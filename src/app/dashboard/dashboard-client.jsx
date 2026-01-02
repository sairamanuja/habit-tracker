"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { formatISO, subDays } from "date-fns";
import { 
  MoreHorizontal, 
  Flame, 
  Trophy, 
  Target, 
  Zap, 
  Star, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Circle,
  XCircle,
  Award,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import HabitFormDialog from "@/components/habits/habit-form-dialog";
import YearHeatmap from "@/components/heatmap/year-heatmap";
import TrendChart from "@/components/charts/trend-chart";

const STATUSES = ["COMPLETED", "PARTIAL", "MISSED"];

function todayYmd() {
  return formatISO(new Date(), { representation: "date" });
}

// Fast fetcher with timeout
const fetcher = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

async function deleteJson(url) {
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function HabitsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

const MOTIVATIONAL_QUOTES = [
  { min: 0, max: 25, quote: "Every master was once a disaster. Start today! 💪", icon: "🌱" },
  { min: 25, max: 50, quote: "You're building momentum. Keep pushing! 🔥", icon: "⚡" },
  { min: 50, max: 75, quote: "Halfway there! You're on fire! 🎯", icon: "🔥" },
  { min: 75, max: 90, quote: "Almost perfect! You're crushing it! 🏆", icon: "⭐" },
  { min: 90, max: 101, quote: "LEGENDARY! You're unstoppable! 👑", icon: "🚀" },
];

function getMotivationalQuote(percentage) {
  return MOTIVATIONAL_QUOTES.find(q => percentage >= q.min && percentage <= q.max) || MOTIVATIONAL_QUOTES[0];
}

function StreakBadge({ streak, label, color = "orange" }) {
  const colors = {
    orange: "from-orange-500 to-red-500",
    blue: "from-blue-500 to-purple-500",
    green: "from-green-500 to-emerald-500",
    gold: "from-yellow-400 to-orange-500",
  };

  return (
    <div className={`relative flex items-center gap-2 rounded-xl bg-gradient-to-r ${colors[color]} p-3 text-white shadow-lg`}>
      <div className="animate-pulse">
        <Flame className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-black">{streak}</div>
        <div className="text-xs opacity-90">{label}</div>
      </div>
    </div>
  );
}

function XPProgressBar({ current, max, level }) {
  const percentage = Math.min((current / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 font-semibold text-purple-300">
          <Star className="h-4 w-4 fill-purple-300" />
          Level {level}
        </span>
        <span className="text-white/70">{current}/{max} XP</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, gradient }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-xl transition-transform hover:scale-105`}>
      <div className="absolute -right-4 -top-4 opacity-20">
        <Icon className="h-20 w-20" />
      </div>
      <div className="relative">
        <div className="text-3xl font-black">{value}</div>
        <div className="text-sm font-medium opacity-90">{label}</div>
        {subValue && (
          <div className="mt-1 flex items-center gap-1 text-xs opacity-80">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

function HabitCard({ habit, onStatusChange, onEdit, onDelete, saving }) {
  const statusConfig = {
    COMPLETED: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10 border-green-500/30",
      glow: "shadow-green-500/20",
    },
    PARTIAL: {
      icon: Circle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10 border-yellow-500/30",
      glow: "shadow-yellow-500/20",
    },
    MISSED: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10 border-red-500/30",
      glow: "shadow-red-500/20",
    },
  };

  const colorConfig = {
    primary: "from-blue-500 to-cyan-500",
    secondary: "from-purple-500 to-pink-500",
    tertiary: "from-orange-500 to-yellow-500",
  };

  const config = statusConfig[habit.status] || statusConfig.MISSED;
  const StatusIcon = config.icon;
  const gradientColor = colorConfig[habit.color] || colorConfig.primary;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border-2 ${config.bg} p-4 shadow-lg ${config.glow} transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}>
      <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${gradientColor}`} />
      
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onStatusChange(habit)}
              disabled={saving}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bg} transition-transform hover:scale-110`}
            >
              <StatusIcon className={`h-6 w-6 ${config.color}`} />
            </button>
            <div>
              <h3 className="font-bold text-lg">{habit.title}</h3>
              {habit.description && (
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{habit.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`bg-gradient-to-r ${gradientColor} text-white border-0`}>
            {habit.frequency}
          </Badge>
          
          {habit.currentStreak > 0 && (
            <Badge variant="outline" className="border-orange-500/50 text-orange-500 gap-1">
              <Flame className="h-3 w-3" />
              {habit.currentStreak}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={saving} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(habit)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(habit)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function AchievementBadge({ title, description, icon: Icon, unlocked, gradient }) {
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all ${unlocked ? `bg-gradient-to-r ${gradient} text-white shadow-lg` : "bg-muted/30 opacity-50 grayscale"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${unlocked ? "bg-white/20" : "bg-muted"}`}>
        <Icon className={`h-5 w-5 ${unlocked ? "text-white" : "text-muted-foreground"}`} />
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className={`text-xs ${unlocked ? "opacity-80" : "text-muted-foreground"}`}>{description}</div>
      </div>
      {unlocked && (
        <Sparkles className="absolute right-2 top-2 h-4 w-4 animate-pulse" />
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  const ranks = {
    bronze: { label: "Bronze", gradient: "from-amber-700 to-amber-900", icon: Award },
    silver: { label: "Silver", gradient: "from-gray-300 to-gray-500", icon: Award },
    gold: { label: "Gold", gradient: "from-yellow-400 to-amber-500", icon: Trophy },
    platinum: { label: "Platinum", gradient: "from-cyan-300 to-blue-400", icon: Trophy },
    diamond: { label: "Diamond", gradient: "from-purple-400 to-pink-500", icon: Crown },
    legend: { label: "Legend", gradient: "from-orange-500 via-red-500 to-purple-500", icon: Crown },
  };

  const config = ranks[rank] || ranks.bronze;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${config.gradient} px-4 py-2 text-white shadow-lg`}>
      <Icon className="h-5 w-5" />
      <span className="font-bold">{config.label}</span>
    </div>
  );
}

function calculateRank(completionRate, totalDays) {
  if (completionRate >= 0.95 && totalDays >= 100) return "legend";
  if (completionRate >= 0.9 && totalDays >= 60) return "diamond";
  if (completionRate >= 0.8 && totalDays >= 30) return "platinum";
  if (completionRate >= 0.7 && totalDays >= 14) return "gold";
  if (completionRate >= 0.5 && totalDays >= 7) return "silver";
  return "bronze";
}

function calculateXP(analytics, habits) {
  // Calculate from habits' completed status or analytics
  const completedCount = habits?.filter(h => h.status === "COMPLETED").length || 0;
  const analyticsCompleted = analytics?.perHabit?.reduce((sum, h) => sum + (h.completedCount || 0), 0) || 0;
  const totalXP = (analyticsCompleted + completedCount) * 10;
  const level = Math.floor(totalXP / 500) + 1;
  const currentLevelXP = totalXP % 500;
  
  return { current: currentLevelXP, max: 500, level, totalXP };
}

function calculateMaxStreak(analytics, habits) {
  // Try from habits first, then analytics
  const habitsMax = habits?.length ? Math.max(...habits.map(h => h.longestStreak || 0), 0) : 0;
  const analyticsMax = analytics?.perHabit?.length ? Math.max(...analytics.perHabit.map(h => h.longestStreak || 0), 0) : 0;
  return Math.max(habitsMax, analyticsMax);
}

function calculateCurrentStreak(analytics, habits) {
  // Try from habits first, then analytics
  const habitsCurrent = habits?.length ? Math.max(...habits.map(h => h.currentStreak || 0), 0) : 0;
  const analyticsCurrent = analytics?.perHabit?.length ? Math.max(...analytics.perHabit.map(h => h.currentStreak || 0), 0) : 0;
  return Math.max(habitsCurrent, analyticsCurrent);
}

export default function DashboardClient() {
  const [date, setDate] = useState(todayYmd());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  // SWR for habits - revalidates on focus, with deduplication
  const { 
    data: habitsData, 
    error: habitsError, 
    isLoading: habitsLoading,
    mutate: mutateHabits 
  } = useSWR(
    `/api/habits?date=${encodeURIComponent(date)}`,
    fetcher,
    { 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      refreshInterval: 0,
      keepPreviousData: true,
    }
  );

  // SWR for analytics - revalidate after mutations
  const { 
    data: analytics, 
    error: analyticsError,
    isLoading: analyticsLoading,
    mutate: mutateAnalytics 
  } = useSWR(
    '/api/analytics?days=365',
    fetcher,
    { 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      refreshInterval: 0,
      keepPreviousData: true,
    }
  );

  const habits = habitsData?.habits || [];
  const loading = habitsLoading || analyticsLoading;
  const fetchError = habitsError?.message || analyticsError?.message || error;

  // Refresh all data - force revalidation from server
  const refreshAll = useCallback(async () => {
    setError("");
    await Promise.all([
      mutateHabits(undefined, { revalidate: true }),
      mutateAnalytics(undefined, { revalidate: true })
    ]);
  }, [mutateHabits, mutateAnalytics]);

  // Optimistic update for status changes
  async function setStatus(habitId, nextStatus) {
    setSaving(true);
    setError("");
    
    // Optimistic update
    mutateHabits(
      (current) => ({
        ...current,
        habits: current?.habits?.map((h) => 
          h.id === habitId ? { ...h, status: nextStatus } : h
        ) || [],
      }),
      { revalidate: false }
    );

    try {
      await postJson("/api/entries", { habitId, date, status: nextStatus });
      // Force revalidate both after success
      await Promise.all([
        mutateHabits(undefined, { revalidate: true }),
        mutateAnalytics(undefined, { revalidate: true })
      ]);
    } catch (e) {
      // Revert on error - force fetch fresh data
      await mutateHabits(undefined, { revalidate: true });
      setError(e?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHabit(habit) {
    const ok = window.confirm(`Delete habit "${habit.title}"? This removes its history too.`);
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      await deleteJson(`/api/habits/${habit.id}`);
      await refreshAll();
    } catch (e) {
      setError(e?.message || "Failed to delete habit");
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
    const slice = analytics.daily.slice(-30);
    return slice.map((d) => ({ date: d.date, pct: Math.round(d.completionRate * 100) }));
  }, [analytics]);

  // Calculate today's completion from current habits state (more accurate)
  const todayCompletion = useMemo(() => {
    if (!habits.length) return 0;
    const completed = habits.filter(h => h.status === "COMPLETED").length;
    return Math.round((completed / habits.length) * 100);
  }, [habits]);

  const quote = getMotivationalQuote(todayCompletion);
  const xpData = calculateXP(analytics, habits);
  const maxStreak = calculateMaxStreak(analytics, habits);
  const currentStreak = calculateCurrentStreak(analytics, habits);
  const totalHabits = analytics?.stats?.totalHabits ?? habits.length;
  const rank = calculateRank(todayCompletion / 100, analytics?.daily?.length ?? 0);

  const achievements = [
    { 
      title: "First Step", 
      description: "Create your first habit", 
      icon: Target, 
      unlocked: totalHabits >= 1,
      gradient: "from-green-500 to-emerald-600"
    },
    { 
      title: "Habit Master", 
      description: "Track 5 habits", 
      icon: Trophy, 
      unlocked: totalHabits >= 5,
      gradient: "from-yellow-500 to-orange-500"
    },
    { 
      title: "Week Warrior", 
      description: "7 day streak", 
      icon: Flame, 
      unlocked: maxStreak >= 7,
      gradient: "from-orange-500 to-red-500"
    },
    { 
      title: "Month Master", 
      description: "30 day streak", 
      icon: Crown, 
      unlocked: maxStreak >= 30,
      gradient: "from-purple-500 to-pink-500"
    },
  ];

  return (
    <div className="space-y-6">
      <HabitFormDialog
        mode="edit"
        habit={editingHabit}
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) setEditingHabit(null);
        }}
        trigger={null}
        onSaved={() => refreshAll()}
      />

      {fetchError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {fetchError} <button className="underline ml-2" onClick={() => refreshAll()}>Retry</button>
        </div>
      )}

      {/* Hero Section with Motivation */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-4xl">{quote.icon}</span>
              <h1 className="text-3xl font-black">Dashboard</h1>
            </div>
            <p className="text-lg opacity-90">{quote.quote}</p>
            <div className="flex items-center gap-3 pt-2">
              <RankBadge rank={rank} />
              <Badge className="bg-white/20 text-white border-0 backdrop-blur">
                <Zap className="h-3 w-3 mr-1" />
                {xpData.totalXP} Total XP
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-3">
            <StreakBadge streak={currentStreak} label="Current Streak" color="orange" />
            <StreakBadge streak={maxStreak} label="Best Streak" color="gold" />
          </div>
        </div>

        <div className="relative mt-6">
          <XPProgressBar current={xpData.current} max={xpData.max} level={xpData.level} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard 
          icon={Target} 
          label="Total Habits" 
          value={totalHabits}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Today's Progress" 
          value={`${todayCompletion}%`}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard 
          icon={Flame} 
          label="Current Streak" 
          value={currentStreak}
          subValue="days strong"
          gradient="from-orange-500 to-red-500"
        />
        <StatCard 
          icon={Trophy} 
          label="Best Streak" 
          value={maxStreak}
          subValue="personal best"
          gradient="from-yellow-500 to-amber-500"
        />
      </div>

      {/* Yearly Heatmap */}
      <Card className="border-2 border-border/50 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Yearly Progress
            </CardTitle>
            <CardDescription>GitHub-style activity heatmap</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const d = formatISO(subDays(new Date(date), 1), { representation: "date" });
                setDate(d);
                refreshAll(d);
              }}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                refreshAll(e.target.value);
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const d = formatISO(subDays(new Date(date), -1), { representation: "date" });
                setDate(d);
                refreshAll(d);
              }}
              disabled={loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <YearHeatmap daily={analytics?.daily || []} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Habits */}
        <Card className="lg:col-span-2 border-2 border-border/50 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Today&apos;s Habits
              </CardTitle>
              <CardDescription>Click the icon to cycle status</CardDescription>
            </div>
            <HabitFormDialog 
              onCreated={() => refreshAll()} 
              trigger={<Button size="sm" className="gap-1"><Target className="h-4 w-4" /> Add Habit</Button>}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <HabitsSkeleton />
            ) : habits.length ? (
              habits.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  onStatusChange={(habit) => setStatus(habit.id, nextStatus(habit.status))}
                  onEdit={(habit) => {
                    setEditingHabit(habit);
                    setEditOpen(true);
                  }}
                  onDelete={deleteHabit}
                  saving={saving}
                />
              ))
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-8 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No habits yet. Create one to start your journey!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* 30-Day Trend */}
          <Card className="border-2 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                30-Day Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="h-40">
                  <TrendChart data={trendData} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="border-2 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Achievements
              </CardTitle>
              <CardDescription>Unlock badges by building habits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {achievements.map((a, i) => (
                <AchievementBadge key={i} {...a} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Habit Insights - LeetCode Style Leaderboard */}
      <Card className="border-2 border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Habit Leaderboard
          </CardTitle>
          <CardDescription>Your habits ranked by performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.perHabit?.length ? (
              [...analytics.perHabit]
                .sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0))
                .map((h, index) => {
                  const completionPct = Math.round((h.completionRate || 0) * 100);
                  const isTopThree = index < 3;
                  const medals = ["🥇", "🥈", "🥉"];
                  
                  return (
                    <div 
                      key={h.habitId} 
                      className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-lg ${isTopThree ? "bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent border-yellow-500/30" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold">
                          {isTopThree ? medals[index] : `#${index + 1}`}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold truncate">{h.title}</span>
                            {h.currentStreak > 0 && (
                              <Badge variant="outline" className="border-orange-500/50 text-orange-500 gap-1">
                                <Flame className="h-3 w-3" />
                                {h.currentStreak}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${completionPct >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-400" : completionPct >= 50 ? "bg-gradient-to-r from-yellow-500 to-orange-400" : "bg-gradient-to-r from-red-500 to-pink-400"}`}
                                style={{ width: `${completionPct}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${completionPct >= 80 ? "text-green-500" : completionPct >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                              {completionPct}%
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Best: {h.longestStreak} days</span>
                            <span>•</span>
                            <span className={`font-medium ${h.classification === "STRONG" ? "text-green-500" : h.classification === "WEAK" ? "text-red-500" : "text-yellow-500"}`}>
                              {h.classification}
                            </span>
                          </div>
                        </div>

                        <Badge className={h.classification === "STRONG" ? "bg-green-500/20 text-green-400 border-green-500/30" : h.classification === "WEAK" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
                          {h.classification === "STRONG" ? "💪 Strong" : h.classification === "WEAK" ? "⚠️ Needs Work" : "🔄 Building"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Complete some habits to see your leaderboard!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
