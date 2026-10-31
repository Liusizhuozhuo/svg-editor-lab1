import { DomainError } from "../domain/DomainError.js";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import type { DocumentReadResult } from "../ports/DocumentReadResult.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { UndoableCommand } from "../commands/UndoableCommand.js";
import type { CommandResult } from "../commands/CommandResult.js";
import { CommandHistory } from "./CommandHistory.js";
import { EditorSession } from "./EditorSession.js";

/** Entry for application edits. No terminal IO, file IO or command-name dispatch. */
export class CommandExecutor {
  private readonly session = new EditorSession();
  private readonly history = new CommandHistory(this.session);

  constructor(private readonly repository?: DocumentRepository) {}

  public readDocument(path: string): DocumentReadResult {
    if (!this.repository) throw new DomainError("document repository is not configured");
    const result = this.repository.read(path);
    this.replaceDocument(result.getDocument(), path);
    return result;
  }
  public saveDocument(path?: string): string {
    const document = this.getDocument();
    const target = path ?? this.getFilePath();
    if (!target) throw new DomainError("no file path. use 'save <path>' first");
    if (!this.repository) throw new DomainError("document repository is not configured");
    this.repository.save(target, document);
    this.replaceDocument(document, target);
    return target;
  }
  public resizeCanvas(width: number, height: number): void {
    this.getDocument().resize(width, height);
    this.markDocumentOperation();
  }

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

  /** Successful document operations call this; not itself an IO command. */
  public markDocumentOperation(): void {
    this.session.getDocument();
    this.history.establishBarrier();
  }
}
