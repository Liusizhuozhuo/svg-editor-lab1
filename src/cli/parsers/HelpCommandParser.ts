import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class HelpCommandParser implements CommandParser {
  constructor(private readonly getHelp: () => string) {}
  public getName(): string { return "help"; }
  public getSyntax(): string { return "help"; }
  public parse(args: TokenCursor): ParsedCommand {
    args.expectEnd();
    return new ParsedCommand(() => this.getHelp());
  }
}
