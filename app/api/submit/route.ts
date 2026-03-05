import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { quizId, score } = body as { quizId?: string; score?: number };

  if (typeof quizId !== "string" || typeof score !== "number" || score < 0) {
    return NextResponse.json(
      { error: "Invalid body: quizId (string) and score (number) required" },
      { status: 400 }
    );
  }

  if (!supabase) {
    return NextResponse.json({ ok: true, saved: false });
  }

  const { error } = await supabase.from("attempts").insert({
    user_id: null,
    quiz_id: quizId,
    score: Math.min(5, Math.max(0, Math.round(score))),
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save attempt", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, saved: true });
}
