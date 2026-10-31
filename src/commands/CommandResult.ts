/** A result for the presentation layer; commands never print to the terminal. */
export class CommandResult {
  constructor(private readonly summary: string) {}
  public getSummary(): string { return this.summary; }
}
