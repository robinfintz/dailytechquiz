"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomeClient() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.quiz?.briefing) setBriefing(data.quiz.briefing);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const bullets =
    briefing
      ?.split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <main className="min-h-screen flex flex-col items-center p-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2 mt-8">
        Daily Tech Drill
      </h1>
      <p className="text-zinc-400 mb-6 text-center">
        5 MCQs from today&apos;s tech news. No essays. Just reps.
      </p>

      {loading ? (
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin my-4" />
      ) : bullets.length > 0 ? (
        <div className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-5 mb-6 text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500/90 mb-3">
            Today&apos;s summary
          </h2>
          <ul className="space-y-2 text-zinc-300 text-sm leading-relaxed">
            {bullets.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500/80 shrink-0">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-zinc-500 text-sm mb-6 text-center">
          No drill yet today. Run the generator or check back later.
        </p>
      )}

      <Link
        href="/today"
        className="px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
      >
        Today&apos;s Drill →
      </Link>
    </main>
  );
}
