import type { ShapeVisitor } from "../ShapeVisitor.js";
import { GeometrySnapshot } from "../GeometrySnapshot.js";
import { NumericRules } from "../NumericRules.js";
import { Shape } from "./Shape.js";

export class Ellipse extends Shape {
  private cx: number;
  private cy: number;
  private rx: number;
  private ry: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id);
    this.cx = NumericRules.finite(cx, "cx");
    this.registerNumericAttribute("cx", () => this.cx, value => { this.cx = value; });
    this.cy = NumericRules.finite(cy, "cy");
    this.registerNumericAttribute("cy", () => this.cy, value => { this.cy = value; });
    this.rx = NumericRules.nonNegative(rx, "rx");
    this.registerNumericAttribute("rx", () => this.rx, value => { this.rx = value; }, true);
    this.ry = NumericRules.nonNegative(ry, "ry");
    this.registerNumericAttribute("ry", () => this.ry, value => { this.ry = value; }, true);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitEllipse(this); }

  public override getType(): string { return "ellipse"; }

  public override captureGeometry(): GeometrySnapshot {
    const cx = this.cx;
    const cy = this.cy;
    const rx = this.rx;
    const ry = this.ry;
    return new GeometrySnapshot(this, () => {
      this.cx = cx;
      this.cy = cy;
      this.rx = rx;
      this.ry = ry;
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
    const rx = NumericRules.finite(this.rx * factor, "rx");
    const ry = NumericRules.finite(this.ry * factor, "ry");
    return () => {
      this.cx = cx;
      this.cy = cy;
      this.rx = rx;
      this.ry = ry;
    };
  }
}
