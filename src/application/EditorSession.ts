import { DomainError } from "../domain/DomainError.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { CommandContext } from "../ports/CommandContext.js";

/** Session state. Application callers replace documents through CommandExecutor. */
export class EditorSession implements CommandContext {
  private document: SvgDocument | undefined;
  private filePath: string | undefined;

  public getDocument(): SvgDocument {
    if (!this.document) throw new DomainError("no document. use 'init' or 'read' first");
    return this.document;
  }

  public getFilePath(): string | undefined { return this.filePath; }

  /** Application-layer write entry, not a CLI or command API. */
  public replaceDocument(document: SvgDocument, filePath?: string): void {
    this.document = document;
    this.filePath = filePath;
  }
}
