import fs from "fs";
import getRandomFruitsName from "random-fruits-name";
import pidtree from "pidtree";
import { GenericContainer, Network, StartedNetwork, StartedTestContainer } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/dist/wait-strategy";
import { setTestSourceFiles } from "./test-utils";
import execa, { ExecaChildProcess } from "execa";

import { RandomUuid } from "testcontainers/dist/uuid";
// const log = require("why-is-node-running");

export const TEMP_STORAGE_PATH = "tmp-registry-server-storage-" + new RandomUuid().nextUuid();
export const TEMP_STORAGE_URL = "file://" + TEMP_STORAGE_PATH;
const MAX_SERVER_LOG_LINES = 25;

// These hold the standard out log lines from the datapm server
export const serverLogLines: string[] = [];
export const serverErrorLogLines: string[] = [];

let databaseContainer: StartedTestContainer;
let testDataServerProcess: execa.ExecaChildProcess<string>;
let registryServerProcess: execa.ExecaChildProcess<string>;
let mailDevContainer: StartedTestContainer;
let network: StartedNetwork;

// let registryContainerReadable: Readable;
export let databaseIpAddress: string;
export let databasePortNumber: number;
export let mailDevWebPortNumber: number;
export const registryServerPort: number = Math.floor(Math.random() * (65535 - 1024) + 1024);
export const dataServerPort: number = Math.floor(Math.random() * (65535 - 1024) + 1024);

before(async function () {
    network = await new Network().start();

    const runName = getRandomFruitsName("en")
        .replace(/[^a-zA-Z0-9_.-]/g, "-")
        .toLowerCase();

    console.log("Run name is " + runName);

    console.log("Starting postgres temporary container");

    this.timeout(300000);
    databaseContainer = await new GenericContainer("postgres", "13.3")
        .withEnv("POSTGRES_USER", "postgres")
        .withEnv("POSTGRES_PASSWORD", "postgres")
        .withEnv("POSTGRES_DB", "datapm")
        .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
        .withExposedPorts(5432)
        .withName("database-" + runName)
        .withNetworkMode(network.getName())
        .withWaitStrategy(new LogWaitStrategy("database system is ready to accept connections"))
        .start();

    databasePortNumber = databaseContainer.getMappedPort(5432);
    databaseIpAddress = databaseContainer.getContainerIpAddress();
    console.log("Postgres started on " + databaseIpAddress + ":" + databasePortNumber);

    mailDevContainer = await new GenericContainer("maildev/maildev")
        .withExposedPorts(80, 25)
        .withName("smtp-" + runName)
        .withNetworkMode(network.getName())
        .start();

    mailDevWebPortNumber = mailDevContainer.getMappedPort(80);
    const mailDevSMTPPortNumber = mailDevContainer.getMappedPort(25);
    const mailDevIpAddress = mailDevContainer.getContainerIpAddress();

    console.log(
        "maildev started on " +
            mailDevIpAddress +
            ", web port " +
            mailDevWebPortNumber +
            " smtp port " +
            mailDevSMTPPortNumber
    );

    testDataServerProcess = (
        await startServerProcess(
            "Test data",
            "npm",
            ["run", "start:test-data-server"],
            "./",
            {
                PORT: dataServerPort.toString()
            },
            [],
            []
        )
    ).serverProcess;

    console.log("Test data server started on port " + dataServerPort);

    registryServerProcess = (
        await startServerProcess(
            "Registry",
            "npm",
            ["run", "start-nowatch"],
            "../backend",
            {
                PORT: registryServerPort.toString(),
                TYPEORM_PORT: databasePortNumber.toString(),
                SMTP_PORT: mailDevSMTPPortNumber.toString(),
                SMTP_SERVER: "localhost",
                SMTP_USER: "",
                SMTP_PASSWORD: "",
                SMTP_SECURE: "false",
                SMTP_FROM_ADDRESS: "test@localhost",
                SMTP_FROM_NAME: "local-test",
                STORAGE_URL: TEMP_STORAGE_URL,
                ACTIVITY_LOG: "false",
                LEADER_ELECTION_DISABLED: "true",
                SCHEDULER_KEY: "TEST_JOB_KEY"
            },
            serverLogLines,
            serverErrorLogLines
        )
    ).serverProcess;

    /* const registryContainerReadable = await registryContainer.logs();

	registryContainerReadable
		.on("data", (chunk) => {
			console.log(chunk);
		})
		.on("error", (chunk) => {
			console.error(chunk);
		})
		.on("close", () => {
			console.log("DataPM registry container closed");
		}); */

    console.log("Registry server started on port " + registryServerPort);
    setTestSourceFiles();
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

        console.log("Waiting for server to start");
        serverProcess.stdout?.on("data", async (buffer: Buffer) => {
            const line = buffer.toString();
            // console.log(line);
            if (line.indexOf("🚀") !== -1) {
                console.log(name + "server started!");
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

after(async function () {
    this.timeout(30000);

    registryServerProcess.stdout?.destroy();
    registryServerProcess.stderr?.destroy();

    try {
        const pids = pidtree(registryServerProcess.pid, { root: true });

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
        console.log("datapm registry container stopped normally");
    } catch (error) {
        console.log("error stopping processes " + error.message);
    }

    fs.rmdirSync(TEMP_STORAGE_URL.replace("file://", "./../backend/"), { recursive: true });

    testDataServerProcess.stdout?.destroy();
    testDataServerProcess.stderr?.destroy();

    try {
        const pids = pidtree(testDataServerProcess.pid, { root: true });

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
        console.log("test data server stopped normally");
    } catch (error) {
        console.log("error stopping processes " + error.message);
    }

    if (databaseContainer) await databaseContainer.stop();
    console.log("postgres container stopped normally");

    if (mailDevContainer) await mailDevContainer.stop();
    console.log("maildev container stopped normally");

    if (network) await network.stop();

    // registryContainerReadable.destroy();

    const pids = pidtree(process.pid, { root: true });

    // recursively kill all child processes
    (await pids).forEach((p) => {
        if (p === process.pid) return;

        console.warn("Killing process " + p + " this means there is a test leaving a process open");
        try {
            process.kill(p, 9);
        } catch (error) {
            if (error.message.includes("ESRCH")) return;
            console.error("Error killing process " + p);
            console.error(error);
        }
    });

    // setTimeout(() => {
    //	log(); // uncomment to view all open threads, for debugging when the process wont exit
    // }, 2000);
});
