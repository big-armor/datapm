import BaseX from "base-x";

const base62 = new BaseX("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");

export function encodeBase62(value: string): string {
    return base62.encode(Buffer.from(value, "utf-8"));
}

export function decodeBase62(encodedValue: string): string {
    return base62.decode(encodedValue).toString();
}
