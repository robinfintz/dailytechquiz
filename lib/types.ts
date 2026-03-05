export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
}

export interface Quiz {
  id: string;
  date: string;
  created_at: string;
  questions: QuizQuestion[];
}

export interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export interface GeneratedQuizPayload {
  questions: GeneratedQuestion[];
}

export interface Attempt {
  id: string;
  user_id: string | null;
  quiz_id: string;
  score: number;
  created_at: string;
}
