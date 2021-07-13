import { PostgresQueryEngine } from "./PostgresQueryEngine";

export interface QueryEngine {
    identifier(): string;
    prepare(): Promise<boolean>;
    query(query: string): Promise<QueryResults>;
}

export interface QueryResults {
    success: boolean;
}

export function getQueryEngines(): QueryEngine[] {
    return [new PostgresQueryEngine()];
}

export function getQueryEngine(identifier: string): QueryEngine | undefined {
    return getQueryEngines().find((queryEngine) => queryEngine.identifier() === identifier);
}
