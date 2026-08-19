import { describe, expect, it } from 'vitest';
import { MAX_ATTEMPTS_PER_QUESTION, QuizMachine } from '../core/quizMachine';
import { QuestionTimer } from '../core/timer';
import type { QuizQuestion } from '../types';

function makeQuestions(count: number): QuizQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `test-${index + 1}`,
    category: 'Practice',
    prompt: `Practice question ${index + 1}?`,
    choices: [
      { id: 'correct', label: 'Correct choice' },
      { id: 'wrong', label: 'Another choice' },
    ],
    correctChoiceId: 'correct',
  }));
}

describe('QuestionTimer', () => {
  it('counts down to zero and stays expired', () => {
    const timer = new QuestionTimer(3);

    expect(timer.remaining).toBe(3);
    expect(timer.expired).toBe(false);
    expect(timer.tick()).toBe(2);
    expect(timer.tick()).toBe(1);
    expect(timer.tick()).toBe(0);
    expect(timer.expired).toBe(true);
    expect(timer.tick()).toBe(0);
  });

  it('resets to the configured limit', () => {
    const timer = new QuestionTimer(60);
    timer.tick();
    timer.tick();
    timer.reset();

    expect(timer.remaining).toBe(60);
    expect(timer.expired).toBe(false);
  });
});

