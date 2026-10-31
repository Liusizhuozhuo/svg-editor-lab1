import { UngroupCommand } from "../../commands/UngroupCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class UngroupCommandParser implements CommandParser {
  public getName(): string { return "ungroup"; }
  public getSyntax(): string { return "ungroup <gid>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const gid = args.readString("gid");
    args.expectEnd();
    const command = new UngroupCommand(gid);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
