import type { QuizQuestion, VerseCard } from '../types';

export function validateQuestions(questions: readonly QuizQuestion[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();

  questions.forEach((question, index) => {
    if (!question.id || ids.has(question.id)) {
      errors.push(`Question ${index + 1} has a missing or duplicate ID.`);
    }
    ids.add(question.id);

    const normalizedPrompt = question.prompt.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!question.category?.trim()) {
      errors.push(`Question ${question.id || index + 1} has no category.`);
    }
    if (!normalizedPrompt) {
      errors.push(`Question ${question.id || index + 1} has no prompt.`);
    } else if (prompts.has(normalizedPrompt)) {
      errors.push(`Question ${question.id || index + 1} has a duplicate prompt.`);
    }
    prompts.add(normalizedPrompt);

    if (question.choices.length < 2 || question.choices.length > 6) {
      errors.push(`Question ${question.id || index + 1} must have 2–6 choices.`);
    }

    const choiceIds = new Set(question.choices.map((choice) => choice.id));
    if (choiceIds.size !== question.choices.length || !choiceIds.has(question.correctChoiceId)) {
      errors.push(`Question ${question.id || index + 1} must have one valid correct choice.`);
    }
    const choiceLabels = question.choices.map((choice) => choice.label.toLocaleLowerCase().replace(/\s+/g, ' ').trim());
    if (choiceLabels.some((label) => !label) || new Set(choiceLabels).size !== choiceLabels.length) {
      errors.push(`Question ${question.id || index + 1} must have unique, non-empty choices.`);
    }
  });

  return errors;
}

export function validateVerses(verses: readonly VerseCard[]): string[] {
  const errors: string[] = [];
  const references = new Set<string>();

  if (verses.length !== 150) {
    errors.push(`Expected exactly 150 verse cards, received ${verses.length}.`);
  }

  verses.forEach((verse, index) => {
    if (!verse.reference.trim() || references.has(verse.reference)) {
      errors.push(`Verse ${index + 1} has a missing or duplicate reference.`);
    }
    references.add(verse.reference);
    if (!verse.text.trim() || !verse.note.trim()) {
      errors.push(`Verse ${verse.reference || index + 1} is missing text or encouragement.`);
    }
  });

  return errors;
}
