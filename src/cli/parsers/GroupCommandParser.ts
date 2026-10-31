import { GroupCommand } from "../../commands/GroupCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class GroupCommandParser implements CommandParser {
  public getName(): string { return "group"; }
  public getSyntax(): string { return "group <newGid> <id1> [id2 ...]"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("newGid");
    const ids = [args.readString("id1")];
    while (args.hasNext()) ids.push(args.readString("shapeId"));
    const command = new GroupCommand(id, ids);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
