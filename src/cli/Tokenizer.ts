import { DomainError } from "../domain/DomainError.js";
import { Token } from "./Token.js";

/** Whole-token double quotes; only backslash and double quote are escaped inside quotes. */
export class Tokenizer {
  public tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith("#")) return [];
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index]!)) { index++; continue; }
      const start = index;
      let value = "";
      const quoted = line[index] === '"';
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const char = line[index]!;
          if (char === '"') { index++; closed = true; break; }
          const next = line[index + 1];
          if (char === "\\" && (next === "\\" || next === '"')) {
            value += next;
            index += 2;
          } else { value += char; index++; }
        }
        if (!closed) throw new DomainError(`unterminated double quote at column ${start + 1}`);
        if (index < line.length && !/\s/.test(line[index]!)) {
          throw new DomainError(`expected whitespace after quote at column ${index + 1}`);
        }
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          if (line[index] === '"') {
            throw new DomainError(`quotes must enclose a whole argument at column ${index + 1}`);
          }
          value += line[index]!;
          index++;
        }
      }
      tokens.push(new Token(value, quoted, start + 1));
    }
    return Object.freeze(tokens);
  }
}
