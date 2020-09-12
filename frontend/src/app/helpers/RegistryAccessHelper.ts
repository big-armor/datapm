import { environment } from '../../environments/environment';
import * as URLParse from 'url-parse';

export function getRegistryPort():number {
    const urlParsed = URLParse(window.location.href);

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
    const urlParsed = URLParse(window.location.href);

    let hostname = "";
    if(environment.registryHostname) {
        hostname = environment.registryHostname;
    } else {
        hostname = urlParsed.hostname;
    }

    return hostname;
}

export function getRegistryProtocol(): "https" | "http" {

    const urlParsed = URLParse(window.location.href);

    let protocol: "http" | "https"  = "https";

    if(environment.registryProtocol) {
        protocol = environment.registryProtocol;
    } else {
        const parsedProtocol = urlParsed.protocol;

        if(parsedProtocol.endsWith(":")) {
            protocol = parsedProtocol.substr(0,length -1) as "http" | "https";
        }

    }

    if(protocol == null ) {
        const port = getRegistryPort();

        if(port == 443)
            protocol = "https"
        
        if(port == 80)
            protocol = "http"
    }


    
    return protocol;
}