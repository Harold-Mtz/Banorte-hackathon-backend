# MCP tools y UI adaptativa

Las tools son funciones de dominio con entrada Zod. El agente puede decidir qué tools invocar, pero la salida debe transformarse a componentes de un catálogo conocido.

Tools actuales: perfil financiero, productos hipotecarios, simulación hipotecaria, amortización, creación de meta y refinanciamiento.

Tools prioritarias nuevas: `getFinancialDashboard`, `listFinancialMovements`, `recordFinancialMovement`, `getGoalImpact`.

Una tool no debe renderizar UI ni devolver JSX. Devuelve datos; el AgentService compone `AdaptiveUIResponse`.
