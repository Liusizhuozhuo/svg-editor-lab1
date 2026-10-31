export class Token {
  constructor(
    private readonly value: string,
    private readonly quoted: boolean,
    private readonly column: number
  ) {}
  public getValue(): string { return this.value; }
  public isQuoted(): boolean { return this.quoted; }
  public getColumn(): number { return this.column; }
}
