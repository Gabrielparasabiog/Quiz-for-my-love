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
  reviewed: number;
  mistakes: number;
  wrongAnswers: number;
  score: number;
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
  attemptNumber: number;
  attemptsRemaining: number;
  finalForQuestion: boolean;
  stats: QuizStats;
  completed: boolean;
};

export type QuestionReview = {
  question: QuizQuestion;
  attempts: number;
  incorrectAttempts: number;
  selectedChoiceIds: string[];
  mastered: boolean;
  status: 'mastered' | 'corrected' | 'not-mastered';
};
