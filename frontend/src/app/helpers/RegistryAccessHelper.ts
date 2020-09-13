import { environment } from '../../environments/environment';
import * as URLParse from 'url-parse';

export function getRegistryPort():number {
    const urlParsed = URLParse(currentLocation());

    let port:number = 443;

    if(environment.registryPort) {

        port = environment.registryPort;
    } else {
    
        if(urlParsed.protocol == "https:"
            && (urlParsed.port == "" || urlParsed.port == "443")) {

        } else if(urlParsed.protocol == "http:"
            && (urlParsed.port == "" || urlParsed.port == "80")) {

        } else if(urlParsed.port != "") {
            port = Number.parseInt(urlParsed.port);
        }

    }

    return port;

}

export function getRegistryHostname():string {
    const urlParsed = URLParse(currentLocation());

    let hostname = "";
    if(environment.registryHostname) {
        hostname = environment.registryHostname;
    } else {
        hostname = urlParsed.hostname;
    }

    return hostname;
}

export function getRegistryProtocol(): "https" | "http" {

    const urlParsed = URLParse(currentLocation());

    let protocol = "https";

    if(environment.registryProtocol) {
        protocol = environment.registryProtocol;
    } else {
        const parsedProtocol = urlParsed.protocol;

        if(parsedProtocol.endsWith(":")) {
            protocol = parsedProtocol.substr(0,parsedProtocol.length - 1);
        }

    }

    if(protocol == null || protocol == "" ) {
        const port = getRegistryPort();

        if(port == 80)
            protocol = "http"

        else 
            protocol = "https"
    }


    
    return protocol as "https" | "http";
}

export function currentLocation() {
    return window.location.href;
}