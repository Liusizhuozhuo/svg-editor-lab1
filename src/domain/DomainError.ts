/** Domain messages have no CLI prefix; the presentation layer adds it. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
