import Conf from "conf";
import { DPMConfiguration } from "datapm-lib";
import { getPassword, setPassword } from "keytar";
import * as crypto from "crypto";
import { v4 as uuid } from "uuid";

const configSchema = {
    registries: {
        type: "array",
        items: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                url: { type: "string" }
            }
        }
    },
    repositories: {
        type: "array",
        items: {
            type: "object",
            properties: {
                identifier: { type: "string" },
                connectionConfiguration: { type: "object" },
                credentials: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            identifier: { type: "string" },
                            encryptedCredentials: { type: "string" },
                            iv: { type: "string" }
                        }
                    }
                }
            }
        }
    }
} as const; // https://github.com/sindresorhus/conf/pull/121#issuecomment-672139929

const config = new Conf({
    projectName: "datapm-client",
    projectVersion: "1.0.2",
    schema: configSchema,
    migrations: {},
    defaults: {
        registries: [],
        repositories: []
    }
});

export interface RegistryConfig {
    url: string;
    apiPath?: string;
    apiKey?: string;
}

export interface RepositoryCredentialsConfig {
    identifier: string;
    encryptedConfiguration: string;
    iv: string; // cryto hash iv value
}
export interface RepositoryConfig {
    /** The unique identifer of the repository */
    identifier: string;

    /** The connection configuration object for the repository, that is used to connect to the repository */
    connectionConfiguration: DPMConfiguration;

    /** An array of string identifiers for each access credential. */
    crdentials?: RepositoryCredentialsConfig[];
}

export interface RepositoryType {
    type: string;

    configs: RepositoryConfig[];
}

export function getConfigurationPath(): string {
    return config.path;
}

export function getConfiguration(): typeof configSchema | unknown {
    return config.store;
}

export function resetConfiguration(): void {
    config.store = { registries: [], repositories: [] };
}

/** Given a repository type, return a list of saved repository configurations */
export function getRepositoryConfigs(type: string): RepositoryConfig[] {
    return (config.get("repositories") as RepositoryType[]).find((f) => f.type === type)?.configs || [];
}
export function getRepositoryConfig(type: string, identifier: string): RepositoryConfig | undefined {
    return getRepositoryConfigs(type).find((r) => r.identifier === identifier);
}

export function saveRepositoryConfig(
    type: string,
    repositoryIdentifer: string,
    connectionConfiguration: DPMConfiguration
): void {
    const repositoryConfig = getRepositoryConfig(type, repositoryIdentifer);

    saveRepositoryConfigInternal(type, {
        identifier: repositoryIdentifer,
        connectionConfiguration,
        crdentials: repositoryConfig ? repositoryConfig.crdentials : []
    });
}

function saveRepositoryConfigInternal(type: string, repositoryConfig: RepositoryConfig): void {
    const repositoryTypes: RepositoryType[] = config.get("repositories") as RepositoryType[];

    let repositoryType = repositoryTypes.find((r) => r.type === type);

    if (repositoryType === undefined) {
        repositoryType = {
            configs: [],
            type
        };
        repositoryTypes.push(repositoryType);
    }

    const filteredConfigs = repositoryType.configs.filter((r) => r.identifier !== repositoryConfig.identifier);

    filteredConfigs.push(repositoryConfig);

    repositoryType.configs = filteredConfigs;

    config.set("repositories", repositoryTypes);
}

export async function getRepositoryCredential(
    repositoryType: string,
    repositoryIdentifier: string,
    credentialsIdentifier: string
): Promise<DPMConfiguration> {
    const repositoryConfig = getRepositoryConfig(repositoryType, repositoryIdentifier);

    if (!repositoryConfig) {
        throw new Error(`No repository configuration found for ${repositoryType} ${repositoryIdentifier}`);
    }

    const credentials = repositoryConfig.crdentials?.find((c) => c.identifier === credentialsIdentifier);

    if (!credentials) {
        throw new Error(`No credentials found for ${repositoryType} ${repositoryIdentifier} ${credentialsIdentifier}`);
    }

    const secretKey = await getCredentialSecretKey();

    if (!secretKey) throw new Error("Could not get secret key");

    const jsonString = decrypt(credentials.iv, credentials.encryptedConfiguration, secretKey);

    return JSON.parse(jsonString);
}

