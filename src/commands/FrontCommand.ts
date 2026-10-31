import type { SvgDocument } from "../domain/SvgDocument.js";
import { CommandResult } from "./CommandResult.js";
import { StructuralEditCommand } from "./StructuralEditCommand.js";

export class FrontCommand extends StructuralEditCommand {
  constructor(private readonly id: string) { super(); }
  protected override change(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    document.bringToFront(this.id);
    return new CommandResult(`${shape.getType()}#${this.id} moved to front`);
  }
}
