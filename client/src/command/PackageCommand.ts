import chalk from "chalk";
import {
	packageSlugValid,
	DerivedFrom,
	DPMConfiguration,
	PackageFile,
	Properties,
	Schema,
	Source,
	StreamSet
} from "datapm-lib";
import { JSONSchema7TypeName } from "json-schema";
import numeral from "numeral";
import ora from "ora";
import { exit } from "process";
import prompts from "prompts";
import { Argv } from "yargs";
import {
	findSourceForUri,
	generateSchemasFromSourceStreams,
	getSources,
	getSourceByType,
	InspectionResults,
	InspectProgress,
	SourceInterface,
	StreamSetPreview,
	SourceInspectionContext,
	SourceStreamsInspectionResult
} from "../source/SourceUtil";
import { validPackageDisplayName, validShortPackageDescription, validUnit, validVersion } from "../util/IdentifierUtil";
import { LogType } from "../util/LoggingUtils";
import { nameToSlug } from "../util/NameUtil";
import { writeLicenseFile, writePackageFile, writeReadmeFile, PublishType } from "../util/PackageUtil";
import { cliHandleParameters, defaultPromptOptions } from "../util/ParameterUtils";
import * as SchemaUtil from "../util/SchemaUtil";
import { Command } from "./Command";
import { PublishPackageCommand } from "./PublishPackageCommand";

class PackageArguments {
	defaults?: boolean;
	sourceConfiguration?: string;
	urls?: string[];
}

export class PackageCommand implements Command {
	prepareCommand(argv: Argv): Argv {
		return argv.command({
			command: "package [urls..]",
			describe: "Generate a new package listing file (ex: datapm-package.json) from a url",
			builder: (argv) =>
				argv
					.positional("urls", {
						describe: "The url(s) of the data",
						demandOption: false,
						array: true,
						type: "string"
					})
					.option("defaults", {
						type: "boolean",
						describe:
							"Use default user friendly/short package name, starting version and short package description"
					})
					.option("sourceConfiguration", {
						describe: "JSON object for configuring source",
						type: "string"
					})
					.help(),
			handler: (argv: PackageArguments) => {
				generatePackage(argv);
			}
		});
	}
}

