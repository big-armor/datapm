import { FileStorageService } from "../files/file-storage-service";
import { PackageIdentifierInput, VersionIdentifierInput } from "../../generated/graphql";
import { PackageFile } from "datapm-lib";
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

    public async readLicenseFile(identifier: VersionIdentifierInput): Promise<string> {
        const stream = await this.fileStorageService.readFile(
            this.versionIdentifierPath(identifier),
            FileType.LICENSE_FILE
        );

        const stringValue = await this.streamToString(stream);
        return stringValue;
    }

    public async readReadmeFile(identifier: VersionIdentifierInput): Promise<string> {
        const stream = await this.fileStorageService.readFile(
            this.versionIdentifierPath(identifier),
            FileType.README_FILE
        );

        const stringValue = await this.streamToString(stream);
        return stringValue;
    }

    public async readPackageFile(identifier: VersionIdentifierInput): Promise<PackageFile> {
        const stream = await this.fileStorageService.readFile(
            this.versionIdentifierPath(identifier),
            FileType.PACKAGE_FILE
        );

        const stringValue = await this.streamToString(stream);

        const packageFile = JSON.parse(stringValue) as PackageFile;
        return packageFile;
    }

    public writeReadmeFile(identifier: VersionIdentifierInput, contents: string): Promise<void> {
        return this.fileStorageService.writeFileFromString(
            this.versionIdentifierPath(identifier),
            FileType.README_FILE,
            contents
        );
    }

    public writeLicenseFile(identifier: VersionIdentifierInput, contents: string): Promise<void> {
        return this.fileStorageService.writeFileFromString(
            this.versionIdentifierPath(identifier),
            FileType.LICENSE_FILE,
            contents
        );
    }

    public writePackageFile(identifier: VersionIdentifierInput, packageFile: PackageFile): Promise<void> {
        const valueString = JSON.stringify(packageFile);

        return this.fileStorageService.writeFileFromString(
            this.versionIdentifierPath(identifier),
            FileType.PACKAGE_FILE,
            valueString
        );
    }

    deleteLicenseFile(identifier: VersionIdentifierInput) {
        return this.fileStorageService.deleteFile(this.versionIdentifierPath(identifier), FileType.LICENSE_FILE);
    }

    deleteReadmeFile(identifier: VersionIdentifierInput) {
        return this.fileStorageService.deleteFile(this.versionIdentifierPath(identifier), FileType.README_FILE);
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
