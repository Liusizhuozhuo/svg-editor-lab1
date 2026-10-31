import { AddToCommand } from "../../commands/AddToCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class AddToCommandParser implements CommandParser {
  public getName(): string { return "addto"; }
  public getSyntax(): string { return "addto <gid> <id>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const gid = args.readString("gid");
    const id = args.readString("id");
    args.expectEnd();
    const command = new AddToCommand(gid, id);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
