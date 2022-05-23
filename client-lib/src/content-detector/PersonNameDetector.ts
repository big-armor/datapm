import { ContentLabel, DPMPropertyTypes } from "datapm-lib";
import { ContentLabelDetectorInterface } from "./ContentLabelDetector";
import * as peopleNames from "people-names";

export const PEOPLE_NAMES_LABEL = "person_name";

/** Applies the 'email_address' label when any single email address is found in any value */
export class PersonNameDetector implements ContentLabelDetectorInterface {
    valueTestedCount = 0;
    foundCount = 0;

    getApplicableTypes(): DPMPropertyTypes[] {
        return ["string"];
    }

    getOccurenceCount(): number {
        return this.foundCount;
    }

    getValueTestCount(): number {
        return this.valueTestedCount;
    }

    isThresholdMet(): boolean {
        return this.foundCount / this.valueTestedCount > 0.66;
    }

    inspectValue(value: string): void {
        if (value.length > 40 && value.split(/\s/).length > 0) {
            const names = peopleNames.parseNames(value);
            if (names.length > 0) this.foundCount++;
        } else {
            if (peopleNames.isPersonName(value)) this.foundCount++;
        }

        this.valueTestedCount++;
    }

    getContentLabels(_propertyName: string): ContentLabel[] {
        if (this.foundCount === 0) return [];

        return [
            {
                ocurrenceCount: this.foundCount as number,
                hidden: false,
                label: PEOPLE_NAMES_LABEL,
                appliedByContentDetector: PersonNameDetector.name
            }
        ];
    }
}
