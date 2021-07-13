import ora from "ora";
import { Argv } from "yargs";
import { getQueryEngine } from "../query/QueryUtil";
import { Command } from "./Command";

class QueryArguments {
	statement: string;
}

export class QueryCommand implements Command {
	prepareCommand(argv: Argv): Argv {
		return argv.command({
			command: "query <statement>",
			describe: "Perform an SQL based query",
			builder: (argv) => {
				return argv
					.positional("statement", {
						describe: "SQL tables reference data type identiifers",
						demandOption: true,
						type: "string"
					})
					.help();
			},
			handler: this.runQuery
		});
	}

	async runQuery(argv: QueryArguments): Promise<void> {
		const oraRef = ora({
			color: "yellow",
			spinner: "dots"
		});

		oraRef.start("Looking for query engine...");

		const queryEngine = getQueryEngine("postgres");

		if (queryEngine == null) {
			oraRef.fail("Query engine postgres not found");
			process.exit(0);
		}

		oraRef.text = "Starting query engine...";

		// Parse the query, and find the replacement tokens
		const matches = (argv.statement as string).match(/{(?:[^}{]+)*}/g);
		if (matches == null) {
			oraRef.fail("Found no package identifiers in the query.");
			return;
		}

		await Promise.all(
			Array.from(
				matches.map(() => {
					return new Promise<void>((resolve) => {
						// const referenceString = match.replace(/{|}/g, "");

						// const packageFileWithContext = (await getPackage(referenceString)) as PackageFileWithContext;

						// const packageFileWithContext = (await getPackage(referenceString)) as PackageFileWithContext;

						// TODO - do something WAY better here. Require full versioned data types?
						// const packageFile = packageFileWithContext.packageFile;

						// Get the pre-configured sink from the query engine

						resolve();
					});
				})
			)
		);

		// const startSuccess = await queryEngine.prepare();

		oraRef.succeed("Query engine started");

		oraRef.start("Fetching data...");
	}
}
