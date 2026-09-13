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
    42000,
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
