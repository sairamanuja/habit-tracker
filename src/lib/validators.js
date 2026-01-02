import { z } from "zod";

export const habitColorEnum = z.enum([
  "primary",
  "secondary",
  "accent",
  "muted",
]);

export const habitFrequencyEnum = z.enum(["DAILY", "WEEKLY"]);
export const entryStatusEnum = z.enum(["COMPLETED", "PARTIAL", "MISSED"]);

export const createHabitSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(240).optional().nullable(),
  frequency: habitFrequencyEnum.default("DAILY"),
  color: habitColorEnum.default("primary"),
});

export const updateHabitSchema = createHabitSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "No fields to update" }
);

export const upsertEntrySchema = z.object({
  habitId: z.string().min(1),
  date: z.string().min(8), // yyyy-mm-dd
  status: entryStatusEnum,
});
