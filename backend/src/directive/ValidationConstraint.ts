export interface ValidationConstraint {
    getName(): string;
    validate(value: String): void;
    getCompatibleScalarKinds(): string[];
}
