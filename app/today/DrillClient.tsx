"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STREAK_KEY = "tech-drill-streak";
const LAST_DATE_KEY = "tech-drill-last-date";
const ACCURACY_KEY = "tech-drill-accuracy"; // store as "totalCorrect,totalQuestions"

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface TodayData {
  quiz: { id: string; date: string; briefing?: string | null };
  questions: Question[];
}

function getStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10);
}

function getAccuracy(): { avg: number; totalCorrect: number; totalQuestions: number } {
  if (typeof window === "undefined") return { avg: 0, totalCorrect: 0, totalQuestions: 0 };
  const raw = localStorage.getItem(ACCURACY_KEY) ?? "0,0";
  const [totalCorrect, totalQuestions] = raw.split(",").map((n) => parseInt(n, 10) || 0);
  const avg = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  return { avg, totalCorrect, totalQuestions };
}

function updateStreak(today: string): void {
  const last = localStorage.getItem(LAST_DATE_KEY);
  let streak = getStreak();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (last === yesterdayStr) streak += 1;
  else if (last !== today) streak = 1;
  localStorage.setItem(LAST_DATE_KEY, today);
  localStorage.setItem(STREAK_KEY, String(streak));
}

function updateAccuracy(correct: number, total: number): void {
  const raw = localStorage.getItem(ACCURACY_KEY) ?? "0,0";
  const [c, t] = raw.split(",").map((n) => parseInt(n, 10) || 0);
  localStorage.setItem(ACCURACY_KEY, `${c + correct},${t + total}`);
}

export function DrillClient() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [missedQuestions, setMissedQuestions] = useState<string[]>([]);

  useEffect(() => {
    setStreak(getStreak());
    setAccuracy(getAccuracy().avg);
  }, []);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => {
        if (r.status === 404) throw new Error("No quiz for today");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    const q = data!.questions[index];
    if (i === q.correctIndex) setScore((s) => s + 1);
    else setMissedQuestions((m) => [...m, q.question]);
  };

  const handleNext = () => {
    if (index + 1 >= data!.questions.length) {
      setDone(true);
      if (data?.quiz?.date) updateStreak(data.quiz.date);
      updateAccuracy(score + (selected === data!.questions[index].correctIndex ? 1 : 0), data!.questions.length);
      if (!submitted && data?.quiz?.id) {
        const finalScore = score + (selected === data!.questions[index].correctIndex ? 1 : 0);
        setSubmitted(true);
        fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: data.quiz.id, score: finalScore }),
        }).catch(() => {});
      }
      setStreak(getStreak());
      setAccuracy(getAccuracy().avg);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        Loading today&apos;s drill...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-6 text-center">
        <p className="text-zinc-300 mb-4">
          {error === "No quiz for today"
            ? "No drill for today yet. Run the cron job or try again later."
            : error || "Failed to load quiz."}
        </p>
        <Link
          href="/"
          className="text-amber-500 hover:text-amber-400 text-sm font-medium"
        >
          ← Back home
        </Link>
      </div>
    );
  }

  if (done) {
    const finalScore = score;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>🔥 {getStreak()} Day Streak</span>
          <span>📊 Avg Accuracy: {getAccuracy().avg}%</span>
        </div>
        <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-2">Score: {finalScore}/5</h2>
          {missedQuestions.length > 0 && (
            <p className="text-zinc-400 text-sm mt-2">
              You missed: &quot;{missedQuestions[0].slice(0, 60)}{missedQuestions[0].length > 60 ? "…" : ""}&quot;
            </p>
          )}
          <p className="text-zinc-500 text-sm mt-4">Done in 3–4 minutes. Come back tomorrow.</p>
          <Link
            href="/"
            className="inline-block mt-4 text-amber-500 hover:text-amber-400 text-sm font-medium"
          >
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  const q = data.questions[index];
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="space-y-6">
      <p className="text-zinc-500 text-sm">
        Question {index + 1} / {data.questions.length}
      </p>
      <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-6">
        <p className="text-white font-medium mb-6">{q.question}</p>
        <ul className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isChosen = selected === i;
            let style = "bg-zinc-800 hover:bg-zinc-700 text-left";
            if (revealed) {
              if (isCorrect) style = "bg-green-900/50 border border-green-600 text-green-200";
              else if (isChosen && !isCorrect) style = "bg-red-900/50 border border-red-600 text-red-200";
              else style = "bg-zinc-800/50 text-zinc-500 cursor-default";
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelect(i)}
                  disabled={revealed}
                  className={`w-full px-4 py-3 rounded-lg transition text-sm ${style}`}
                >
                  <span className="font-mono text-zinc-500 mr-2">{labels[i]}.</span>
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
        {revealed && (
          <button
            type="button"
            onClick={handleNext}
            className="mt-6 w-full py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
          >
            {index + 1 >= data.questions.length ? "See results" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}
