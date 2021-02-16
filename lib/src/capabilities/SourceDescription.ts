import { SourceCategory } from "./SourceCategory";

export interface SourceDescription {
    name: string;
    slug: string;
    description: string;
    category: SourceCategory;
}
