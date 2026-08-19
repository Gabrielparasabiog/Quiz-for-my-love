const ROMAN_LIST_ITEM = /\s+(?=(?:VIII|VII|VI|IV|III|II|IX|X|V|I)\.\s)/g;

/**
 * Keeps the supplied wording intact while placing enumerated statements on
 * separate lines for easier reading in the quiz card.
 */
export function formatPromptForDisplay(prompt: string): string {
  return prompt.trim().replace(ROMAN_LIST_ITEM, '\n');
}
