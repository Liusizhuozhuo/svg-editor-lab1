import { ShapeFormatter } from "../../presentation/ShapeFormatter.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class ShowCommandParser implements CommandParser {
  constructor(private readonly formatter = new ShapeFormatter()) {}
  public getName(): string { return "show"; }
  public getSyntax(): string { return "show <id>"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.readString("id");
    args.expectEnd();
    return new ParsedCommand(editor => this.formatter.details(editor.getDocument().getShape(id)));
  }
}
