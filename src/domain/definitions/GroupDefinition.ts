import type { ShapeImportData } from "../ShapeImportData.js";
import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Group } from "../shapes/Group.js";

export class GroupDefinition implements ShapeDefinition {
  public createFromSvg(id: string, data: ShapeImportData): Group {
    data.validate([], false, true);
    return new Group(id, data.getChildren());
  }
  public getType(): string { return "g"; }
  public getSyntax(): string { return ''; }
  public create(id: string, args: ShapeArguments): Group {
    const shape = new Group(id);
    args.expectEnd();
    return shape;
  }
}
