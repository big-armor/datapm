export function createAPIKeyFromParts(id: string, secret: string): string {
    return Buffer.from(id + "." + secret).toString("base64");
}
