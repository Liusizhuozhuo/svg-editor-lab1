import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class InitCommandParser implements CommandParser {
  public getName(): string { return "init"; }
  public getSyntax(): string { return "init [w] [h]"; }
  public parse(args: TokenCursor): ParsedCommand {
    const width = args.hasNext() ? args.readNumber("width") : 800;
    const height = args.hasNext() ? args.readNumber("height") : 600;
    args.expectEnd();
    return new ParsedCommand(editor => {
      editor.initialize(width, height);
      return `canvas ${width}x${height} created`;
    });
  }
}
