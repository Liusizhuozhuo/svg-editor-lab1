import { readFileSync, openSync, writeFileSync, closeSync, renameSync, unlinkSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { DomainError } from "../domain/DomainError.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import type { DocumentReadResult } from "../ports/DocumentReadResult.js";
import { SvgReader } from "./SvgReader.js";
import { SvgWriter } from "./SvgWriter.js";

export class SvgFileRepository implements DocumentRepository {
  public read(path: string): DocumentReadResult {
    let source: string;
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)); }
    catch { throw new DomainError(`cannot read file: ${path}`); }
    return new SvgReader().read(source);
  }
  public save(path: string, document: SvgDocument): void {
    const source = new SvgWriter().write(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    let created = false;
    try {
      descriptor = openSync(temporary, "wx");
      created = true;
      writeFileSync(descriptor, source, "utf8");
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, path);
      created = false;
    } catch { throw new DomainError(`cannot write file: ${path}`); }
    finally {
      if (descriptor !== undefined) { try { closeSync(descriptor); } catch { /* Preserve original error. */ } }
      if (created) { try { unlinkSync(temporary); } catch { /* Best-effort cleanup of this save's temporary file. */ } }
    }
  }
}
