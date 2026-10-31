import { DomainError } from "../domain/DomainError.js";
export class XmlEscaper {
  public static validate(value: string): void {
    for (const char of value) {
      const code = char.codePointAt(0)!;
      if (!(code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff))) {
        throw new DomainError("invalid XML character");
      }
    }
  }
  public static text(value: string): string {
    this.validate(value);
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\r", "&#13;");
  }
  public static attribute(value: string): string {
    return this.text(value).replaceAll('"', "&quot;").replaceAll("\n", "&#10;").replaceAll("\t", "&#9;");
  }
}
