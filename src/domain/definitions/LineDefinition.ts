import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Line } from "../shapes/Line.js";

export class LineDefinition implements ShapeDefinition {
  public getType(): string { return "line"; }
  public getSyntax(): string { return '<x1> <y1> <x2> <y2> [stroke]'; }
  public create(id: string, args: ShapeArguments): Line {
    const shape = new Line(id, args.number("x1"), args.number("y1"), args.number("x2"), args.number("y2"), args.optionalText("stroke"));
    args.expectEnd();
    return shape;
  }
}
