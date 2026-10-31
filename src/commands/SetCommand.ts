import { DomainError } from "../domain/DomainError.js";
import type { AttributeSnapshot } from "../domain/AttributeSnapshot.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { CommandResult } from "./CommandResult.js";
import { EditCommand } from "./EditCommand.js";

export class SetCommand extends EditCommand {
  private target: Shape | undefined;
  private before: AttributeSnapshot | undefined;
  private after: AttributeSnapshot | undefined;

  constructor(
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string | number
  ) { super(); }

  protected override apply(document: SvgDocument): CommandResult {
    const target = document.getShape(this.id);
    const before = target.captureAttributes();
    target.setAttribute(this.attribute, this.value);
    this.target = target;
    this.before = before;
    this.after = target.captureAttributes();
    return this.updatedResult();
  }

  protected override revert(document: SvgDocument): CommandResult {
    this.assertTarget(document);
    this.before!.restore();
    return new CommandResult(`${this.target!.getType()}#${this.id} attribute change undone`);
  }

  protected override reapply(document: SvgDocument): CommandResult {
    this.assertTarget(document);
    this.after!.restore();
    return this.updatedResult();
  }

  private assertTarget(document: SvgDocument): void {
    if (document.getShape(this.id) !== this.target) {
      throw new DomainError("cannot restore attribute: target shape changed");
    }
  }

  private updatedResult(): CommandResult {
    return new CommandResult(`${this.target!.getType()}#${this.id} updated: ${this.attribute}=${JSON.stringify(this.value)}`);
  }
}
