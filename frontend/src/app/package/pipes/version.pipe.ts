import { Pipe, PipeTransform } from "@angular/core";
import { VersionIdentifier } from "src/generated/graphql";

@Pipe({
    name: "version"
})
export class VersionPipe implements PipeTransform {
    transform(value: VersionIdentifier): string {
        if (!value) {
            return "";
        }

        return `${value.versionMajor}.${value.versionMinor}.${value.versionPatch}`;
    }
}
