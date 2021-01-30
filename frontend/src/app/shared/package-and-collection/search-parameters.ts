import { LimitAndOffset } from "./limit-and-offset";

export interface SearchParameters extends LimitAndOffset {
    query: string;
}
