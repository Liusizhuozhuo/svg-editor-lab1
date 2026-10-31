import { DomainError } from "./DomainError.js";
import { NumericRules } from "./NumericRules.js";

/** Positional creation values, independent of quotes, terminal IO and CLI suffixes. */
export class ShapeArguments {
  private position = 0;
  private readonly values: readonly (string | number)[];
  constructor(values: readonly (string | number)[]) { this.values = [...values]; }

  public number(name: string): number { return NumericRules.parse(this.read(name), name); }
  public text(name: string): string {
    const value = this.read(name);
    if (typeof value !== "string") throw new DomainError(`${name} must be a string`);
    return value;
  }
  public optionalText(name: string): string | undefined {
    return this.position < this.values.length ? this.text(name) : undefined;
  }
  public expectEnd(): void {
    if (this.position < this.values.length) {
      throw new DomainError(`unexpected shape argument: ${this.values[this.position]}`);
    }
  }
  private read(name: string): string | number {
    const value = this.values[this.position];
    if (value === undefined) throw new DomainError(`missing argument: ${name}`);
    this.position++;
    return value;
  }
}
