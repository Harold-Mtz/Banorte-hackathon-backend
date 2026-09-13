# Backend handoff

Este repo implementa el dominio y la Agent API de Boreas. El frontend no debe llamar repositorios ni MCP directamente.

## Fuente de verdad

PostgreSQL contiene usuarios, perfiles, productos, metas, simulaciones, sesiones, interacciones y estado de UI. Las nuevas capacidades de dashboard deben usar migraciones idempotentes.

## Tools MCP

Registrar tools en `src/mcp/server.ts` y reutilizar sus funciones de dominio. Cada tool debe validar input con Zod y devolver datos serializables.

## Auth

`POST /api/auth/login` devuelve JWT. Las rutas del agente requieren `Authorization: Bearer <token>`. El `userId` efectivo debe venir de `sub`; cualquier userId del body es compatibilidad temporal y debe validarse contra el token.

## Cambios nuevos esperados

Agregar movimientos financieros y consulta agregada de dashboard; no romper metas, hipotecas, sesiones ni UI state. El agente debe componer `AdaptiveUIResponse` usando datos reales y no valores de demo.

## Objetivos no especializados

No limites la clasificación a casa, auto y ahorro. Un usuario puede querer un perro, un celular, una mudanza, un viaje, salud, educación, una boda o un negocio. Usa una categoría `GENERAL_GOAL` con metadata de categoría, checklist y próximos pasos.

El ciclo de vida mínimo de una meta es: seleccionar, crear, editar, pausar, reactivar, cancelar, archivar, eliminar lógicamente, aportar, retirar y consultar impacto. La eliminación lógica conserva movimientos y auditoría.
