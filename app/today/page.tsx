import Link from "next/link";
import { DrillClient } from "./DrillClient";

export default function TodayPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white text-sm transition"
        >
          ← Daily Tech Drill
        </Link>
      </header>
      <DrillClient />
    </main>
  );
}
