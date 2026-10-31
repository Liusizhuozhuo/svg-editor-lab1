import type { ParsedCommand } from "./ParsedCommand.js";
import type { TokenCursor } from "./TokenCursor.js";

export interface CommandParser {
  getName(): string;
  getSyntax(): string;
  parse(args: TokenCursor): ParsedCommand;
}
