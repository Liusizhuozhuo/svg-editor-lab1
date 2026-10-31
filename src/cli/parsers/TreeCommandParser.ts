import { TreeFormatter } from "../../presentation/TreeFormatter.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class TreeCommandParser implements CommandParser {
  constructor(private readonly formatter = new TreeFormatter()) {}
  public getName(): string { return "tree"; }
  public getSyntax(): string { return "tree [id]"; }
  public parse(args: TokenCursor): ParsedCommand {
    const id = args.hasNext() ? args.readString("id") : undefined;
    args.expectEnd();
    return new ParsedCommand(editor => this.formatter.format(editor.getDocument(), id));
  }
}
