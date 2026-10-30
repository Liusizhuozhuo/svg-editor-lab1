import { NumericRules } from "../NumericRules.js";
import { Shape } from "./Shape.js";

export class TextShape extends Shape {
  private x: number;
  private y: number;
  private content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.x = NumericRules.finite(x, "x");
    this.registerNumericAttribute("x", () => this.x, value => { this.x = value; });
    this.y = NumericRules.finite(y, "y");
    this.registerNumericAttribute("y", () => this.y, value => { this.y = value; });
    this.content = "";
    this.registerStringAttribute("text", () => this.content, value => { this.content = value; });
    this.setAttribute("text", content);
  }

  public override getType(): string { return "text"; }

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
    return () => {
      this.x = x;
      this.y = y;
    };
  }
}
