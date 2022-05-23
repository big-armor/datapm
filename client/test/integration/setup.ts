import fs from "fs";
import getRandomFruitsName from "random-fruits-name";
import pidtree from "pidtree";
import { GenericContainer, Network, StartedNetwork, StartedTestContainer } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/dist/wait-strategy";
import { setTestSourceFiles } from "./test-utils";
import execa, { ExecaChildProcess } from "execa";

import { RandomUuid } from "testcontainers/dist/uuid";
import { Listr, ListrContext, ListrTask } from "listr2";
// const log = require("why-is-node-running");

const TEMP_STORAGE_PREFIX = "tmp-registry-server-storage-";
export const TEMP_STORAGE_PATH = TEMP_STORAGE_PREFIX + new RandomUuid().nextUuid();
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
let mailDevSMTPPortNumber: number;
export let mailDevIpAddress: string;
export const registryServerPort: number = Math.floor(Math.random() * (65535 - 1024) + 1024);
export const dataServerPort: number = Math.floor(Math.random() * (65535 - 1024) + 1024);

before(async function () {
    this.timeout(500 * 1000);
    network = await new Network().start();

    const runName = getRandomFruitsName("en")
        .replace(/[^a-zA-Z0-9_.-]/g, "-")
        .toLowerCase();

    console.log("Run name is " + runName);

    const listrTasks: ListrTask[] = [];

    listrTasks.push({
        task: async function (): Promise<void> {
            await execa("npm", ["run", "build"]);
        },
        title: "Build Client"
    });

    /* listrTasks.push({
        task: async function (): Promise<void> {
            await execa("npm", ["run", "build"], {
                cwd: "../backend"
            });
        },
        title: "Build Server"
    }); */

    listrTasks.push({
        task: async function (): Promise<void> {
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
        },
        title: "Start Postgress"
    });

    listrTasks.push({
        task: async function (): Promise<void> {
            mailDevContainer = await new GenericContainer("maildev/maildev", "2.0.2")
                .withExposedPorts(1080, 1025)
                .withName("smtp-" + runName)
                .withNetworkMode(network.getName())
                .start();

            mailDevWebPortNumber = mailDevContainer.getMappedPort(1080);
            mailDevSMTPPortNumber = mailDevContainer.getMappedPort(1025);
            mailDevIpAddress = mailDevContainer.getContainerIpAddress();
            console.log(
                "maildev started on " +
                    mailDevIpAddress +
                    ", web port " +
                    mailDevWebPortNumber +
                    " smtp port " +
                    mailDevSMTPPortNumber
            );
        },
        title: "Start MailDev"
    });

    listrTasks.push({
        task: async function (): Promise<void> {
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
        },
        title: "Start test data server"
    });

    listrTasks.push({
        task: async function (): Promise<void> {
            if (fs.existsSync(TEMP_STORAGE_PATH)) {
                fs.rmSync(TEMP_STORAGE_PATH, { recursive: true });
            }
        }
    });

    // eslint-disable-next-line no-async-promise-executor

    const listr = new Listr<ListrContext>(listrTasks, {
        concurrent: true,
        rendererSilent: false
    });

    try {
        await listr.run();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    console.log("Starting registry server for tests");

    registryServerProcess = (
        await startServerProcess(
            "Registry",
            "npm",
            ["run", "start:server"],
            "../backend",
            {
                REGISTRY_URL: "http://localhost:" + registryServerPort,
                PORT: registryServerPort.toString(),
                TYPEORM_HOST: databaseIpAddress,
                TYPEORM_PORT: databasePortNumber.toString(),
                SMTP_PORT: mailDevSMTPPortNumber.toString(),
                SMTP_SERVER: mailDevIpAddress,
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

    console.log("Registry server started on port " + registryServerPort);

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

        console.log("Waiting for " + name + " to start");
        serverProcess.stdout?.on("data", async (buffer: Buffer) => {
            const line = buffer.toString();
            // console.log(line);
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

after(async function () {
    this.timeout(30000);

    if (registryServerProcess) {
        registryServerProcess.stdout?.destroy();
        registryServerProcess.stderr?.destroy();

        if (registryServerProcess.pid !== undefined) {
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
        }
    }

    const tempStoragePathRelative = TEMP_STORAGE_URL.replace("file://", "./../backend/");

    if (fs.existsSync(tempStoragePathRelative)) {
        fs.rmSync(tempStoragePathRelative, { recursive: true });
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
