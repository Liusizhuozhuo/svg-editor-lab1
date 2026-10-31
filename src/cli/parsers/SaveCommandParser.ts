import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";
export class SaveCommandParser implements CommandParser {
  public getName(): string { return "save"; }
  public getSyntax(): string { return "save [path]"; }
  public parse(args: TokenCursor): ParsedCommand {
    const path = args.hasNext() ? args.readString("path") : undefined;
    args.expectEnd();
    return new ParsedCommand(editor => {
      const target = editor.saveDocument(path);
      return `saved to ${target} (${editor.getDocument().getElementCount()} elements)`;
    });
  }
}
