import fs from "fs";
import path from "path";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
const client = new SecretManagerServiceClient();

async function getSecret(name: string): Promise<Buffer> {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
        throw new Error("the environment variable GOOGLE_CLOUD_PROJECT is unset");
    }

    const [secret] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${name}/versions/latest`
    });

    if (!secret.payload) {
        throw new Error("the secret contains no payload");
    }

    if (!secret.payload.data) {
        throw new Error("the secret contains no data");
    }

    return Buffer.from(secret.payload.data);
}

export async function getSecretVariable(envVariableName: string): Promise<void> {
    if (process.env[envVariableName] !== undefined) {
        // secret already specified in environment variable - all done
        return;
    }

    // secret not specified in environment variable - retrieve from secret manager
    try {
        const secret = await getSecret(envVariableName);

        // inject value into process environment
        process.env[envVariableName] = secret.toString();
        return;
    } catch (err) {
        console.warn(`Unable to lookup ${envVariableName} from secret manager - ${err}`);
        return;
    }
}

// if running within app engine (GAE_SERVICE is set)
// get a cached copy of the APP_ENGINE_SERVICE_ACCOUNT_JSON from secret manager
// write this json to disk and set GOOGLE_APPLICATION_CREDENTIALS
// we do this to improve performance of gcloud getSignedUrl
// when credentials are from a json, they are cached
// when they are from an auto-discovered service account, they are not
export async function setAppEngineServiceAccountJson(): Promise<void> {
    if (process.env.GAE_SERVICE === undefined) {
        return;
    }

    const secret = await getSecret("APP_ENGINE_SERVICE_ACCOUNT_JSON");

    const jsonLocation = path.join(process.cwd(), "app-engine-service-account.json");

    await fs.promises.writeFile(jsonLocation, secret);

    process.env.GOOGLE_APPLICATION_CREDENTIALS = jsonLocation;
}
