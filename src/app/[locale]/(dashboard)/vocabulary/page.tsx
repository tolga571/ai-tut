"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FlagIcon } from "@/components/FlagIcon";

type Word = {
  id: string;
  word: string;
  translation: string;
  language: string;
  example: string | null;
  createdAt: string;
  reviewCount?: number;
  correctStreak?: number;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
};

export default function VocabularyPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ word: "", translation: "", language: "en", example: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/vocabulary")
      .then((r) => r.json())
      .then(setWords)
      .catch(() => toast.error("Failed to load vocabulary"))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.translation.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setWords((prev) => [created, ...prev]);
      setForm({ word: "", translation: "", language: "en", example: "" });
      setShowForm(false);
      toast.success("Word saved!");
    } catch {
      toast.error("Failed to save word");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = words.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.translation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-700">/</span>
          <h1 className="text-base sm:text-lg font-semibold truncate">📖 Vocabulary</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <Link
            href="/vocabulary/quiz"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-sm font-medium transition-all"
          >
            <span className="hidden sm:inline">Start Quiz</span>
            <span className="sm:hidden">Quiz</span>
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Word</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Add form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white">New Word</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Word / Phrase</label>
                <input
                  type="text"
                  value={form.word}
                  onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
                  placeholder="e.g. bonjour"
                  className="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Translation</label>
                <input
                  type="text"
                  value={form.translation}
                  onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))}
                  placeholder="e.g. hello"
                  className="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Language</label>
                <input
                  type="text"
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value.toLowerCase() }))}
                  placeholder="e.g. fr"
                  maxLength={5}
                  className="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Example sentence (optional)</label>
                <input
                  type="text"
                  value={form.example}
                  onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
                  placeholder="e.g. Bonjour, comment ça va?"
                  className="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2 text-white"
              >
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save Word
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Stats bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{words.length}</span> words saved
          </p>
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Word list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-4xl">📝</p>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {words.length === 0 ? "No words yet — add your first one!" : "No results for your search."}
            </p>
            {words.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                You can also save words directly from the AI chat.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="group relative bg-gray-50/80 dark:bg-gray-900/70 border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FlagIcon code={w.language} className="w-5 h-4" />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-snug">
                        {w.word}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {w.translation}
                    </p>
                    {w.example && (
                      <div className="mt-2 rounded-xl bg-white/70 dark:bg-black/20 px-3 py-2 border border-gray-200/80 dark:border-white/5">
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                          &ldquo;{w.example}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deleting === w.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 text-gray-400 hover:text-red-400 transition-all flex-shrink-0 disabled:opacity-50"
                  >
                    {deleting === w.id ? (
                      <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin block" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-600">
                  <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                  {typeof w.reviewCount === "number" && w.reviewCount > 0 && (
                    <span>
                      {w.reviewCount} review{w.reviewCount > 1 ? "s" : ""} · streak {w.correctStreak ?? 0}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
