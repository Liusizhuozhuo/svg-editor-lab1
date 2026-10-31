import type { ShapeImportData } from "../ShapeImportData.js";
import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Circle } from "../shapes/Circle.js";

export class CircleDefinition implements ShapeDefinition {
  public createFromSvg(id: string, data: ShapeImportData): Circle {
    data.validate(["cx", "cy", "r"], false, false);
    return new Circle(id, data.number("cx"), data.number("cy"), data.number("r"));
  }
  public getType(): string { return "circle"; }
  public getSyntax(): string { return '<cx> <cy> <r> [fill]'; }
  public create(id: string, args: ShapeArguments): Circle {
    const shape = new Circle(id, args.number("cx"), args.number("cy"), args.number("r"), args.optionalText("fill"));
    args.expectEnd();
    return shape;
  }
}
