/** Opaque property memento, including absence of optional SVG styles. */
export class AttributeSnapshot {
  constructor(private readonly restoreValues: () => void) {}
  public restore(): void { this.restoreValues(); }
}
