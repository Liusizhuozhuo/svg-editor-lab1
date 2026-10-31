import type { ShapeVisitor } from "../ShapeVisitor.js";
import { GeometrySnapshot } from "../GeometrySnapshot.js";
import { NumericRules } from "../NumericRules.js";
import { Shape } from "./Shape.js";

export class Circle extends Shape {
  private cx: number;
  private cy: number;
  private r: number;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this.cx = NumericRules.finite(cx, "cx");
    this.registerNumericAttribute("cx", () => this.cx, value => { this.cx = value; });
    this.cy = NumericRules.finite(cy, "cy");
    this.registerNumericAttribute("cy", () => this.cy, value => { this.cy = value; });
    this.r = NumericRules.nonNegative(r, "r");
    this.registerNumericAttribute("r", () => this.r, value => { this.r = value; }, true);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitCircle(this); }

  public override getType(): string { return "circle"; }

  public override captureGeometry(): GeometrySnapshot {
    const cx = this.cx;
    const cy = this.cy;
    const r = this.r;
    return new GeometrySnapshot(this, () => {
      this.cx = cx;
      this.cy = cy;
      this.r = r;
    });
  }

  protected override planMove(dx: number, dy: number): () => void {
    const cx = NumericRules.finite(this.cx + dx, "cx");
    const cy = NumericRules.finite(this.cy + dy, "cy");
    return () => {
      this.cx = cx;
      this.cy = cy;
    };
  }

  protected override planScale(factor: number): () => void {
    const cx = NumericRules.finite(this.cx * factor, "cx");
    const cy = NumericRules.finite(this.cy * factor, "cy");
    const r = NumericRules.finite(this.r * factor, "r");
    return () => {
      this.cx = cx;
      this.cy = cy;
      this.r = r;
    };
  }
}