export async function generatePackage(argv: PackageArguments): Promise<void> {
	const oraRef = ora({
		color: "yellow",
		spinner: "dots",
		text: `Inspecting URIs...`
	});

	let sourceConfiguration: DPMConfiguration = {};
	if (argv.sourceConfiguration) {
		try {
			const correctJson = argv.sourceConfiguration.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');

			sourceConfiguration = JSON.parse(correctJson);
		} catch (error) {
			oraRef.fail("Could not parse the sourceConfiguration parameter as JSON");
			process.exit(1);
		}
	}

	// Inspecting source

	let source: SourceInterface;

	if (argv.urls == null || argv.urls.length === 0) {
		const urlsPromptResult = await prompts(
			{
				type: "select",
				name: "source",
				message: "Source?",
				choices: getSources()
					.sort((a, b) => a.sourceType().localeCompare(b.sourceType()))
					.map((s) => {
						return { value: s.sourceType(), title: s.sourceType() };
					})
					.sort((a, b) => a.title.localeCompare(b.title))
			},
			defaultPromptOptions
		);
		const maybeSource = getSourceByType(urlsPromptResult.source);

		if (maybeSource == null) throw new Error("SOURCE_NOT_FOUND - " + urlsPromptResult.source);

		source = maybeSource;
	} else {
		let uris = [];
		if (Array.isArray(argv.urls)) {
			uris = argv.urls;
		} else {
			uris = [argv.urls];
		}

		sourceConfiguration.uris = uris;
		try {
			source = await findSourceForUri(uris[0]);
			oraRef.succeed(`Found ${source.sourceType()} source`);
		} catch (error) {
			oraRef.fail("No source implementation found to inspect this data - " + uris[0]);
			exit(1);
		}
	}

	const sourceInspectionContext: SourceInspectionContext = {
		defaults: argv.defaults || false,
		quiet: false,
		log: (type, message) => {
			if (type === LogType.INFO) oraRef.info(message);
			else if (type === LogType.WARN) oraRef.warn(message);
			else if (type === LogType.DEBUG) console.debug(message);
			else if (type === LogType.ERROR) oraRef.fail(message);
		},
		parameterPrompt: async (parameters) => {
			await cliHandleParameters(argv.defaults || false, parameters);
		}
	};

	const uriInspectionResults = await inspectSource(source, sourceInspectionContext, oraRef, sourceConfiguration);

	console.log("");
	console.log(chalk.magenta("Inspecting Data Streams"));
	oraRef.succeed("Found " + uriInspectionResults.streamSetPreviews.length + " stream sets ");

	const schemas: Record<string, Schema> = {};

	const streamSets: StreamSet[] = [];

	for (const streamSetPreview of uriInspectionResults.streamSetPreviews) {
		const sourceStreamInspectionResults = await inspectStreamSet(
			streamSetPreview,
			sourceInspectionContext,
			oraRef,
			sourceConfiguration
		);

		sourceStreamInspectionResults.schemas.forEach((schema) => {
			if (schema.title == null) throw new Error("SCHEMA_HAS_NO_TITLE");

			schemas[schema.title] = schema;
		});

		console.log("");
		const streamSet: StreamSet = {
			slug: streamSetPreview.slug,
			configuration: streamSetPreview.configuration,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			schemaTitles: sourceStreamInspectionResults.schemas.map((s) => s.title!),
			streamStats: sourceStreamInspectionResults.streamStats
		};

		streamSets.push(streamSet);
	}

	const sanitizedSourceConfiguration = { ...sourceConfiguration };
	source.removeSecretConfigValues(sanitizedSourceConfiguration);

	const sourceObject: Source = {
		slug: source.sourceType(),
		streamSets,
		type: source.sourceType(),
		configuration: sanitizedSourceConfiguration
	};
	// build sources array

	for (const schema of Object.values(schemas)) {
		SchemaUtil.print(schema);

		if (!argv.defaults) await schemaSpecificQuestions(schema);
	}

	// Prompt Display Name
	let displayNameResponse: prompts.Answers<"displayName">;
	if (argv.defaults) {
		displayNameResponse = {
			displayName: uriInspectionResults.defaultDisplayName
		};
		const validateResult = validPackageDisplayName(displayNameResponse.displayName);
		if (validateResult !== true) {
			console.log(chalk.red(validateResult));
			process.exit(1);
		}
		console.log(`Default user friendly package name: ${displayNameResponse.displayName}`);
	} else {
		console.log("");
		console.log(chalk.magenta("Package Details"));
		displayNameResponse = await prompts(
			[
				{
					type: "text",
					name: "displayName",
					message: "User friendly package name?",
					validate: validPackageDisplayName
				}
			],
			defaultPromptOptions
		);
	}

	// Prompt Package Slug, Version, Description
	const suggestedSlug = nameToSlug(displayNameResponse.displayName as string);

	let responses: prompts.Answers<"packageSlug" | "version" | "description" | "website" | "sampleRecordCount">;

	if (argv.defaults) {
		responses = {
			packageSlug: suggestedSlug,
			version: "1.0.0",
			description: `Generated from ${argv.urls}`,
			website: "", // TODO - Better websites defaults. Handle github, etc,
			sampleRecordCount: 100
		};
		console.log(`Default package short name: ${responses.packageSlug}`);
		console.log(`Default starting version: ${responses.version}`);
		console.log(`Default short package description: ${responses.description}`);
	} else {
		responses = await prompts(
			[
				{
					type: "text",
					name: "packageSlug",
					message: "Package short name?",
					initial: suggestedSlug,
					validate: (value) => {
						const slugValid = packageSlugValid(value);

						if (slugValid === "PACKAGE_SLUG_INVALID") {
							return "Must include only letters, numbers, periods, underscores, and hyphens";
						} else if (slugValid === "PACKAGE_SLUG_REQUIRED") {
							return "A slug is required";
						} else if (slugValid === "PACKAGE_SLUG_TOO_LONG") {
							return "Must be less than 39 charaters";
						}

						return true;
					}
				},
				{
					type: "text",
					name: "version",
					message: "Starting version?",
					initial: "1.0.0",
					validate: validVersion
				},
				{
					type: "text",
					name: "description",
					message: "Short package description?",
					validate: validShortPackageDescription
				},
				{
					type: "text",
					name: "website",
					message: "Website?",
					validate: validUrl
				},
				{
					type: "number",
					name: "sampleRecordCount",
					message: "Number of sample records?",
					initial: 100,
					validate: validSampleRecordCount
				}
			],
			defaultPromptOptions
		);
	}

	for (const schema of Object.values(schemas)) {
		if (responses.sampleRecordCount > 0) {
			if (schema.sampleRecords)
				schema.sampleRecords = schema.sampleRecords.splice(0, responses.sampleRecordCount);
		} else {
			delete schema.sampleRecords;
		}
	}

	// Writing Package, ReadMe, License Files
	const packageFile: PackageFile = {
		$schema: new PackageFile().$schema,
		sources: [sourceObject],
		generatedBy:
			"`datapm package` command. Visit datapm.io to learn about the tools and to discover other data packages",
		updatedDate: new Date(),
		displayName: displayNameResponse.displayName,
		packageSlug: responses.packageSlug,
		version: responses.version,
		description: responses.description,
		readmeFile: `${responses.packageSlug}.README.md`,
		licenseFile: `${responses.packageSlug}.LICENSE.md`,
		website: responses.website,
		schemas: Object.values(schemas)
	};

	oraRef.start("Writing package file...");
	let packageFileLocation;

	try {
		packageFileLocation = writePackageFile(packageFile);

		oraRef.succeed(`Wrote package file ${packageFileLocation}`);
	} catch (error) {
		oraRef.fail(`Unable to write the package file: ${error.message}`);
		process.exit(1);
	}

	oraRef.start("Writing README file...");
	try {
		const readmeFileLocation = writeReadmeFile(packageFile);

		oraRef.succeed(`Wrote README file ${readmeFileLocation}`);
	} catch (error) {
		oraRef.fail(`Unable to write the README file: ${error.message}`);
		process.exit(1);
	}

	oraRef.start("Writing LICENSE file...");
	try {
		const licenseFileLocation = writeLicenseFile(packageFile);

		oraRef.succeed(`Wrote LICENSE file ${licenseFileLocation}`);
	} catch (error) {
		oraRef.fail(`Unable to write the LICENSE file: ${error.message}`);
		process.exit(1);
	}

	// Output Results
	if (argv.defaults) {
		console.log("");
		console.log(chalk.grey("When you are ready, you can publish with the following command"));
		console.log(chalk.green(`datapm publish ${packageFileLocation}`));
		process.exit(0);
	}

	console.log("");
	console.log(chalk.magenta("Publishing Options"));
	const schemaPublishResponse = await prompts(
		[
			{
				type: "select",
				name: "publish",
				message: "Publish to registry?",
				choices: [
					{ title: "Do not publish", value: PublishType.DO_NOT_PUBLISH },
					{ title: "Schema only", value: PublishType.SCHEMA_ONLY }
				]
			}
		],
		defaultPromptOptions
	);

	const publishType = schemaPublishResponse.publish as PublishType;

	if (publishType === PublishType.DO_NOT_PUBLISH) {
		console.log("");
		console.log(chalk.grey("When you are ready, you can publish with the following command"));
		console.log(chalk.green(`datapm publish ${packageFileLocation}`));
		process.exit(0);
	}

	// Publish Package
	const publishCommand = new PublishPackageCommand();
	try {
		await publishCommand.handleCommand({ reference: packageFileLocation });
	} catch (error) {
		console.log("");
		console.log(chalk.grey("You can publish the package file with the following command later"));
		console.log(chalk.green(`datapm publish ${packageFileLocation}`));
		process.exit(1);
	}

	process.exit(0);
}

