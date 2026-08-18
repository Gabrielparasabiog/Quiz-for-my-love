export class QuestionTimer {
  private seconds: number;

  public constructor(private readonly limit = 60) {
    this.seconds = limit;
  }

  public reset(): void {
    this.seconds = this.limit;
  }

  public tick(): number {
    this.seconds = Math.max(0, this.seconds - 1);
    return this.seconds;
  }

  public get remaining(): number {
    return this.seconds;
  }

  public get expired(): boolean {
    return this.seconds === 0;
  }
}
