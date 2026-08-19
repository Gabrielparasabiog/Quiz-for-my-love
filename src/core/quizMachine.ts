import type {
  AnswerResult,
  PresentedQuestion,
  QuestionReview,
  QuizQuestion,
  QuizStats,
} from '../types';
import type { RandomSource } from './shuffleBag';
import { validateQuestions } from './content';

type RetryEntry = {
  questionId: string;
  eligibleAtAttempt: number;
};

type QuestionRecord = {
  attempts: number;
  incorrectAttempts: number;
  selectedChoiceIds: string[];
};

export const MAX_ATTEMPTS_PER_QUESTION = 2;

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export class QuizMachine {
  private readonly questionsById = new Map<string, QuizQuestion>();
  private readonly questionIds: string[];
  private unseenIds: string[];
  private retries: RetryEntry[] = [];
  private masteredIds = new Set<string>();
  private exhaustedIds = new Set<string>();
  private readonly records = new Map<string, QuestionRecord>();
  private firstAttemptedIds = new Set<string>();
  private firstAttemptCorrect = 0;
  private attempts = 0;
  private retryCount = 0;
  private streak = 0;
  private bestStreak = 0;
  private current: PresentedQuestion | null = null;
  private readonly random: RandomSource;

  public constructor(questions: readonly QuizQuestion[], random: RandomSource = Math.random) {
    const errors = validateQuestions(questions);
    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    this.random = random;
    questions.forEach((question) => this.questionsById.set(question.id, question));
    this.questionIds = questions.map((question) => question.id);
    this.questionIds.forEach((questionId) => {
      this.records.set(questionId, { attempts: 0, incorrectAttempts: 0, selectedChoiceIds: [] });
    });
    this.unseenIds = shuffle(this.questionIds, this.random);
  }

  public start(): PresentedQuestion {
    if (this.current) {
      return this.current;
    }
    const next = this.pickNextId();
    if (!next) {
      throw new Error('The quiz has no remaining question.');
    }
    this.current = this.present(next);
    return this.current;
  }

  public get currentQuestion(): PresentedQuestion | null {
    return this.current;
  }

  public get pendingRetryCount(): number {
    return this.retries.length;
  }

  public get review(): QuestionReview[] {
    return this.questionIds
      .map((questionId) => {
        const record = this.getRecord(questionId);
        const mastered = this.masteredIds.has(questionId);
        return {
          question: this.questionsById.get(questionId) as QuizQuestion,
          attempts: record.attempts,
          incorrectAttempts: record.incorrectAttempts,
          selectedChoiceIds: [...record.selectedChoiceIds],
          mastered,
          status: mastered
            ? record.incorrectAttempts > 0
              ? 'corrected'
              : 'mastered'
            : 'not-mastered',
        } satisfies QuestionReview;
      })
      .sort((left, right) => {
        const leftMissed = left.incorrectAttempts > 0 ? 0 : 1;
        const rightMissed = right.incorrectAttempts > 0 ? 0 : 1;
        return leftMissed - rightMissed;
      });
  }

  public answer(choiceId: string): AnswerResult {
    if (!this.current) {
      throw new Error('There is no active question to answer.');
    }

    const presented = this.current;
    const isCorrect = choiceId === presented.question.correctChoiceId;
    const result = this.record(presented, isCorrect ? 'correct' : 'incorrect', choiceId);
    return result;
  }

  public timeout(): AnswerResult {
    if (!this.current) {
      throw new Error('There is no active question to time out.');
    }

    const presented = this.current;
    return this.record(presented, 'timeout');
  }

  public next(): PresentedQuestion | null {
    if (this.current) {
      throw new Error('Finish the current answer before moving on.');
    }

    const nextId = this.pickNextId();
    if (!nextId) {
      return null;
    }

    this.current = this.present(nextId);
    return this.current;
  }

  public get stats(): QuizStats {
    const totalQuestions = this.questionIds.length;
    const mastered = this.masteredIds.size;
    const reviewed = [...this.records.values()].filter((record) => record.incorrectAttempts > 0).length;
    const wrongAnswers = [...this.records.values()].reduce((total, record) => total + record.incorrectAttempts, 0);
    const mistakes = this.exhaustedIds.size;
    const settled = mastered + mistakes;
    const firstAttempted = this.firstAttemptedIds.size;
    return {
      totalQuestions,
      mastered,
      remaining: totalQuestions - settled,
      reviewed,
      mistakes,
      wrongAnswers,
      score: totalQuestions === 0 ? 0 : (mastered / totalQuestions) * 100,
      attempts: this.attempts,
      retries: this.retryCount,
      firstAttempted,
      firstAttemptCorrect: this.firstAttemptCorrect,
      firstAttemptAccuracy: firstAttempted === 0 ? 0 : (this.firstAttemptCorrect / firstAttempted) * 100,
      streak: this.streak,
      bestStreak: this.bestStreak,
    };
  }

  private record(
    presented: PresentedQuestion,
    outcome: 'correct' | 'incorrect' | 'timeout',
    selectedChoiceId?: string,
  ): AnswerResult {
    this.attempts += 1;
    const questionId = presented.question.id;
    const record = this.getRecord(questionId);
    const attemptNumber = record.attempts + 1;
    record.attempts = attemptNumber;
    if (selectedChoiceId) {
      record.selectedChoiceIds.push(selectedChoiceId);
    }
    const firstAttempt = !this.firstAttemptedIds.has(questionId);
    this.firstAttemptedIds.add(questionId);

    if (outcome === 'correct') {
      this.masteredIds.add(questionId);
      this.exhaustedIds.delete(questionId);
      this.retries = this.retries.filter((entry) => entry.questionId !== questionId);
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      if (firstAttempt) {
        this.firstAttemptCorrect += 1;
      }
    } else {
      record.incorrectAttempts += 1;
      this.retryCount += 1;
      this.streak = 0;
      this.retries = this.retries.filter((entry) => entry.questionId !== questionId);
      if (attemptNumber >= MAX_ATTEMPTS_PER_QUESTION) {
        this.exhaustedIds.add(questionId);
      } else {
        this.retries.push({ questionId, eligibleAtAttempt: this.attempts + 10 });
      }
    }

    this.current = null;
    const stats = this.stats;
    return {
      outcome,
      questionId,
      presented,
      selectedChoiceId,
      attemptNumber,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS_PER_QUESTION - attemptNumber),
      finalForQuestion: outcome === 'correct' || attemptNumber >= MAX_ATTEMPTS_PER_QUESTION,
      stats,
      completed: stats.remaining === 0,
    };
  }

  private getRecord(questionId: string): QuestionRecord {
    const record = this.records.get(questionId);
    if (!record) {
      throw new Error(`Question ${questionId} was not found.`);
    }
    return record;
  }

  private pickNextId(): string | null {
    const due = this.retries
      .filter((entry) => entry.eligibleAtAttempt <= this.attempts)
      .sort((left, right) => left.eligibleAtAttempt - right.eligibleAtAttempt);

    if (due.length > 0) {
      const selected = due[0];
      this.retries = this.retries.filter((entry) => entry !== selected);
      return selected.questionId;
    }

    const nextUnseen = this.unseenIds.shift();
    if (nextUnseen) {
      return nextUnseen;
    }

    if (this.retries.length > 0) {
      this.retries.sort((left, right) => left.eligibleAtAttempt - right.eligibleAtAttempt);
      return this.retries.shift()?.questionId ?? null;
    }

    return null;
  }

  private present(questionId: string): PresentedQuestion {
    const question = this.questionsById.get(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} was not found.`);
    }

    return {
      question,
      choices: question.lockChoiceOrder ? [...question.choices] : shuffle(question.choices, this.random),
    };
  }
}

export function choiceLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

export function formatAccuracy(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}
