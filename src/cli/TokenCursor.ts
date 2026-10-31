import { DomainError } from "../domain/DomainError.js";
import { NumericRules } from "../domain/NumericRules.js";
import type { Token } from "./Token.js";

export class TokenCursor {
  private position = 0;
  private readonly tokens: readonly Token[];
  constructor(tokens: readonly Token[]) { this.tokens = [...tokens]; }
  public hasNext(): boolean { return this.position < this.tokens.length; }
  public readString(name: string): string {
    const token = this.tokens[this.position];
    if (!token) throw new DomainError(`missing argument: ${name}`);
    this.position++;
    return token.getValue();
  }
  public readNumber(name: string): number { return NumericRules.parse(this.readString(name), name); }
  public takeRemaining(): readonly Token[] {
    const rest = this.tokens.slice(this.position);
    this.position = this.tokens.length;
    return rest;
  }
  public expectEnd(): void {
    const token = this.tokens[this.position];
    if (token) throw new DomainError(`unexpected argument: ${token.getValue()}`);
  }
}
