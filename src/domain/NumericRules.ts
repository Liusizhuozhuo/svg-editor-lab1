import { DomainError } from "./DomainError.js";

/** Shared numeric invariants, independent of CLI syntax and IO. */
export class NumericRules {
  public static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) {
      throw new DomainError(`${name} must be a finite number`);
    }
    return value;
  }

  public static nonNegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) {
      throw new DomainError(`${name} must be non-negative`);
    }
    return value;
  }

  public static scaleFactor(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DomainError("scale factor must be positive");
    }
    return value;
  }

  public static parse(value: string | number, name: string): number {
    if (typeof value === "number") return this.finite(value, name);
    const text = value.trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      throw new DomainError(`${name} must be a finite number`);
    }
    return this.finite(Number(text), name);
  }
}
