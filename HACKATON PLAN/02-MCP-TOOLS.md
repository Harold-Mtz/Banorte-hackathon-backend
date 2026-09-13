# MCP tools y UI adaptativa

Las tools son funciones de dominio con entrada Zod. El agente puede decidir qué tools invocar, pero la salida debe transformarse a componentes de un catálogo conocido.

Tools actuales: perfil financiero, productos hipotecarios, simulación hipotecaria, amortización, creación de meta y refinanciamiento.

Tools prioritarias nuevas: `getFinancialDashboard`, `listFinancialMovements`, `recordFinancialMovement`, `getGoalImpact`.

Tools necesarias para gestión completa de metas:

- `listSavingsGoals`
- `getSavingsGoal`
- `createSavingsGoal`
- `updateSavingsGoal`
- `pauseSavingsGoal`
- `resumeSavingsGoal`
- `cancelSavingsGoal`
- `archiveSavingsGoal`
- `deleteSavingsGoal` como eliminación lógica
- `previewGoalImpact`

Una meta puede representar cualquier objetivo financiero: mascota, celular, computadora, viaje, mudanza, salud, educación, boda, negocio o fondo de emergencia. No asumir que toda meta es hipotecaria.

Cada tool de meta debe validar ownership, conservar historial y devolver el estado actualizado suficiente para reconstruir dashboard, selector, progreso y actividad.

Una tool no debe renderizar UI ni devolver JSX. Devuelve datos; el AgentService compone `AdaptiveUIResponse`.
