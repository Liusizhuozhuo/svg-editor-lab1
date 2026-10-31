import type { ShapeImportData } from "../ShapeImportData.js";
import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Rect } from "../shapes/Rect.js";

export class RectDefinition implements ShapeDefinition {
  public createFromSvg(id: string, data: ShapeImportData): Rect {
    data.validate(["x", "y", "width", "height"], false, false);
    return new Rect(id, data.number("x"), data.number("y"), data.number("width"), data.number("height"));
  }
  public getType(): string { return "rect"; }
  public getSyntax(): string { return '<x> <y> <w> <h> [fill]'; }
  public create(id: string, args: ShapeArguments): Rect {
    const shape = new Rect(id, args.number("x"), args.number("y"), args.number("width"), args.number("height"), args.optionalText("fill"));
    args.expectEnd();
    return shape;
  }
}
