import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { CommandExecutor } from "../application/CommandExecutor.js";
import { CommandRouter } from "./CommandRouter.js";

/** IO boundary: scripted input and interactive input execute the same request path. */
export class CliApplication {
  constructor(
    private readonly editor = new CommandExecutor(),
    private readonly router = new CommandRouter()
  ) {}

  public executeLine(line: string): string | undefined {
    return this.router.parse(line)?.execute(this.editor);
  }

  public async run(
    input: Readable = process.stdin,
    output: Writable = process.stdout,
    errors: Writable = process.stderr,
    interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  ): Promise<void> {
    const lines = createInterface({ input, output, terminal: interactive, crlfDelay: Infinity });
    if (interactive) {
      output.write("svg-editor 0.1 - type 'help' for commands\n");
      lines.setPrompt("svg> ");
      lines.prompt();
    }
    try {
      for await (const line of lines) {
        try {
          const result = this.executeLine(line);
          if (result !== undefined) output.write(`${result}\n`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.write(`error: ${message.replace(/[\r\n]+/g, " ")}\n`);
        }
        if (interactive) lines.prompt();
      }
    } finally {
      lines.close();
    }
  }
}
