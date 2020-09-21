import { PackageIdentifierInput } from '../../../src/generated/graphql';
import { getRegistryHostname, getRegistryProtocol, getRegistryPort } from './RegistryAccessHelper';

export function packageToIdentifier(identifier:PackageIdentifierInput) {

    const hostname = getRegistryHostname();

    if(hostname == "datapm.io") 
    return identifier.catalogSlug + "/" + identifier.packageSlug;



    const protocol = getRegistryProtocol();
    const port = getRegistryPort();

    let portStr = "";

    if((protocol == "https" && port == 443) || (protocol == "http" && port == 80)) {
        portStr = ""
    }  else {
        portStr = ":" + port.toString();
    }

    

    return protocol+ "://" + hostname + portStr + "/" + identifier.catalogSlug + "/" + identifier.packageSlug


}