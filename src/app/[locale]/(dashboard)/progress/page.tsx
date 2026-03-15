"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_COLORS: Record<string, string> = {
  A1: "bg-emerald-500",
  A2: "bg-green-500",
  B1: "bg-blue-500",
  B2: "bg-indigo-500",
  C1: "bg-purple-500",
  C2: "bg-pink-500",
};

type DayData = { date: string; messages: number; words: number };
type ProgressData = {
  days: DayData[];
  totalMessages7d: number;
  totalWords7d: number;
  correctionsReceived: number;
  xp: number;
  level: number;
  xpInLevel: number;
  cefrLevel: string;
  targetLang: string;
  memberSince: string | null;
};

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function BarChart({ days, field, color }: { days: DayData[]; field: "messages" | "words"; color: string }) {
  const max = Math.max(...days.map((d) => d[field]), 1);
  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {days.map((d) => {
        const height = Math.max((d[field] / max) * 100, d[field] > 0 ? 6 : 0);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 dark:text-gray-500">{d[field] > 0 ? d[field] : ""}</span>
            <div className="w-full rounded-t-sm flex items-end" style={{ height: "80px" }}>
              <div
                className={`w-full rounded-t-md transition-all duration-700 ${color}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDay(d.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/progress", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-gray-500">
        Failed to load progress.
      </div>
    );
  }

  const cefrIdx = CEFR_ORDER.indexOf(data.cefrLevel);
  const cefrPct = Math.round(((cefrIdx + 1) / CEFR_ORDER.length) * 100);
  const memberDays = data.memberSince
    ? Math.floor((Date.now() - new Date(data.memberSince).getTime()) / 86400000)
    : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <header className="px-4 sm:px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <h1 className="text-base sm:text-lg font-semibold">📊 My Progress</h1>
        <ThemeToggle />
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full space-y-6">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Messages (7d)", value: data.totalMessages7d, icon: "💬" },
            { label: "Words added (7d)", value: data.totalWords7d, icon: "📚" },
            { label: "Corrections", value: data.correctionsReceived, icon: "✏️" },
            { label: "Days learning", value: memberDays, icon: "📅" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* XP & Level */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Level</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.level}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
              <p className="text-3xl font-bold text-blue-500">{data.xp}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Level {data.level}</span>
              <span>{data.xpInLevel} / 100 XP</span>
              <span>Level {data.level + 1}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${data.xpInLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* CEFR Level */}
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">CEFR Level</h2>
            <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${CEFR_COLORS[data.cefrLevel] ?? "bg-gray-500"}`}>
              {data.cefrLevel}
            </span>
          </div>
          <div className="flex gap-1.5">
            {CEFR_ORDER.map((lvl, i) => (
              <div key={lvl} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full h-2.5 rounded-full transition-all ${
                    i <= cefrIdx ? (CEFR_COLORS[data.cefrLevel] ?? "bg-blue-500") : "bg-gray-200 dark:bg-white/10"
                  }`}
                />
                <span className={`text-[10px] font-medium ${i === cefrIdx ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                  {lvl}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            {cefrPct}% through CEFR scale · target language: <span className="text-gray-700 dark:text-gray-300 font-medium uppercase">{data.targetLang}</span>
          </p>
        </div>

        {/* Chat activity chart */}
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Messages — last 7 days</h2>
          <BarChart days={data.days} field="messages" color="bg-blue-500" />
        </div>

        {/* Vocabulary activity chart */}
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Words added — last 7 days</h2>
          <BarChart days={data.days} field="words" color="bg-emerald-500" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <Link
            href="/chat"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all"
          >
            💬 Practice now
          </Link>
          <Link
            href="/vocabulary"
            className="flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          >
            📚 Vocabulary
          </Link>
        </div>
      </div>
    </div>
  );
}
