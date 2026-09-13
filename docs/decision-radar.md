# Radar Boreas: composición adaptativa con MCP

El diferenciador protege el presupuesto de las metas antes de explorar otro compromiso: muestra el margen disponible después de aportaciones planeadas, metas con fecha en riesgo y el ahorro registrado. Los datos salen del perfil, movimientos y metas de PostgreSQL.

## Recorrido real

`AgentService.processMessage` → SDK `Client` + `InMemoryTransport` → MCP `initialize` y `tools/call(getDecisionInsights)` → esquema Zod → `DecisionInsightsService` → servicios de dominio → PostgreSQL → Gemini → componente `decision-insights` → renderer adaptativo.

El transporte es MCP real dentro del proceso, sin petición HTTP a la propia aplicación. La misma herramienta está publicada en el servidor HTTP MCP autenticado. El servidor sustituye siempre `userId` por el usuario autenticado, incluso si los argumentos intentan enviar otro identificador.

Gemini elige el orden de señales y siguientes pasos dentro de un catálogo calculado por dominio. Esa selección cambia la prioridad visual y la narrativa validada del radar. No escribe HTML, montos, acciones, aprobaciones ni consejos libres. El resultado debe contener todos los elementos exactamente una vez; entradas inventadas, duplicadas o incompletas activan las reglas.

## Frescura y fallback

- La lectura inicial usa una transacción breve; su bloqueo termina antes de llamar a Gemini.
- Antes de responder se consulta nuevamente el tablero. `snapshotId` vincula la composición con los hechos de dominio. Si cambian, se recomputan los valores y se descarta la selección anterior.
- Las interacciones financieras recomputan el radar con reglas y no esperan llamadas de IA dentro de la transacción.
- `source: ai` significa que se recibió y validó una composición del modelo. `source: rules` identifica ausencia de modelo, error, timeout, composición inválida o actualización financiera.
- `transport: mcp` identifica una respuesta recibida por el protocolo MCP y vigente para ese snapshot. `transport: domain` identifica la recomputación local o fallback de transporte.
- El SDK cancela la petición de Gemini a los 4.5 segundos. Ante un error transitorio 500/502/503/504 se permite un único reintento, compartiendo ese mismo plazo. Errores de autenticación, cuota o composición inválida conservan el fallback. El servicio tiene un límite adicional de 5 segundos.
- `generatedAt` fecha la recomposición del radar. Las cifras monetarias usan MXN; un formato `percent` usaría puntos porcentuales, igual que las tasas del catálogo.

La simulación hipotecaria devuelve además `schedule`, con filas `paymentNumber`, `payment`, `principal`, `interest`, `remainingBalance` calculadas mediante la herramienta de amortización existente. El tamaño máximo del calendario es 600 pagos.

## Verificación

`npm run test:radar` verifica grounding, fallback, timeout, invalidación de snapshot, contrato Zod y recorrido MCP real contra un usuario temporal de PostgreSQL que se elimina al terminar.

Para una comprobación opcional con el proveedor configurado, establece `BOREAS_TEST_GEMINI=1` y ejecuta la misma prueba. Imprime únicamente modelo, origen, transporte y duración; nunca credenciales. La comprobación realizada durante esta implementación obtuvo `source: ai`, `transport: mcp` con el modelo configurado `gemini-3.5-flash-lite` en aproximadamente 1.2 segundos. El modelo y las credenciales se conservan en la configuración existente.
