import { FrontCommand } from "../../commands/FrontCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class FrontCommandParser implements CommandParser {
  public getName(): string { return "front"; }
  public getSyntax(): string { return "front <id>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    args.expectEnd();
    const command = new FrontCommand(id);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
