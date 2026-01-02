"use client";

import { useState } from "react";
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

export default function HabitFormDialog({ onCreated }) {
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      frequency: "DAILY",
      color: "primary",
    },
  });

  async function onSubmit(values) {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to create habit");
    }

    form.reset();
    setOpen(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create habit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create habit</DialogTitle>
          <DialogDescription>Keep it small and consistent.</DialogDescription>
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
            {form.formState.isSubmitting ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
