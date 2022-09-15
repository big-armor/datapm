export interface ValidationConstraint {
    getName(): string;
    validate(value: string): void;
    getCompatibleScalarKinds(): string[];
}
