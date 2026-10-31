import { DocumentStructureSnapshot } from "./DocumentStructureSnapshot.js";
import { Group } from "./shapes/Group.js";
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

  /** Group selected subtrees in document order under their lowest common parent. */
  public group(newId: string, ids: readonly string[]): Group {
    if (this.index.has(newId)) throw new DomainError(`id already exists: ${newId}`);
    if (ids.length === 0) throw new DomainError("group requires at least one shape");
    const group = new Group(newId);
    const selected = new Set<Shape>();
    for (const id of ids) {
      const shape = this.getShape(id);
      if (selected.has(shape)) throw new DomainError(`duplicate shape selection: ${id}`);
      selected.add(shape);
    }
    for (const shape of selected) {
      for (let ancestor = shape.getParent(); ancestor; ancestor = ancestor.getParent()) {
        if (selected.has(ancestor)) {
          throw new DomainError(`cannot group a container into its own descendant: ${ancestor.getId()}`);
        }
      }
    }
    const ordered = this.roots.flatMap(root => this.collectSubtree(root)).filter(node => selected.has(node));
    let parent = ordered[0]!.getParent();
    while (parent && !ordered.every(node => this.isAncestor(parent!, node))) parent = parent.getParent();
    const siblings = this.childrenOf(parent);
    const at = Math.min(...ordered.map(node => {
      let branch = node;
      while (branch.getParent() !== parent) branch = branch.getParent()!;
      return siblings.indexOf(branch);
    }));
    const changed = new Map<Shape | undefined, Shape[]>();
    for (const node of ordered) {
      const oldParent = node.getParent();
      if (!changed.has(oldParent)) changed.set(oldParent, [...this.childrenOf(oldParent)]);
    }
    if (!changed.has(parent)) changed.set(parent, [...siblings]);
    for (const [container, children] of changed) {
      changed.set(container, children.filter(child => !selected.has(child)));
    }
    changed.get(parent)!.splice(at, 0, group);
    // No user-visible mutation occurs before all identities and locations are validated.
    for (const [container, children] of changed) this.replaceChildren(container, children);
    TreeStructure.replaceChildren(group, ordered);
    TreeStructure.setParent(group, parent);
    for (const node of ordered) TreeStructure.setParent(node, group);
    TreeStructure.claim(group, this.ownership);
    this.index.set(newId, group);
    return group;
  }

  public ungroup(id: string): void {
    const group = this.getShape(id);
    if (!group.isContainer()) throw new DomainError(`not a container: ${id}`);
    if (!group.canUngroup()) throw new DomainError(`cannot ungroup composite shape: ${id}`);
    const parent = group.getParent();
    if (!parent) throw new DomainError(`cannot ungroup top-level container: ${id}`);
    const siblings = [...parent.getChildren()];
    const at = this.positionOf(group, siblings);
    const children = [...group.getChildren()];
    siblings.splice(at, 1, ...children);
    this.replaceChildren(parent, siblings);
    for (const child of children) TreeStructure.setParent(child, parent);
    TreeStructure.replaceChildren(group, []);
    TreeStructure.setParent(group, undefined);
    TreeStructure.release(group);
    this.index.delete(id);
  }

  public captureStructure(): DocumentStructureSnapshot {
    const roots = [...this.roots];
    const entries = [...this.index.values()].map(shape => ({
      shape, parent: shape.getParent(), children: [...shape.getChildren()]
    }));
    const desired = new Set(entries.map(entry => entry.shape));
    const same = (a: readonly Shape[], b: readonly Shape[]): boolean =>
      a.length === b.length && a.every((shape, index) => shape === b[index]);
    return new DocumentStructureSnapshot(
      () => same(this.roots, roots) && this.index.size === entries.length && entries.every(entry =>
        this.index.get(entry.shape.getId()) === entry.shape && entry.shape.getParent() === entry.parent
        && same(entry.shape.getChildren(), entry.children)
        && TreeStructure.isOwnedBy(entry.shape, this.ownership)),
      () => {
        const current = new Set(this.index.values());
        for (const { shape } of entries) {
          if (TreeStructure.isOwned(shape) && !TreeStructure.isOwnedBy(shape, this.ownership)) {
            throw new DomainError(`cannot restore shape owned by another document: ${shape.getId()}`);
          }
          const parent = shape.getParent();
          if (parent && !desired.has(parent) && !current.has(parent)) {
            throw new DomainError(`cannot restore externally attached shape: ${shape.getId()}`);
          }
          if (shape.getChildren().some(child => !desired.has(child) && !current.has(child))) {
            throw new DomainError(`cannot restore externally changed subtree: ${shape.getId()}`);
          }
        }
        // Keep omitted subtrees detached, but remove references to restored children.
        for (const shape of current) {
          if (!desired.has(shape)) {
            if (shape.isContainer()) TreeStructure.replaceChildren(shape,
              shape.getChildren().filter(child => !desired.has(child)));
            if (shape.getParent() && desired.has(shape.getParent()!)) TreeStructure.setParent(shape, undefined);
            TreeStructure.release(shape);
          }
        }
        this.index.clear();
        for (const entry of entries) {
          if (entry.shape.isContainer()) TreeStructure.replaceChildren(entry.shape, entry.children);
          TreeStructure.setParent(entry.shape, entry.parent);
          TreeStructure.claim(entry.shape, this.ownership);
          this.index.set(entry.shape.getId(), entry.shape);
        }
        this.roots = Object.freeze([...roots]);
      }
    );
  }

  private isAncestor(ancestor: Shape, shape: Shape): boolean {
    for (let parent = shape.getParent(); parent; parent = parent.getParent()) {
      if (parent === ancestor) return true;
    }
    return false;
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
