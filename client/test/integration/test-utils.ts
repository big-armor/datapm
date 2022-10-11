import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client/core";
import execa from "execa";
import faker from "faker";
import fs from "fs";
import moment from "moment";
import { Writable } from "stream";
import * as request from "superagent";
import {
    CreateAPIKeyDocument,
    CreateMeDocument,
    CreateMeMutation,
    CreateMeMutationVariables,
    LoginDocument,
    Scope,
    VerifyEmailAddressDocument
} from "datapm-client-lib";
import { dataServerPort, mailDevIpAddress, mailDevWebPortNumber, registryServerPort } from "./setup";
import { createAPIKeyFromParts, loadPackageFileFromDisk, PackageFile } from "datapm-lib";
import fetch from "cross-fetch";
import { getDataPMHomePath, getLocalPackageLatestVersionPath } from "../../src/util/GetPackageUtil";
import path from "path";

export const KEYS = {
    ENTER: "\n",
    DOWN: "\x1B\x5B\x42",
    CANCEL: "\x03"
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let TEST_SOURCE_FILES: Record<string, string> = {};

interface Email {
    id: string;
    to: [{ address: string; name: string }];
    subject: string;
    text: string;
    html: string;
}

export type PromptInput = {
    message: string;
    input: string;
};

export type TestResults = Record<string, boolean | number | string | CmdResult | null>;

export function setTestSourceFiles(): void {
    TEST_SOURCE_FILES = {
        HTTP1: `http://localhost:${dataServerPort}/state-codes.csv`,
        HTTP2: `http://localhost:${dataServerPort}/non-existing.csv`, // purposefully not-existing
        GOOGLESHEET1: `https://docs.google.com/spreadsheets/d/1KSrO9svsYoZQgVCOxmMEZTsNzDWe4N7Czazc6BhdPwc/edit?usp=sharing`,
        FILE1: "file://./test/sources/covid-02-01-2020.csv",
        FILE2: "file://./test/sources/covid-03-01-2020.csv",
        FILE3: "file://./test/sources/test-date-data.csv",
        FILE4: "file://./test/sources/all-types.csv",
        FILE5: "file://./test/sources/legislators.csv",
        FILE6: "file://./test/sources/us-covid.csv",
        FILE7: "file://./test/sources/state-codes.csv.gzip",
        FILE8: "file://./test/sources/state-codes.csv.bz2",
        FILE9: "file://./test/sources/airports-small.csv",
        FILE10: "file://./test/sources/sea-level_fig-1.csv",
        FILE11: "file://./test/sources/coinbaseUSD-small.csv",
        FILE12: "file://./test/sources/country-currencies.xml",
        FILE13: "file://./test/sources/daily_prices.json",
        FILE14: "file://./test/sources/business-confidence-index.csv",
        FILE15: "file://./test/sources/non-profits-1.csv",
        FILE16: "file://./test/sources/non-profits-2.csv",
        FILE17: "file://./test/sources/non-profits-3.csv",
        FILE18: "file://./test/sources/non-profits-4.csv",
        FILE19: "file://./test/sources/countries-v1.csv",
        FILE20: "file://./test/sources/countries-v2.csv",
        FILE21: "file://./test/sources/content-detection.csv",
        FILE22: "file://./test/sources/covid-02-01-2020.avro",
        FILE23: "file://./test/sources/us-covid.xlsx",
        FILE24: "file://./test/sources/source.zip",
        FILE25: "file://./test/sources/source.tar",
        FILE26: "file://./test/sources/weird-headers.csv"
    };
}

export function createAnonymousClient(): ApolloClient<NormalizedCacheObject> {
    const REGISTRY_GRAPHQL_URL = `http://localhost:${registryServerPort}/graphql`;

    return new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({ uri: REGISTRY_GRAPHQL_URL, fetch }),

        defaultOptions: {
            query: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            mutate: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            watchQuery: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            }
        }
    });
}

export function createTestClient(headers: Record<string, string>): ApolloClient<NormalizedCacheObject> {
    return new ApolloClient({
        cache: new InMemoryCache(),
        defaultOptions: {
            query: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            mutate: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            watchQuery: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            }
        },
        link: new HttpLink({
            uri: `http://localhost:${registryServerPort}/graphql`,
            headers: {
                ...headers,
                Accept: "charset=utf-8"
            },
            fetch
        })
    });
}

