import { describe, expect, it } from 'vitest';
import { validateQuestions, validateVerses } from '../core/content';
import { ShuffleBag } from '../core/shuffleBag';
import { questionBank } from '../data/questions';
import { verses } from '../data/verses';

describe('bundled content', () => {
  it('contains the complete validated question bank imported from the supplied PDF', () => {
    expect(questionBank).toHaveLength(231);
    expect(validateQuestions(questionBank)).toEqual([]);
    expect(new Set(questionBank.map((question) => question.id)).size).toBe(231);
  });

  it('contains exactly 150 unique, complete WEB verse cards', () => {
    expect(verses).toHaveLength(150);
    expect(validateVerses(verses)).toEqual([]);
    expect(new Set(verses.map((verse) => verse.reference)).size).toBe(150);
    expect(new Set(verses.map((verse) => verse.theme))).toEqual(
      new Set(['courage', 'wisdom', 'perseverance', 'peace', 'discipline', 'hope', 'faith']),
    );
  });
});

describe('ShuffleBag', () => {
  it('cycles without repeating an item immediately', () => {
    const bag = new ShuffleBag(['a', 'b', 'c'], () => 0.5);
    const draws = Array.from({ length: 9 }, () => bag.next());

    for (let index = 1; index < draws.length; index += 1) {
      expect(draws[index]).not.toBe(draws[index - 1]);
    }
    expect(new Set(draws.slice(0, 3)).size).toBe(3);
  });
});
