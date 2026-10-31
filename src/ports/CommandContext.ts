import type { SvgDocument } from "../domain/SvgDocument.js";

/** Minimal capability used by commands; no concrete session dependency. */
export interface CommandContext {
  getDocument(): SvgDocument;
}
