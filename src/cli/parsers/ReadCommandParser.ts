import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";
export class ReadCommandParser implements CommandParser {
  public getName(): string { return "read"; }
  public getSyntax(): string { return "read <path>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const path = args.readString("path");
    args.expectEnd();
    return new ParsedCommand(editor => {
      const result = editor.readDocument(path);
      return [...result.getWarnings(), `read ${path} (${result.getDocument().getElementCount()} elements)`].join("\n");
    });
  }
}
