import { GeometrySnapshot } from "../GeometrySnapshot.js";
import { NumericRules } from "../NumericRules.js";
import { Shape } from "./Shape.js";

export class Rect extends Shape {
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id);
    this.x = NumericRules.finite(x, "x");
    this.registerNumericAttribute("x", () => this.x, value => { this.x = value; });
    this.y = NumericRules.finite(y, "y");
    this.registerNumericAttribute("y", () => this.y, value => { this.y = value; });
    this.width = NumericRules.nonNegative(width, "width");
    this.registerNumericAttribute("width", () => this.width, value => { this.width = value; }, true);
    this.height = NumericRules.nonNegative(height, "height");
    this.registerNumericAttribute("height", () => this.height, value => { this.height = value; }, true);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  public override getType(): string { return "rect"; }

  public override captureGeometry(): GeometrySnapshot {
    const x = this.x;
    const y = this.y;
    const width = this.width;
    const height = this.height;
    return new GeometrySnapshot(this, () => {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    });
  }

  protected override planMove(dx: number, dy: number): () => void {
    const x = NumericRules.finite(this.x + dx, "x");
    const y = NumericRules.finite(this.y + dy, "y");
    return () => {
      this.x = x;
      this.y = y;
    };
  }

  protected override planScale(factor: number): () => void {
    const x = NumericRules.finite(this.x * factor, "x");
    const y = NumericRules.finite(this.y * factor, "y");
    const width = NumericRules.finite(this.width * factor, "width");
    const height = NumericRules.finite(this.height * factor, "height");
    return () => {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    };
  }
}
