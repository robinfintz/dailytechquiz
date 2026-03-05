import OpenAI from "openai";
import type { GeneratedQuizPayload, GeneratedQuestion } from "@/lib/types";

const systemPrompt = `You will receive tech news summaries. Return valid JSON with two keys:

1. "briefing": A bullet-point summary with exactly 8–10 bullets. Cover a range of topics from the articles: companies, products, deals, launches, AI/tech trends, partnerships, controversies. One topic per bullet. Start each bullet with a short phrase (e.g. "OpenAI: ..." or "Venture funding: ..."). Use newlines to separate bullets; do not use • or - in the text. No specific dollar amounts or percentages unless essential.

2. "questions": An array of EXACTLY 5 multiple choice questions. You MUST include 5 questions. Each question must:
- Be specific and factual
- Have 4 answer choices (options array) and exactly 1 correct answer (correctIndex 0–3)
- Avoid opinion or speculation
- Prefer conceptual questions: companies, products, strategies, partnerships, implications, who did what. Avoid questions that are mainly about specific numbers (funding amounts, percentages, exact counts) unless the number is central to the story.`;

export interface GenerateQuizResult {
  briefing: string | null;
  questions: GeneratedQuestion[];
}

async function callOpenai(summaries: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here are today's news summaries:\n\n${summaries}`,
      },
    ],
    response_format: { type: "json_object" },
  });
}

export async function generateMcqs(summaries: string): Promise<GenerateQuizResult> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const completion = await callOpenai(summaries);
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(raw) as {
      briefing?: string;
      questions?: GeneratedQuizPayload["questions"];
    };

    const qs = parsed.questions;
    if (!Array.isArray(qs) || qs.length < 5) {
      const count = Array.isArray(qs) ? qs.length : 0;
      if (attempt === 2) {
        console.error("[generateMcqs] Retry failed. Got", count, "questions.");
        throw new Error(`Invalid response: need 5 questions, got ${count}. Try again.`);
      }
      continue;
    }

  const briefing =
    typeof parsed.briefing === "string" && parsed.briefing.trim().length > 0
      ? parsed.briefing.trim()
      : null;

  const questions: GeneratedQuestion[] = qs.slice(0, 5).map((q) => {
    const rawIdx = Number(q.correctIndex);
    const correctIndex =
      Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx <= 3 ? rawIdx : 0;
    const options: [string, string, string, string] = Array.isArray(q.options)
      ? (q.options.slice(0, 4) as [string, string, string, string])
      : ["A", "B", "C", "D"];
    return {
      question: String(q.question ?? ""),
      options,
      correctIndex,
    };
  });

  return { briefing, questions };
  }
  throw new Error("Failed to generate 5 questions");
}
