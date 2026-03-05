import { NextRequest, NextResponse } from "next/server";
import { fetchAllNews, newsToSummaries } from "@/lib/feeds";
import { generateMcqs } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set in .env" },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const force = req.nextUrl.searchParams.get("force") === "true" || req.nextUrl.searchParams.get("force") === "1";

  try {
    if (supabase) {
      const { data: existing } = await supabase
        .from("quizzes")
        .select("id")
        .eq("date", today)
        .single();
      if (existing) {
        if (force) {
          await supabase.from("quizzes").delete().eq("id", existing.id);
        } else {
          return NextResponse.json({ ok: true, message: "Quiz already exists" });
        }
      }
    }

    const items = await fetchAllNews();
    const top5 = items.slice(0, 5);
    const summaries = newsToSummaries(top5);

    if (!summaries.trim()) {
      return NextResponse.json(
        { error: "No news items in last 24h; try again later or check RSS feeds" },
        { status: 500 }
      );
    }

    const { briefing, questions } = await generateMcqs(summaries);

    if (!supabase) {
      return NextResponse.json({
        ok: true,
        message: "No DB; quiz generated but not stored",
        briefing,
        questions,
      });
    }

    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .insert({ date: today, briefing: briefing ?? undefined })
      .select("id")
      .single();

    if (quizErr || !quiz) {
      return NextResponse.json(
        { error: "Failed to create quiz", detail: quizErr?.message },
        { status: 500 }
      );
    }

    const rows = questions.map((q) => ({
      quiz_id: quiz.id,
      question_text: q.question,
      option_a: q.options[0] ?? "",
      option_b: q.options[1] ?? "",
      option_c: q.options[2] ?? "",
      option_d: q.options[3] ?? "",
      correct_index: q.correctIndex,
    }));

    const { error: questionsErr } = await supabase.from("questions").insert(rows);
    if (questionsErr) {
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return NextResponse.json(
        { error: "Failed to save questions", detail: questionsErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, quizId: quiz.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/generate]", err);
    return NextResponse.json(
      { error: "Generate failed", detail: message },
      { status: 500 }
    );
  }
}
