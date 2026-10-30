import { DomainError } from "./DomainError.js";
import { NumericRules } from "./NumericRules.js";
import { TreeStructure } from "./internal/TreeStructure.js";
import type { Shape } from "./shapes/Shape.js";

/** Canvas and sole public coordinator of tree structure and the global ID index.
 * The SVG root is a document, not a named Group; parentId undefined means root.
 */
export class SvgDocument {
  private width: number;
  private height: number;
  private roots: readonly Shape[] = Object.freeze([]);
  private readonly index = new Map<string, Shape>();
  private readonly ownership = {};

  constructor(width = 800, height = 600) {
    this.width = this.validateDimension(width, "width");
    this.height = this.validateDimension(height, "height");
  }

  public getWidth(): number { return this.width; }
  public getHeight(): number { return this.height; }
  public getChildren(): readonly Shape[] { return this.roots; }
  public getElementCount(): number { return this.index.size; }
  public findById(id: string): Shape | undefined { return this.index.get(id); }

  public getShape(id: string): Shape {
    const shape = this.findById(id);
    if (!shape) throw new DomainError(`no such shape: ${id}`);
    return shape;
  }

  public resize(width: number, height: number): void {
    const nextWidth = this.validateDimension(width, "width");
    const nextHeight = this.validateDimension(height, "height");
    this.width = nextWidth;
    this.height = nextHeight;
  }

  /** Insert a detached subtree. Omitted position appends after existing siblings. */
  public insert(shape: Shape, parentId?: string, position?: number): void {
    const parent = this.resolveContainer(parentId);
    const siblings = this.childrenOf(parent);
    const at = this.validatePosition(position ?? siblings.length, siblings.length);
    if (shape.getParent() !== undefined) {
      throw new DomainError(`shape already has a parent: ${shape.getId()}`);
    }
    const nodes = this.collectSubtree(shape);
    const ids = new Set<string>();
    for (const node of nodes) {
      if (TreeStructure.isOwned(node)) {
        throw new DomainError(`shape already belongs to a document: ${node.getId()}`);
      }
      const id = node.getId();
      if (ids.has(id) || this.index.has(id)) {
        throw new DomainError(`id already exists: ${id}`);
      }
      ids.add(id);
    }
    // All validation is complete. Commit structure and index synchronously.
    const next = [...siblings];
    next.splice(at, 0, shape);
    this.replaceChildren(parent, next);
    TreeStructure.setParent(shape, parent);
    for (const node of nodes) {
      TreeStructure.claim(node, this.ownership);
      this.index.set(node.getId(), node);
    }
  }

  /** Detach a subtree, preserving its internal structure for future reinsertion. */
  public remove(id: string): Shape {
    const shape = this.getShape(id);
    const parent = shape.getParent();
    const siblings = [...this.childrenOf(parent)];
    const at = this.positionOf(shape, siblings);
    const nodes = this.collectSubtree(shape);
    siblings.splice(at, 1);
    this.replaceChildren(parent, siblings);
    TreeStructure.setParent(shape, undefined);
    for (const node of nodes) {
      this.index.delete(node.getId());
      TreeStructure.release(node);
    }
    return shape;
  }

  /** Position is the index in the destination list AFTER removing this node.
   * Omitted position appends, including moves within the same parent.
   * Coordinates and explicit styles are preserved; SVG inherited styles may change.
   */
  public reparent(id: string, parentId?: string, position?: number): void {
    const shape = this.getShape(id);
    const parent = this.resolveContainer(parentId);
    for (let ancestor = parent; ancestor !== undefined; ancestor = ancestor.getParent()) {
      if (ancestor === shape) {
        throw new DomainError(`cannot move a container into itself or its descendant: ${id}`);
      }
    }
    const oldParent = shape.getParent();
    const source = [...this.childrenOf(oldParent)];
    const previous = this.positionOf(shape, source);
    source.splice(previous, 1);
    const destination = parent === oldParent ? source : [...this.childrenOf(parent)];
    const at = this.validatePosition(position ?? destination.length, destination.length);
    destination.splice(at, 0, shape);
    if (parent !== oldParent) this.replaceChildren(oldParent, source);
    this.replaceChildren(parent, destination);
    TreeStructure.setParent(shape, parent);
  }

  public getLocation(id: string): Readonly<{ parentId: string | undefined; index: number }> {
    const shape = this.getShape(id);
    const parent = shape.getParent();
    return Object.freeze({
      parentId: parent?.getId(),
      index: this.positionOf(shape, this.childrenOf(parent))
    });
  }

  /** Later SVG siblings paint on top. */
  public bringToFront(id: string): void {
    this.reparent(id, this.getShape(id).getParent()?.getId());
  }

  public sendToBack(id: string): void {
    this.reparent(id, this.getShape(id).getParent()?.getId(), 0);
  }

  private resolveContainer(id: string | undefined): Shape | undefined {
    if (id === undefined) return undefined;
    const shape = this.findById(id);
    if (!shape) throw new DomainError(`no such container: ${id}`);
    if (!shape.isContainer()) throw new DomainError(`not a container: ${id}`);
    return shape;
  }

  private childrenOf(parent: Shape | undefined): readonly Shape[] {
    return parent === undefined ? this.roots : parent.getChildren();
  }

  private replaceChildren(parent: Shape | undefined, children: readonly Shape[]): void {
    if (parent === undefined) this.roots = Object.freeze([...children]);
    else TreeStructure.replaceChildren(parent, children);
  }

  private collectSubtree(root: Shape): Shape[] {
    const nodes: Shape[] = [];
    const seen = new Set<Shape>();
    const pending = [root];
    while (pending.length > 0) {
      const node = pending.pop()!;
      if (seen.has(node)) throw new DomainError(`invalid tree: repeated shape: ${node.getId()}`);
      seen.add(node);
      nodes.push(node);
      const children = node.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i]!;
        if (child.getParent() !== node) {
          throw new DomainError(`invalid parent relationship: ${child.getId()}`);
        }
        pending.push(child);
      }
    }
    return nodes;
  }

  private positionOf(shape: Shape, siblings: readonly Shape[]): number {
    const position = siblings.indexOf(shape);
    if (position < 0) throw new DomainError(`invalid tree location: ${shape.getId()}`);
    return position;
  }

  private validatePosition(position: number, length: number): number {
    if (!Number.isInteger(position) || position < 0 || position > length) {
      throw new DomainError(`invalid child position: ${position}`);
    }
    return position;
  }

  private validateDimension(value: number, name: string): number {
    NumericRules.finite(value, `canvas ${name}`);
    if (value <= 0) throw new DomainError(`canvas ${name} must be positive`);
    return value;
  }
}
