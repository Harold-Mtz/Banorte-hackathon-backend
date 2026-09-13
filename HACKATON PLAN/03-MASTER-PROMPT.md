# Master prompt backend

Lee `HACKATON PLAN` completo antes de editar. Trabaja con cambios mínimos y reversibles. No hardcodees datos financieros ni conviertas la clasificación de intención en una pantalla fija. Usa las tools de dominio y repositorios para devolver un dashboard actualizado.

Toda mutación financiera debe:

- Validar usuario autenticado.
- Validar montos y ownership.
- Persistir un movimiento auditable.
- Calcular impacto del movimiento.
- Devolver una nueva `AdaptiveUIResponse` completa.

No rompas contratos existentes; compila con `npm run build`. Si requiere SQL, agrega cambios idempotentes a `database/schema.sql` y documenta que una base existente necesita aplicar la migración.
