import { ContentLabel, DPMPropertyTypes } from "datapm-lib";
import { ContentLabelDetectorInterface } from "./ContentLabelDetector";

export const PHONE_NUMBER_LABEL = "phone_number";

/** Applies the 'phone_number' label when any single phone number is found in any value */
export abstract class RegexDetector implements ContentLabelDetectorInterface {
    abstract getRegExp(): RegExp;
    abstract getLabel(): string;

    valueTestedCount = 0;
    ocurrenceCount = 0;

    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string"];
    }

    getOccurenceCount(): number {
        return this.ocurrenceCount;
    }

    getValueTestCount(): number {
        return this.valueTestedCount;
    }

    isThresholdMet(): boolean {
        return this.ocurrenceCount / this.valueTestedCount > 0.66;
    }

    inspectValue(value: string | number): void {
        const stringValue = typeof value === "number" ? value.toString() : value;

        const adjustedValue = stringValue.toLocaleString().trim();

        const regex = this.getRegExp();

        if (adjustedValue.match(regex)) {
            this.ocurrenceCount++;
        }

        this.valueTestedCount++;
    }

    getContentLabels(_propertyName: string): ContentLabel[] {
        return [
            {
                ocurrenceCount: this.ocurrenceCount,
                valuesTestedCount: this.valueTestedCount,
                hidden: false,
                label: this.getLabel(),
                appliedByContentDetector: this.constructor.name
            }
        ];
    }
}