describe('QuizMachine', () => {
  it('does not accept an answer twice for one presented question', () => {
    const machine = new QuizMachine(makeQuestions(2), () => 0.25);
    const question = machine.start();

    const first = machine.answer(question.question.correctChoiceId);
    expect(first.outcome).toBe('correct');
    expect(() => machine.answer(question.question.correctChoiceId)).toThrow('There is no active question');
  });

  it('allows one retry after ten other attempts, then settles a second miss', () => {
    const machine = new QuizMachine(makeQuestions(12), () => 0.37);
    const first = machine.start();
    const firstId = first.question.id;

    const failed = machine.answer('wrong');
    expect(failed.outcome).toBe('incorrect');
    expect(failed.stats.retries).toBe(1);

    for (let index = 0; index < 10; index += 1) {
      const next = machine.next();
      expect(next).not.toBeNull();
      expect(next?.question.id).not.toBe(firstId);
      machine.answer(next?.question.correctChoiceId ?? 'correct');
    }

    const retry = machine.next();
    expect(retry?.question.id).toBe(firstId);

    const finalMiss = machine.answer('wrong');
    expect(finalMiss.finalForQuestion).toBe(true);
    expect(finalMiss.attemptNumber).toBe(MAX_ATTEMPTS_PER_QUESTION);
    expect(finalMiss.attemptsRemaining).toBe(0);
    expect(finalMiss.stats.mistakes).toBe(1);
    expect(machine.pendingRetryCount).toBe(0);
  });

  it('uses the remaining available question before an early retry when fewer than ten remain', () => {
    const machine = new QuizMachine(makeQuestions(2), () => 0.42);
    const first = machine.start();
    const failed = machine.answer('wrong');
    expect(failed.outcome).toBe('incorrect');

    const other = machine.next();
    expect(other?.question.id).not.toBe(first.question.id);
    const completedOther = machine.answer(other?.question.correctChoiceId ?? 'correct');
    expect(completedOther.completed).toBe(false);

    const retry = machine.next();
    expect(retry?.question.id).toBe(first.question.id);

    const finalMiss = machine.answer('wrong');
    expect(finalMiss.completed).toBe(true);
    expect(finalMiss.stats.score).toBe(50);
    expect(finalMiss.stats.mistakes).toBe(1);
    expect(finalMiss.stats.remaining).toBe(0);
  });

  it('does not allow a third attempt after the second miss', () => {
    const machine = new QuizMachine(makeQuestions(2), () => 0.42);
    const first = machine.start();
    machine.answer('wrong');
    expect(machine.pendingRetryCount).toBe(1);

    const other = machine.next();
    machine.answer(other?.question.correctChoiceId ?? 'correct');
    const retry = machine.next();
    expect(retry?.question.id).toBe(first.question.id);
    const second = machine.answer('wrong');

    expect(second.finalForQuestion).toBe(true);
    expect(machine.pendingRetryCount).toBe(0);
    expect(() => machine.answer('wrong')).toThrow('There is no active question');
  });

  it('restores the exact current question, answer order, and progress from a saved session', () => {
    const questions = makeQuestions(4);
    const machine = new QuizMachine(questions, () => 0.42);
    const first = machine.start();
    machine.answer(first.question.correctChoiceId);
    const current = machine.next();
    const snapshot = machine.snapshot();

    const restored = QuizMachine.restore(questions, snapshot, () => 0.9);

    expect(restored.currentQuestion?.question.id).toBe(current?.question.id);
    expect(restored.currentQuestion?.choices.map((choice) => choice.id)).toEqual(
      current?.choices.map((choice) => choice.id),
    );
    expect(restored.stats).toEqual(machine.stats);
    expect(restored.snapshot().unseenIds).toEqual(snapshot.unseenIds);
  });

  it('rejects saved progress when it belongs to a different question bank', () => {
    const machine = new QuizMachine(makeQuestions(3), () => 0.31);
    machine.start();

    expect(() => QuizMachine.restore(makeQuestions(2), machine.snapshot())).toThrow(
      'does not match the current question bank',
    );
  });

  it('counts timeouts as retries and never reveals a correct choice in the result', () => {
    const machine = new QuizMachine(makeQuestions(2), () => 0.31);
    const question = machine.start();

    const result = machine.timeout();
    expect(result.outcome).toBe('timeout');
    expect(result.selectedChoiceId).toBeUndefined();
    expect(result.stats.retries).toBe(1);
    expect(result.completed).toBe(false);
    expect(result.finalForQuestion).toBe(false);
    expect(question.question.correctChoiceId).toBe('correct');
  });

  it('puts every missed question before the questions mastered without a miss', () => {
    const machine = new QuizMachine(makeQuestions(3), () => 0.23);
    const first = machine.start();
    machine.answer('wrong');

    const second = machine.next();
    machine.answer(second?.question.correctChoiceId ?? 'correct');
    const third = machine.next();
    machine.answer(third?.question.correctChoiceId ?? 'correct');
    const retry = machine.next();
    expect(retry?.question.id).toBe(first.question.id);
    machine.answer(retry?.question.correctChoiceId ?? 'correct');

    const review = machine.review;
    expect(review).toHaveLength(3);
    expect(review[0]?.question.id).toBe(first.question.id);
    expect(review[0]?.status).toBe('corrected');
    expect(review.slice(1).every((item) => item.status === 'mastered')).toBe(true);
    expect(machine.stats.reviewed).toBe(1);
    expect(machine.stats.mistakes).toBe(0);
    expect(machine.stats.score).toBe(100);
  });

  it('completes with a zero score when the only question is missed twice', () => {
    const machine = new QuizMachine(makeQuestions(1), () => 0.2);
    machine.start();
    machine.answer('wrong');
    const retry = machine.next();
    const finalMiss = machine.answer(retry?.question.choices[1]?.id ?? 'wrong');

    expect(finalMiss.completed).toBe(true);
    expect(finalMiss.stats.score).toBe(0);
    expect(finalMiss.stats.mistakes).toBe(1);
    expect(finalMiss.stats.reviewed).toBe(1);
    expect(machine.review[0]?.status).toBe('not-mastered');
    expect(machine.review[0]?.selectedChoiceIds).toHaveLength(2);
  });

  it('tracks first-attempt accuracy, streaks, and best streak', () => {
    const machine = new QuizMachine(makeQuestions(3), () => 0.16);
    const first = machine.start();
    const firstResult = machine.answer(first.question.correctChoiceId);
    expect(firstResult.stats.firstAttemptCorrect).toBe(1);
    expect(firstResult.stats.firstAttemptAccuracy).toBe(100);
    expect(firstResult.stats.streak).toBe(1);

    const second = machine.next();
    const secondResult = machine.answer(second?.question.correctChoiceId ?? 'correct');
    expect(secondResult.stats.streak).toBe(2);
    expect(secondResult.stats.bestStreak).toBe(2);

    const third = machine.next();
    const thirdResult = machine.answer('wrong');
    expect(third?.question.id).not.toBe('missing');
    expect(thirdResult.stats.streak).toBe(0);
    expect(thirdResult.stats.bestStreak).toBe(2);
    expect(thirdResult.stats.firstAttemptCorrect).toBe(2);
    expect(thirdResult.stats.firstAttemptAccuracy).toBeCloseTo(66.6667, 3);
  });

  it('completes only after every question has been mastered', () => {
    const machine = new QuizMachine(makeQuestions(2), () => 0.23);
    const first = machine.start();
    const firstResult = machine.answer(first.question.correctChoiceId);
    expect(firstResult.completed).toBe(false);

    const second = machine.next();
    const secondResult = machine.answer(second?.question.correctChoiceId ?? 'correct');
    expect(secondResult.completed).toBe(true);
    expect(secondResult.stats.mastered).toBe(2);
    expect(secondResult.stats.remaining).toBe(0);
    expect(machine.next()).toBeNull();
  });
});
