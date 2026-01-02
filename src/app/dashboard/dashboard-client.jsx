"use client";

import { useEffect, useMemo, useState } from "react";
import { formatISO, subDays } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import HabitFormDialog from "@/components/habits/habit-form-dialog";
import YearHeatmap from "@/components/heatmap/year-heatmap";
import TrendChart from "@/components/charts/trend-chart";

const STATUSES = ["COMPLETED", "PARTIAL", "MISSED"];

function todayYmd() {
  return formatISO(new Date(), { representation: "date" });
}

function statusBadgeVariant(status) {
  if (status === "COMPLETED") return "default";
  if (status === "PARTIAL") return "secondary";
  return "outline";
}

export default function DashboardClient() {
  const [date, setDate] = useState(todayYmd());
  const [habits, setHabits] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const last30 = useMemo(() => 30, []);

  async function refreshAll(nextDate = date) {
    setLoading(true);
    try {
      const [h, a] = await Promise.all([
        fetch(`/api/habits?date=${encodeURIComponent(nextDate)}`).then((r) => r.json()),
        fetch(`/api/analytics?days=365`).then((r) => r.json()),
      ]);
      setHabits(h.habits || []);
      setAnalytics(a);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(habitId, nextStatus) {
    setSaving(true);
    try {
      await fetch("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ habitId, date, status: nextStatus }),
      });

      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, status: nextStatus } : h)));
      await refreshAll(date);
    } finally {
      setSaving(false);
    }
  }

  function nextStatus(current) {
    const idx = STATUSES.indexOf(current);
    if (idx === -1) return STATUSES[0];
    return STATUSES[(idx + 1) % STATUSES.length];
  }

  const trendData = useMemo(() => {
    if (!analytics?.daily) return [];
    const slice = analytics.daily.slice(-last30);
    return slice.map((d) => ({ date: d.date, pct: Math.round(d.completionRate * 100) }));
  }, [analytics, last30]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Yearly progress</CardTitle>
            <CardDescription>GitHub-style completion intensity by day.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const d = formatISO(subDays(new Date(date), 1), { representation: "date" });
                setDate(d);
                refreshAll(d);
              }}
              disabled={loading}
            >
              Prev
            </Button>
            <input
              type="date"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                refreshAll(e.target.value);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const d = formatISO(subDays(new Date(date), -1), { representation: "date" });
                setDate(d);
                refreshAll(d);
              }}
              disabled={loading}
            >
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <YearHeatmap daily={analytics?.daily || []} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Today’s habits</CardTitle>
              <CardDescription>Click a status to cycle: completed → partial → missed.</CardDescription>
            </div>
            <HabitFormDialog onCreated={() => refreshAll(date)} />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : habits.length ? (
              habits.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium">{h.title}</div>
                      <Badge variant="outline">{h.frequency}</Badge>
                      <Badge variant="secondary">{h.color}</Badge>
                    </div>
                    {h.description ? (
                      <div className="truncate text-sm text-muted-foreground">{h.description}</div>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    disabled={saving}
                    onClick={() => setStatus(h.id, nextStatus(h.status))}
                    className="shrink-0"
                  >
                    <Badge variant={statusBadgeVariant(h.status)}>
                      {h.status ? h.status : "SET"}
                    </Badge>
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                No habits yet. Create one to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
            <CardDescription>Quick snapshot for motivation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Habits</div>
              <div className="font-semibold">{analytics?.stats?.totalHabits ?? 0}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="font-semibold">{Math.round((analytics?.stats?.completionToday ?? 0) * 100)}%</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium">30-day trend</div>
              <div className="mt-2 h-40">
                <TrendChart data={trendData} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Habit insights</CardTitle>
          <CardDescription>Completion rate and streaks per habit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics?.perHabit?.length ? (
            analytics.perHabit.map((h) => (
              <div key={h.habitId} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{h.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(h.completionRate * 100)}% • current {h.currentStreak} • best {h.longestStreak} • {h.classification}
                  </div>
                </div>
                <Badge variant={h.classification === "STRONG" ? "default" : h.classification === "WEAK" ? "secondary" : "outline"}>
                  {h.classification}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No analytics yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
