import { ReadCommandParser } from "./parsers/ReadCommandParser.js";
import { SaveCommandParser } from "./parsers/SaveCommandParser.js";
import { CanvasCommandParser } from "./parsers/CanvasCommandParser.js";
import { DeleteCommandParser } from "./parsers/DeleteCommandParser.js";
import { ScaleCommandParser } from "./parsers/ScaleCommandParser.js";
import { SetCommandParser } from "./parsers/SetCommandParser.js";
import { UngroupCommandParser } from "./parsers/UngroupCommandParser.js";
import { AddToCommandParser } from "./parsers/AddToCommandParser.js";
import { FrontCommandParser } from "./parsers/FrontCommandParser.js";
import { BackCommandParser } from "./parsers/BackCommandParser.js";
import { GroupCommandParser } from "./parsers/GroupCommandParser.js";
import { DomainError } from "../domain/DomainError.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import type { CommandParser } from "./CommandParser.js";
import type { ParsedCommand } from "./ParsedCommand.js";
import { Tokenizer } from "./Tokenizer.js";
import { TokenCursor } from "./TokenCursor.js";
import { InitCommandParser } from "./parsers/InitCommandParser.js";
import { CreateCommandParser } from "./parsers/CreateCommandParser.js";
import { MoveCommandParser } from "./parsers/MoveCommandParser.js";
import { UndoCommandParser } from "./parsers/UndoCommandParser.js";
import { RedoCommandParser } from "./parsers/RedoCommandParser.js";
import { TreeCommandParser } from "./parsers/TreeCommandParser.js";
import { ShowCommandParser } from "./parsers/ShowCommandParser.js";
import { HelpCommandParser } from "./parsers/HelpCommandParser.js";

/** Sole command-name dispatch. TODO: injected command registration in a later phase. */
export class CommandRouter {
  private readonly parsers = new Map<string, CommandParser>();
  private readonly tokenizer = new Tokenizer();
  private readonly factory = new ShapeFactory();

  constructor() {
    const parsers: CommandParser[] = [new ReadCommandParser(), new SaveCommandParser(), new CanvasCommandParser(), new InitCommandParser(), new CreateCommandParser(this.factory),
      new DeleteCommandParser(), new ScaleCommandParser(), new SetCommandParser(), new UngroupCommandParser(), new AddToCommandParser(), new FrontCommandParser(), new BackCommandParser(), new GroupCommandParser(),
      new MoveCommandParser(), new UndoCommandParser(), new RedoCommandParser(),
      new TreeCommandParser(), new ShowCommandParser(), new HelpCommandParser(() => this.getHelp())];
    for (const parser of parsers) this.parsers.set(parser.getName(), parser);
  }

  public parse(line: string): ParsedCommand | undefined {
    const args = new TokenCursor(this.tokenizer.tokenize(line));
    if (!args.hasNext()) return undefined;
    const name = args.readString("command");
    const parser = this.parsers.get(name);
    if (!parser) throw new DomainError(`unknown command: ${name}`);
    return parser.parse(args);
  }

  private getHelp(): string {
    return ["Available commands:", ...[...this.parsers.values()].map(parser => `  ${parser.getSyntax()}`),
      "", "Shape parameters:", ...this.factory.getSyntax().map(syntax => `  ${syntax}`),
      "", 'Use double quotes for arguments containing spaces. Lines starting with # are comments.',
      "EOF or Ctrl+C ends the session."].join("\n");
  }
}
