import { DeleteCommand } from "../../commands/DeleteCommand.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class DeleteCommandParser implements CommandParser {
  public getName(): string { return "delete"; }
  public getSyntax(): string { return "delete <id>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    args.expectEnd();
    const command = new DeleteCommand(id);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
