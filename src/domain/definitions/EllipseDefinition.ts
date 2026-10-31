import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Ellipse } from "../shapes/Ellipse.js";

export class EllipseDefinition implements ShapeDefinition {
  public getType(): string { return "ellipse"; }
  public getSyntax(): string { return '<cx> <cy> <rx> <ry> [fill]'; }
  public create(id: string, args: ShapeArguments): Ellipse {
    const shape = new Ellipse(id, args.number("cx"), args.number("cy"), args.number("rx"), args.number("ry"), args.optionalText("fill"));
    args.expectEnd();
    return shape;
  }
}
