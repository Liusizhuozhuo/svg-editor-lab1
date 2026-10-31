import { DomainError } from "./DomainError.js";
import { ShapeArguments } from "./ShapeArguments.js";
import type { ShapeDefinition } from "./ShapeDefinition.js";
import type { Shape } from "./shapes/Shape.js";
import { RectDefinition } from "./definitions/RectDefinition.js";
import { CircleDefinition } from "./definitions/CircleDefinition.js";
import { EllipseDefinition } from "./definitions/EllipseDefinition.js";
import { LineDefinition } from "./definitions/LineDefinition.js";
import { TextShapeDefinition } from "./definitions/TextShapeDefinition.js";
import { GroupDefinition } from "./definitions/GroupDefinition.js";

/** Sole shape-type name dispatch. TODO: injectable registration in plugin phase. */
export class ShapeFactory {
  private readonly definitions = new Map<string, ShapeDefinition>();
  constructor() {
    const builtins: ShapeDefinition[] = [new RectDefinition(), new CircleDefinition(), new EllipseDefinition(), new LineDefinition(), new TextShapeDefinition(), new GroupDefinition()];
    for (const definition of builtins) this.definitions.set(definition.getType(), definition);
  }

  public create(type: string, id: string, values: readonly (string | number)[]): Shape {
    const definition = this.definitions.get(type);
    if (!definition) throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition.create(id, new ShapeArguments(values));
  }

  public getSyntax(): readonly string[] {
    return Object.freeze([...this.definitions.values()].map(definition =>
      `create ${definition.getType()} <id> ${definition.getSyntax()} [in <containerId>]`.replace(/ +/g, " ")));
  }
}