function validUrl(value: string): boolean | string {
	if (value === "") return true;

	if (!value.startsWith("http://") && !value.startsWith("https://")) {
		return "Must start with http:// or https://";
	}

	if (value.length < 10) {
		return "Not a valid URL - not long enough";
	}

	return true;
}

function validSampleRecordCount(value: number): boolean | string {
	if (value == null) return "Number, 0 to 100, required";
	if (value > 100) return "Number less than 100 required";
	return true;
}

async function schemaSpecificQuestions(schema: Schema) {
	console.log("");
	console.log(chalk.magenta(`${schema.title} Details`));

	let properties = schema.properties as Properties;
	// Ignore Attributes
	const ignoreAttributesResponse = await prompts(
		[
			{
				type: "confirm",
				name: "ignoreAttributes",
				message: `Exclude any attributes from ${schema.title}?`,
				initial: false
			}
		],
		defaultPromptOptions
	);
	if (ignoreAttributesResponse.ignoreAttributes) {
		const attributesToIgnoreResponse = await prompts(
			[
				{
					type: "multiselect",
					name: "attributesToIgnore",
					message: "Attributes to exclude?",
					choices: Object.keys(schema.properties as Properties).map((attributeName) => ({
						title: attributeName,
						value: attributeName
					}))
				}
			],
			defaultPromptOptions
		);
		attributesToIgnoreResponse.attributesToIgnore.forEach((attributeName: string) => {
			properties[attributeName].hidden = true;
		});
	}

	// Rename Attributes
	const renameAttributesResponse = await prompts(
		[
			{
				type: "confirm",
				name: "renameAttributes",
				message: `Rename attributes from ${schema.title}?`,
				initial: false
			}
		],
		defaultPromptOptions
	);
	if (renameAttributesResponse.renameAttributes) {
		const attributeNameMap: Record<string, string> = {};
		const attributesToRenameResponse = await prompts(
			[
				{
					type: "multiselect",
					name: "attributesToRename",
					message: "Attributes to rename?",
					choices: Object.keys(schema.properties as Properties).map((attributeName) => ({
						title: attributeName,
						value: attributeName
					}))
				}
			],
			defaultPromptOptions
		);
		for (const attributeName of attributesToRenameResponse.attributesToRename) {
			const attributeToRenameResponse = await prompts(
				[
					{
						type: "text",
						name: "attributeToRename",
						message: `New attribute name for "${attributeName}"?`
					}
				],
				defaultPromptOptions
			);
			attributeNameMap[attributeName] = attributeToRenameResponse.attributeToRename;
		}
		attributesToRenameResponse.attributesToRename.forEach((attributeName: string) => {
			const newAttributeName = attributeNameMap[attributeName];
			properties[attributeName].title = newAttributeName;
			if (schema.sampleRecords) {
				schema.sampleRecords.forEach((record) => {
					record[newAttributeName] = record[attributeName];
					delete record[attributeName];
				});
			}
		});
	}

	// Derived from
	const derivedFrom: DerivedFrom[] = [];

	while (true) {
		const message =
			derivedFrom.length === 0
				? `Was ${schema.title} derived from other 'upstream data'?`
				: `Was ${schema.title} derived from additional 'upstream data'?`;
		const wasDerivedResponse = await prompts(
			[
				{
					type: "select",
					name: "wasDerived",
					message: message,
					choices: [
						{ title: "No", value: false },
						{
							title: "Yes",
							value: true
						}
					]
				}
			],
			defaultPromptOptions
		);

		if (!wasDerivedResponse.wasDerived) break;

		const derivedFromUrlResponse = await prompts(
			[
				{
					type: "text",
					name: "url",
					message: "URL for the 'upstream data'?",
					hint: "Leave blank to end"
				}
			],
			defaultPromptOptions
		);

		if (derivedFromUrlResponse.url !== "") {
			// get the title
			const displayName = "";

			const derivedFromUrlDisplayNameResponse = await prompts(
				[
					{
						type: "text",
						name: "displayName",
						message: "Name of data from above URL?",
						initial: displayName
					}
				],
				defaultPromptOptions
			);

			derivedFrom.push({
				url: derivedFromUrlResponse.url,
				displayName: derivedFromUrlDisplayNameResponse.displayName
			});
		} else {
			break;
		}
	}

	let derivedFromDescription = "";

	if (derivedFrom.length > 0) {
		const derivedFromDescriptionResponse = await prompts(
			[
				{
					name: "description",
					type: "text",
					message: "What SQL or other process was used to derive this data?",
					validate: (value: string) => {
						if (value.length === 0) return "A description is required.";

						return true;
					}
				}
			],
			defaultPromptOptions
		);

		derivedFromDescription = derivedFromDescriptionResponse.description;

		schema.derivedFrom = derivedFrom;
		schema.derivedFromDescription = derivedFromDescription;
	}

	const recordUnitResponse = await prompts(
		[
			{
				type: "text",
				name: "recordUnit",
				message: `What does each ${schema.title} record represent?`,
				validate: validUnit
			}
		],
		defaultPromptOptions
	);
	if (recordUnitResponse.recordUnit) {
		schema.unit = recordUnitResponse.recordUnit;
	}
	// Prompt Column Unit per "number" Type Column
	properties = schema.properties as Properties;
	const keys = Object.keys(properties).filter((key) => {
		const property = properties[key] as Schema;
		const type = property.type as JSONSchema7TypeName[];
		const types = type.filter((type) => type !== "null");
		return types.length === 1 && types[0] === "number";
	});

	let promptForNumberUnits = true;

	if (keys.length >= 3) {
		const confirmContinueResponse = await prompts(
			[
				{
					type: "confirm",
					name: "confirm",
					message: `Do you want to specify units for the ${keys.length} number properties?`,
					initial: true
				}
			],
			defaultPromptOptions
		);
		if (!confirmContinueResponse.confirm) {
			promptForNumberUnits = false;
		}
	}

	if (promptForNumberUnits) {
		for (const key of keys) {
			const property = properties[key] as Schema;
			const columnUnitResponse = await prompts(
				[
					{
						type: "text",
						name: "columnUnit",
						message: `Unit for attribute '${property.title}'?`,
						validate: validUnit
					}
				],
				defaultPromptOptions
			);
			if (columnUnitResponse.columnUnit) {
				property.unit = columnUnitResponse.columnUnit;
			}
		}
	}
}

