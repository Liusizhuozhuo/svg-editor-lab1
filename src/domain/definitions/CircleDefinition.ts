import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Circle } from "../shapes/Circle.js";

export class CircleDefinition implements ShapeDefinition {
  public getType(): string { return "circle"; }
  public getSyntax(): string { return '<cx> <cy> <r> [fill]'; }
  public create(id: string, args: ShapeArguments): Circle {
    const shape = new Circle(id, args.number("cx"), args.number("cy"), args.number("r"), args.optionalText("fill"));
    args.expectEnd();
    return shape;
  }
}
