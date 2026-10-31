import type { ShapeImportData } from "./ShapeImportData.js";
import type { ShapeArguments } from "./ShapeArguments.js";
import type { Shape } from "./shapes/Shape.js";

export interface ShapeDefinition {
  createFromSvg(id: string, data: ShapeImportData): Shape;
  getType(): string;
  getSyntax(): string;
  create(id: string, args: ShapeArguments): Shape;
}