/** Inspect a one or more URIs, with a given config, and implementation. This is generally one schema */
export async function inspectSource(
	source: SourceInterface,
	sourceInspectionContext: SourceInspectionContext,
	oraRef: ora.Ora,
	configuration: DPMConfiguration
): Promise<InspectionResults> {
	// Inspecting URL
	const uriInspectionResults = await source.inspectURIs(configuration, sourceInspectionContext).catch((error) => {
		oraRef.fail(error.message);
		process.exit(1);
	});

	return uriInspectionResults;
}

export async function inspectStreamSet(
	streamSetPreview: StreamSetPreview,
	sourceInspectionContext: SourceInspectionContext,
	oraRef: ora.Ora,
	sourceConfiguration: DPMConfiguration
): Promise<SourceStreamsInspectionResult> {
	// Parsing file content
	oraRef.start("Inspecting streams, generating schemas...");

	// TODO For the UpdateCommand, allow below to incrementally inspect the newly available data
	// and update the existing stats - rather than over writting the states every time with the latest
	// from the beginning of the stream.

	const bytesTotal = streamSetPreview.expectedBytesTotal || 0;
	const recordsTotal = streamSetPreview.expectedRecordsTotal || 0;

	if (bytesTotal) {
		oraRef.succeed(`Expecting ${numeral(bytesTotal).format("0.0 b")}`);
	} else if (recordsTotal) {
		oraRef.succeed(`Expecting ${numeral(recordsTotal).format("0,0a")} records`);
	}

	const progressText = function (progress: InspectProgress) {
		let text = "Inspecting records...\n";
		const recordsCountedString = numeral(progress.recordCount).format("0,0a");
		const recordsPerSecondString = numeral(progress.recordsPerSecond).format("0,0a");
		const recordsInspectedString = numeral(progress.recordsInspectedCount).format("0,0a");
		const bytesProcessedString = numeral(progress.bytesProcessed).format("0.0b");

		if (progress.recordCount !== progress.recordsInspectedCount) {
			text += `- ${recordsCountedString} records counted\n`;
		}
		text += `- ${recordsInspectedString} records inspected\n`;
		text += `- ${bytesProcessedString} processed\n`;
		text += `- ${recordsPerSecondString} records/second\n`;

		return text;
	};

	const inspectionResults = await generateSchemasFromSourceStreams(
		streamSetPreview,
		{
			onStart: (streamName: string) => {
				oraRef.start(`Inspecting ${streamName}...`);
			},
			onProgress: (progress: InspectProgress) => {
				oraRef.text = progressText(progress);
			},
			onComplete: (progress: InspectProgress) => {
				oraRef.succeed(progressText(progress));
			},
			onError: (error: Error) => {
				oraRef.fail(error.message);
				process.exit(1);
			}
		},
		sourceInspectionContext,
		sourceConfiguration
	).catch((error: Error) => {
		oraRef.fail(`Failed to parse - ${error.message}`);
		console.error(error.stack);
		process.exit(1);
	});

	return inspectionResults;
}
