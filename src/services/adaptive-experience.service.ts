import { buildGoalPlan } from "./goal-plan.service";
import { callDomainTool } from "../mcp/tools/client";
import { randomUUID } from "crypto";
import { z } from "zod";
import { AgentService } from "./agent.service";
import { AgentRequestDTO } from "../dtos/agent-request.dto";
import { AgentInteractionDTO } from "../dtos/agent-interaction.dto";
import { AgentResponse } from "../responses/agent-response";
import { AdaptiveUIResponse } from "../types/ui/adaptive-ui-response.type";
import { AgentSessionRepository } from "../repositories/agent-session.repository";
import { UIStateRepository } from "../repositories/ui-state.repository";
import { AgentMessageRepository } from "../repositories/agent-message.repository";
import { InteractionRepository } from "../repositories/interaction.repository";
import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { LifeEventRepository } from "../repositories/life-event.repository";
import { FinancialService } from "./financial.service";
import { MortgageService } from "./mortgage.service";
import { simulateMortgageInputSchema } from "../mcp/tools/simulate-mortgage.tool";
import { createSavingsGoalInputSchema } from "../mcp/tools/create-savings-goal-tool";
import { pool } from "../config/database";

const interactionSchema = z.object({
  sessionId: z.uuid(),
  componentId: z.string().min(1),
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export class AdaptiveExperienceService {
  private sessions = new AgentSessionRepository();
  private states = new UIStateRepository();
  private products = new FinancialProductRepository();
  private financial = new FinancialService(new FinancialProfileRepository());
  private mortgage = new MortgageService(
    new MortgageSimulationRepository(),
    this.products,
    this.financial,
  );
  constructor(private agent: AgentService) {}

  async message(input: AgentRequestDTO): Promise<AgentResponse> {
    const data = z
      .object({
        userId: z.uuid(),
        sessionId: z.uuid().optional(),
        message: z.string().trim().min(1).max(2000),
      })
      .parse(input);
    if (data.sessionId) {
      const existing = await this.sessions.findById(data.sessionId);
      if (!existing || existing.userId !== data.userId)
        throw new Error("SESSION_NOT_FOUND");
    }
    const response = await this.agent.processMessage(data);
    const events = new LifeEventRepository();
    let event = (await events.findByUserId(data.userId)).find(
      (e) => e.type === response.intent && e.status === "ACTIVE",
    );
    if (!event && response.intent && response.intent !== "UNKNOWN") {
      const { isLifeEventType } = await import("../models/life-event.model");
      if (isLifeEventType(response.intent))
        event = await events.create({
          userId: data.userId,
          type: response.intent,
          title: response.ui.screen.title,
        });
    }
    const session = data.sessionId
      ? await this.sessions.findById(data.sessionId)
      : await this.sessions.create(data.userId, event?.id, response.intent);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    response.sessionId = session.id;
    await this.sessions.updateIntent(session.id, response.intent ?? "UNKNOWN");
    await this.sessions.updateContext(session.id, { lifeEventId: event?.id, objective: data.message });
    response.ui.components = response.ui.components.filter(
      (c) => c.type === "financial-summary",
    );
    if (response.intent === "FIRST_HOME") {
      const products = (await this.products.findByType("MORTGAGE")).filter(
        (p) => p.isActive,
      );
      const profile = await this.financial.getProfile(data.userId);
      response.ui.components.push(
        {
          id: "capacity",
          type: "mortgage-capacity",
          props: {
            estimatedMaxPayment: Math.max(
              0,
              await this.mortgage.calculateCapacity(data.userId),
            ),
          },
        },
        { id: "products", type: "product-comparison", props: { products } },
        {
          id: "simulator",
          type: "mortgage-simulator",
          props: {
            products,
            propertyValue: event?.context.propertyBudget,
            termMonths: event?.context.preferredTermMonths,
            downPayment: profile?.currentSavings,
          },
          actions: [
            {
              id: "simulate",
              type: "UPDATE_DOWN_PAYMENT",
              label: "Actualizar simulación",
            },
          ],
        },
        {
          id: "savings",
          type: "savings-goal-form",
          props: {},
          actions: [
            {
              id: "prepare-goal",
              type: "REQUEST_CREATE_SAVINGS_GOAL",
              label: "Revisar meta",
            },
          ],
        },
      );
    }
    response.ui.screen.title = "Tu plan con Borias";
    response.ui.screen.subtitle = "Confirma el presupuesto y el plazo para obtener pasos y una proyección personalizada.";
    response.ui.components.unshift({
      id: `plan-input-${randomUUID()}`, type: "goal-plan-form",
      props: { objective: data.message },
      actions: [{id: "build-plan", type: "BUILD_GOAL_PLAN", label: "Generar mi plan"}],
    });
    await new AgentMessageRepository().create(session.id, "USER", data.message);
    await this.save(response);
    return response;
  }

  private async save(response: AgentResponse) {
    const latest = await this.states.findLatestBySessionId(response.sessionId);
    await this.states.create(response.sessionId, (latest?.version ?? 0) + 1, {
      ...response.ui,
    });
  }

  async interact(
    input: AgentInteractionDTO,
    userId: string,
  ): Promise<AgentResponse> {
    const data = interactionSchema.parse(input);
    // Serialize actions for one session, including duplicate confirmation clicks.
    const lock = await pool.connect();
    try {
      await lock.query("SELECT pg_advisory_lock(hashtext($1))", [
        data.sessionId,
      ]);
      const session = await this.sessions.findById(data.sessionId);
      if (!session || session.userId !== userId)
        throw new Error("SESSION_NOT_FOUND");
      const latest = await this.states.findLatestBySessionId(session.id);
      if (!latest) throw new Error("UI_STATE_NOT_FOUND");
      const ui = latest.schema as unknown as AdaptiveUIResponse;
      const component = ui.components.find((c) => c.id === data.componentId);
      if (!component?.actions?.some((a) => a.type === data.action))
        throw new Error("ACTION_NOT_AVAILABLE");
      const payload = data.payload ?? {};
      const lifeEventId =
        typeof session.context.lifeEventId === "string"
          ? session.context.lifeEventId
          : undefined;
      if (data.action === "BUILD_GOAL_PLAN") {
        const profile = await this.financial.getProfile(userId);
        if (!profile) throw new Error("FINANCIAL_PROFILE_NOT_FOUND");
        const summary = ui.components.find(c => c.type === "financial-summary");
        if (summary) summary.props = {...profile};
        const calculated = buildGoalPlan(payload, profile, String(session.context.objective ?? "Mi objetivo"), session.currentIntent ?? "UNKNOWN");
        const personalized = await this.agent.personalizePlan(calculated.objective, calculated.input.details, calculated.steps);
        const plan = {...calculated, ...personalized};
        component.props = {...component.props, input: plan.input};
        ui.components = ui.components.filter(c => c.type !== "goal-plan" && c.type !== "confirmation");
        ui.components.splice(1, 0, {id: randomUUID(), type: "goal-plan", props: {...plan}, actions: [{id: "save-plan", type: "REQUEST_SAVE_PLAN", label: "Guardar este plan como meta"}]});
        await this.sessions.updateContext(session.id, {...session.context, plan, pendingGoal: undefined});
      } else if (data.action === "UPDATE_DOWN_PAYMENT") {
        const parsed = simulateMortgageInputSchema.parse({
          ...payload,
          userId,
          lifeEventId,
        });
        const simulation = await callDomainTool(
          "simulateMortgage",
          { ...parsed },
          z.object({
            id: z.string(),
            propertyValue: z.number(),
            downPayment: z.number(),
            loanAmount: z.number(),
            termMonths: z.number(),
            annualInterestRate: z.number(),
            monthlyPayment: z.number(),
            totalPayment: z.number(),
            totalInterest: z.number(),
          }),
        );
        component.props = {
          ...component.props,
          ...simulation,
          financialProductId: parsed.financialProductId,
        };
        const comparison = ui.components.find(
          (c) => c.type === "product-comparison",
        );
        if (comparison)
          comparison.props.selectedProductId = parsed.financialProductId;
      } else if (data.action === "REQUEST_CREATE_SAVINGS_GOAL" || data.action === "REQUEST_SAVE_PLAN") {
        let goalPayload = payload;
        if (data.action === "REQUEST_SAVE_PLAN") {
          const stored = session.context.plan as ReturnType<typeof buildGoalPlan> | undefined;
          if (!stored) throw new Error("ACTION_NOT_AVAILABLE");
          const start = new Date(stored.plannedAt);
          const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + stored.input.months + 1, 0));
          end.setUTCDate(Math.min(start.getUTCDate(), end.getUTCDate()));
          goalPayload = {targetDate: end.toISOString().slice(0,10), name: stored.objective.slice(0, 150), targetAmount: stored.input.targetAmount, currentAmount: stored.input.allocatedSavings, ...(stored.input.contribution > 0 ? {monthlyContribution: stored.input.contribution} : {})};
        }
        const pendingGoal = createSavingsGoalInputSchema.parse({
          ...goalPayload,
          userId,
          lifeEventId,
        });
        await this.sessions.updateContext(session.id, {
          ...session.context,
          pendingGoal,
          pendingPlan: data.action === "REQUEST_SAVE_PLAN",
        });
        ui.components = ui.components.filter((c) => c.type !== "confirmation");
        ui.components.push({
          id: randomUUID(),
          type: "confirmation",
          props: {
            message: "Revisa tu meta antes de guardarla.",
            ...pendingGoal,
          },
          actions: [
            {
              id: "confirm",
              type: "CONFIRM_CREATE_SAVINGS_GOAL",
              label: "Confirmar y crear meta",
            },
            { id: "cancel", type: "CANCEL", label: "Volver" },
          ],
        });
      } else if (data.action === "CONFIRM_CREATE_SAVINGS_GOAL") {
        const pending = createSavingsGoalInputSchema.parse(
          session.context.pendingGoal,
        );
        const goal = await callDomainTool(
          "createSavingsGoal",
          { ...pending },
          z.object({
            id: z.string(),
            name: z.string(),
            targetAmount: z.number(),
            currentAmount: z.number(),
            monthlyContribution: z.number().nullable(),
            targetDate: z.string().nullable(),
            status: z.string(),
          }),
        );
        await this.sessions.updateContext(session.id, {
          ...session.context,
          pendingGoal: undefined,
        });
        ui.components = ui.components.filter((c) => c.type !== "confirmation");
        if (session.context.pendingPlan) {
          for (const c of ui.components) if (c.type === "goal-plan") c.actions = [];
        }
        ui.components.push(
          { id: goal.id, type: "goal-progress", props: { ...goal } },
          {
            id: randomUUID(),
            type: "confirmation",
            props: { message: "Tu meta de ahorro se guardó correctamente." },
          },
        );
      } else if (data.action === "CANCEL") {
        await this.sessions.updateContext(session.id, {
          ...session.context,
          pendingGoal: undefined,
        });
        ui.components = ui.components.filter((c) => c.id !== component.id);
      } else throw new Error("ACTION_NOT_AVAILABLE");
      await new InteractionRepository().create(
        session.id,
        data.componentId,
        data.action,
        payload,
      );
      const response: AgentResponse = {
        sessionId: session.id,
        intent: session.currentIntent ?? undefined,
        ui,
      };
      await this.save(response);
      return response;
    } finally {
      await lock.query("SELECT pg_advisory_unlock(hashtext($1))", [
        data.sessionId,
      ]);
      lock.release();
    }
  }
}
