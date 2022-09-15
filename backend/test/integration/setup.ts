import { GenericContainer, StartedTestContainer } from "testcontainers";

import execa, { ExecaChildProcess } from "execa";

import pidtree from "pidtree";
import { Observable } from "@apollo/client/core";
import fs from "fs";
import { before } from "mocha";
import { createTestClient, createUser } from "./test-utils";
import { ActivityLogChangeType, ActivityLogEventType, RegistryStatus, RegistryStatusDocument } from "./registry-client";
import { expect } from "chai";
import { AdminHolder } from "./admin-holder";
import { TEMP_STORAGE_PATH } from "./constants";
import path from "path";
// NOTE: including "datapm-client-lib" here causes a build error where suddently the response objects
// in the generated graphql schema are seen as "any" type.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const maildev = require("maildev");

export type MailDevEmail = { text: string; html: string; to: { address: string; name: string }[]; subject: string };
export const tempMailDevEmail: MailDevEmail = {
    html: "",
    subject: "",
    text: "",
    to: [{ address: "", name: "" }]
};

export const dataServerPort: number = Math.floor(Math.random() * (65535 - 1024) + 1024);

let container: StartedTestContainer;
let serverProcess: ExecaChildProcess;
let testDataServerProcess: execa.ExecaChildProcess<string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mailServer: any;
export let mailObservable: Observable<MailDevEmail>;

export const TEMP_STORAGE_URL = "file://" + TEMP_STORAGE_PATH;
const MAX_SERVER_LOG_LINES = 25;

// These hold the standard out log lines from the datapm server
export const serverLogLines: string[] = [];
export const serverErrorLogLines: string[] = [];

/** The object logged to the console */
export interface ActivityLogLine {
    _type: string;
    date: Date;
    username: string;
    eventType: ActivityLogEventType;
    changeType?: ActivityLogChangeType;
    targetPackageIdentifier?: string;
    targetVersionNumber?: string;
    targetCatalogSlug?: string;
    targetGroupSlug?: string;
    targetCollectionSlug?: string;
    targetUsername?: string;
    propertiesEdited?: string[];
}

export function findActivityLogLine(line: string, callback: (activityLogLine: ActivityLogLine) => boolean): boolean {
    const lines = line.split("\n");

    for (const splitLine of lines) {
        const trimmedLine = splitLine.trim();
        if (trimmedLine.length === 0 || !trimmedLine.startsWith("{")) continue;
        try {
            const lineObject = JSON.parse(trimmedLine) as ActivityLogLine;
            if (lineObject._type === "ActivityLog" && callback(lineObject)) return true;
        } catch (e) {
            console.log("Error parsing line: " + trimmedLine);
            console.log(e.message);
        }
    }

    return false;
}

before(async function () {
    console.log("Starting postgres temporary container");

    this.timeout(240000);

    container = await new GenericContainer("postgres", "13.3")
        .withEnv("POSTGRES_PASSWORD", "postgres")
        .withEnv("POSTGRES_DB", "datapm")
        .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
        .withExposedPorts(5432)
        .start();

    const postgresPortNumber = container.getMappedPort(5432);
    const postgresIpAddress = container.getContainerIpAddress();

    console.log("Postgres started");

    // star the maildev server
    // eslint-disable-next-line new-cap
    mailServer = new maildev({
        smtp: 1026,
        web: 1081,
        ignoreTLS: true
    });

    let mailObserver: ZenObservable.SubscriptionObserver<MailDevEmail>;

    mailServer.listen(() => {
        mailObservable = new Observable<MailDevEmail>((observer) => {
            mailObserver = observer;
        });
    });

    mailServer.on("new", function (email: MailDevEmail) {
        // console.log("Email recieved: " + email.subject);
        mailObserver.next(email);
    });

    serverProcess = execa("npm", ["run", "start-nowatch"], {
        env: {
            TYPEORM_HOST: postgresIpAddress,
            TYPEORM_PORT: postgresPortNumber.toString(),
            SMTP_PORT: "1026",
            SMTP_SERVER: "localhost",
            SMTP_USER: "",
            SMTP_PASSWORD: "",
            SMTP_SECURE: "false",
            SMTP_FROM_ADDRESS: "test@localhost",
            SMTP_FROM_NAME: "local-test",
            STORAGE_URL: TEMP_STORAGE_URL,
            LEADER_ELECTION_DISABLED: "true",
            SCHEDULER_KEY: "TEST_JOB_KEY"
        }
    });

    serverProcess.stdout?.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverLogLines.push(line);

        if (serverLogLines.length > MAX_SERVER_LOG_LINES) serverLogLines.shift();

        if (line.startsWith("{")) return;
        console.log(line);
    });

    serverProcess.stderr?.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverErrorLogLines.push(line);

        if (serverErrorLogLines.length > MAX_SERVER_LOG_LINES) serverErrorLogLines.shift();

        if (line.startsWith("{")) return;
        console.error(line);
    });

    serverProcess.addListener("error", (err) => {
        console.error("Registry server process error");
        console.error(JSON.stringify(err));
    });

    serverProcess.addListener("exit", (code, signal) => {
        console.log("Registry server exited with code " + code + " and signal " + signal);
    });

    const serverStartResponse = await startServerProcess(
        "Test data",
        "npm",
        ["run", "start:test-data-server"],
        "./",
        {
            PORT: dataServerPort.toString()
        },
        [],
        []
    );

    testDataServerProcess = serverStartResponse.serverProcess;

    // Wait for the server to start
    await new Promise<void>((resolve, reject) => {
        let serverReady = false;

        console.log("Waiting for server to start");
        serverProcess.stdout?.on("data", async (buffer: Buffer) => {
            const line = buffer.toString();
            // console.log(line);
            if (line.indexOf("🚀") !== -1) {
                console.log("Server started!");
                serverReady = true;

                AdminHolder.adminClient = await createUser(
                    "admin",
                    "user",
                    "admin-user",
                    "admin@test.comc",
                    "admin1234",
                    false
                );
                AdminHolder.adminUsername = "admin-user";

                resolve();
            }
        });

        serverProcess.stdout?.on("error", (err: Error) => {
            console.error(JSON.stringify(err, null, 1));
        });

        serverProcess.stdout?.on("close", () => {
            if (!serverReady) throw new Error("Registry server exited before becoming ready");
        });
    });
});

