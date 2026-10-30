import { DomainError } from "../DomainError.js";
import { Shape } from "./Shape.js";

/** Stage 2 builds groups at construction time. Document-level editing comes later. */
export class Group extends Shape {
  private readonly children: readonly Shape[];

  constructor(id: string, children: readonly Shape[] = []) {
    super(id);
    const selected = new Set<Shape>();
    // Complete validation before assigning any parent, including on failure.
    for (const child of children) {
      if (selected.has(child)) {
        throw new DomainError(`duplicate child: ${child.getId()}`);
      }
      if (child.getParent() !== undefined) {
        throw new DomainError(`shape already has a parent: ${child.getId()}`);
      }
      selected.add(child);
    }
    this.children = Object.freeze([...children]);
    for (const child of this.children) Group.attachChild(child, this);
  }

  public override getType(): string { return "g"; }
  public override getChildren(): readonly Shape[] { return this.children; }

  protected override planMove(dx: number, dy: number): () => void {
    const plans = this.children.map(child => Group.planChildMove(child, dx, dy));
    return () => { for (const apply of plans) apply(); };
  }

  protected override planScale(factor: number): () => void {
    const plans = this.children.map(child => Group.planChildScale(child, factor));
    return () => { for (const apply of plans) apply(); };
  }
}
