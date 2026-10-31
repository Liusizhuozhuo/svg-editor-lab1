import type { SvgDocument } from "../domain/SvgDocument.js";
import { CommandResult } from "./CommandResult.js";
import { StructuralEditCommand } from "./StructuralEditCommand.js";

export class UngroupCommand extends StructuralEditCommand {
  constructor(private readonly id: string) { super(); }
  protected override change(document: SvgDocument): CommandResult {
    document.ungroup(this.id);
    return new CommandResult(`g#${this.id} ungrouped`);
  }
}
