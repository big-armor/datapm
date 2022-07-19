import Conf from "conf";
import { DPMConfiguration } from "datapm-lib";
import * as crypto from "crypto";
import { v4 as uuid } from "uuid";
import { RegistryConfig, RepositoryConfig, RepositoryType } from "datapm-client-lib";
import os from "os";
import fs from "fs";
import path from "path";

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
                            encryptedConfiguration: { type: "string" },
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

export function removeRepositoryConfig(type: string, repositoryIdentifer: string): void {
    const repositoryConfigs = (config.get("repositories") as RepositoryType[]) || null;

    if (repositoryConfigs == null) {
        throw new Error("There are no saved repositories.");
    }

    const repositoryType = repositoryConfigs.find((f) => f.type === type);

    if (repositoryType == null) {
        throw new Error(`Repository type ${type} not found in saved configurations`);
    }

    repositoryType.configs = repositoryType.configs.filter((r) => r.identifier !== repositoryIdentifer);

    if (repositoryType.configs.length === 0) {
        repositoryConfigs.splice(repositoryConfigs.indexOf(repositoryType), 1);
    }

    config.set("repositories", repositoryConfigs);
}

export function saveRepositoryConfig(type: string, repositoryConfig: RepositoryConfig): void {
    saveRepositoryConfigInternal(type, {
        identifier: repositoryConfig.identifier,
        connectionConfiguration: repositoryConfig.connectionConfiguration,
        credentials: repositoryConfig ? repositoryConfig.credentials : []
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
): Promise<DPMConfiguration | undefined> {
    const repositoryConfig = getRepositoryConfig(repositoryType, repositoryIdentifier);

    if (!repositoryConfig) {
        return undefined;
    }

    const credentials = repositoryConfig.credentials?.find((c) => c.identifier === credentialsIdentifier);

    if (!credentials) {
        return undefined;
    }

    const secretKey = await getCredentialSecretKey();

    if (!secretKey) throw new Error("Could not get secret key");

    const hash = JSON.parse(credentials.encryptedConfiguration) as { iv: string; value: string };

    const jsonString = decrypt(hash.iv, hash.value, secretKey);

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

    if (repositoryConfig.credentials == null) repositoryConfig.credentials = [];

    repositoryConfig.credentials = repositoryConfig.credentials.filter((c) => c.identifier !== credentialsIdentifier);

    repositoryConfig.credentials.push({
        identifier: credentialsIdentifier,
        encryptedConfiguration: JSON.stringify({ value: hash.content, iv: hash.iv })
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

    const credentials = repositoryConfig.credentials?.filter((c) => c.identifier !== credentialsIdentifier);

    repositoryConfig.credentials = credentials;

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

    const operatingSystem = os.platform();
    let secret: string | null;

    // Use node-keytar on macOS and windows. Keytar uses libsecret -> gnome-keyring -> X11 on linux (sad face)
    if (operatingSystem === "win32" || operatingSystem === "darwin") {
        const keytar = await import("keytar");

        secret = await keytar.getPassword("datapm", "default");

        if (secret === null) {
            secret = uuid() as string;
            await keytar.setPassword("datapm", "default", secret);
        }
    } else {
        const rootDirectory = path.join(os.homedir(), "datapm");

        if (!fs.existsSync(rootDirectory)) {
            fs.mkdirSync(rootDirectory, { recursive: true });
        }

        const credentialsFilePath = path.join("credentials.secret");
        const secretFile = credentialsFilePath;

        if (!fs.existsSync(secretFile)) {
            secret = uuid() as string;
            fs.writeFileSync(secretFile, secret);
            fs.chmodSync(secretFile, 0o400);
        } else {
            const fileStat = fs.statSync(secretFile);
            const unixFilePermissions = "0" + (fileStat.mode & parseInt("777", 8)).toString(8);

            if (unixFilePermissions !== "0400") {
                console.log("The datapm credentials file should be readable only by the owner");
                console.log("Use the following command to fix this serious issue: ");
                console.log("chmod 400 " + secretFile);
                process.exit(1);
            }

            secret = fs.readFileSync(secretFile).toString();
        }
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

export function removeCredentialsConfig(
    repositoryType: string,
    repositoryIdentifer: string,
    credentialsIdentifier: string
): void {
    const repositoryConfigs = (config.get("repositories") as RepositoryType[]) || null;

    if (repositoryConfigs == null) {
        throw new Error("There are no saved repositories.");
    }

    const repositoryTypeConfigObject = repositoryConfigs.find((f) => f.type === repositoryType);

    if (repositoryTypeConfigObject == null) {
        throw new Error(`Repository type ${repositoryType} not found in saved configurations`);
    }

    const repositoryConfig = repositoryTypeConfigObject.configs.find((r) => r.identifier === repositoryIdentifer);

    if (repositoryConfig == null) {
        throw new Error(`Repository ${repositoryType} ${repositoryIdentifer} not found in saved configurations`);
    }

    if (repositoryConfig.credentials == null || repositoryConfig.credentials.length === 0) {
        throw new Error(`Repository ${repositoryType} ${repositoryIdentifer} does not have any credentials`);
    }

    const credentialsConfig = repositoryConfig.credentials.find((c) => c.identifier === credentialsIdentifier);

    if (credentialsConfig == null) {
        throw new Error(`Credentials ${credentialsIdentifier} not found in ${repositoryType} ${repositoryIdentifer}`);
    }

    repositoryConfig.credentials.splice(repositoryConfig.credentials.indexOf(credentialsConfig), 1);

    config.set("repositories", repositoryConfigs);
}
