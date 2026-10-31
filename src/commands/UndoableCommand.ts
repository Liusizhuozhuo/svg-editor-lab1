import type { CommandContext } from "../ports/CommandContext.js";
import type { Command } from "./Command.js";
import type { CommandResult } from "./CommandResult.js";

export interface UndoableCommand extends Command {
  undo(context: CommandContext): CommandResult;
  redo(context: CommandContext): CommandResult;
}
