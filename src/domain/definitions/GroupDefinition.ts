import type { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeDefinition } from "../ShapeDefinition.js";
import { Group } from "../shapes/Group.js";

export class GroupDefinition implements ShapeDefinition {
  public getType(): string { return "g"; }
  public getSyntax(): string { return ''; }
  public create(id: string, args: ShapeArguments): Group {
    const shape = new Group(id);
    args.expectEnd();
    return shape;
  }
}
