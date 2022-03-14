import { GenericContainer, StartedTestContainer } from "testcontainers";

import execa from "execa";
import { ExecaChildProcess } from "execa";
import pidtree from "pidtree";
import { Observable } from "@apollo/client/core";
import fs from "fs";
import { before } from "mocha";
import { createTestClient, createUser } from "./test-utils";
import { ActivityLogChangeType, ActivityLogEventType, RegistryStatusDocument } from "./registry-client";
import { expect } from "chai";
import { AdminHolder } from "./admin-holder";
import { TEMP_STORAGE_PATH } from "./constants";

const maildev = require("maildev");

export const dataServerPort: number = Math.floor(Math.random() * (65535 - 1024) + 1024);

let container: StartedTestContainer;
let serverProcess: ExecaChildProcess;
let testDataServerProcess: execa.ExecaChildProcess<string>;
let mailServer: any;
export let mailObservable: Observable<any>;

export const TEMP_STORAGE_URL = "file://" + TEMP_STORAGE_PATH;
const MAX_SERVER_LOG_LINES = 25;

// These hold the standard out log lines from the datapm server
export let serverLogLines: string[] = [];
export let serverErrorLogLines: string[] = [];

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
    targetCollectionSlug?: string;
    targetUsername?: string;
    propertiesEdited?: string[];
}


export function findActivityLogLine(line: string, callback: (activityLogLine: ActivityLogLine) => boolean): Boolean {
    if (!line.startsWith("{")) return false;

    try {
        const lineObject = JSON.parse(line) as ActivityLogLine;
        if (lineObject._type == "ActivityLog" && callback(lineObject)) return true;
    } catch (e) {
        console.log("Error parsing line: " + line);
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

    console.log("Postgres started");

    // star the maildev server
    mailServer = new maildev({
        smtp: 1025,
        web: 1081,
        ignoreTLS: true
    });

    let mailObserver: ZenObservable.SubscriptionObserver<any>;

    mailServer.listen((err: any) => {
        mailObservable = new Observable<any>((observer) => {
            mailObserver = observer;
        });
    });

    mailServer.on("new", function (email: any) {
        mailObserver.next(email);
    });

    serverProcess = execa("npm", ["run", "start-nowatch"], {
        env: {
            TYPEORM_PORT: postgresPortNumber.toString(),
            SMTP_PORT: "1025",
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

    serverProcess.stdout!.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverLogLines.push(line);

        if (serverLogLines.length > MAX_SERVER_LOG_LINES) serverLogLines.shift();

        if (line.startsWith("{")) return;
        console.log(line);
    });

    serverProcess.stderr!.addListener("data", (chunk: Buffer) => {
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
    await new Promise<void>(async (r) => {
        let serverReady = false;

        console.log("Waiting for server to start");
        serverProcess.stdout!.on("data", async (buffer: Buffer) => {
            const line = buffer.toString();
            //console.log(line);
            if (line.indexOf("🚀") != -1) {
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

                r();
            }
        });

        serverProcess.stdout!.on("error", (err: Error) => {
            console.error(JSON.stringify(err, null, 1));
        });

        serverProcess.stdout!.on("close", () => {
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
    });
});

after(async function () {
    this.timeout(30000);

    const storageFolderPath = TEMP_STORAGE_URL.replace("file://", "");

    if(fs.existsSync(storageFolderPath)) {
            fs.rmSync(storageFolderPath, { recursive: true });
    }

    if(testDataServerProcess) {
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

    serverProcess.stdout!.destroy();
    serverProcess.stderr!.destroy();

    if(serverProcess.pid !== undefined) {
        try {
                let pids = pidtree(serverProcess.pid, { root: true });

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