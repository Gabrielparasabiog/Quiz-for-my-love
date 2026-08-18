export type Choice = {
  id: string;
  label: string;
};

export type QuizQuestion = {
  id: string;
  category: string;
  prompt: string;
  choices: Choice[];
  correctChoiceId: string;
  lockChoiceOrder?: boolean;
};

export type VerseCard = {
  reference: string;
  text: string;
  note: string;
  theme: 'courage' | 'wisdom' | 'perseverance' | 'peace' | 'discipline' | 'hope' | 'faith';
};

export type QuizStats = {
  totalQuestions: number;
  mastered: number;
  remaining: number;
  attempts: number;
  retries: number;
  firstAttempted: number;
  firstAttemptCorrect: number;
  firstAttemptAccuracy: number;
  streak: number;
  bestStreak: number;
};

export type PresentedQuestion = {
  question: QuizQuestion;
  choices: Choice[];
};

export type AnswerOutcome = 'correct' | 'incorrect' | 'timeout';

export type AnswerResult = {
  outcome: AnswerOutcome;
  questionId: string;
  presented: PresentedQuestion;
  selectedChoiceId?: string;
  stats: QuizStats;
  completed: boolean;
};
