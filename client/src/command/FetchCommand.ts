import chalk from "chalk";
import { CountPrecision, DPMConfiguration, leastPrecise, Source } from "datapm-lib";
import numeral from "numeral";
import ora from "ora";
import prompts, { PromptObject } from "prompts";
import { SemVer } from "semver";
import { Argv } from "yargs";
import { getSink, getSinks, SinkState, SinkStateKey } from "../sink/SinkUtil";
import { StandardOutSink } from "../sink/StandardOutSink";
import { OraQuiet } from "../util/OraQuiet";
import { getPackage } from "../util/PackageAccessUtil";
import { cliHandleParameters, defaultPromptOptions, parametersToPrompts, Parameter } from "../util/ParameterUtils";
import { inspectSourceConnection } from "../util/SchemaUtil";
import { Command } from "./Command";

import ON_DEATH from "death";
import { fetch, FetchOutcome, newRecordsAvailable } from "../util/StreamToSinkUtil";
import { StreamSetPreview, InspectionResults } from "../source/SourceUtil";
import { formatRemainingTime } from "../util/DateUtil";
import { Listr, ListrTask } from "listr2";

class FetchArguments {
    reference?: string;
    sink?: string;
    defaults?: boolean;
    sinkConfig?: string;
    quiet?: boolean;
    forceUpdate?: boolean;
}

export class FetchCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "fetch [reference]",
            describe: "Obtain a data package, or individual data type from a package",
            builder: (argv) => {
                return argv
                    .positional("reference", {
                        describe: "package identifier, local file, or url",
                        demandOption: false,
                        type: "string"
                    })
                    .option("quiet", {
                        type: "boolean",
                        describe: "Do not output status messages"
                    })
                    .option("forceUpdate", {
                        type: "boolean",
                        describe: "Run fetch without checking state"
                    })
                    .option("sink", {
                        choices: getSinks().map((sink) => sink.getType()),
                        describe: "destination"
                    })
                    .option("sinkConfig", {
                        type: "string"
                    })
                    .help();
            },
            handler: fetchPackage
        });
    }
}

