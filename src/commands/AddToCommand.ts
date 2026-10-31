import type { SvgDocument } from "../domain/SvgDocument.js";
import { CommandResult } from "./CommandResult.js";
import { StructuralEditCommand } from "./StructuralEditCommand.js";

export class AddToCommand extends StructuralEditCommand {
  constructor(private readonly gid: string, private readonly id: string) { super(); }
  protected override change(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    document.reparent(this.id, this.gid);
    return new CommandResult(`${shape.getType()}#${this.id} moved into g#${this.gid}`);
  }
}
