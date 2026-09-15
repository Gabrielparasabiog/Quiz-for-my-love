import { describe, expect, it } from 'vitest';
import { validateQuestions, validateVerses } from '../core/content';
import { formatPromptForDisplay } from '../core/promptFormat';
import { ShuffleBag } from '../core/shuffleBag';
import { questionBank } from '../data/questions';
import { supplementalQuestions } from '../data/supplementalQuestions';
import { loveNoteMessages } from '../data/messages';
import { verses } from '../data/verses';

describe('bundled content', () => {
  it('contains the complete validated and de-duplicated question bank', () => {
    expect(questionBank).toHaveLength(400);
    expect(validateQuestions(questionBank)).toEqual([]);
    expect(new Set(questionBank.map((question) => question.id)).size).toBe(400);
  });

  it('includes the image answer keys and the distinct April 2025 concepts', () => {
    expect(supplementalQuestions.filter((question) => question.id.startsWith('image-'))).toHaveLength(30);
    expect(supplementalQuestions.filter((question) => question.id.startsWith('apr25-'))).toHaveLength(166);

    const answerById = new Map(supplementalQuestions.map((question) => [question.id, question.correctChoiceId]));
    expect(answerById.get('image-20260912-001')).toBe('c');
    expect(answerById.get('image-20260912-006')).toBe('c');
    expect(answerById.get('image-20260912-010')).toBe('d');
    expect(answerById.get('image-20260912-019')).toBe('c');
    expect(answerById.get('image-20260915-020')).toBe('b');
    expect(answerById.get('image-20260915-023')).toBe('c');
    expect(answerById.get('image-20260915-028')).toBe('c');
    expect(answerById.get('image-20260915-030')).toBe('b');
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

  it('keeps corrected answer keys from the construction compilation', () => {
    const correctedAnswers = new Map([
      ['pdf-0105', 'c'],
      ['pdf-0223', 'c'],
      ['pdf-0226', 'c'],
      ['pdf-0227', 'a'],
      ['pdf-0228', 'd'],
    ]);

    correctedAnswers.forEach((correctChoiceId, questionId) => {
      expect(questionBank.find((question) => question.id === questionId)?.correctChoiceId).toBe(correctChoiceId);
    });
  });

  it('does not reintroduce the known duplicate legacy entries', () => {
    const removedDuplicateIds = [
      'pdf-0056', 'pdf-0113', 'pdf-0137', 'pdf-0138', 'pdf-0143', 'pdf-0158',
      'pdf-0161', 'pdf-0162', 'pdf-0163', 'pdf-0167', 'pdf-0172', 'pdf-0173',
      'pdf-0174', 'pdf-0176', 'pdf-0179', 'pdf-0182', 'pdf-0184', 'pdf-0204',
      'pdf-0205', 'pdf-0207', 'pdf-0208', 'pdf-0209', 'pdf-0210', 'pdf-0213',
      'pdf-0218', 'pdf-0221', 'pdf-0230',
    ];

    removedDuplicateIds.forEach((questionId) => {
      expect(questionBank.some((question) => question.id === questionId)).toBe(false);
    });

    const normalizedPrompts = questionBank.map((question) =>
      question.prompt.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
    );
    expect(new Set(normalizedPrompts).size).toBe(questionBank.length);
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
