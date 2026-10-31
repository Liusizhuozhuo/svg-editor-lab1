import { DomainError } from "../domain/DomainError.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { CommandContext } from "../ports/CommandContext.js";
import type { CommandResult } from "./CommandResult.js";
import type { UndoableCommand } from "./UndoableCommand.js";

/** One instance represents one edit, bound to one document after success. */
export abstract class EditCommand implements UndoableCommand {
  private phase: "new" | "done" | "undone" = "new";
  private document: SvgDocument | undefined;

  public execute(context: CommandContext): CommandResult {
    if (this.phase !== "new") throw new DomainError("command has already been executed");
    const document = context.getDocument();
    const result = this.apply(document);
    this.document = document;
    this.phase = "done";
    return result;
  }

  public undo(context: CommandContext): CommandResult {
    const document = this.requireDocument(context, "done");
    const result = this.revert(document);
    this.phase = "undone";
    return result;
  }

  public redo(context: CommandContext): CommandResult {
    const document = this.requireDocument(context, "undone");
    const result = this.reapply(document);
    this.phase = "done";
    return result;
  }

  protected abstract apply(document: SvgDocument): CommandResult;
  protected abstract revert(document: SvgDocument): CommandResult;
  protected abstract reapply(document: SvgDocument): CommandResult;

  private requireDocument(context: CommandContext, phase: "done" | "undone"): SvgDocument {
    if (this.phase !== phase) throw new DomainError("invalid command lifecycle");
    const document = context.getDocument();
    if (document !== this.document) throw new DomainError("command belongs to a different document");
    return document;
  }
}
