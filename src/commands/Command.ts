import type { CommandContext } from "../ports/CommandContext.js";
import type { CommandResult } from "./CommandResult.js";

export interface Command {
  execute(context: CommandContext): CommandResult;
}
