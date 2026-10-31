import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { TextShape } from "../shapes/TextShape.js";

export class TextShapeDefinition implements ShapeDefinition {
  public getType(): string { return "text"; }
  public getSyntax(): string { return '<x> <y> "content"'; }
  public create(id: string, args: ShapeArguments): TextShape {
    const shape = new TextShape(id, args.number("x"), args.number("y"), args.text("content"));
    args.expectEnd();
    return shape;
  }
}
