import type { ShapeVisitor } from "../domain/ShapeVisitor.js";
import type { Shape } from "../domain/shapes/Shape.js";
import type { Rect } from "../domain/shapes/Rect.js";
import type { Circle } from "../domain/shapes/Circle.js";
import type { Ellipse } from "../domain/shapes/Ellipse.js";
import type { Line } from "../domain/shapes/Line.js";
import type { TextShape } from "../domain/shapes/TextShape.js";
import type { Group } from "../domain/shapes/Group.js";

export class ShapeFormatter implements ShapeVisitor<string> {
  private readonly styleNames = new Set(["fill", "stroke", "stroke-width"]);

  public inline(shape: Shape): string {
    return [this.label(shape), shape.accept(this), this.styles(shape)].filter(Boolean).join("  ");
  }

  public details(shape: Shape): string {
    const parent = shape.getParent();
    const header = `${this.label(shape)}  parent=${parent ? this.label(parent) : "svg"}`;
    const geometry = Object.entries(shape.getAttributes())
      .filter(([name]) => !this.styleNames.has(name))
      .map(([name, value]) => `${name}=${typeof value === "string" ? JSON.stringify(value) : value}`)
      .join(" ");
    return [header, ...[geometry, this.styles(shape)].filter(Boolean).map(line => `  ${line}`)].join("\n");
  }

  public visitRect(shape: Rect): string {
    const a = shape.getAttributes();
    return `x=${a.x} y=${a.y} w=${a.width} h=${a.height}`;
  }
  public visitCircle(shape: Circle): string {
    const a = shape.getAttributes();
    return `cx=${a.cx} cy=${a.cy} r=${a.r}`;
  }
  public visitEllipse(shape: Ellipse): string {
    const a = shape.getAttributes();
    return `cx=${a.cx} cy=${a.cy} rx=${a.rx} ry=${a.ry}`;
  }
  public visitLine(shape: Line): string {
    const a = shape.getAttributes();
    return `(${a.x1},${a.y1}) -> (${a.x2},${a.y2})`;
  }
  public visitTextShape(shape: TextShape): string {
    const a = shape.getAttributes();
    return `(${a.x},${a.y}) ${JSON.stringify(a.text)}`;
  }
  public visitGroup(_shape: Group): string { return ""; }

  private label(shape: Shape): string { return `${shape.getType()}#${shape.getId()}`; }
  private styles(shape: Shape): string {
    return Object.entries(shape.getAttributes()).filter(([name]) => this.styleNames.has(name))
      .map(([name, value]) => `${name}=${typeof value === "string" && /\s/.test(value)
        ? JSON.stringify(value) : value}`).join(" ");
  }
}
