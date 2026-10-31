import type { CommandExecutor } from "../application/CommandExecutor.js";

/** A validated CLI request; editable requests delegate to real Command objects. */
export class ParsedCommand {
  constructor(private readonly action: (editor: CommandExecutor) => string) {}
  public execute(editor: CommandExecutor): string { return this.action(editor); }
}
