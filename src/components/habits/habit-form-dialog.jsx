"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  color: z.enum(["primary", "secondary", "accent", "muted"]).default("primary"),
});

export default function HabitFormDialog({
  mode = "create",
  habit = null,
  trigger = null,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
  onSaved,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const isEdit = mode === "edit";

  const defaults = useMemo(
    () => ({
      title: habit?.title || "",
      description: habit?.description || "",
      frequency: habit?.frequency || "DAILY",
      color: habit?.color || "primary",
    }),
    [habit]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaults);
  }, [open, defaults, form]);

  async function onSubmit(values) {
    const url = isEdit ? `/api/habits/${habit?.id}` : "/api/habits";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || (isEdit ? "Failed to update habit" : "Failed to create habit"));
    }

    form.reset();
    setOpen(false);
    if (isEdit) onSaved?.();
    else onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null ? (
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button>{isEdit ? "Edit" : "Create habit"}</Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit habit" : "Create habit"}</DialogTitle>
          <DialogDescription>{isEdit ? "Tweak your habit details." : "Keep it small and consistent."}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <select
                id="frequency"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("frequency")}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color tag</Label>
              <select
                id="color"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("color")}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="accent">Accent</option>
                <option value="muted">Muted</option>
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
