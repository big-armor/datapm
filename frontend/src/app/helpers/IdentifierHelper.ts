import * as URLParse from 'url-parse';
import { PackageIdentifier, PackageGQL, PackageQuery, PackageIdentifierInput } from '../../../src/generated/graphql';
import { url } from 'inspector';
import { environment } from 'src/environments/environment';


export function packageToIdentifier(identifier:PackageIdentifierInput) {

    const urlParsed = URLParse(window.location.href);

    if(urlParsed.hostname == "datapm.io") 
        return identifier.catalogSlug + "/" + identifier.packageSlug;


    let hostname = "";
    if(environment.registryHostname) {
        hostname = environment.registryHostname;
    } else {
        hostname = urlParsed.hostname;
    }

    let port = "";

    if(environment.registryPort) {

        port = ":" + environment.registryPort.toString();
    } else {
    
        if(urlParsed.protocol == "https:"
            && (urlParsed.port == "" || urlParsed.port == "443")) {

        } else if(urlParsed.protocol == "http:"
            && (urlParsed.port == "" || urlParsed.port == "80")) {

        } else {
            port = ":" + urlParsed.port
        }

    }

    let protocol  = "";

    if(environment.registryProtocol) {
        protocol = environment.registryProtocol;
    } else {
        protocol = urlParsed.protocol;
    }

    return protocol+ "://" + hostname + port + "/" + identifier.catalogSlug + "/" + identifier.packageSlug


}