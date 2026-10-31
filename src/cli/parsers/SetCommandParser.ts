import { SetCommand } from "../../commands/SetCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class SetCommandParser implements CommandParser {
  public getName(): string { return "set"; }
  public getSyntax(): string { return "set <id> <attr> <value>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    const attr = args.readString("attr");
    const value = args.readString("value");
    args.expectEnd();
    const command = new SetCommand(id, attr, value);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
