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

    public async readPackageFile(packageId: number, identifier: VersionIdentifierInput): Promise<PackageFile> {
        const stream = await this.fileStorageService.readFile(
            this.versionIdentifierPath(packageId, identifier),
            FileType.PACKAGE_FILE
        );

        const stringValue = await this.streamToString(stream);

        const packageFile = parsePackageFileJSON(stringValue);
        return packageFile;
    }

    public writePackageFile(
        packageId: number,
        identifier: VersionIdentifierInput,
        packageFile: PackageFile
    ): Promise<void> {
        const valueString = JSON.stringify(packageFile);

        return this.fileStorageService.writeFileFromString(
            this.versionIdentifierPath(packageId, identifier),
            FileType.PACKAGE_FILE,
            valueString
        );
    }

    deletePackageFile(packageId: number, identifier: VersionIdentifierInput): Promise<void> {
        return this.fileStorageService.deleteFile(
            this.versionIdentifierPath(packageId, identifier),
            FileType.PACKAGE_FILE
        );
    }

    private async streamToString(stream: Stream): Promise<string> {
        return new Promise((resolve) => {
            const tempBuffer: Array<Uint8Array> = [];
            stream.on("data", function (d) {
                tempBuffer.push(d);
            });
            stream.on("end", function () {
                const buffer = Buffer.concat(tempBuffer).toString();
                resolve(buffer);
            });
        });
    }

    private versionIdentifierPath(packageId: number, identifier: VersionIdentifierInput): string[] {
        return [
            Prefixes.PACKAGE,
            packageId.toString(),
            identifier.versionMajor.toString(),
            identifier.versionMinor.toString(),
            identifier.versionPatch.toString()
        ];
    }
}
