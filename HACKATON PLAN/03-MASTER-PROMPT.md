# Master prompt backend

Lee `HACKATON PLAN` completo antes de editar. Trabaja con cambios mínimos y reversibles. No hardcodees datos financieros ni conviertas la clasificación de intención en una pantalla fija. Usa las tools de dominio y repositorios para devolver un dashboard actualizado.

## Clasificación abierta de objetivos

El agente debe soportar objetivos que no estén en un enum pequeño: perro, celular, computadora, mudanza, viaje, salud, estudios, boda, negocio, fondo de emergencia y liquidación de deuda. Deben producir `GENERAL_GOAL` o una categoría equivalente, nunca caer por defecto en hipoteca.

Separa siempre:

- `goalType`: qué quiere lograr.
- `financialAction`: ahorrar, aportar, retirar, gastar, pedir crédito o consultar.
- `urgency` y `targetDate` cuando existan.

Si faltan datos, pregunta lo mínimo y guarda el contexto en la sesión. No inventes montos, fechas ni capacidad de pago.

## Ciclo de vida de metas

Las metas son recursos administrables, no respuestas de una sola vez. Soportan selección, creación, edición, pausa, reactivación, cancelación, archivado, eliminación lógica, aportaciones, retiros parciales y consulta de progreso.

Eliminar una meta no elimina movimientos ni auditoría. Toda acción destructiva o financiera valida ownership y requiere confirmación explícita.

Toda mutación financiera debe:

- Validar usuario autenticado.
- Validar montos y ownership.
- Persistir un movimiento auditable.
- Calcular impacto del movimiento.
- Devolver una nueva `AdaptiveUIResponse` completa.

Toda operación de meta devuelve el dashboard actualizado, la meta seleccionada y actividad reciente. Si un gasto afecta la fecha objetivo, devuelve una alerta antes de persistirlo.

`FIRST_HOME` solo se usa si el usuario habla de casa, vivienda, hipoteca o inmueble. Para celular, perro o cualquier caso no especializado, usa una meta genérica con datos reales y módulos específicos del objetivo.

No rompas contratos existentes; compila con `npm run build`. Si requiere SQL, agrega cambios idempotentes a `database/schema.sql` y documenta que una base existente necesita aplicar la migración.
