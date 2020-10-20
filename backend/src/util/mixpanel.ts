import fetch from "node-fetch";
import { Request } from "express";

// grab the Mixpanel factory
import * as Mixpanel from "mixpanel";

// initialize mixpanel client configured to communicate over https
export const mixpanel = process.env.MIXPANEL_TOKEN
    ? Mixpanel.init(process.env.MIXPANEL_TOKEN ?? "", {
          protocol: "https"
      })
    : null;

const BASE_URL = "https://api.mixpanel.com";
const TRACK_URL = `${BASE_URL}/track`;
const ENGAGE_URL = `${BASE_URL}/engage`;

export function track(actions: object, request: Request): Promise<number> {
    return forwardMixpanel(TRACK_URL, actions, request);
}

export function engage(userInfo: object, request: Request): Promise<number> {
    return forwardMixpanel(ENGAGE_URL, userInfo, request);
}

async function forwardMixpanel(url: string, data: object, request: Request): Promise<number> {
    const ip = (request.headers["x-forwarded-for"] as string) || request.connection.remoteAddress || "";

    const result = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Forwarded-For": ip
        },
        body: "data=" + Buffer.from(JSON.stringify(data)).toString("base64")
    });

    if (result.status !== 200) {
        throw new Error(`Bad Status Code: ${result.status}`);
    }

    const text = await result.text();

    return parseInt(text);
}
