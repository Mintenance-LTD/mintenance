import { z } from 'zod';

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.getUTCFullYear() > 0 &&
      date.toISOString().slice(0, 10) === value
    );
  }, 'Enter a valid calendar date');

// Older mobile clients submit a UTC timestamp. Preserve their date while rejecting
// impossible dates rather than relying on PostgreSQL to reject them after a save.
const dueDate = z.union([
  calendarDate,
  z
    .string()
    .datetime({ offset: true })
    .refine(
      (value) =>
        calendarDate.safeParse(value.slice(0, 10)).success &&
        Number.isFinite(new Date(value).getTime())
    )
    .transform((value) => new Date(value).toISOString().slice(0, 10)),
]);
const frequency = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => (value === 'yearly' ? 'annual' : value))
  .pipe(z.enum(['monthly', 'quarterly', 'biannual', 'annual']));

export const propertyScheduleInput = z.object({
  title: z.string().trim().min(5).max(200),
  frequency,
  next_due_date: dueDate,
  category: z.string().trim().max(100).optional(),
});

export const propertyScheduleUpdate = propertyScheduleInput
  .partial()
  .extend({
    scheduleId: z.string().uuid(),
    is_active: z.boolean().optional(),
    expected_updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.is_active !== undefined ||
      value.title !== undefined ||
      value.frequency !== undefined ||
      value.next_due_date !== undefined ||
      value.category !== undefined,
    'Provide a change'
  )
  .refine(
    (value) =>
      value.expected_updated_at !== undefined ||
      (value.title === undefined &&
        value.frequency === undefined &&
        value.next_due_date === undefined &&
        value.category === undefined),
    'Reload the schedule before editing'
  );

export const portfolioScheduleInput = propertyScheduleInput.extend({
  property_id: z.string().uuid(),
  task_type: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  auto_create_job: z.boolean().optional(),
});
