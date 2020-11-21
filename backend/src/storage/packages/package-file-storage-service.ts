import { FileStorageService } from "../files/file-storage-service";
import { PackageIdentifierInput, VersionIdentifierInput } from "../../generated/graphql";
import { PackageFile, parsePackageFileJSON } from "datapm-lib";
import { Readable, Stream } from "stream";

enum FileType {
    PACKAGE_FILE = "package_file",
    README_FILE = "readme_file",
    LICENSE_FILE = "license_file"
}

enum Prefixes {
    PACKAGE = "package"
}
export class PackageFileStorageService {
    public static readonly INSTANCE = new PackageFileStorageService();
    private fileStorageService = FileStorageService.INSTANCE;

    public async readPackageFile(identifier: VersionIdentifierInput): Promise<PackageFile> {
        const stream = await this.fileStorageService.readFile(
            this.versionIdentifierPath(identifier),
            FileType.PACKAGE_FILE
        );

        const stringValue = await this.streamToString(stream);

        const packageFile = parsePackageFileJSON(stringValue);
        return packageFile;
    }

    public writePackageFile(identifier: VersionIdentifierInput, packageFile: PackageFile): Promise<void> {
        const valueString = JSON.stringify(packageFile);

        return this.fileStorageService.writeFileFromString(
            this.versionIdentifierPath(identifier),
            FileType.PACKAGE_FILE,
            valueString
        );
    }

    deletePackageFile(identifier: VersionIdentifierInput) {
        return this.fileStorageService.deleteFile(this.versionIdentifierPath(identifier), FileType.PACKAGE_FILE);
    }

    private async streamToString(stream: Stream): Promise<string> {
        return new Promise((r) => {
            var tempBuffer: any[] = [];
            stream.on("data", function (d) {
                tempBuffer.push(d);
            });
            stream.on("end", function () {
                var buffer = Buffer.concat(tempBuffer).toString();
                r(buffer);
            });
        });
    }

    private versionIdentifierPath(identifier: VersionIdentifierInput): string {
        return (
            Prefixes.PACKAGE +
            "/" +
            identifier.catalogSlug +
            "/" +
            identifier.packageSlug +
            "/" +
            identifier.versionMajor +
            "." +
            identifier.versionMinor +
            "." +
            identifier.versionPatch
        );
    }
}
