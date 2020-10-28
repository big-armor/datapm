import { Package } from "./packge.model";

export interface PackageWithLastActivity {
    package: Package;
    lastActivityLabel: string;
}
