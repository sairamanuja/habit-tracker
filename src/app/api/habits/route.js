import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { createHabitSchema } from "@/lib/validators";
import { isBeforeToday, parseYmdToDate, todayYmd } from "@/lib/date";

// Cache headers for better performance
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
};

export async function GET(request) {
  const rl = rateLimit(request, { keyPrefix: "habits:get", limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayYmd();

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      entries: {
        where: { date: parseYmdToDate(date) },
        select: { status: true },
      },
      streak: {
        select: { currentStreak: true, longestStreak: true },
      },
    },
  });

  // Auto-create missed entries for past dates to keep analytics stable.
  if (isBeforeToday(date)) {
    const missing = habits.filter((h) => h.entries.length === 0);
    if (missing.length) {
      await prisma.habitEntry.createMany({
        data: missing.map((h) => ({
          habitId: h.id,
          date: parseYmdToDate(date),
          status: "MISSED",
        })),
        skipDuplicates: true,
      });

      // Re-fetch entries for accurate response
      const refreshed = await prisma.habit.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          entries: {
            where: { date: parseYmdToDate(date) },
            select: { status: true },
          },
          streak: {
            select: { currentStreak: true, longestStreak: true },
          },
        },
      });

      return NextResponse.json({
        date,
        habits: refreshed.map((h) => ({
          id: h.id,
          title: h.title,
          description: h.description,
          frequency: h.frequency,
          color: h.color,
          createdAt: h.createdAt,
          status: h.entries[0]?.status || null,
          currentStreak: h.streak?.currentStreak || 0,
          longestStreak: h.streak?.longestStreak || 0,
        })),
      });
    }
  }

  return NextResponse.json({
    date,
    habits: habits.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      frequency: h.frequency,
      color: h.color,
      createdAt: h.createdAt,
      status: h.entries[0]?.status || null,
      currentStreak: h.streak?.currentStreak || 0,
      longestStreak: h.streak?.longestStreak || 0,
    })),
  });
}

export async function POST(request) {
  const rl = rateLimit(request, { keyPrefix: "habits:post", limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = createHabitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const habit = await prisma.habit.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      frequency: parsed.data.frequency,
      color: parsed.data.color,
      streak: { create: {} },
    },
  });

  return NextResponse.json({ habit }, { status: 201 });
}
