import { CliApplication } from "./cli/CliApplication.js";

// Composition root: connect the terminal adapter to the application.
await new CliApplication().run();
