import { DomainError } from "../DomainError.js";
import type { Shape } from "../shapes/Shape.js";

/** @internal Structural storage. Only Shape, Group and SvgDocument use this module.
 * Application/command code must edit structure through SvgDocument.
 * Weak references do not retain removed documents or shapes on their own.
 */
export class TreeStructure {
  private static readonly parents = new WeakMap<Shape, Shape>();
  private static readonly children = new WeakMap<Shape, readonly Shape[]>();
  private static readonly owners = new WeakMap<Shape, object>();

  public static getParent(shape: Shape): Shape | undefined {
    return this.parents.get(shape);
  }

  public static getChildren(shape: Shape): readonly Shape[] {
    return this.children.get(shape) ?? Object.freeze([]);
  }

  public static isOwned(shape: Shape): boolean {
    return this.owners.has(shape);
  }

  public static initializeGroup(group: Shape, children: readonly Shape[]): void {
    const selected = new Set<Shape>();
    for (const child of children) {
      if (selected.has(child)) throw new DomainError(`duplicate child: ${child.getId()}`);
      if (this.getParent(child) !== undefined) {
        throw new DomainError(`shape already has a parent: ${child.getId()}`);
      }
      if (this.isOwned(child)) {
        throw new DomainError(`shape already belongs to a document: ${child.getId()}`);
      }
      selected.add(child);
    }
    this.replaceChildren(group, children);
    for (const child of children) this.setParent(child, group);
  }

  public static replaceChildren(parent: Shape, children: readonly Shape[]): void {
    this.children.set(parent, Object.freeze([...children]));
  }

  public static setParent(shape: Shape, parent: Shape | undefined): void {
    if (parent === undefined) this.parents.delete(shape);
    else this.parents.set(shape, parent);
  }

  public static claim(shape: Shape, owner: object): void {
    this.owners.set(shape, owner);
  }

  public static release(shape: Shape): void {
    this.owners.delete(shape);
  }
}
