import { describe, expect, it } from 'vitest';
import { VerseRotation } from '../core/verseRotation';
import type { VerseCard } from '../types';

const testVerses: VerseCard[] = [
  { reference: 'Test 1:1', text: 'One', note: 'Isa', theme: 'hope' },
  { reference: 'Test 1:2', text: 'Two', note: 'Dalawa', theme: 'faith' },
  { reference: 'Test 1:3', text: 'Three', note: 'Tatlo', theme: 'courage' },
];

describe('VerseRotation', () => {
  it('keeps the current verse before the interval and rotates at the interval', () => {
    const rotation = new VerseRotation(testVerses, 180000, () => 0.2);
    const first = rotation.advance(0);

    expect(rotation.advance(179999)).toBe(first);
    expect(rotation.advance(180000)).not.toBe(first);
    expect(rotation.currentVerse).toBe(rotation.advance(180000));
  });

  it('catches up if the page was backgrounded across multiple rotations', () => {
    const rotation = new VerseRotation(testVerses, 100, () => 0.4);
    const references = [rotation.advance(0).reference];
    references.push(rotation.advance(250).reference);

    expect(references).toHaveLength(2);
    expect(references[0]).not.toBe(references[1]);
  });
});
