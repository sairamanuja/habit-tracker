import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { updateHabitSchema } from "@/lib/validators";

export async function PATCH(request, { params }) {
  const rl = rateLimit(request, { keyPrefix: "habits:patch", limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing habit id" }, { status: 400 });

  const json = await request.json().catch(() => null);
  const parsed = updateHabitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const habit = await prisma.habit.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.habit.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      frequency: parsed.data.frequency,
      color: parsed.data.color,
    },
  });

  return NextResponse.json({ habit: updated });
}

export async function DELETE(request, { params }) {
  const rl = rateLimit(request, { keyPrefix: "habits:delete", limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing habit id" }, { status: 400 });

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const habit = await prisma.habit.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.habit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
