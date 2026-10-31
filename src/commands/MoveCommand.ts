import { DomainError } from "../domain/DomainError.js";
import type { GeometrySnapshot } from "../domain/GeometrySnapshot.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { CommandResult } from "./CommandResult.js";
import { EditCommand } from "./EditCommand.js";

export class MoveCommand extends EditCommand {
  private target: Shape | undefined;
  private before: GeometrySnapshot | undefined;
  private after: GeometrySnapshot | undefined;

  constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number
  ) { super(); }

  protected override apply(document: SvgDocument): CommandResult {
    const target = document.getShape(this.id);
    const before = target.captureGeometry();
    target.move(this.dx, this.dy);
    this.target = target;
    this.before = before;
    this.after = target.captureGeometry();
    return this.movedResult();
  }

  protected override revert(document: SvgDocument): CommandResult {
    this.assertTarget(document);
    this.before!.restore();
    return new CommandResult(`${this.target!.getType()}#${this.id} move undone`);
  }

  protected override reapply(document: SvgDocument): CommandResult {
    this.assertTarget(document);
    this.after!.restore();
    return this.movedResult();
  }

  private assertTarget(document: SvgDocument): void {
    if (document.getShape(this.id) !== this.target) {
      throw new DomainError("cannot restore move: target shape changed");
    }
  }

  private movedResult(): CommandResult {
    return new CommandResult(`${this.target!.getType()}#${this.id} moved by (${this.dx},${this.dy})`);
  }
}
