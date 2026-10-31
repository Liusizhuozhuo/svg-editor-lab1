import { AttributeSnapshot } from "../AttributeSnapshot.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";
import type { GeometrySnapshot } from "../GeometrySnapshot.js";
import { DomainError } from "../DomainError.js";
import { NumericRules } from "../NumericRules.js";
import { TreeStructure } from "../internal/TreeStructure.js";

type AttributeValue = string | number;
type AttributeBinding = {
  read: () => AttributeValue | undefined;
  capture: () => (() => void);
  write: (value: AttributeValue) => void;
};

/** Encapsulated shape behavior shared by leaves and groups. */
export abstract class Shape {
  private readonly id: string;
  private fill: string | undefined;
  private stroke: string | undefined;
  private strokeWidth: number | undefined;
  private readonly attributes = new Map<string, AttributeBinding>();

  protected constructor(id: string) {
    if (!id || /\s/.test(id)) {
      throw new DomainError("id must be non-empty and contain no whitespace");
    }
    this.id = id;
    this.registerStringAttribute("fill", () => this.fill, value => { this.fill = value; }, () => { this.fill = undefined; });
    this.registerStringAttribute("stroke", () => this.stroke, value => { this.stroke = value; }, () => { this.stroke = undefined; });
    this.registerNumericAttribute("stroke-width", () => this.strokeWidth,
      value => { this.strokeWidth = value; }, true, () => { this.strokeWidth = undefined; });
  }

  public getId(): string { return this.id; }
  public abstract getType(): string;
  public abstract accept<T>(visitor: ShapeVisitor<T>): T;
  public abstract captureGeometry(): GeometrySnapshot;
  public getParent(): Shape | undefined { return TreeStructure.getParent(this); }
  public isContainer(): boolean { return false; }
  public canUngroup(): boolean { return false; }
  public getChildren(): readonly Shape[] { return Object.freeze([]); }

  /** Detached, frozen explicit attributes; omitted styles stay absent.
   * The text key is logical content, NOT an XML attribute.
   */
  public getAttributes(): Readonly<Record<string, AttributeValue>> {
    const entries: [string, AttributeValue][] = [];
    for (const [name, binding] of this.attributes) {
      const value = binding.read();
      if (value !== undefined) entries.push([name, value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  }

  public captureAttributes(): AttributeSnapshot {
    const restore = [...this.attributes.values()].map(binding => binding.capture());
    return new AttributeSnapshot(() => { for (const apply of restore) apply(); });
  }

  public setAttribute(name: string, value: AttributeValue): void {
    const binding = this.attributes.get(name);
    if (!binding) throw new DomainError(`unknown attribute: ${name}`);
    binding.write(value);
  }

  public move(dx: number, dy: number): void {
    NumericRules.finite(dx, "dx");
    NumericRules.finite(dy, "dy");
    this.planMove(dx, dy)();
  }

  public scale(factor: number): void {
    NumericRules.scaleFactor(factor);
    this.planScale(factor)();
  }

  // Plans validate all prospective coordinates before any mutation occurs.
  // These are internal synchronous geometry plans, not history Commands.
  protected abstract planMove(dx: number, dy: number): () => void;
  protected abstract planScale(factor: number): () => void;

  protected static planChildMove(child: Shape, dx: number, dy: number): () => void {
    return child.planMove(dx, dy);
  }

  protected static planChildScale(child: Shape, factor: number): () => void {
    return child.planScale(factor);
  }

  protected registerNumericAttribute(
    name: string,
    read: () => number | undefined,
    write: (value: number) => void,
    nonNegative = false,
    clear?: () => void
  ): void {
    this.attributes.set(name, {
      read,
      capture: () => {
        const value = read();
        if (value !== undefined) return () => write(value);
        if (!clear) throw new DomainError(`cannot capture absent attribute: ${name}`);
        return clear;
      },
      write: value => {
        const parsed = NumericRules.parse(value, name);
        write(nonNegative ? NumericRules.nonNegative(parsed, name) : parsed);
      }
    });
  }

  protected registerStringAttribute(
    name: string,
    read: () => string | undefined,
    write: (value: string) => void,
    clear?: () => void
  ): void {
    this.attributes.set(name, {
      read,
      capture: () => {
        const value = read();
        if (value !== undefined) return () => write(value);
        if (!clear) throw new DomainError(`cannot capture absent attribute: ${name}`);
        return clear;
      },
      write: value => {
        if (typeof value !== "string") throw new DomainError(`${name} must be a string`);
        write(value);
      }
    });
  }
}
