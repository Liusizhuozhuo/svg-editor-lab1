import type { SvgDocument } from "../domain/SvgDocument.js";
import { CommandResult } from "./CommandResult.js";
import { StructuralEditCommand } from "./StructuralEditCommand.js";

export class GroupCommand extends StructuralEditCommand {
  private readonly ids: readonly string[];
  constructor(private readonly newId: string, ids: readonly string[]) {
    super();
    this.ids = [...ids];
  }
  protected override change(document: SvgDocument): CommandResult {
    const group = document.group(this.newId, this.ids);
    return new CommandResult(`g#${this.newId} created with ${group.getChildren().length} children`);
  }
}
