import type { SvgDocument } from "../domain/SvgDocument.js";
export class DocumentReadResult {
  private readonly warnings: readonly string[];
  constructor(private readonly document: SvgDocument, warnings: readonly string[]) {
    this.warnings = Object.freeze([...warnings]);
  }
  public getDocument(): SvgDocument { return this.document; }
  public getWarnings(): readonly string[] { return this.warnings; }
}
