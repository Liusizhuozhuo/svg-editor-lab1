import { GeometrySnapshot } from "../GeometrySnapshot.js";
import { NumericRules } from "../NumericRules.js";
import { Shape } from "./Shape.js";

export class Line extends Shape {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id);
    this.x1 = NumericRules.finite(x1, "x1");
    this.registerNumericAttribute("x1", () => this.x1, value => { this.x1 = value; });
    this.y1 = NumericRules.finite(y1, "y1");
    this.registerNumericAttribute("y1", () => this.y1, value => { this.y1 = value; });
    this.x2 = NumericRules.finite(x2, "x2");
    this.registerNumericAttribute("x2", () => this.x2, value => { this.x2 = value; });
    this.y2 = NumericRules.finite(y2, "y2");
    this.registerNumericAttribute("y2", () => this.y2, value => { this.y2 = value; });
    if (stroke !== undefined) this.setAttribute("stroke", stroke);
  }

  public override getType(): string { return "line"; }

  public override captureGeometry(): GeometrySnapshot {
    const x1 = this.x1;
    const y1 = this.y1;
    const x2 = this.x2;
    const y2 = this.y2;
    return new GeometrySnapshot(this, () => {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
    });
  }

  protected override planMove(dx: number, dy: number): () => void {
    const x1 = NumericRules.finite(this.x1 + dx, "x1");
    const y1 = NumericRules.finite(this.y1 + dy, "y1");
    const x2 = NumericRules.finite(this.x2 + dx, "x2");
    const y2 = NumericRules.finite(this.y2 + dy, "y2");
    return () => {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
    };
  }

  protected override planScale(factor: number): () => void {
    const x1 = NumericRules.finite(this.x1 * factor, "x1");
    const y1 = NumericRules.finite(this.y1 * factor, "y1");
    const x2 = NumericRules.finite(this.x2 * factor, "x2");
    const y2 = NumericRules.finite(this.y2 * factor, "y2");
    return () => {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
    };
  }
}
