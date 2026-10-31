import type { SvgDocument } from "../domain/SvgDocument.js";
import type { ShapeVisitor } from "../domain/ShapeVisitor.js";
import type { Shape } from "../domain/shapes/Shape.js";
import type { Rect } from "../domain/shapes/Rect.js";
import type { Circle } from "../domain/shapes/Circle.js";
import type { Ellipse } from "../domain/shapes/Ellipse.js";
import type { Line } from "../domain/shapes/Line.js";
import type { TextShape } from "../domain/shapes/TextShape.js";
import type { Group } from "../domain/shapes/Group.js";
import { XmlEscaper } from "./XmlEscaper.js";

export class SvgWriter implements ShapeVisitor<string> {
  constructor(private readonly depth = 1) {}
  public write(document: SvgDocument): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${document.getWidth()}" height="${document.getHeight()}" viewBox="0 0 ${document.getWidth()} ${document.getHeight()}">\n` +
      document.getChildren().map(child => child.accept(new SvgWriter())).join("\n") + "\n</svg>\n";
  }
  public visitRect(shape: Rect): string { return this.element(shape); }
  public visitCircle(shape: Circle): string { return this.element(shape); }
  public visitEllipse(shape: Ellipse): string { return this.element(shape); }
  public visitLine(shape: Line): string { return this.element(shape); }
  public visitTextShape(shape: TextShape): string {
    return this.element(shape, XmlEscaper.text(String(shape.getAttributes()["text"] ?? "")));
  }
  public visitGroup(shape: Group): string {
    const children = shape.getChildren().map(child => child.accept(new SvgWriter(this.depth + 1)));
    return this.element(shape, "\n" + children.join("\n") + "\n" + "  ".repeat(this.depth));
  }
  private element(shape: Shape, content?: string): string {
    const attrs = [["id", shape.getId()], ...Object.entries(shape.getAttributes()).filter(([name]) => name !== "text")];
    const start = "  ".repeat(this.depth) + `<${shape.getType()}` + attrs.map(([name, value]) => ` ${name}="${XmlEscaper.attribute(String(value))}"`).join("");
    return content === undefined ? start + " />" : start + ">" + content + `</${shape.getType()}>`;
  }
}
