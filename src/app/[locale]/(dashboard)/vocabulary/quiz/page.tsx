"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type Word = { id: string; word: string; translation: string; language: string };
type Phase = "loading" | "empty" | "question" | "result" | "done";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function VocabularyQuizPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [queue, setQueue] = useState<Word[]>([]);
  const [current, setCurrent] = useState<Word | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    fetch("/api/vocabulary")
      .then((r) => r.json())
      .then((data: Word[]) => {
        setWords(data);
        if (data.length < 2) {
          setPhase("empty");
        } else {
          startQuiz(data);
        }
      })
      .catch(() => setPhase("empty"));
  }, []);

  const startQuiz = useCallback((data: Word[]) => {
    const shuffled = shuffle(data);
    setQueue(shuffled.slice(1));
    loadQuestion(shuffled[0], data);
    setScore({ correct: 0, total: 0 });
    setPhase("question");
  }, []);

  const loadQuestion = (word: Word, allWords: Word[]) => {
    setCurrent(word);
    setSelected(null);
    // 3 wrong choices from other words
    const others = shuffle(allWords.filter((w) => w.id !== word.id)).slice(0, 3);
    setChoices(shuffle([word.translation, ...others.map((o) => o.translation)]));
  };

  const handleChoice = (choice: string) => {
    if (selected !== null || !current) return;
    setSelected(choice);
    const correct = choice === current.translation;
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setPhase("result");
  };

  const handleNext = () => {
    if (queue.length === 0) {
      setPhase("done");
      return;
    }
    const [next, ...rest] = queue;
    setQueue(rest);
    loadQuestion(next, words);
    setPhase("question");
  };

  const handleRestart = () => startQuiz(words);

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <header className="px-4 sm:px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-3">
          <Link href="/vocabulary" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Vocabulary</span>
          </Link>
          <h1 className="text-base sm:text-lg font-semibold">🎯 Quiz</h1>
          <ThemeToggle />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
          <p className="text-5xl">📝</p>
          <p className="text-xl font-semibold">Not enough words yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">Add at least 2 words to your vocabulary list to start a quiz.</p>
          <Link href="/vocabulary" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all">
            Go to Vocabulary
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const pct = Math.round((score.correct / score.total) * 100);
    const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "👍" : "💪";
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <header className="px-4 sm:px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-3">
          <Link href="/vocabulary" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Vocabulary</span>
          </Link>
          <h1 className="text-base sm:text-lg font-semibold">🎯 Quiz Results</h1>
          <ThemeToggle />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
          <p className="text-6xl">{emoji}</p>
          <div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{pct}%</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {score.correct} / {score.total} correct
            </p>
          </div>
          <div className="w-full max-w-xs bg-gray-200 dark:bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all"
            >
              Try Again
            </button>
            <Link href="/vocabulary" className="px-6 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCorrect = selected === current?.translation;
  const progress = score.total / words.length;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <header className="px-4 sm:px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-3">
        <Link href="/vocabulary" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Vocabulary</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {score.total} / {words.length}
          </span>
          <div className="w-24 sm:w-32 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {/* Score */}
        <div className="flex gap-4 mb-8">
          <span className="text-sm text-green-500 font-semibold">✓ {score.correct}</span>
          <span className="text-sm text-red-400 font-semibold">✗ {score.total - score.correct}</span>
        </div>

        {/* Word card */}
        <div className="w-full text-center mb-8">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">What does this mean?</p>
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 dark:border-purple-500/20 rounded-2xl p-8">
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{current?.word}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider">{current?.language}</p>
          </div>
        </div>

        {/* Choices */}
        <div className="w-full grid grid-cols-1 gap-3">
          {choices.map((choice) => {
            let style = "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-gray-300";
            if (selected !== null) {
              if (choice === current?.translation) {
                style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300";
              } else if (choice === selected) {
                style = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300";
              } else {
                style = "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 opacity-50 text-gray-500 dark:text-gray-500";
              }
            }
            return (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                disabled={selected !== null}
                className={`w-full px-5 py-4 rounded-xl border-2 text-left font-medium transition-all ${style}`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {/* Feedback + Next */}
        {selected !== null && (
          <div className="mt-6 w-full space-y-3">
            <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${isCorrect ? "bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30" : "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"}`}>
              <span>{isCorrect ? "✓ Correct!" : `✗ The answer was: ${current?.translation}`}</span>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
            >
              {queue.length === 0 ? "See Results" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
