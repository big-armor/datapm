import * as URLParse from "url-parse";

export function getRegistryURL(): string {
    let port = getRegistryPort();
    const protocol = getRegistryProtocol();

    let portStr = "";

    if (
        (protocol == "https:" && !(port == "443" || port == "")) ||
        (protocol == "http:" && !(port == "80" || port == ""))
    )
        portStr = ":" + port;

    return protocol + "//" + getRegistryHostname() + portStr;
}

export function getRegistryProtocol(): "https:" | "http:" {
    const urlParsed = URLParse(currentLocation());

    return urlParsed.protocol as "https:" | "http:";
}

export function getRegistryHostname(): string {
    const urlParsed = URLParse(currentLocation());

    let hostname = urlParsed.hostname;

    if (hostname == "www.datapm.io") hostname = "datapm.io";

    return hostname;
}

export function getRegistryPort(): string {
    const urlParsed = URLParse(currentLocation());
    const protocol = urlParsed.protocol;

    let port = urlParsed.port;
    if (port == "") {
        if (protocol == "http") port = "80";
        else if (protocol == "https") port = "443";
    }

    return port;
}

export function currentLocation() {
    return window.location.href;
}
