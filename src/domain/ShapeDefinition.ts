import type { ShapeArguments } from "./ShapeArguments.js";
import type { Shape } from "./shapes/Shape.js";

export interface ShapeDefinition {
  getType(): string;
  getSyntax(): string;
  create(id: string, args: ShapeArguments): Shape;
}