export async function saveRepositoryCredential(
    repositoryType: string,
    repositoryIdentifier: string,
    credentialsIdentifier: string,
    credentials: DPMConfiguration
): Promise<void> {
    const repositoryConfig = getRepositoryConfig(repositoryType, repositoryIdentifier);

    if (!repositoryConfig) {
        throw new Error(`No repository configuration found for ${repositoryType} ${repositoryIdentifier}`);
    }

    const secretKey = await getCredentialSecretKey();

    if (!secretKey) throw new Error("Could not get secret key");

    const jsonString = JSON.stringify(credentials);

    const hash = encrypt(jsonString, secretKey);

    if (repositoryConfig.crdentials == null) repositoryConfig.crdentials = [];

    repositoryConfig.crdentials = repositoryConfig.crdentials.filter((c) => c.identifier !== credentialsIdentifier);

    repositoryConfig.crdentials.push({
        identifier: credentialsIdentifier,
        encryptedConfiguration: hash.content,
        iv: hash.iv
    });

    saveRepositoryConfigInternal(repositoryType, repositoryConfig);
}

export async function deleteRepositoryAccessCredential(
    repositoryType: string,
    repositoryIdentifier: string,
    credentialsIdentifier: string
): Promise<void> {
    const repositoryConfig = getRepositoryConfig(repositoryType, repositoryIdentifier);

    if (!repositoryConfig) {
        throw new Error(`No repository configuration found for ${repositoryType} ${repositoryIdentifier}`);
    }

    const credentials = repositoryConfig.crdentials?.filter((c) => c.identifier !== credentialsIdentifier);

    repositoryConfig.crdentials = credentials;

    saveRepositoryConfigInternal(repositoryType, repositoryConfig);
}

function encrypt(text: string, secretKey: string) {
    const iv = crypto.randomBytes(16);

    const keyHash = crypto.createHash("sha256").update(String(secretKey)).digest("hex").substr(0, 32);

    const cipher = crypto.createCipheriv("aes-256-ctr", keyHash, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString("hex"),
        content: encrypted.toString("base64")
    };
}

function decrypt(iv: string, content: string, secretKey: string) {
    const keyHash = crypto.createHash("sha256").update(String(secretKey)).digest("hex").substr(0, 32);

    const decipher = crypto.createDecipheriv("aes-256-ctr", keyHash, Buffer.from(iv, "hex"));

    const decrpyted = Buffer.concat([decipher.update(Buffer.from(content, "base64")), decipher.final()]);

    return decrpyted.toString();
}

async function getCredentialSecretKey(): Promise<string | null> {
    if (process.env.CREDENTIALS_SECRET_KEY != null) {
        return process.env.CREDENTIALS_SECRET_KEY;
    }

    let secret = await getPassword("datapm", "default");

    if (secret === null) {
        secret = uuid() as string;
        await setPassword("datapm", "default", secret);
    }
    return secret;
}

export function getRegistryConfigs(): RegistryConfig[] {
    return config.get("registries") as RegistryConfig[];
}

export function getRegistryConfig(url: string): RegistryConfig | undefined {
    return getRegistryConfigs().find((registry) => url.startsWith(registry.url));
}

export function addRegistry(registry: RegistryConfig): void {
    const filteredRegistries = getRegistryConfigs().filter((_registry) => _registry.url !== registry.url);

    filteredRegistries.push(registry);

    config.set("registries", filteredRegistries);
}

export function removeRegistry(url: string): void {
    if (config.has("registries")) {
        let registries = config.get("registries") as RegistryConfig[];

        const registryCount = registries.length;

        registries = registries.filter((registry) => {
            return registry.url !== url;
        });

        if (registries.length < registryCount) {
            console.log(`Removing registry ${url} from local configuration`);
        } else {
            console.log(`Did not find ${url} in the local configuration `);
        }

        config.set("registries", registries);
    } else {
        console.log(`There are no registries in the local configuration`);
    }
}