/** creates a new user and returns an apollo client for their session */
export async function createUser(
    firstName: string,
    lastName: string,
    username: string,
    emailAddress: string,
    password: string
): Promise<ApolloClient<NormalizedCacheObject>> {
    return await new Promise((resolve, reject) => {
        const client = createAnonymousClient();
        client
            .mutate<CreateMeMutation, CreateMeMutationVariables>({
                errorPolicy: "all",
                mutation: CreateMeDocument,
                variables: {
                    value: {
                        firstName: firstName,
                        lastName: lastName,
                        username: username,
                        emailAddress: emailAddress,
                        password: password
                    }
                }
            })
            .catch((error) => {
                // console.error(JSON.stringify(error,null,1));
                reject(error);
            })
            .then(async (result) => {
                if (!result) {
                    reject(new Error("This should never happen"));
                    return;
                }

                const email = await getEmail("✓ Verify Your New Account", emailAddress);

                const matches = email.text.match(/\?token=([a-zA-z0-9-]+)/);

                if (matches == null) throw new Error("Could not find account verification token in email");

                const emailValidationToken = matches[1];

                // Delete the email
                request.delete(`http://${mailDevIpAddress}:${mailDevWebPortNumber}/email/${email.id}`);

                await client.mutate({
                    mutation: VerifyEmailAddressDocument,
                    variables: {
                        token: emailValidationToken
                    }
                });

                const loginResponse = await client.mutate({
                    mutation: LoginDocument,
                    variables: {
                        username: username,
                        password: password
                    }
                });

                if (loginResponse.data == null) throw new Error("Got no data back for login. Probably errored");

                const token = loginResponse.data.login;

                const testClient = createTestClient({ Authorization: "Bearer " + token });

                resolve(testClient);
            });
    });
}

