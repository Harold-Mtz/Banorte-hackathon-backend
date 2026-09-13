import { z } from 'zod';

// PostgreSQL accepts UUID-shaped legacy seed IDs without RFC version/variant bits.
// Authorization still comes exclusively from JWT ownership, never from the ID's shape.
export const idSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Identificador inválido');

export const moneySchema = z.number().finite().positive().max(999999999999.99)
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.001, 'Usa como máximo dos decimales.');
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Fecha inválida');
export const goalPlanSchema = z.object({
  name: z.string().trim().min(1).max(150),
  targetAmount: moneySchema,
  monthlyContribution: moneySchema.optional(),
  targetDate: dateSchema.optional(),
  category: z.string().max(50).optional(),
  checklist: z.array(z.string().max(200)).max(12).optional()
});
export const movementSchema = z.object({
  userId: idSchema, goalId: idSchema.optional(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'EXPENSE', 'INCOME']), amount: moneySchema,
  category: z.string().trim().max(80).optional(), note: z.string().trim().max(240).optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(), confirm: z.boolean().optional()
});
