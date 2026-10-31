import { DomainError } from "./DomainError.js";

/** Only topology/ownership/index are captured; geometry and styles remain on objects. */
export class DocumentStructureSnapshot {
  constructor(private readonly matches: () => boolean, private readonly restoreTree: () => void) {}
  public assertCurrent(): void {
    if (!this.matches()) throw new DomainError("cannot restore history: document structure changed");
  }
  public restore(): void { this.restoreTree(); }
}