/** Fetches an email from the maildev server */
async function getEmail(subject: string, to: string): Promise<Email> {
    let emailFound = false;

    const startDate = new Date();
    while (emailFound === false) {
        const response = await request.get("http://" + mailDevIpAddress + ":" + mailDevWebPortNumber + "/email");
        const emails = JSON.parse(response.text) as [Email];

        for (const email of emails) {
            if (email.subject === subject && email.to.find((t) => t.address === to)) {
                emailFound = true;
                return email;
                break;
            }
        }

        if (!emailFound) {
            const currentDate = new Date();

            if (currentDate.getTime() - startDate.getTime() > 10000) {
                throw new Error("Email not found! subject: " + subject + " to: " + to);
            } else {
                delay(500);
            }
        }
    }

    throw new Error("eslint has no brains");
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createTestUser(): Promise<ApolloClient<NormalizedCacheObject>> {
    const randomName = `u${Math.random().toString().replace(".", "")}`;
    return await createUser(randomName, randomName, randomName, `${randomName}@test.datapm.io`, "passwordA!");
}

export async function createApiKey(userClient: ApolloClient<NormalizedCacheObject>): Promise<string> {
    const response = await userClient.mutate({
        mutation: CreateAPIKeyDocument,
        variables: {
            value: {
                label: "test",
                scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
            }
        }
    });

    if (response.data == null) throw new Error("Error while creating api key");

    const apiKey = createAPIKeyFromParts(response.data.createAPIKey.id, response.data.createAPIKey.secret);
    return apiKey;
}

export interface CmdResult {
    code: number | null;
    signal: NodeJS.Signals | null;
}

export function testCmd(
    cmd: string | null,
    args: Array<string> = [],
    prompts: Array<{
        message: string;
        input: string;
        isDone?: boolean;
    }> = [],
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    callback: (line: string, index: number, cmdProcess: execa.ExecaChildProcess) => Promise<void> = async () => {}
): Promise<CmdResult> {
    let cmdProcess: execa.ExecaChildProcess;

    const copiedPrompts = JSON.parse(JSON.stringify(prompts));

    return new Promise<CmdResult>((resolve) => {
        let promptIndex = 0;
        let line = "";

        let execCmd = "node";

        let conditionedArgs = [...args];

        if (cmd) {
            conditionedArgs = [cmd, ...args];
        }

        if (process.env.DATAPM_CLIENT_TEST_COMMAND) {
            execCmd = process.env.DATAPM_CLIENT_TEST_COMMAND;
        } else {
            conditionedArgs = ["dist/src/main.js", ...conditionedArgs];
        }

        // console.log("Running: node " + conditionedArgs.join(" "));

        cmdProcess = execa(execCmd, conditionedArgs);

        // if (cmdProcess.stdout) cmdProcess.stdout.pipe(process.stdout, { end: false });

        // if (cmdProcess.stderr) cmdProcess.stderr.pipe(process.stderr, { end: false });

        if (cmdProcess.stdout == null) throw new Error("Expected stdout, but it's null");
        if (cmdProcess.stdin == null) throw new Error("Expected stdin, but it's null");
        if (cmdProcess.stderr == null) throw new Error("Expected stderr, but it's null");

        cmdProcess.stdout.on("data", async (buffer: Buffer) => {
            line = buffer.toString();
            callback && callback(line, promptIndex, cmdProcess);
            if (copiedPrompts.length > 0) {
                const currentPrompt = copiedPrompts[promptIndex];
                if (
                    promptIndex < copiedPrompts.length &&
                    !currentPrompt.isDone &&
                    line.includes(currentPrompt.message)
                ) {
                    if (cmdProcess.stdin == null) throw new Error("Expected stdin, but it's null");

                    // note that this is not awaiting the delayed result
                    // so the buffer writing continues asynchronously
                    writeSlowlyToBuffer(cmdProcess.stdin, currentPrompt.input);
                    currentPrompt.isDone = true;
                    promptIndex += 1;
                }
            }
        });

        cmdProcess.stderr.on("data", async (buffer: Buffer) => {
            line = buffer.toString();
            callback && callback(line, promptIndex, cmdProcess);
        });

        cmdProcess.stdout.on("error", (err: Error) => {
            console.error(JSON.stringify(err, null, 1));
        });

        cmdProcess.on("close", (code, signal) => {
            resolve({ code, signal });
        });

        cmdProcess.on("exit", (code, signal) => {
            resolve({ code, signal });
        });

        cmdProcess.on("message", (message, _sendHandle) => {
            console.log(message.toString());
        });

        cmdProcess.on("disconnect", () => {
            console.log("cmdProcess disconnect");
        });
    });
}

async function writeSlowlyToBuffer(writable: Writable, charactersRemaining: string): Promise<void> {
    const indexOfEnter = charactersRemaining.lastIndexOf("\n");

    writable.write(charactersRemaining.substring(0, indexOfEnter));
    await delay(100);

    if (indexOfEnter === -1) {
        return;
    }

    writable.write(charactersRemaining.substring(indexOfEnter));
}

export function getPromptInputs(
    defaultPrompts: string[],
    inputs?: Array<string | null>,
    skip = 0,
    lastIndex = Number.MAX_SAFE_INTEGER
): PromptInput[] {
    const defaultPromptInputs: PromptInput[] = defaultPrompts.map((message) => ({
        message,
        input: KEYS.ENTER
    }));
    const promptInputs = defaultPromptInputs.slice(skip, lastIndex);

    if (inputs === undefined) return promptInputs;

    inputs?.forEach((input, index) => {
        promptInputs[index].input = input === null ? "" : `${input}${KEYS.ENTER}`;
    });

    return promptInputs.filter((promptInput) => Boolean(promptInput.input));
}
export const defaultPromptInputsForCSVs = [
    {
        message: "Is there a header line above?",
        input: "\n"
    },
    {
        message: "Header row line number?",
        input: "\n"
    }
];

export async function createTestPackage(
    url: string | string[],
    defaults = false,
    name = "",
    description = "",
    configuration = "",
    unitPrompts: PromptInput[] = []
): Promise<string> {
    const options: string[] = typeof url === "string" ? [url] : url;
    if (defaults) {
        options.push("--defaults");
    }
    if (configuration) {
        options.push("--configuration", configuration);
    }
    let packageFilePath = "";

    if (defaults) {
        await testCmd("package", options, defaultPromptInputsForCSVs, async (line: string) => {
            if (line.includes("datapm publish ")) {
                const matches = line.match(/datapm\spublish\s(.*)/);
                if (matches == null) throw new Error("No matches");
                packageFilePath = matches[1];
            }
        });
    } else {
        const generatePackageCommandPrompts = [
            "Is there a header line above?",
            "Header row line number?",
            "How are files updated?",
            "Exclude any attributes",
            "Rename attributes",
            "derived from other 'upstream data'?",
            "User friendly package name?",
            "Package short name?",
            "Starting version?",
            "Short package description?",
            "Website?",
            "Number of sample records?",
            "Publish to registry?",
            "Target registry?",
            "Catalog short name?",
            "Data Access Method?",
            "Is the above ok?"
        ];
        const prompts = getPromptInputs(generatePackageCommandPrompts, [
            "",
            "",
            "",
            "",
            "",
            "",
            name,
            "",
            "",
            description,
            "https://test.datapm-not-a-site.io",
            "10",
            "yes", // publish to registry
            KEYS.DOWN, // target registry
            "", // default catalog
            "", // data access method,
            "yes" // is the above ok
        ]);
        prompts.splice(6, 0, ...unitPrompts);
        await testCmd("package", options, prompts, async (line: string) => {
            // console.log(line);
            if (line.includes("datapm fetch ")) {
                const matches = line.match(/datapm\sfetch\s(.*)/);
                if (matches == null) throw new Error("No matches");
                packageFilePath = matches[1];
            }

            if (line.includes("datapm publish ")) {
                const matches = line.match(/datapm\spublish\slocal\/(.*)/);
                if (matches == null) throw new Error("No matches");
                const packageSlug = matches[1];
                packageFilePath = getLocalPackageLatestVersionPath(packageSlug);
            }
        });
        if (packageFilePath === "") {
            throw new Error(`Could not generate test package "${name}"`);
        }
    }

    return packageFilePath;
}

export const generateRandomValue = (): string => {
    const randomValueList: string[] = [];

    randomValueList.push("null");
    randomValueList.push(faker.datatype.boolean().toString());
    randomValueList.push(faker.datatype.number(1000).toString());
    randomValueList.push(faker.datatype.float(1000).toString());
    randomValueList.push(faker.name.firstName());
    randomValueList.push(faker.date.past(10).toString());

    const randomIndex = Math.floor(randomValueList.length * Math.random());

    return randomValueList[randomIndex];
};

export function writeCSVFile(fileName: string, headers: string[], records: string[][]): void {
    let content = "";
    content = headers.map((header) => `"${header}"`).join(",");
    content += "\n";
    content += records.map((record) => record.map((value) => `"${value}"`).join(",")).join("\n");

    fs.writeFileSync(fileName, content);
}

export function loadTestPackageFile(packageName: string): PackageFile {
    if (packageName.startsWith("local/")) packageName = packageName.replace("local/", "");
    const packagePath = getLocalPackageLatestVersionPath(packageName);
    return loadPackageFileFromDisk(packagePath);
}

export function writeTestPackageFile(packageFile: PackageFile, packageName: string): void {
    if (packageName.startsWith("local/")) packageName = packageName.replace("local/", "");
    const packagePath = getLocalPackageLatestVersionPath(packageName);
    const packageFileJSON = JSON.stringify(packageFile, null, 2);
    fs.writeFileSync(packagePath, packageFileJSON);
}

export function removePackageFiles(packageNames: string[]): void {
    packageNames.forEach((packageName) => {
        const packagePath = path.join(getDataPMHomePath(), "local", packageName);

        if (fs.existsSync(packagePath)) fs.rmSync(packagePath, { recursive: true });
    });
}

export function generateTestSourceFile(filePath: string): void {
    const headers = [
        "Integer",
        "Float",
        "Integer_Float",
        "Boolean",
        "Boolean_Integer_String",
        "Date",
        "DateTime",
        "Date_DateTime",
        "String",
        "all_types"
    ];
    const records: string[][] = [];

    for (let i = 0; i < 100; i += 1) {
        const record = [];
        record[0] = faker.datatype.number(1000).toString();
        record[1] = (Math.random() * 1000).toString();
        if (i < 40) {
            record[2] = faker.datatype.number(1000).toString();
        } else {
            record[2] = (Math.random() * 1000).toString();
        }
        record[3] = faker.datatype.boolean().toString();
        if (i < 20) {
            record[4] = faker.datatype.boolean().toString();
        } else if (i < 50) {
            record[4] = faker.datatype.number(1000).toString();
        } else {
            record[4] = faker.name.firstName();
        }
        record[5] = moment(faker.date.past(10)).format("YYYY-MM-DD");
        record[6] = moment(faker.date.past(10)).format("YYYY-MM-DD HH:mm:ss");
        if (i < 30) {
            record[7] = moment(faker.date.past(10)).format("YYYY-MM-DD");
        } else {
            record[7] = moment(faker.date.past(10)).format("YYYY-MM-DD HH:mm:ss");
        }
        record[8] = faker.name.firstName();
        if (i < 10) {
            record[9] = faker.datatype.number(1000).toString();
        } else if (i < 25) {
            record[9] = (Math.random() * 1000).toString();
        } else if (i < 45) {
            record[9] = faker.datatype.boolean().toString();
        } else if (i < 70) {
            record[9] = moment(faker.date.past(10)).format("YYYY-MM-DD");
        } else if (i < 80) {
            record[9] = moment(faker.date.past(10)).format("YYYY-MM-DD HH:mm:ss");
        } else {
            record[9] = faker.name.firstName();
        }
        records.push(record);
    }

    writeCSVFile(filePath, headers, records);
}
