import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class RedoCommandParser implements CommandParser {
  public getName(): string { return "redo"; }
  public getSyntax(): string { return "redo"; }
  public parse(args: TokenCursor): ParsedCommand {
    args.expectEnd();
    return new ParsedCommand(editor => editor.redo().getSummary());
  }
}
