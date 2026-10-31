import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { ShapeFormatter } from "./ShapeFormatter.js";

export class TreeFormatter {
  constructor(private readonly shapes = new ShapeFormatter()) {}

  public format(document: SvgDocument, id?: string): string {
    const lines: string[] = [];
    if (id === undefined) {
      lines.push(`svg (${document.getWidth()}x${document.getHeight()})`);
      this.appendChildren(document.getChildren(), "", lines);
    } else {
      const shape = document.getShape(id);
      lines.push(this.shapes.inline(shape));
      this.appendChildren(shape.getChildren(), "", lines);
    }
    return lines.join("\n");
  }

  private appendChildren(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? "└── " : "├── "}${this.shapes.inline(child)}`);
      this.appendChildren(child.getChildren(), prefix + (last ? "    " : "│   "), lines);
    });
  }
}
