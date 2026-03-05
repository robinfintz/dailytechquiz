import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { data: quiz, error: quizErr } = await supabase
    .from("quizzes")
    .select("id, date, created_at, briefing")
    .eq("date", today)
    .single();

  if (quizErr || !quiz) {
    return NextResponse.json(
      { error: "No quiz for today", code: "NO_QUIZ" },
      { status: 404 }
    );
  }

  const { data: questions, error: questionsErr } = await supabase
    .from("questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_index")
    .eq("quiz_id", quiz.id)
    .order("id", { ascending: true });

  if (questionsErr || !questions?.length) {
    return NextResponse.json(
      { error: "No questions for today" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      date: quiz.date,
      created_at: quiz.created_at,
      briefing: quiz.briefing ?? null,
    },
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question_text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctIndex: q.correct_index,
    })),
  });
}
