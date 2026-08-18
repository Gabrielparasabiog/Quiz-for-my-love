import type { VerseCard } from '../types';
import type { RandomSource } from './shuffleBag';
import { ShuffleBag } from './shuffleBag';

export class VerseRotation {
  private bag: ShuffleBag<VerseCard>;
  private current: VerseCard | null = null;
  private nextRotationAt = 0;

  public constructor(
    private readonly source: readonly VerseCard[],
    private readonly intervalMs = 180000,
    private readonly random: RandomSource = Math.random,
  ) {
    if (source.length === 0) {
      throw new Error('Verse rotation requires at least one verse.');
    }
    if (intervalMs <= 0) {
      throw new Error('Verse rotation interval must be positive.');
    }
    this.bag = new ShuffleBag(source, random);
  }

  public reset(): void {
    this.bag = new ShuffleBag(this.source, this.random);
    this.current = null;
    this.nextRotationAt = 0;
  }

  public advance(now: number): VerseCard {
    if (!this.current) {
      this.current = this.bag.next();
      this.nextRotationAt = now + this.intervalMs;
      return this.current;
    }

    if (now >= this.nextRotationAt) {
      const rotations = Math.floor((now - this.nextRotationAt) / this.intervalMs) + 1;
      for (let index = 0; index < rotations; index += 1) {
        this.current = this.bag.next();
      }
      this.nextRotationAt += rotations * this.intervalMs;
    }

    return this.current;
  }

  public get currentVerse(): VerseCard | null {
    return this.current;
  }
}
