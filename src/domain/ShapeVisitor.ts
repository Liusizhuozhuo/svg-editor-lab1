import type { Rect } from "./shapes/Rect.js";
import type { Circle } from "./shapes/Circle.js";
import type { Ellipse } from "./shapes/Ellipse.js";
import type { Line } from "./shapes/Line.js";
import type { TextShape } from "./shapes/TextShape.js";
import type { Group } from "./shapes/Group.js";

/** Double dispatch for output adapters, without switch(tag). */
export interface ShapeVisitor<T> {
  visitRect(shape: Rect): T;
  visitCircle(shape: Circle): T;
  visitEllipse(shape: Ellipse): T;
  visitLine(shape: Line): T;
  visitTextShape(shape: TextShape): T;
  visitGroup(shape: Group): T;
}
