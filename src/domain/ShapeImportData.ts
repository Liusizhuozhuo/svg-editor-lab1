import { DomainError } from "./DomainError.js";
import { NumericRules } from "./NumericRules.js";
import type { Shape } from "./shapes/Shape.js";

/** XML-independent input; each definition owns its import schema. */
export class ShapeImportData {
  private readonly attributes: Readonly<Record<string, string>>;
  private readonly children: readonly Shape[];
  constructor(attributes: Record<string, string>, private readonly text: string, children: readonly Shape[]) {
    this.attributes = Object.freeze({ ...attributes });
    this.children = Object.freeze([...children]);
  }
  public number(name: string): number { return NumericRules.parse(this.attributes[name] ?? "0", name); }
  public getText(): string { return this.text; }
  public getChildren(): readonly Shape[] { return this.children; }
  public validate(geometry: readonly string[], textAllowed: boolean, childrenAllowed: boolean): void {
    const allowed = new Set(["id", "fill", "stroke", "stroke-width", ...geometry]);
    for (const key of Object.keys(this.attributes)) {
      if (!allowed.has(key)) throw new DomainError(`unsupported SVG attribute: ${key}`);
    }
    if (!textAllowed && this.text.trim()) throw new DomainError("unexpected SVG text content");
    if (!childrenAllowed && this.children.length) throw new DomainError("leaf SVG element cannot contain elements");
  }
  public applyStyles(shape: Shape): void {
    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = this.attributes[name];
      if (value !== undefined) shape.setAttribute(name, value);
    }
  }
}
