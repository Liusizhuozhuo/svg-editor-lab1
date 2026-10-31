import { ScaleCommand } from "../../commands/ScaleCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class ScaleCommandParser implements CommandParser {
  public getName(): string { return "scale"; }
  public getSyntax(): string { return "scale <id> <factor>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    const factor = args.readNumber("factor");
    args.expectEnd();
    const command = new ScaleCommand(id, factor);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