describe("Server should start", async function () {
    it("Should return running status", async function () {
        const client = createTestClient({});
        const response = await client.query({
            query: RegistryStatusDocument
        });

        expect(response.errors == null).equal(true);
        expect(response.data.registryStatus.registryUrl).equal("http://localhost:4200");
        expect(response.data.registryStatus.status).equal(RegistryStatus.SERVING_REQUESTS);

        const packageFileJson = fs.readFileSync(path.join(__dirname, "..", "..", "package.json"));
        const packageFile = JSON.parse(packageFileJson.toString());

        expect(response.data.registryStatus.version).equal(packageFile.version);
    });
});

after(async function () {
    this.timeout(30000);

    const storageFolderPath = TEMP_STORAGE_URL.replace("file://", "");

    if (fs.existsSync(storageFolderPath)) {
        fs.rmSync(storageFolderPath, { recursive: true });
    }

    if (testDataServerProcess) {
        testDataServerProcess.stdout?.destroy();
        testDataServerProcess.stderr?.destroy();

        if (testDataServerProcess.pid !== undefined) {
            try {
                const pids = pidtree(testDataServerProcess.pid, { root: true });

                // recursively kill all child processes
                (await pids).forEach((p) => {
                    console.log("Killing process " + p);
                    try {
                        process.kill(p); // TODO Wait for process to actually exit, then kill it with sign 9 (SIGKILL) after a timeout
                    } catch (error) {
                        console.error("Error killing process " + p);
                        console.error(error);
                    }
                });
                console.log("test data server stopped normally");
            } catch (error) {
                console.log("error stopping processes " + error.message);
            }
        }
    }

    serverProcess.stdout?.destroy();
    serverProcess.stderr?.destroy();

    if (serverProcess.pid !== undefined) {
        try {
            const pids = pidtree(serverProcess.pid, { root: true });

            // recursively kill all child processes
            (await pids).forEach((p) => {
                console.log("Killing process " + p);
                try {
                    process.kill(p);
                } catch (error) {
                    console.error("Error killing process " + p);
                    console.error(error);
                }
            });
        } catch (error) {
            console.log("error stopping processes " + error.message);
        }
    }

    if (container) {
        await container.stop();
        console.log("postgres container stopped normally");
    }

    mailServer.close();
});

async function startServerProcess(
    name: string,
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv | undefined,
    serverLogLines: string[],
    serverErrorLogLines: string[]
): Promise<{ serverProcess: ExecaChildProcess<string> }> {
    console.log("Starting " + name + " server");

    const serverProcess = execa(command, args, {
        cwd,
        env
    });

    serverProcess.stdout?.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverLogLines.push(line);

        if (serverLogLines.length > MAX_SERVER_LOG_LINES) serverLogLines.shift();

        if (line.startsWith("{")) return;
        console.log(line);
    });

    serverProcess.stderr?.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverErrorLogLines.push(line);

        if (serverErrorLogLines.length > MAX_SERVER_LOG_LINES) serverErrorLogLines.shift();

        if (line.startsWith("{")) return;
        console.error(line);
    });

    serverProcess.addListener("error", (err) => {
        console.error(name + " server process error");
        console.error(JSON.stringify(err));
    });

    serverProcess.addListener("exit", (code, signal) => {
        console.log(name + " server exited with code " + code + " and signal " + signal);
    });

    // Wait for the server to start
    await new Promise<void>((resolve) => {
        let serverReady = false;

        console.log("Waiting for " + name + " to start");
        serverProcess.stdout?.on("data", async (buffer: Buffer) => {
            const line = buffer.toString();
            if (line.indexOf("🚀") !== -1) {
                console.log(name + " server started!");
                serverReady = true;

                resolve();
            }
        });

        serverProcess.stdout?.on("error", (err: Error) => {
            console.error(JSON.stringify(err, null, 1));
        });

        serverProcess.stdout?.on("close", () => {
            if (!serverReady) throw new Error(name + " server exited before becoming ready");
        });
    });

    return { serverProcess };
}
