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

export type QuizMachineSnapshot = {
  version: 1;
  questionIds: string[];
  unseenIds: string[];
  retries: RetryEntry[];
  masteredIds: string[];
  exhaustedIds: string[];
  records: Array<QuestionRecord & { questionId: string }>;
  firstAttemptedIds: string[];
  firstAttemptCorrect: number;
  attempts: number;
  retryCount: number;
  streak: number;
  bestStreak: number;
  current: {
    questionId: string;
    choiceIds: string[];
  } | null;
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

  public static restore(
    questions: readonly QuizQuestion[],
    snapshot: QuizMachineSnapshot,
    random: RandomSource = Math.random,
  ): QuizMachine {
    const machine = new QuizMachine(questions, random);
    machine.applySnapshot(snapshot);
    return machine;
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

  public snapshot(): QuizMachineSnapshot {
    return {
      version: 1,
      questionIds: [...this.questionIds],
      unseenIds: [...this.unseenIds],
      retries: this.retries.map((entry) => ({ ...entry })),
      masteredIds: [...this.masteredIds],
      exhaustedIds: [...this.exhaustedIds],
      records: this.questionIds.map((questionId) => ({
        questionId,
        ...this.getRecord(questionId),
        selectedChoiceIds: [...this.getRecord(questionId).selectedChoiceIds],
      })),
      firstAttemptedIds: [...this.firstAttemptedIds],
      firstAttemptCorrect: this.firstAttemptCorrect,
      attempts: this.attempts,
      retryCount: this.retryCount,
      streak: this.streak,
      bestStreak: this.bestStreak,
      current: this.current
        ? {
            questionId: this.current.question.id,
            choiceIds: this.current.choices.map((choice) => choice.id),
          }
        : null,
    };
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

  private applySnapshot(snapshot: QuizMachineSnapshot): void {
    if (!snapshot || snapshot.version !== 1) {
      throw new Error('The saved quiz session uses an unsupported format.');
    }

    const knownIds = new Set(this.questionIds);
    const matchesQuestionBank = snapshot.questionIds.length === this.questionIds.length
      && snapshot.questionIds.every((questionId) => knownIds.has(questionId));
    if (!matchesQuestionBank) {
      throw new Error('The saved quiz session does not match the current question bank.');
    }

    const requireKnownIds = (ids: readonly string[], label: string): void => {
      if (!Array.isArray(ids) || ids.some((questionId) => !knownIds.has(questionId))) {
        throw new Error(`The saved quiz session has invalid ${label}.`);
      }
    };
    const requireCount = (value: number, label: string): void => {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`The saved quiz session has an invalid ${label}.`);
      }
    };

    requireKnownIds(snapshot.unseenIds, 'unseen questions');
    requireKnownIds(snapshot.masteredIds, 'mastered questions');
    requireKnownIds(snapshot.exhaustedIds, 'settled questions');
    requireKnownIds(snapshot.firstAttemptedIds, 'first-attempt questions');
    if (!Array.isArray(snapshot.retries)) {
      throw new Error('The saved quiz session has invalid retries.');
    }
    snapshot.retries.forEach((entry) => {
      requireKnownIds([entry.questionId], 'retry questions');
      requireCount(entry.eligibleAtAttempt, 'retry position');
    });
    [
      [snapshot.firstAttemptCorrect, 'first-attempt score'],
      [snapshot.attempts, 'attempt count'],
      [snapshot.retryCount, 'retry count'],
      [snapshot.streak, 'streak'],
      [snapshot.bestStreak, 'best streak'],
    ].forEach(([value, label]) => requireCount(value as number, label as string));

    if (!Array.isArray(snapshot.records) || snapshot.records.length !== this.questionIds.length) {
      throw new Error('The saved quiz session has incomplete question records.');
    }
    const restoredRecords = new Map<string, QuestionRecord>();
    snapshot.records.forEach((record) => {
      requireKnownIds([record.questionId], 'question records');
      requireCount(record.attempts, 'question attempt count');
      requireCount(record.incorrectAttempts, 'question miss count');
      const question = this.questionsById.get(record.questionId);
      const choiceIds = new Set(question?.choices.map((choice) => choice.id) ?? []);
      if (!Array.isArray(record.selectedChoiceIds) || record.selectedChoiceIds.some((choiceId) => !choiceIds.has(choiceId))) {
        throw new Error('The saved quiz session has an invalid selected answer.');
      }
      restoredRecords.set(record.questionId, {
        attempts: record.attempts,
        incorrectAttempts: record.incorrectAttempts,
        selectedChoiceIds: [...record.selectedChoiceIds],
      });
    });
    if (restoredRecords.size !== this.questionIds.length) {
      throw new Error('The saved quiz session has duplicate question records.');
    }

    let restoredCurrent: PresentedQuestion | null = null;
    if (snapshot.current) {
      requireKnownIds([snapshot.current.questionId], 'current question');
      const question = this.questionsById.get(snapshot.current.questionId) as QuizQuestion;
      const choicesById = new Map(question.choices.map((choice) => [choice.id, choice]));
      const uniqueChoiceIds = new Set(snapshot.current.choiceIds);
      if (
        !Array.isArray(snapshot.current.choiceIds)
        || snapshot.current.choiceIds.length !== question.choices.length
        || uniqueChoiceIds.size !== question.choices.length
        || snapshot.current.choiceIds.some((choiceId) => !choicesById.has(choiceId))
      ) {
        throw new Error('The saved quiz session has an invalid current answer order.');
      }
      restoredCurrent = {
        question,
        choices: snapshot.current.choiceIds.map((choiceId) => choicesById.get(choiceId) as QuizQuestion['choices'][number]),
      };
    }

    this.unseenIds = [...snapshot.unseenIds];
    this.retries = snapshot.retries.map((entry) => ({ ...entry }));
    this.masteredIds = new Set(snapshot.masteredIds);
    this.exhaustedIds = new Set(snapshot.exhaustedIds);
    this.records.clear();
    restoredRecords.forEach((record, questionId) => this.records.set(questionId, record));
    this.firstAttemptedIds = new Set(snapshot.firstAttemptedIds);
    this.firstAttemptCorrect = snapshot.firstAttemptCorrect;
    this.attempts = snapshot.attempts;
    this.retryCount = snapshot.retryCount;
    this.streak = snapshot.streak;
    this.bestStreak = snapshot.bestStreak;
    this.current = restoredCurrent;
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
