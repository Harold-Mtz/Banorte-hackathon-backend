import { z } from "zod";

export const planInputSchema = z.object({
  targetAmount: z.number().finite().positive().max(1_000_000_000),
  allocatedSavings: z.number().finite().min(0).max(1_000_000_000),
  months: z.number().int().min(1).max(360),
  contribution: z.number().finite().min(0).max(1_000_000_000),
  extraExpenses: z.number().finite().min(0).max(1_000_000_000),
  details: z.string().trim().max(1000).default(""),
});
const tasks: Record<string, string[]> = {
 FIRST_HOME: ["Cotiza vivienda y separa enganche, escrituración y mudanza en tu presupuesto.", "Compara el CAT y el costo total de las opciones del simulador antes de solicitar crédito."],
 CAR_PURCHASE: ["Compara cotizaciones del auto y agrega seguro, placas y mantenimiento al presupuesto.", "Revisa documentación y condiciones del vehículo antes de comprometer el ahorro."],
 EDUCATION: ["Confirma inscripción, colegiaturas, materiales y transporte con la institución.", "Consulta becas y fechas de pago; ajusta tu presupuesto con costos confirmados."],
 TRAVEL: ["Cotiza transporte, hospedaje, documentos y gastos diarios para tu destino.", "Verifica fechas y condiciones de cancelación antes de reservar."],
 MARRIAGE: ["Define invitados y cotiza lugar, alimentos y servicios esenciales.", "Divide anticipos y pagos finales por fecha; acuerda qué gastos son prioritarios."],
 CHILD: ["Cotiza atención, artículos esenciales y cuidados según tus necesidades.", "Contempla cambios de ingreso y gastos recurrentes en el presupuesto familiar."],
};
export function buildGoalPlan(raw: unknown, profile: {monthlyIncome: number; monthlyExpenses: number; currentSavings: number}, objective: string, intent: string) {
 const input = planInputSchema.parse(raw);
 if (input.allocatedSavings > profile.currentSavings || input.allocatedSavings > input.targetAmount) throw new Error("PLAN_SAVINGS_INVALID");
 const round = (n: number) => Math.round(n * 100) / 100;
 const remaining = Math.max(0, input.targetAmount - input.allocatedSavings);
 const available = round(profile.monthlyIncome - profile.monthlyExpenses - input.extraExpenses);
 const requiredMonthly = Math.ceil(remaining / input.months * 100) / 100;
 const shortfall = round(Math.max(0, remaining - input.contribution * input.months));
 const affordable = input.contribution <= Math.max(0, available) && available >= 0;
 const steps = [...(tasks[intent] ?? ["Divide tu objetivo en compras o hitos concretos y solicita cotizaciones.", "Ordena esos hitos por prioridad y confirma sus fechas de pago."]),
   affordable ? "Separa tu aportación al recibir tus ingresos y conserva una reserva para imprevistos." : "Ajusta gastos, aportación o plazo antes de comprometer dinero: el presupuesto actual no cubre este plan.",
   shortfall > 0 ? "Para cubrir el faltante, compara la aportación necesaria con tu margen o amplía el plazo." : "Mantén la aportación prevista y revisa cada mes el avance frente a la proyección.",
   "Actualiza los costos y tu perfil cuando cambien tus ingresos o gastos; vuelve a calcular el plan."];
 return { objective, intent, input, available, requiredMonthly, shortfall, affordable,
   monthlyRemainder: round(available - input.contribution),
   monthsNeeded: remaining === 0 ? 0 : input.contribution > 0 ? Math.ceil(remaining / input.contribution) : null,
   feasible: affordable && shortfall === 0, steps, plannedAt: new Date().toISOString(),
   projection: Array.from({length: input.months + 1}, (_, month) => ({month, amount: round(Math.min(input.targetAmount, input.allocatedSavings + input.contribution * month)), target: input.targetAmount})),
 };
}
