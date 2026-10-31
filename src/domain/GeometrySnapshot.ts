import { DomainError } from "./DomainError.js";
import type { Shape } from "./shapes/Shape.js";

/** Opaque geometry memento. Captured values are held by shape-owned closures. */
export class GeometrySnapshot {
  private readonly topology: ReadonlyArray<{
    shape: Shape; parent: Shape | undefined; children: readonly Shape[];
  }>;

  constructor(target: Shape, private readonly restoreGeometry: () => void) {
    const nodes: Shape[] = [target];
    const topology = [];
    while (nodes.length > 0) {
      const shape = nodes.pop()!;
      const children = [...shape.getChildren()];
      topology.push({ shape, parent: shape.getParent(), children });
      nodes.push(...children);
    }
    this.topology = topology;
  }

  public restore(): void {
    // Reject out-of-band structural changes before touching any geometry.
    for (const entry of this.topology) {
      const children = entry.shape.getChildren();
      if (entry.shape.getParent() !== entry.parent || children.length !== entry.children.length
        || children.some((child, index) => child !== entry.children[index])) {
        throw new DomainError("cannot restore geometry: shape structure changed");
      }
    }
    this.restoreGeometry();
  }
}
