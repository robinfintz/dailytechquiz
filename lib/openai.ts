import OpenAI from "openai";
import type { GeneratedQuizPayload, GeneratedQuestion } from "@/lib/types";

const systemPrompt = `You will receive tech news summaries.
Return ONLY valid JSON with exactly this shape (keys and types must match):
{
  "briefing": ["string", "string", "string", "string", "string", "string", "string", "string", "string", "string"],
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0
    }
  ]
}

Rules:
- "questions" MUST have EXACTLY 5 items.
- "briefing" MUST be an array with BETWEEN 10 and 15 strings.
- Each briefing string must be plain text with no leading "-" or "•" characters.
- Each briefing item should be a standalone tech/AI news summary, unrelated to the other items.
- Each briefing item should be 1-2 sentences maximum.
- Ensure diversity: avoid mentioning the same company or repeating similar information across briefing items. Each item must cover a distinct topic, company, or event.
- Prioritize variety in companies, technologies, and news angles to maximize uniqueness.
- Each question must be specific and factual and include 4 options with exactly 1 correct answer.
- "correctIndex" MUST be an integer from 0 to 3.
- Avoid opinion/speculation.
- Prefer conceptual questions (who did what, product/company/deal/launch/partnership/implications). Avoid number-chasing unless the number is central.`;

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
      briefing?: unknown;
      questions?: GeneratedQuizPayload["questions"];
    };

    const qs = parsed.questions;
    if (!Array.isArray(qs) || qs.length < 5) {
      const count = Array.isArray(qs) ? qs.length : 0;
      console.error("[generateMcqs] Invalid response. Got", count, "questions. Parsed keys:", Object.keys(parsed));
      console.error("[generateMcqs] Raw (truncated):", raw.slice(0, 2000));
      if (attempt === 2) {
        throw new Error(`Invalid response: need 5 questions, got ${count}. Try again.`);
      }
      continue;
    }

    const briefingLines: string[] = (() => {
      if (Array.isArray(parsed.briefing)) {
        return parsed.briefing
          .map((x) => (typeof x === "string" ? x : String(x)))
          .map((s) => s.trim())
          .map((s) => s.replace(/^[-•]\s*/, ""))
          .filter(Boolean);
      }

      if (typeof parsed.briefing === "string") {
        // Back-compat if the model still returns a single string.
        // Convert common bullet separators into newlines so we can count items reliably.
        const normalized = parsed.briefing.replace(/\r/g, "").trim();
        const withNewlines = normalized
          // "• item" style
          .replace(/•/g, "\n")
          // "- item" style when it appears at the start of a line
          .replace(/(^|\n)\s*-\s+/g, "\n");

        return withNewlines
          .split(/\n+/)
          .map((s) => s.trim())
          .map((s) => s.replace(/^[-•]\s*/, ""))
          .filter(Boolean);
      }

      return [];
    })();

    if (briefingLines.length < 10 || briefingLines.length > 15) {
      console.error(
        "[generateMcqs] Invalid response. Got",
        briefingLines.length,
        "briefing items (need 10-15). Parsed keys:",
        Object.keys(parsed)
      );
      console.error("[generateMcqs] Raw (truncated):", raw.slice(0, 2000));
      if (attempt === 2) {
        throw new Error(
          `Invalid response: need 10-15 briefing items, got ${briefingLines.length}. Try again.`
        );
      }
      continue;
    }

    const briefing = briefingLines.join("\n");

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
