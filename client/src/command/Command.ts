import { Argv } from "yargs";

export interface Command {
	prepareCommand(argv: Argv): Argv;
}
