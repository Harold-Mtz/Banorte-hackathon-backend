const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { start } = require("./test-app.cjs");
let app, session, agent, goalId;
before(async () => {
  app = await start();
});
after(async () => {
  await new Promise((resolve) => app.server.close(resolve));
  await app.pool.end();
});
async function call(path, method = "GET", body, token = session?.token) {
  const response = await fetch(app.url + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, ...(await response.json()) };
}
test("registration, login, profile, adaptive simulation, confirmation and recovery", async () => {
  let result = await call("/auth/register", "POST", {
    name: "Prueba integral",
    email: "e2e@example.test",
    password: "TestPassword123!",
  });
  assert.equal(result.status, 201);
  session = result.data;
  assert.ok(session.token);
  assert.equal(session.user.name, "Prueba integral");
  assert.equal(
    (
      await call("/auth/register", "POST", {
        name: "Duplicado",
        email: "e2e@example.test",
        password: "TestPassword123!",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call("/auth/login", "POST", {
        email: "e2e@example.test",
        password: "wrong",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call("/auth/login", "POST", {
        email: "e2e@example.test",
        password: "TestPassword123!",
      })
    ).status,
    200,
  );
  const profilePath = `/financial-profiles/${session.user.id}/financial-profile`;
  result = await call(profilePath);
  assert.equal(result.data.currentSavings, 0);
  result = await call(profilePath, "PATCH", {
    monthlyIncome: 60000,
    monthlyExpenses: 16000,
    currentSavings: 300000,
    currentDebt: 2000,
    creditScore: 720,
  });
  assert.equal(result.status, 200);
  assert.equal(
    (await call(profilePath, "PATCH", { monthlyIncome: -1 })).status,
    400,
  );
  assert.equal(
    (await call(`/financial-profiles/${session.user.id}/financial-summary`))
      .data.availableIncome,
    44000,
  );
  result = await call("/agent/message", "POST", {
    userId: session.user.id,
    message: "Quiero comprar mi primera casa",
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  agent = result.data;
  assert.equal(agent.ui.version, "1.0");
  assert.ok(agent.ui.components.some((c) => c.type === "mortgage-simulator"));
  assert.equal(
    (await call(`/agent/sessions/${agent.sessionId}/ui-states/latest`)).data
      .schema.screen.title,
    agent.ui.screen.title,
  );
  result = await call("/agent/interact", "POST", {
    sessionId: agent.sessionId,
    componentId: "simulator",
    action: "UPDATE_DOWN_PAYMENT",
    payload: {
      financialProductId: app.productId,
      propertyValue: 1800000,
      downPayment: 300000,
      termMonths: 240,
    },
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  const first = result.data.ui.components.find(
    (c) => c.type === "mortgage-simulator",
  ).props;
  assert.ok(first.monthlyPayment > 0);
  assert.equal(first.loanAmount, 1500000);
  result = await call("/agent/interact", "POST", {
    sessionId: agent.sessionId,
    componentId: "simulator",
    action: "UPDATE_DOWN_PAYMENT",
    payload: {
      financialProductId: app.productId,
      propertyValue: 1800000,
      downPayment: 500000,
      termMonths: 240,
    },
  });
  assert.equal(result.status, 200);
  assert.ok(
    result.data.ui.components.find((c) => c.type === "mortgage-simulator").props
      .monthlyPayment < first.monthlyPayment,
  );
  assert.equal(
    (await call(`/users/${session.user.id}/mortgage-simulations`)).data.length,
    2,
  );
  result = await call("/agent/interact", "POST", {
    sessionId: agent.sessionId,
    componentId: "savings",
    action: "REQUEST_CREATE_SAVINGS_GOAL",
    payload: {
      name: "Mi enganche",
      targetAmount: 500000,
      currentAmount: 300000,
      monthlyContribution: 10000,
      targetDate: "2028-01-01",
    },
  });
  assert.equal(result.status, 200);
  const confirmation = result.data.ui.components.find(
    (c) => c.type === "confirmation",
  );
  assert.ok(confirmation);
  assert.equal(
    (await call(`/savings-goals/user/${session.user.id}`)).data.length,
    0,
    "request must not persist a goal before confirmation",
  );
  const confirm = {
    sessionId: agent.sessionId,
    componentId: confirmation.id,
    action: "CONFIRM_CREATE_SAVINGS_GOAL",
    payload: { targetAmount: 1 },
  };
  result = await call("/agent/interact", "POST", confirm);
  assert.equal(result.status, 200, JSON.stringify(result));
  const goal = result.data.ui.components.find(
    (c) => c.type === "goal-progress",
  );
  assert.equal(
    goal.props.targetAmount,
    500000,
    "confirmation uses server pending data",
  );
  goalId = goal.id;
  assert.equal(
    (await call("/agent/interact", "POST", confirm)).status,
    400,
    "replayed confirmation is unavailable",
  );
  result = await call(`/savings-goals/user/${session.user.id}`);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].name, "Mi enganche");
  assert.equal(
    (await call(`/savings-goals/${goalId}/progress`)).data.progress,
    60,
  );
  assert.equal(
    (
      await call(`/savings-goals/${goalId}/amount`, "PATCH", {
        currentAmount: 350000,
      })
    ).data.currentAmount,
    350000,
  );
  assert.ok(
    (
      await call(`/agent/sessions/${agent.sessionId}/ui-states/latest`)
    ).data.schema.components.some((c) => c.type === "goal-progress"),
  );
});
test("ownership and allowlist reject unauthorized or malformed operations", async () => {
  const other = (
    await call("/auth/register", "POST", {
      name: "Otra cuenta",
      email: "other@example.test",
      password: "TestPassword123!",
    })
  ).data;
  assert.equal(
    (await call(`/users/${session.user.id}`, "GET", undefined, other.token))
      .status,
    403,
  );
  assert.equal(
    (await call(`/savings-goals/${goalId}`, "GET", undefined, other.token))
      .status,
    403,
  );
  assert.equal(
    (
      await call(
        "/agent/interact",
        "POST",
        {
          sessionId: agent.sessionId,
          componentId: "simulator",
          action: "UPDATE_DOWN_PAYMENT",
        },
        other.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/agent/interact", "POST", {
        sessionId: agent.sessionId,
        componentId: "simulator",
        action: "RUN_CODE",
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("/financial-products", "GET", undefined, "invalid")).status,
    401,
  );
  assert.equal(
    (
      await call("/mortgages/simulate", "POST", {
        userId: session.user.id,
        financialProductId: app.productId,
        propertyValue: "wrong",
        downPayment: 0,
        termMonths: 240,
      })
    ).status,
    400,
  );
});

test("plan calculation, recovery and confirmed server values", async () => {
 const response = await call('/agent/message', 'POST', {userId: session.user.id, message: 'Quiero viajar'});
 const current = response.data;
 const form = current.ui.components.find(c => c.type === 'goal-plan-form');
 const act = (componentId, action, payload) => call('/agent/interact', 'POST', {sessionId: current.sessionId, componentId, action, payload});
 const values = {targetAmount:120000, allocatedSavings:20000, months:10, contribution:8000, extraExpenses:4000, details:'Japón'};
 assert.equal((await act(form.id,'BUILD_GOAL_PLAN',{...values,allocatedSavings:400000})).status,400);
 assert.equal((await act(form.id,'BUILD_GOAL_PLAN',{...values,months:0})).status,400);
 const built = await act(form.id,'BUILD_GOAL_PLAN',values);
 assert.equal(built.status,200,JSON.stringify(built));
 const plan = built.data.ui.components.find(c => c.type === 'goal-plan');
 assert.equal(plan.props.requiredMonthly,10000);
 assert.equal(plan.props.available,40000);
 assert.equal(plan.props.shortfall,20000);
 assert.equal(plan.props.monthsNeeded,13);
 assert.equal(plan.props.feasible,false);
 assert.equal(plan.props.projection.at(-1).amount,100000);
 const restored = await call(`/agent/sessions/${current.sessionId}/ui-states/latest`);
 assert.deepEqual(restored.data.schema.components.find(c => c.type === 'goal-plan').props,plan.props);
 const review = await act(plan.id,'REQUEST_SAVE_PLAN',{targetAmount:1});
 const confirmation = review.data.ui.components.find(c => c.type === 'confirmation');
 assert.equal(confirmation.props.targetAmount,120000);
 assert.ok(confirmation.props.targetDate);
 assert.equal((await act(confirmation.id,'CONFIRM_CREATE_SAVINGS_GOAL')).status,200);
 assert.equal((await act(plan.id,'REQUEST_SAVE_PLAN')).status,400);
 assert.equal((await act(confirmation.id,'CONFIRM_CREATE_SAVINGS_GOAL')).status,400);
});
test("zero contributions, completed savings and insufficient income", () => {
 const {buildGoalPlan} = require('../dist/services/goal-plan.service');
 const profile = {monthlyIncome:10000,monthlyExpenses:12000,currentSavings:5000};
 const input = {targetAmount:10000,allocatedSavings:0,months:12,contribution:0,extraExpenses:0};
 const result = buildGoalPlan(input,profile,'Mi proyecto','UNKNOWN');
 assert.equal(result.monthsNeeded,null);
 assert.equal(result.feasible,false);
 assert.equal(result.available,-2000);
 assert.equal(result.projection.at(-1).amount,0);
 const complete = buildGoalPlan({...input,targetAmount:5000,allocatedSavings:5000},{...profile,monthlyExpenses:5000},'Estudiar','EDUCATION');
 assert.equal(complete.monthsNeeded,0);
 assert.equal(complete.feasible,true);
 assert.ok(complete.steps.some(s => s.includes('becas')));
});

test("all goal categories and free text receive a planner", async () => {
 for (const [message,intent] of [['Quiero un auto','CAR_PURCHASE'],['Quiero estudiar','EDUCATION'],['Quiero viajar','TRAVEL'],['Quiero casarme','MARRIAGE'],['Prepararme para un hijo','CHILD'],['Abrir mi taller','UNKNOWN']]) {
  const result = await call('/agent/message','POST',{userId:session.user.id,message});
  assert.equal(result.status,200);
  assert.equal(result.data.intent,intent);
  assert.ok(result.data.ui.components.some(c => c.type === 'goal-plan-form'));
 }
});
test("AI steps are validated and fall back without losing calculation guidance", async () => {
 const {AgentService} = require('../dist/services/agent.service');
 const fallback = ['Paso base', 'Cuida tu margen', 'Revisa el plazo', 'Actualiza datos'];
 const service = new AgentService({}, {}, {generate: async () => JSON.stringify({steps:['Cotiza transporte para Japón.', 'Comprueba tus documentos de viaje.', 'Elige hospedaje cerca de tus actividades.']})});
 assert.equal((await service.personalizePlan('Viajar','Japón',fallback)).source,'ai');
 const invalid = new AgentService({}, {}, {generate: async () => '{"steps":["Gana $5000"]}'});
 assert.deepEqual(await invalid.personalizePlan('Viajar','',fallback),{steps:fallback,source:'rules'});
});

test("CORS permits the production frontend and token preflight but excludes unrelated origins", async () => {
 const origin = 'https://banorte-hackathon2026-frontend.vercel.app';
 for (const route of ['/api/auth/register', '/api/agent/message']) {
  const response = await fetch(app.url + route, {method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,authorization'}});
  assert.equal(response.status,204);
  assert.equal(response.headers.get('access-control-allow-origin'),origin);
  assert.match(response.headers.get('access-control-allow-headers'),/authorization/i);
 }
 const unauthenticated = await fetch(app.url + '/api/agent/message', {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal(unauthenticated.status,401);
 assert.equal(unauthenticated.headers.get('access-control-allow-origin'),origin);
 const rejected = await fetch(app.url + '/api/auth/register', {method:'OPTIONS',headers:{Origin:'https://unrelated.example','Access-Control-Request-Method':'POST'}});
 assert.equal(rejected.headers.get('access-control-allow-origin'),null);
});
