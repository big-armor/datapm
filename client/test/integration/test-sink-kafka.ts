import { expect } from "chai";
import { GenericContainer, KafkaContainer, Network, StartedNetwork, StartedTestContainer } from "testcontainers";
import { getPromptInputs, KEYS, testCmd, TestResults } from "./test-utils";
import { Kafka, logLevel } from "kafkajs";

const generateCommandPrompts = [
    "Exclude any attributes",
    "Rename attributes",
    "derived from other 'upstream data'?",

    "User friendly package name?",
    "Package short name?",
    "Starting version?",
    "Short package description?",
    "Website?",
    "Number of sample records?",
    "Publish to registry?"
];

const getGenerateCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(generateCommandPrompts, inputs, skip, count);

describe("Kafka Sink", () => {
    let kafkaTestContainer: StartedTestContainer;
    let zookeeperTestContainer: StartedTestContainer;
    let kafkaPort: number;
    let network: StartedNetwork;

    before(async () => {
        network = await new Network().start();

        console.log("Starting Zookeeper test container");

        zookeeperTestContainer = await new GenericContainer("zookeeper", "3.8.0")
            .withNetworkMode(network.getName())
            .withName("zookeeper")
            .withEnv("ZOOKEEPER_CLIENT_PORT", "2181")
            .withExposedPorts(2181)
            .start();

        console.log("Starting Kafka test container");

        kafkaTestContainer = await new KafkaContainer("wurstmeister/kafka", "2.13-2.8.1")
            .withExposedPorts(9093)
            .withZooKeeper("zookeeper", 2181)
            .withNetworkMode(network.getName())
            .start();

        kafkaPort = kafkaTestContainer.getMappedPort(9093);
        console.log(`Kafka port: ${kafkaPort}`);
    });

    it("Should generate package from test stream source without issue", async function () {
        const prompts = [
            {
                message: "How many test records?",
                input: `10${KEYS.ENTER}`
            },
            {
                message: "Name of attribute?",
                input: `Company${KEYS.ENTER}`
            },
            {
                message: "Category of 'Company' attribute?",
                input: `${Array(2).fill(KEYS.DOWN).join("")}${KEYS.ENTER}`
            },
            {
                message: "Type of 'Company' attribute?",
                input: KEYS.ENTER
            },
            {
                message: "Name of attribute?",
                input: `IBAN${KEYS.ENTER}`
            },
            {
                message: "Category of 'IBAN' attribute?",
                input: `${Array(5).fill(KEYS.DOWN).join("")}${KEYS.ENTER}`
            },
            {
                message: "Type of 'IBAN' attribute?",
                input: `${Array(13).fill(KEYS.DOWN).join("")}${KEYS.ENTER}`
            },
            {
                message: "Name of attribute?",
                input: KEYS.ENTER
            },
            ...getGenerateCommandPromptInputs([
                "",
                "",
                "",
                "test",
                "",
                "",
                "test",
                "https://test.datapm-not-a-site.io",
                "10",
                "no"
            ])
        ];

        const unitPrompts = [
            {
                message: "What does each random record represent?",
                input: "country\n"
            }
        ];

        prompts.splice(11, 0, ...unitPrompts);

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("package", ["test://"], prompts, async (line: string) => {
            if (line.includes("datapm publish ")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should allow streaming of records to Kafka", async () => {
        const prompts: Array<{
            message: string;
            input: string;
            isDone?: boolean;
        }> = [
            {
                message: "Exclude any attributes from",
                input: "No" + KEYS.ENTER
            },
            {
                message: "Rename attributes from",
                input: "No" + KEYS.ENTER
            },
            {
                message: "Sink Connector?",
                input: `Kafka` + KEYS.ENTER
            },
            {
                message: "Brokers?",
                input: `${kafkaTestContainer.getContainerIpAddress()}:${kafkaPort}${KEYS.ENTER}`
            },
            {
                message: "Use SSL?",
                input: "No" + KEYS.ENTER
            },
            {
                message: "Authentication?",
                input: "None" + KEYS.ENTER
            },
            {
                message: "Client Id?",
                input: "datapm" + KEYS.ENTER
            },
            {
                message: "Topic?",
                input: "test" + KEYS.ENTER
            },
            {
                message: "Create topics?",
                input: "Yes" + KEYS.ENTER
            },
            {
                message: "Number of partitions?",
                input: "1" + KEYS.ENTER
            },
            {
                message: "Replication factor?",
                input: "1" + KEYS.ENTER
            },
            {
                message: "Max batch size?",
                input: "100" + KEYS.ENTER
            },
            {
                message: "Max batch wait milliseconds?",
                input: "100" + KEYS.ENTER
            },
            {
                message: "Format?",
                input: "json" + KEYS.ENTER
            }
        ];

        const cmdResult = await testCmd("fetch", ["local/test"], prompts);

        expect(cmdResult.code).equals(0);
    });

    it("Should read all records", async () => {
        const kafka = new Kafka({
            logLevel: logLevel.NOTHING,
            brokers: [`${kafkaTestContainer.getContainerIpAddress()}:${kafkaTestContainer.getMappedPort(9093)}`]
        });

        const consumer = kafka.consumer({ groupId: "test-group" });
        await consumer.connect();

        await consumer.subscribe({ topic: "test", fromBeginning: true });

        const messages: string[] = [];

        consumer.run({
            eachMessage: async ({ message }) => {
                if (message.value) messages.push(message.value?.toString());
            }
        });

        while (true) {
            if (messages.length === 10) {
                break;
            }

            await new Promise<void>((resolve) => setTimeout(resolve, 100));
        }

        expect(messages.length).equals(10);

        const firstRecord = JSON.parse(messages[0]);

        expect(firstRecord.Company).not.equal(null);
        expect(firstRecord.IBAN).not.equal(null);

        await consumer.disconnect();
    });

    after(async () => {
        if (kafkaTestContainer) await kafkaTestContainer.stop();
        if (zookeeperTestContainer) await zookeeperTestContainer.stop();
    });
});