export async function fetchPackage(argv: FetchArguments): Promise<void> {
    if (argv.quiet) {
        argv.defaults = true;
    }

    if (argv.reference == null) {
        const referencePromptResult = await prompts(
            {
                type: "text",
                name: "reference",
                message: "What is the package file name or url?",
                validate: (value) => {
                    if (!value) return "Package file name or url required";
                    return true;
                }
            },
            defaultPromptOptions
        );

        argv.reference = referencePromptResult.reference;
    }

    if (argv.reference == null) throw new Error("The package file path or URL is required");

    if (!argv.defaults) {
        const defaultsPromptResult = await prompts(
            {
                type: "select",
                name: "defaults",
                message: "Do you want to use the default options?",
                choices: [
                    { title: "Yes, answer fewer questions", value: true },
                    { title: "No, answer more detailed questions", value: false }
                ],
                initial: 0
            },
            defaultPromptOptions
        );
        argv.defaults = defaultsPromptResult.defaults;
    }

    const oraRef: ora.Ora = argv.quiet
        ? new OraQuiet()
        : ora({
              color: "yellow",
              spinner: "dots"
          });

    // Finding package
    oraRef.start("Finding package...");

    const packageFileWithContext = await getPackage(argv.reference).catch((error) => {
        oraRef.fail();
        console.error(chalk.red(error.message));
        process.exit(1);
    });

    const packageFile = packageFileWithContext.packageFile;

    const schemaDescriptionRecordCount = packageFile.schemas
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((s) => s.recordCount!)
        .reduce((prev, curr) => (prev += curr), 0);
    const schemaCount = packageFile.schemas.length;
    const recordCountPrecision = packageFile.schemas
        .map((s) => s.recordCountPrecision)
        .reduce((prev, curr) => {
            if (prev === undefined || curr === undefined) return undefined;

            return leastPrecise(prev, curr);
        });

    oraRef.succeed(`Found ${packageFile.displayName}`);

    let recordCountText = numeral(schemaDescriptionRecordCount).format("0.0a") + "";
    if (recordCountPrecision === CountPrecision.APPROXIMATE) {
        recordCountText = `approximpately ${recordCountText} `;
    } else if (recordCountPrecision === CountPrecision.GREATER_THAN) {
        recordCountText = `more than ${recordCountText} `;
    }
    recordCountText = `${schemaCount} schemas with ${recordCountText} records`;
    oraRef.info(recordCountText);

    // Getting sink
    let sinkType: string;

    if (argv.sink) {
        sinkType = argv.sink;
    } else if (argv.defaults) {
        sinkType = "file";
    } else {
        const sinks = getSinks();

        const sinkSelect = await prompts(
            [
                {
                    type: "select",
                    name: "type",
                    message: "Destination?",
                    choices: sinks.map((sink) => {
                        return {
                            title: sink.getDisplayName(),
                            value: sink.getType()
                        };
                    })
                }
            ],
            defaultPromptOptions
        );

        sinkType = sinkSelect.type;
    }

    // Finding sink
    if (argv.sink) {
        oraRef.start(`Finding the sink named ${sinkType}`);
    }

    const sink = getSink(sinkType);

    if (sink == null) {
        oraRef.fail(`Could not find sink type: ${sinkType}`);
        return;
    }

    if (argv.sink) {
        oraRef.succeed(`Found the ${sink.getDisplayName()} sink`);
    }

    // Prompt parameters
    let sinkConfiguration: DPMConfiguration = {};

    let parameterCount = 0;

    if (argv.sinkConfig) {
        try {
            sinkConfiguration = JSON.parse(argv.sinkConfig);
        } catch (error) {
            console.error(chalk.red("ERROR_PARSING_SINK_CONFIG"));
            process.exit(1);
        }
    }

    if (argv.defaults) {
        sinkConfiguration = sink.getDefaultParameterValues(
            packageFileWithContext.catalogSlug,
            packageFile,
            sinkConfiguration
        );
    } else {
        let remainingParameters = await sink.getParameters(
            packageFileWithContext.catalogSlug,
            packageFile,
            sinkConfiguration
        );

        while (remainingParameters.length > 0) {
            parameterCount += remainingParameters.length;
            const promptObjects: PromptObject[] = parametersToPrompts(remainingParameters);

            // TODO Skip existing configs
            const newSinkConfig = await prompts(promptObjects, defaultPromptOptions);

            Object.keys(newSinkConfig).forEach((key) => {
                const parameter = remainingParameters.find((parameter) => parameter.name === key) as Parameter;
                parameter.configuration[key] = newSinkConfig[key];
            });

            remainingParameters = await sink.getParameters(
                packageFileWithContext.catalogSlug,
                packageFile,
                sinkConfiguration
            );
        }
    }

    // Write records
    oraRef.start("Writing first record");

    let interupted: false | string = false;

    ON_DEATH({})((signal) => {
        interupted = signal;
    });

    const fetchPreparations: {
        source: Source;
        uriInspectionResults: InspectionResults;
        streamSetPreview: StreamSetPreview;
        sinkStateKey: SinkStateKey;
        sinkState: SinkState | null;
    }[] = [];

    for (const source of packageFile.sources) {
        if (interupted) break;

        const schemaUriInspectionResults = await inspectSourceConnection(source);

        for (const streamSetPreview of schemaUriInspectionResults.streamSetPreviews) {
            const sinkStateKey: SinkStateKey = {
                catalogSlug: packageFileWithContext.catalogSlug || "_no_catalog",
                packageSlug: packageFile.packageSlug,
                packageMajorVersion: new SemVer(packageFile.version).major
            };

            let sinkState = await sink.getSinkState(sinkConfiguration, sinkStateKey);

            if (argv.forceUpdate) sinkState = null;

            if (!argv.forceUpdate) {
                oraRef.start("Checking if new records are available for " + streamSetPreview.slug);

                if (!(await newRecordsAvailable(streamSetPreview, sinkState))) {
                    oraRef.info(
                        "No new records available for " +
                            streamSetPreview.slug +
                            ". Use --force-update to skip this check."
                    );
                    continue;
                }

                oraRef.succeed("New records are available");
            }

            const streamSet = source.streamSets.find((s) => s.slug === streamSetPreview.slug);

            if (streamSet === undefined) {
                oraRef.warn(
                    "Source returned a stream set slug of " +
                        streamSetPreview.slug +
                        " but that is not present in the package file. The package file is out of date (or something is wrong with the source). This may affect writing data. Use the `datapm update ...` command to update the package file."
                );
            }

            fetchPreparations.push({
                sinkState,
                sinkStateKey,
                source,
                streamSetPreview,
                uriInspectionResults: schemaUriInspectionResults
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ListrContext {
        //
    }

    const listrTasks: ListrTask[] = [];

    const latestStatuses: Record<string, number> = {};

    for (const fetchPreparation of fetchPreparations) {
        const listrTask: ListrTask<ListrContext> = {
            title: fetchPreparation.source.slug,
            // eslint-disable-next-line
            task: (_ctx, task) => {
                return fetch(
                    {
                        state: (_state) => {
                            // TODO use this
                        },
                        progress: (state) => {
                            latestStatuses[
                                fetchPreparation.source.slug + "/" + fetchPreparation.streamSetPreview.slug
                            ] = state.recordsCommited;

                            let text = "";

                            const recordCountString = numeral(state.recordsRecieved).format("0.0a");
                            const recordsPerSecondString = numeral(state.recordsPerSecond).format("0.0a");

                            text += `Fetching ${fetchPreparation.streamSetPreview.slug}\n`;

                            if (state.percentComplete) {
                                const percentString = numeral(state.percentComplete).format("0.0%");

                                text += `   ${percentString} complete\n`;
                            }

                            if (state.bytesRecieved > 0) {
                                const bytesCountString = numeral(state.bytesRecieved).format("0.0b");

                                text += `   ${bytesCountString} received`;

                                if (state.bytesPerSecond) {
                                    const bytesPersecondString = numeral(state.bytesPerSecond).format("0.0b");

                                    text += ` - ${bytesPersecondString} per second`;
                                }

                                text += "\n";
                            }

                            text += `   ${recordCountString} records received - ${recordsPerSecondString} per second\n`;

                            if (state.secondsRemaining) {
                                const remainingTimeString = formatRemainingTime(state.secondsRemaining);

                                text += `   estimated ${remainingTimeString} seconds remaining`;
                            }

                            task.output = text;
                        },
                        finish: (line, recordCount, result) => {
                            latestStatuses[
                                fetchPreparation.source.slug + "/" + fetchPreparation.streamSetPreview.slug
                            ] = recordCount;

                            if (result === FetchOutcome.SUCCESS) oraRef.succeed(line);
                            else if (result === FetchOutcome.FAILURE) oraRef.fail(line);
                            else if (result === FetchOutcome.WARNING) oraRef.warn(line);
                            else throw new Error("Unknown line type " + result);
                        },
                        prompt: async (parameters) => {
                            return cliHandleParameters(argv.defaults || false, parameters);
                        }
                    },
                    packageFile,
                    fetchPreparation.streamSetPreview,
                    sink,
                    sinkConfiguration,
                    fetchPreparation.sinkStateKey,
                    fetchPreparation.sinkState,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    packageFile.schemas
                );
            }
        };

        listrTasks.push(listrTask);
    }

    const listr = new Listr<ListrContext>(listrTasks, {
        concurrent: true,
        rendererSilent: argv.quiet
    });

    try {
        await listr.run();
    } catch (e) {
        if (!argv.quiet) console.error(e);
    }

    const totalRecordCount = Object.values(latestStatuses).reduce((prev, curr) => {
        return prev + curr;
    }, 0);

    if (!argv.quiet) oraRef.succeed(`Finished writing ${numeral(totalRecordCount).format("0,0")} records`);

    if (interupted !== false) {
        if (!argv.quiet) console.log(chalk.red(`Recieved ${interupted}, stopping early.`));
    } else if (parameterCount > 0) {
        console.log("");
        console.log(chalk.grey("Next time you can run this same configuration in a single command."));

        const defaultRemovedParameterValues: DPMConfiguration = { ...sinkConfiguration };
        sink.filterDefaultConfigValues(packageFileWithContext.catalogSlug, packageFile, defaultRemovedParameterValues);
        // This prints the password on the console :/

        let command = `datapm fetch ${argv.reference} `;
        if (sink.getType() === new StandardOutSink().getType()) {
            command += "--quiet ";
        }
        command += `--sink ${sink.getType()} --sinkConfig '${JSON.stringify(
            defaultRemovedParameterValues
        )}' --defaults`;

        console.log(chalk.green(command));
    }

    if (sinkType === "stdout" && !argv.quiet) {
        console.error(
            chalk.yellow(
                "You should probably use the --quiet flag to disable all non-data output, so that your data in standard out is clean"
            )
        );
    }

    process.exit(0);
}
