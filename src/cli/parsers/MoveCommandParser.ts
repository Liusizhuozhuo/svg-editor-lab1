import { MoveCommand } from "../../commands/MoveCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class MoveCommandParser implements CommandParser {
  public getName(): string { return "move"; }
  public getSyntax(): string { return "move <id> <dx> <dy>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    const dx = args.readNumber("dx");
    const dy = args.readNumber("dy");
    args.expectEnd();
    const command = new MoveCommand(id, dx, dy);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
