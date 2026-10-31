import { CommandExecutor } from "./application/CommandExecutor.js";
import { SvgFileRepository } from "./infrastructure/SvgFileRepository.js";
import { CliApplication } from "./cli/CliApplication.js";

// Composition root: connect the terminal adapter to the application.
await new CliApplication(new CommandExecutor(new SvgFileRepository())).run();
