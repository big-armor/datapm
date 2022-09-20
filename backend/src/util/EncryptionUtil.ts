import crypto from "crypto";

export function encryptValue(value: string): string {
    const engine = getEncryptionEngine();

    return engine.encryptValue(value);
}

export function decryptValue(value: string): string {
    const engine = getEncryptionEngine();

    return engine.decryptValue(value);
}

function getEncryptionEngine(): EncryptionEngine {
    if (process.env.ENCRYPTION_ENGINE?.toLocaleLowerCase() === "nodejs" || process.env.ENCRYPTION_ENGINE == null) {
        return new NodeJSEncryptionEngine();
    }

    throw new Error("ENCRYPTION_ENGINE " + process.env.ENCRYPTION_ENGINE + " not recognized");
}

interface EncryptionEngine {
    encryptValue(value: string): string;
    decryptValue(value: string): string;
}

class NodeJSEncryptionEngine implements EncryptionEngine {
    encryptValue(value: string): string {
        const key = process.env.NODEJS_ENCRYPTION_KEY;

        if (key == null) throw new Error("NODEJS_ENCRYPTION_KEY not set");

        const iv = crypto.randomBytes(16);

        const safeKey = crypto.createHash("sha256").update(String(key)).digest("base64").substr(0, 32);

        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(safeKey), iv);
        let encrypted = cipher.update(value, "utf-8");
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const jsonValue = { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
        const jsonString = JSON.stringify(jsonValue);
        return jsonString;
    }

    decryptValue(value: string): string {
        const key = process.env.NODEJS_ENCRYPTION_KEY;

        if (key == null) throw new Error("NODEJS_ENCRYPTION_KEY not set");

        const jsonValue = JSON.parse(value);

        const safeKey = crypto.createHash("sha256").update(String(key)).digest("base64").substr(0, 32);

        const iv = Buffer.from(jsonValue.iv, "hex");
        const encryptedText = Buffer.from(jsonValue.encryptedData, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(safeKey), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}
