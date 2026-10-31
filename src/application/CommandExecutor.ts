import { SvgDocument } from "../domain/SvgDocument.js";
import type { UndoableCommand } from "../commands/UndoableCommand.js";
import type { CommandResult } from "../commands/CommandResult.js";
import { CommandHistory } from "./CommandHistory.js";
import { EditorSession } from "./EditorSession.js";

/** Entry for application edits. No terminal IO, file IO or command-name dispatch. */
export class CommandExecutor {
  private readonly session = new EditorSession();
  private readonly history = new CommandHistory(this.session);

  public initialize(width = 800, height = 600): void {
    // Construction may fail; do not touch the old session/history until it succeeds.
    this.replaceDocument(new SvgDocument(width, height));
  }

  public replaceDocument(document: SvgDocument, filePath?: string): void {
    this.session.replaceDocument(document, filePath);
    this.history.establishBarrier();
  }

  public getDocument(): SvgDocument { return this.session.getDocument(); }
  public getFilePath(): string | undefined { return this.session.getFilePath(); }
  public execute(command: UndoableCommand): CommandResult { return this.history.execute(command); }
  public undo(): CommandResult { return this.history.undo(); }
  public redo(): CommandResult { return this.history.redo(); }
  public getHistoryState(): ReturnType<CommandHistory["getState"]> { return this.history.getState(); }

  /** Future successful save/canvas operations call this; not itself an IO command. */
  public markDocumentOperation(): void {
    this.session.getDocument();
    this.history.establishBarrier();
  }
}
