import { DomainError } from "../domain/DomainError.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { CommandResult } from "./CommandResult.js";
import { EditCommand } from "./EditCommand.js";

/** Receives an already constructed shape; parsing and shape factories come later. */
export class CreateCommand extends EditCommand {
  private insertedAt: number | undefined;

  constructor(
    private readonly shape: Shape,
    private readonly parentId?: string,
    private readonly position?: number
  ) { super(); }

  protected override apply(document: SvgDocument): CommandResult {
    document.insert(this.shape, this.parentId, this.position);
    this.insertedAt = document.getLocation(this.shape.getId()).index;
    return this.createdResult();
  }

  protected override revert(document: SvgDocument): CommandResult {
    if (document.getShape(this.shape.getId()) !== this.shape) {
      throw new DomainError("cannot undo create: target shape changed");
    }
    document.remove(this.shape.getId());
    return new CommandResult(`${this.shape.getType()}#${this.shape.getId()} creation undone`);
  }

  protected override reapply(document: SvgDocument): CommandResult {
    document.insert(this.shape, this.parentId, this.insertedAt);
    return this.createdResult();
  }

  private createdResult(): CommandResult {
    const parent = this.parentId === undefined ? "" : ` in g#${this.parentId}`;
    return new CommandResult(`${this.shape.getType()}#${this.shape.getId()} created${parent}`);
  }
}
