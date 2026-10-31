import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class UndoCommandParser implements CommandParser {
  public getName(): string { return "undo"; }
  public getSyntax(): string { return "undo"; }
  public parse(args: TokenCursor): ParsedCommand {
    args.expectEnd();
    return new ParsedCommand(editor => editor.undo().getSummary());
  }
}
