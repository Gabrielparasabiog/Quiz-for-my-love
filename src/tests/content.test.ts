import { describe, expect, it } from 'vitest';
import { validateQuestions, validateVerses } from '../core/content';
import { formatPromptForDisplay } from '../core/promptFormat';
import { ShuffleBag } from '../core/shuffleBag';
import { questionBank } from '../data/questions';
import { loveNoteMessages } from '../data/messages';
import { verses } from '../data/verses';

describe('bundled content', () => {
  it('contains the complete validated question bank imported from the supplied PDF', () => {
    expect(questionBank).toHaveLength(231);
    expect(validateQuestions(questionBank)).toEqual([]);
    expect(new Set(questionBank.map((question) => question.id)).size).toBe(231);
  });

  it('preserves the reviewed HGE 10 answer corrections', () => {
    const correctedAnswers = new Map([
      ['pdf-0016', 'b'],
      ['pdf-0017', 'a'],
      ['pdf-0021', 'd'],
      ['pdf-0023', 'c'],
      ['pdf-0026', 'b'],
    ]);

    correctedAnswers.forEach((correctChoiceId, questionId) => {
      expect(questionBank.find((question) => question.id === questionId)?.correctChoiceId).toBe(
        correctChoiceId,
      );
    });
  });

  it('contains exactly 150 unique, complete WEB verse cards', () => {
    expect(verses).toHaveLength(150);
    expect(validateVerses(verses)).toEqual([]);
    expect(new Set(verses.map((verse) => verse.reference)).size).toBe(150);
    expect(new Set(verses.map((verse) => verse.theme))).toEqual(
      new Set(['courage', 'wisdom', 'perseverance', 'peace', 'discipline', 'hope', 'faith']),
    );
  });

  it('has a generous pool of unique Gab love notes for rotation', () => {
    expect(loveNoteMessages.length).toBeGreaterThanOrEqual(30);
    expect(new Set(loveNoteMessages).size).toBe(loveNoteMessages.length);
    expect(loveNoteMessages.every((message) => message.endsWith('—Gab'))).toBe(true);
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

describe('question presentation', () => {
  it('places Roman-numeral statements on separate lines without changing their words', () => {
    const prompt = 'Which statements are true? I. First statement II. Second statement III. Third statement';

    expect(formatPromptForDisplay(prompt)).toBe(
      'Which statements are true?\nI. First statement\nII. Second statement\nIII. Third statement',
    );
  });

  it('leaves an ordinary question unchanged', () => {
    expect(formatPromptForDisplay('What is the correct value?')).toBe('What is the correct value?');
  });
});
