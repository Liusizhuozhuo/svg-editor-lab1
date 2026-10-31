import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";
export class CanvasCommandParser implements CommandParser {
  public getName(): string { return "canvas"; }
  public getSyntax(): string { return "canvas [w h]"; }
  public parse(args: TokenCursor): ParsedCommand {
    const width = args.hasNext() ? args.readNumber("width") : undefined;
    const height = width === undefined ? undefined : args.readNumber("height");
    args.expectEnd();
    return new ParsedCommand(editor => {
      if (width !== undefined && height !== undefined) editor.resizeCanvas(width, height);
      return `canvas ${editor.getDocument().getWidth()}x${editor.getDocument().getHeight()}`;
    });
  }
}
