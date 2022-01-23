import { IncomingMessage } from "http";
import url from "url";

export function nameToSlug(name: string): string {
    const withDashes = name.toLowerCase().replace(/\W+/g, "-");

    const withoutSurroundingDashes = withDashes.replace(/^[-|_]+/g, "").replace(/[-|_]+$/g, "");

    const shortended = withoutSurroundingDashes.substr(0, 38);

    const withoutSurroundingDashes2 = shortended.replace(/^[-|_]+/g, "").replace(/[-|_]+$/g, "");

    return withoutSurroundingDashes2;
}

export function fileNameFromUrl(url: string, response?: IncomingMessage): string {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;

    let fileName: string | null = null;

    if (response?.headers["content-disposition"]) {
        const disposition = response.headers["content-disposition"];
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) fileName = matches[1].replace(/['"]/g, "");
    }

    if (!fileName) {
        // TODO support URLs with query parameters, etc

        // Use the last part of the path
        const urlParts = url.split("/");

        fileName = urlParts[url.endsWith("/") ? urlParts.length - 2 : urlParts.length - 1];
        fileName = fileName.split("?")[0];
    }

    return fileName;
}

export function nameFromFileUris(uris: string[]): string {
    const names: string[] = [];

    for (const uri of uris) {
        const parsedUrl = new url.URL(uri);
        if (parsedUrl == null) {
            names.push("unknown");
            continue;
        }

        let lastPartOfPath = parsedUrl.pathname.split("/").pop();

        if (lastPartOfPath == null) {
            names.push("unknown");
            continue;
        }

        lastPartOfPath = lastPartOfPath.split("?")[0];

        const lastPartOfPathWithoutExtension = lastPartOfPath.includes(".")
            ? lastPartOfPath.substr(0, lastPartOfPath.indexOf("."))
            : lastPartOfPath;

        names.push(lastPartOfPathWithoutExtension);
    }

    const commonName = fileNamesToSchemaPrefix([], names);

    return commonName;
}

export function toSentenceCase(text: string): string {
    return text.replace(/([A-Z])/g, " $1").replace(/^./, (word) => word.toUpperCase());
}

/** Given a set of file names, find the common characters that make up the final schema name */
export function fileNamesToSchemaPrefix(fileExtensions: string[], fileNames: string[]): string {
    let returnValue: string | null = null;

    if (fileNames.length === 0) throw new Error("NO_FILE_STREAM_SUMMARIES");

    for (const fileName of fileNames.sort((a, b) => a.localeCompare(b))) {
        const fileNameWithoutExtensions = fileNameRemoveExtensions(fileExtensions, fileName);

        if (returnValue == null) {
            returnValue = fileNameWithoutExtensions;
        }

        for (let index = 0; index < returnValue.length && index < fileNameWithoutExtensions.length; index++) {
            const returnValueCharacter = returnValue[index];

            if (returnValueCharacter === "*" || fileNameWithoutExtensions[index] === returnValueCharacter) continue;

            const characters: Array<string> = [...returnValue];
            characters[index] = "*";
            returnValue = characters.join("");
        }
    }

    if (returnValue == null) {
        returnValue = fileNames[0];
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    returnValue = returnValue!.replace("*", "");
    returnValue = returnValue.replace(/^[^a-z0-9]*/gim, "");
    returnValue = returnValue.replace(/[^a-z0-9]*$/gim, "");

    return returnValue as string;
}

export function fileNameRemoveExtensions(fileExtensions: string[], fileName: string): string {
    let newName = fileName.toString();

    for (const fileExtension of fileExtensions) {
        newName = newName.replace(new RegExp(`\\.${fileExtension}$`, "i"), "");
    }

    if (newName == null) {
        newName = fileName;
    }

    return newName;
}
