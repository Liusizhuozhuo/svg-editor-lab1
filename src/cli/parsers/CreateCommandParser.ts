import { CreateCommand } from "../../commands/CreateCommand.js";
import { DomainError } from "../../domain/DomainError.js";
import { ShapeFactory } from "../../domain/ShapeFactory.js";
import type { CommandParser } from "../CommandParser.js";
import { ParsedCommand } from "../ParsedCommand.js";
import type { TokenCursor } from "../TokenCursor.js";

export class CreateCommandParser implements CommandParser {
  constructor(private readonly factory: ShapeFactory) {}
  public getName(): string { return "create"; }
  public getSyntax(): string { return "create <type> <id> [params...] [in <containerId>]"; }
  public parse(args: TokenCursor): ParsedCommand {
    const type = args.readString("type");
    const id = args.readString("id");
    let values = [...args.takeRemaining()];
    let parentId: string | undefined;
    const marker = values[values.length - 2];
    if (marker?.getValue() === "in" && !marker.isQuoted()) {
      parentId = values[values.length - 1]!.getValue();
      values = values.slice(0, -2);
    } else {
      const last = values[values.length - 1];
      if (last?.getValue() === "in" && !last.isQuoted()) {
        throw new DomainError("missing argument: containerId");
      }
    }
    const shape = this.factory.create(type, id, values.map(token => token.getValue()));
    const command = new CreateCommand(shape, parentId);
    return new ParsedCommand(editor => editor.execute(command).getSummary());
  }
}
