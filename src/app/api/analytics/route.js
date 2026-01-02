import { NextResponse } from "next/server";
import { subDays, startOfDay, endOfDay, formatISO } from "date-fns";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

// Cache headers for better performance
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
};

function classify(rate) {
  if (rate >= 0.8) return "STRONG";
  if (rate >= 0.6) return "WEAK";
  return "BROKEN";
}

export async function GET(request) {
  const rl = rateLimit(request, { keyPrefix: "analytics:get", limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || "365");
  const from = startOfDay(subDays(new Date(), Math.max(1, Math.min(days, 365)) - 1));
  const to = endOfDay(new Date());

  // Parallel fetch all data at once for speed
  const [habits, entries, streaks] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, frequency: true },
    }),
    prisma.habitEntry.findMany({
      where: {
        habit: { userId: session.user.id },
        date: { gte: from, lte: to },
      },
      select: { habitId: true, date: true, status: true },
    }),
    prisma.streak.findMany({
      where: { habit: { userId: session.user.id } },
      select: { habitId: true, currentStreak: true, longestStreak: true },
    }),
  ]);
  
  const streakMap = new Map(streaks.map((s) => [s.habitId, s]));

  // Daily completion rate across all habits.
  const dateMap = new Map();
  const habitCount = habits.length || 1;

  for (const e of entries) {
    const ymd = formatISO(e.date, { representation: "date" });
    const cur = dateMap.get(ymd) || { completed: 0, total: 0 };
    cur.total += 1;
    if (e.status === "COMPLETED") cur.completed += 1;
    dateMap.set(ymd, cur);
  }

  // Fill missing days: treat missing entries as missed.
  const daily = [];
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(new Date(), days - 1 - i));
    const ymd = formatISO(d, { representation: "date" });
    const cur = dateMap.get(ymd);
    const completed = cur?.completed || 0;
    const rate = habitCount === 0 ? 0 : completed / habitCount;
    daily.push({ date: ymd, completionRate: rate });
  }

  // Per-habit completion rate over window.
  const byHabit = new Map();
  for (const h of habits) byHabit.set(h.id, { completed: 0, total: 0 });
  for (const e of entries) {
    const cur = byHabit.get(e.habitId);
    if (!cur) continue;
    cur.total += 1;
    if (e.status === "COMPLETED") cur.completed += 1;
  }

  const perHabit = habits.map((h) => {
    const counts = byHabit.get(h.id) || { completed: 0, total: 0 };
    const rate = counts.total ? counts.completed / counts.total : 0;
    const s = streakMap.get(h.id) || { currentStreak: 0, longestStreak: 0 };
    return {
      habitId: h.id,
      title: h.title,
      frequency: h.frequency,
      completionRate: rate,
      classification: classify(rate),
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
    };
  });

  const today = daily[daily.length - 1];

  return NextResponse.json({
    daily,
    perHabit,
    stats: {
      totalHabits: habits.length,
      completionToday: today?.completionRate || 0,
    },
  });
}
