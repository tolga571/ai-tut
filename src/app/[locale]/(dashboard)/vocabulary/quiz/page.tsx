"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type Word = {
  id: string;
  word: string;
  translation: string;
  language: string;
  reviewCount?: number;
  correctStreak?: number;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
};

type QuizMode = "multiple-choice" | "fill-in-blank" | "matching";
type Phase = "loading" | "empty" | "mode-select" | "question" | "result" | "matching-play" | "done";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const QUIZ_MODES: { id: QuizMode; title: string; description: string; icon: string; minWords: number }[] = [
  { id: "multiple-choice", title: "Multiple Choice", description: "Pick the correct translation from 4 options", icon: "🎯", minWords: 2 },
  { id: "fill-in-blank", title: "Fill in the Blank", description: "Type the correct translation from memory", icon: "✏️", minWords: 2 },
  { id: "matching", title: "Matching Pairs", description: "Match words with their translations", icon: "🔗", minWords: 4 },
];

// ── Shared Header ──
function QuizHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="px-4 sm:px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-3">
      <Link href="/vocabulary" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Vocabulary</span>
      </Link>
      {children ?? <h1 className="text-base sm:text-lg font-semibold">{title}</h1>}
      <ThemeToggle />
    </header>
  );
}

// ── Results Screen ──
function ResultsScreen({ score, onRestart, onModeSelect }: { score: { correct: number; total: number }; onRestart: () => void; onModeSelect: () => void }) {
  const pct = Math.round((score.correct / score.total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "👍" : "💪";
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <QuizHeader title="Quiz Results" />
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
        <p className="text-6xl">{emoji}</p>
        <div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{pct}%</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{score.correct} / {score.total} correct</p>
        </div>
        <div className="w-full max-w-xs bg-gray-200 dark:bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onRestart} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all">
            Try Again
          </button>
          <button onClick={onModeSelect} className="px-6 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            Change Mode
          </button>
          <Link href="/vocabulary" className="px-6 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            Back to List
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VocabularyQuizPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<QuizMode>("multiple-choice");
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Multiple Choice state
  const [queue, setQueue] = useState<Word[]>([]);
  const [current, setCurrent] = useState<Word | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // Fill-in-blank state
  const [fillInput, setFillInput] = useState("");
  const [fillChecked, setFillChecked] = useState(false);

  // Matching state
  const [matchCards, setMatchCards] = useState<{ id: string; text: string; type: "word" | "translation"; wordId: string; matched: boolean }[]>([]);
  const [matchSelected, setMatchSelected] = useState<string | null>(null);
  const [matchErrors, setMatchErrors] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [matchTotal, setMatchTotal] = useState(0);

  useEffect(() => {
    fetch("/api/vocabulary")
      .then((r) => r.json())
      .then((data: Word[]) => {
        setWords(data);
        if (data.length < 2) {
          setPhase("empty");
        } else {
          setPhase("mode-select");
        }
      })
      .catch(() => setPhase("empty"));
  }, []);

  // ── Multiple Choice Logic ──
  const startMultipleChoice = useCallback((data: Word[]) => {
    const now = new Date();
    const due = data.filter((w) => !w.nextReviewAt || new Date(w.nextReviewAt) <= now);
    const base = due.length > 0 ? due : data;
    const shuffled = shuffle(base);
    setQueue(shuffled.slice(1));
    loadMCQuestion(shuffled[0], data);
    setScore({ correct: 0, total: 0 });
    setPhase("question");
  }, []);

  const loadMCQuestion = (word: Word, allWords: Word[]) => {
    setCurrent(word);
    setSelected(null);
    const others = shuffle(allWords.filter((w) => w.id !== word.id)).slice(0, 3);
    setChoices(shuffle([word.translation, ...others.map((o) => o.translation)]));
  };

  const handleMCChoice = (choice: string) => {
    if (selected !== null || !current) return;
    setSelected(choice);
    const correct = choice === current.translation;
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    fetch(`/api/vocabulary/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correct }),
    }).catch(() => {});
    setPhase("result");
  };

  const handleMCNext = () => {
    if (queue.length === 0) { setPhase("done"); return; }
    const [next, ...rest] = queue;
    setQueue(rest);
    loadMCQuestion(next, words);
    setPhase("question");
  };

  // ── Fill-in-Blank Logic ──
  const startFillInBlank = useCallback((data: Word[]) => {
    const now = new Date();
    const due = data.filter((w) => !w.nextReviewAt || new Date(w.nextReviewAt) <= now);
    const base = due.length > 0 ? due : data;
    const shuffled = shuffle(base);
    setQueue(shuffled.slice(1));
    setCurrent(shuffled[0]);
    setFillInput("");
    setFillChecked(false);
    setScore({ correct: 0, total: 0 });
    setPhase("question");
  }, []);

  const handleFillCheck = () => {
    if (!current || fillChecked) return;
    setFillChecked(true);
    const correct = fillInput.trim().toLowerCase() === current.translation.trim().toLowerCase();
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    fetch(`/api/vocabulary/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correct }),
    }).catch(() => {});
  };

  const handleFillNext = () => {
    if (queue.length === 0) { setPhase("done"); return; }
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setFillInput("");
    setFillChecked(false);
  };

  // ── Matching Logic ──
  const startMatching = useCallback((data: Word[]) => {
    const now = new Date();
    const due = data.filter((w) => !w.nextReviewAt || new Date(w.nextReviewAt) <= now);
    const base = due.length > 0 ? due : data;
    const pool = shuffle(base).slice(0, Math.min(6, base.length));
    const cards = shuffle([
      ...pool.map((w) => ({ id: `w-${w.id}`, text: w.word, type: "word" as const, wordId: w.id, matched: false })),
      ...pool.map((w) => ({ id: `t-${w.id}`, text: w.translation, type: "translation" as const, wordId: w.id, matched: false })),
    ]);
    setMatchCards(cards);
    setMatchSelected(null);
    setMatchErrors(0);
    setMatchedCount(0);
    setMatchTotal(pool.length);
    setScore({ correct: 0, total: 0 });
    setPhase("matching-play");
  }, []);

  const handleMatchSelect = (cardId: string) => {
    const card = matchCards.find((c) => c.id === cardId);
    if (!card || card.matched) return;

    if (!matchSelected) {
      setMatchSelected(cardId);
      return;
    }

    const firstCard = matchCards.find((c) => c.id === matchSelected);
    if (!firstCard || firstCard.id === cardId) {
      setMatchSelected(cardId);
      return;
    }

    // Must select one word + one translation
    if (firstCard.type === card.type) {
      setMatchSelected(cardId);
      return;
    }

    if (firstCard.wordId === card.wordId) {
      // Correct match
      setMatchCards((prev) =>
        prev.map((c) => (c.wordId === card.wordId ? { ...c, matched: true } : c))
      );
      setMatchedCount((prev) => prev + 1);
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      fetch(`/api/vocabulary/${card.wordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct: true }),
      }).catch(() => {});
      setMatchSelected(null);
    } else {
      // Wrong match
      setMatchErrors((prev) => prev + 1);
      setScore((s) => ({ ...s, total: s.total + 1 }));
      fetch(`/api/vocabulary/${firstCard.wordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct: false }),
      }).catch(() => {});
      setMatchSelected(null);
    }
  };

  useEffect(() => {
    if (phase === "matching-play" && matchedCount > 0 && matchedCount === matchTotal) {
      const timer = setTimeout(() => setPhase("done"), 800);
      return () => clearTimeout(timer);
    }
  }, [matchedCount, matchTotal, phase]);

  // ── Start Quiz by Mode ──
  const startQuiz = useCallback((quizMode: QuizMode) => {
    setMode(quizMode);
    if (quizMode === "multiple-choice") startMultipleChoice(words);
    else if (quizMode === "fill-in-blank") startFillInBlank(words);
    else if (quizMode === "matching") startMatching(words);
  }, [words, startMultipleChoice, startFillInBlank, startMatching]);

  const goToModeSelect = () => {
    setPhase("mode-select");
    setScore({ correct: 0, total: 0 });
  };

  // ── Loading ──
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Empty ──
  if (phase === "empty") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <QuizHeader title="Quiz" />
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

  // ── Done ──
  if (phase === "done") {
    return <ResultsScreen score={score} onRestart={() => startQuiz(mode)} onModeSelect={goToModeSelect} />;
  }

  // ── Mode Select ──
  if (phase === "mode-select") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <QuizHeader title="Choose Quiz Mode" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
          <div className="text-center mb-8">
            <p className="text-4xl mb-3">🧠</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Quiz</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {words.length} words available
            </p>
          </div>
          <div className="w-full space-y-3">
            {QUIZ_MODES.map((qm) => {
              const disabled = words.length < qm.minWords;
              return (
                <button
                  key={qm.id}
                  onClick={() => !disabled && startQuiz(qm.id)}
                  disabled={disabled}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${
                    disabled
                      ? "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 opacity-50 cursor-not-allowed"
                      : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{qm.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{qm.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{qm.description}</p>
                      {disabled && (
                        <p className="text-xs text-amber-500 mt-1">Requires at least {qm.minWords} words</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Matching Play ──
  if (phase === "matching-play") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <QuizHeader title="Matching Pairs">
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-500 font-semibold">Matched: {matchedCount}/{matchTotal}</span>
            <span className="text-xs text-red-400 font-semibold">Errors: {matchErrors}</span>
          </div>
        </QuizHeader>
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-6">Tap a word, then tap its translation</p>
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3">
            {matchCards.map((card) => {
              const isSelected = matchSelected === card.id;
              let cardStyle = "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300";
              if (card.matched) {
                cardStyle = "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300 opacity-60";
              } else if (isSelected) {
                cardStyle = "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30";
              } else {
                cardStyle += " hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10";
              }
              return (
                <button
                  key={card.id}
                  onClick={() => handleMatchSelect(card.id)}
                  disabled={card.matched}
                  className={`px-4 py-3 rounded-xl border-2 text-center font-medium transition-all ${cardStyle}`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">
                    {card.type === "word" ? "Word" : "Translation"}
                  </span>
                  {card.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Multiple Choice / Fill-in-Blank Question ──
  const mcIsCorrect = selected === current?.translation;
  const fillIsCorrect = fillInput.trim().toLowerCase() === (current?.translation ?? "").trim().toLowerCase();
  const progressVal = score.total / words.length;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <QuizHeader title={mode === "multiple-choice" ? "Multiple Choice" : "Fill in the Blank"}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {score.total} / {words.length}
          </span>
          <div className="w-24 sm:w-32 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressVal * 100}%` }}
            />
          </div>
        </div>
      </QuizHeader>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {/* Score */}
        <div className="flex gap-4 mb-8">
          <span className="text-sm text-green-500 font-semibold">✓ {score.correct}</span>
          <span className="text-sm text-red-400 font-semibold">✗ {score.total - score.correct}</span>
        </div>

        {/* Word card */}
        <div className="w-full text-center mb-8">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            {mode === "fill-in-blank" ? "Type the translation" : "What does this mean?"}
          </p>
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 dark:border-purple-500/20 rounded-2xl p-8">
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{current?.word}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider">{current?.language}</p>
          </div>
        </div>

        {/* Multiple Choice */}
        {mode === "multiple-choice" && (
          <>
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
                    onClick={() => handleMCChoice(choice)}
                    disabled={selected !== null}
                    className={`w-full px-5 py-4 rounded-xl border-2 text-left font-medium transition-all ${style}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <div className="mt-6 w-full space-y-3">
                <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${mcIsCorrect ? "bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30" : "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"}`}>
                  <span>{mcIsCorrect ? "✓ Correct!" : `✗ The answer was: ${current?.translation}`}</span>
                </div>
                <button onClick={handleMCNext} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all">
                  {queue.length === 0 ? "See Results" : "Next →"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Fill-in-Blank */}
        {mode === "fill-in-blank" && (
          <>
            <div className="w-full space-y-3">
              <input
                type="text"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !fillChecked && fillInput.trim()) handleFillCheck();
                  else if (e.key === "Enter" && fillChecked) handleFillNext();
                }}
                placeholder="Type the translation..."
                disabled={fillChecked}
                autoFocus
                className={`w-full px-5 py-4 rounded-xl border-2 text-center text-lg font-medium transition-all outline-none ${
                  fillChecked
                    ? fillIsCorrect
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300"
                      : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                }`}
              />
              {!fillChecked ? (
                <button
                  onClick={handleFillCheck}
                  disabled={!fillInput.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all disabled:opacity-40"
                >
                  Check
                </button>
              ) : (
                <div className="space-y-3">
                  <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${fillIsCorrect ? "bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30" : "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"}`}>
                    <span>{fillIsCorrect ? "✓ Correct!" : `✗ The answer was: ${current?.translation}`}</span>
                  </div>
                  <button onClick={handleFillNext} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all">
                    {queue.length === 0 ? "See Results" : "Next →"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
