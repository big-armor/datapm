import path from "path";
import os from "os";

export function getLocalDataPath(catalogSlug: string | undefined, packageSlug: string): string {
    return path.join(os.homedir(), "datapm", "data", catalogSlug !== undefined ? catalogSlug : "_local", packageSlug);
}
