import { GeometrySnapshot } from "../GeometrySnapshot.js";
import { TreeStructure } from "../internal/TreeStructure.js";
import { Shape } from "./Shape.js";

/** Ordered composite; subsequent structural edits are coordinated by SvgDocument. */
export class Group extends Shape {
  constructor(id: string, children: readonly Shape[] = []) {
    super(id);
    TreeStructure.initializeGroup(this, children);
  }

  public override getType(): string { return "g"; }
  public override isContainer(): boolean { return true; }
  public override getChildren(): readonly Shape[] { return TreeStructure.getChildren(this); }

  public override captureGeometry(): GeometrySnapshot {
    const children = this.getChildren().map(child => child.captureGeometry());
    return new GeometrySnapshot(this, () => {
      for (const snapshot of children) snapshot.restore();
    });
  }

  protected override planMove(dx: number, dy: number): () => void {
    const plans = this.getChildren().map(child => Group.planChildMove(child, dx, dy));
    return () => { for (const apply of plans) apply(); };
  }

  protected override planScale(factor: number): () => void {
    const plans = this.getChildren().map(child => Group.planChildScale(child, factor));
    return () => { for (const apply of plans) apply(); };
  }
}
