export type RandomSource = () => number;

export class ShuffleBag<T> {
  private bag: T[] = [];
  private last: T | undefined;

  public constructor(
    private readonly source: readonly T[],
    private readonly random: RandomSource = Math.random,
  ) {}

  public next(): T {
    if (this.source.length === 0) {
      throw new Error('Cannot draw from an empty shuffle bag.');
    }

    if (this.bag.length === 0) {
      this.bag = [...this.source];
      for (let index = this.bag.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(this.random() * (index + 1));
        [this.bag[index], this.bag[swapIndex]] = [this.bag[swapIndex], this.bag[index]];
      }

      if (this.bag.length > 1 && this.last !== undefined && this.bag[0] === this.last) {
        [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
      }
    }

    this.last = this.bag.shift();
    return this.last as T;
  }
}
