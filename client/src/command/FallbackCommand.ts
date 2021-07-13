import prompts from "prompts";
import { Argv } from "yargs";
import { Command } from "./Command";
import { fetchPackage } from "./FetchCommand";
import { generatePackage } from "./PackageCommand";
import { authenticateToRegistry, logoutFromRegistry } from "./RegistryCommand";
import { handleSearch } from "./SearchCommand";
import { updatePackage } from "./UpdateCommand";

const enum Commands {
	FETCH = "Fetch",
	SEARCH = "Search",
	PACKAGE = "Package",
	UPDATE = "Update",
	LOGIN = "Login",
	LOGOUT = "Logout"
}

export class FallbackCommand implements Command {
	prepareCommand(argv: Argv): Argv {
		return argv.command({
			command: "*",
			describe: "DataPM Actions",
			builder: (yargs) => {
				return yargs
					.command({
						command: "fetch",
						describe: "Fetch data",
						handler: fetchPackage
					})
					.command({
						command: "search",
						describe: "Search for data",
						handler: handleSearch
					})
					.command({
						command: "package",
						describe: "Package data",
						handler: generatePackage
					})
					.command({
						command: "update",
						describe: "Update package",
						handler: updatePackage
					})
					.command({
						command: "registry",
						describe: "registry actions",
						handler: updatePackage
					});
			},
			handler: async () => {
				const commandPromptResult = await prompts({
					type: "select",
					name: "command",
					message: "What action would you like to take?",
					choices: [
						{ title: "Fetch specific data", value: Commands.FETCH },
						{ title: "Search for data", value: Commands.SEARCH },
						{ title: "Package and publish new data", value: Commands.PACKAGE },
						{ title: "Update and publish an existing data package", value: Commands.UPDATE },
						{ title: "Log into a registry", value: Commands.LOGIN },
						{ title: "Log out of a registry", value: Commands.LOGOUT }
					],
					initial: 0
				});

				if (commandPromptResult.command === Commands.FETCH) {
					await this.runFetchCommand();
				} else if (commandPromptResult.command === Commands.SEARCH) {
					await this.runSearchCommand();
				} else if (commandPromptResult.command === Commands.PACKAGE) {
					await this.runPackageCommand();
				} else if (commandPromptResult.command === Commands.UPDATE) {
					await this.runUpdateCommand();
				} else if (commandPromptResult.command === Commands.LOGIN) {
					await this.runLoginCommand();
				} else if (commandPromptResult.command === Commands.LOGOUT) {
					await this.runLogoutCommand();
				}
			}
		});
	}

	async runFetchCommand(): Promise<void> {
		await fetchPackage({});
	}

	async runSearchCommand(): Promise<void> {
		await handleSearch({});
	}

	async runPackageCommand(): Promise<void> {
		await generatePackage({});
	}

	async runUpdateCommand(): Promise<void> {
		await updatePackage({});
	}

	async runLoginCommand(): Promise<void> {
		await authenticateToRegistry({});
	}

	async runLogoutCommand(): Promise<void> {
		await logoutFromRegistry({});
	}
}
