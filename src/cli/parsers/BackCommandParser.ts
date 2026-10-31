import { BackCommand } from "../../commands/BackCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class BackCommandParser implements CommandParser {
  public getName(): string { return "back"; }
  public getSyntax(): string { return "back <id>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    args.expectEnd();
    const command = new BackCommand(id);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
