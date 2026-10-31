import { DomainError } from "../domain/DomainError.js";
import type { CommandContext } from "../ports/CommandContext.js";
import type { CommandResult } from "../commands/CommandResult.js";
import type { UndoableCommand } from "../commands/UndoableCommand.js";

/** Knows only the command protocol, never specific command names or shape types. */
export class CommandHistory {
  private readonly undoStack: UndoableCommand[] = [];
  private readonly redoStack: UndoableCommand[] = [];
  private readonly submitted = new WeakSet<UndoableCommand>();
  private blocked = false;

  constructor(private readonly context: CommandContext) {}

  public execute(command: UndoableCommand): CommandResult {
    this.context.getDocument();
    if (this.submitted.has(command)) throw new DomainError("command has already been submitted");
    const result = command.execute(this.context);
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.submitted.add(command);
    this.blocked = false;
    return result;
  }

  public undo(): CommandResult {
    this.checkAllowed();
    const command = this.undoStack[this.undoStack.length - 1];
    if (!command) throw new DomainError("nothing to undo");
    const result = command.undo(this.context);
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  public redo(): CommandResult {
    this.checkAllowed();
    const command = this.redoStack[this.redoStack.length - 1];
    if (!command) throw new DomainError("nothing to redo");
    const result = command.redo(this.context);
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  /** Invoke only after a successful document operation. Never on a query/failure. */
  public establishBarrier(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blocked = true;
  }

  public getState(): Readonly<{ undoCount: number; redoCount: number; blocked: boolean }> {
    return Object.freeze({ undoCount: this.undoStack.length,
      redoCount: this.redoStack.length, blocked: this.blocked });
  }

  private checkAllowed(): void {
    this.context.getDocument();
    if (this.blocked) throw new DomainError("undo not allowed after io command");
  }
}
