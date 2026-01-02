import { NextResponse } from "next/server";
import { endOfToday, startOfToday } from "date-fns";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { upsertEntrySchema } from "@/lib/validators";
import { parseYmdToDate } from "@/lib/date";

function computeDailyStreak(entriesYmdDesc) {
  let current = 0;
  let longest = 0;
  let run = 0;

  for (const e of entriesYmdDesc) {
    if (e.status === "COMPLETED") run += 1;
    else run = 0;
    if (run > longest) longest = run;
  }

  // Current streak is consecutive COMPLETED ending today.
  for (const e of entriesYmdDesc) {
    if (e.status === "COMPLETED") current += 1;
    else break;
  }

  return { current, longest };
}

function computeWeeklyStreak(weekKeysDesc) {
  let longest = 0;
  let run = 0;

  for (const k of weekKeysDesc) {
    if (k.completed) run += 1;
    else run = 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (const k of weekKeysDesc) {
    if (k.completed) current += 1;
    else break;
  }

  return { current, longest };
}

function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function recomputeStreak(habitId) {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: { id: true, frequency: true },
  });
  if (!habit) return;

  const entries = await prisma.habitEntry.findMany({
    where: {
      habitId,
      date: { lte: endOfToday() },
    },
    orderBy: { date: "desc" },
    select: { date: true, status: true },
  });

  if (habit.frequency === "WEEKLY") {
    const map = new Map();
    for (const e of entries) {
      const key = isoWeekKey(e.date);
      const prev = map.get(key) || false;
      map.set(key, prev || e.status === "COMPLETED");
    }

    const weekKeysDesc = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, completed]) => ({ key, completed }));

    const { current, longest } = computeWeeklyStreak(weekKeysDesc);
    await prisma.streak.upsert({
      where: { habitId },
      update: { currentStreak: current, longestStreak: longest },
      create: { habitId, currentStreak: current, longestStreak: longest },
    });
    return;
  }

  // DAILY
  const normalized = entries.map((e) => ({
    date: e.date,
    status: e.status,
  }));

  // Ensure there is an entry for today (missing => break current streak)
  const today = startOfToday();
  if (!normalized.length || normalized[0].date.getTime() !== today.getTime()) {
    normalized.unshift({ date: today, status: "MISSED" });
  }

  const { current, longest } = computeDailyStreak(normalized);
  await prisma.streak.upsert({
    where: { habitId },
    update: { currentStreak: current, longestStreak: longest },
    create: { habitId, currentStreak: current, longestStreak: longest },
  });
}

export async function POST(request) {
  const rl = rateLimit(request, { keyPrefix: "entries:post", limit: 240, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = upsertEntrySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const habit = await prisma.habit.findFirst({
    where: { id: parsed.data.habitId, userId: session.user.id },
    select: { id: true },
  });
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date = parseYmdToDate(parsed.data.date);

  const entry = await prisma.habitEntry.upsert({
    where: { habitId_date: { habitId: parsed.data.habitId, date } },
    update: { status: parsed.data.status },
    create: { habitId: parsed.data.habitId, date, status: parsed.data.status },
  });

  await recomputeStreak(parsed.data.habitId);

  return NextResponse.json({ entry });
}
