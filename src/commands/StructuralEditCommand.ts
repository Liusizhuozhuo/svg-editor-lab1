import type { DocumentStructureSnapshot } from "../domain/DocumentStructureSnapshot.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { CommandResult } from "./CommandResult.js";
import { EditCommand } from "./EditCommand.js";

/** Whole-document topology mementos make compound edits one undo unit. */
export abstract class StructuralEditCommand extends EditCommand {
  private before: DocumentStructureSnapshot | undefined;
  private after: DocumentStructureSnapshot | undefined;
  private result: CommandResult | undefined;
  protected abstract change(document: SvgDocument): CommandResult;

  protected override apply(document: SvgDocument): CommandResult {
    const before = document.captureStructure();
    const result = this.change(document);
    this.before = before;
    this.after = document.captureStructure();
    this.result = result;
    return result;
  }
  protected override revert(_document: SvgDocument): CommandResult {
    this.after!.assertCurrent();
    this.before!.restore();
    return new CommandResult(`undone: ${this.result!.getSummary()}`);
  }
  protected override reapply(_document: SvgDocument): CommandResult {
    this.before!.assertCurrent();
    this.after!.restore();
    return this.result!;
  }
}
