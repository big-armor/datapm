import { ContentLabel, DPMPropertyTypes } from "datapm-lib";
import { ContentLabelDetectorInterface } from "./ContentLabelDetector";

export abstract class PropertyNameDetectorBase implements ContentLabelDetectorInterface {
    abstract getApplicableTypes(): DPMPropertyTypes[];
    abstract getPropertyNameMatches(): RegExp[];
    abstract getLabel(): string;

    valueTestCount = 0;

    inspectValue(_value: string | number): void {
        // Do nothing, because we're just looking at the property name
    }

    getOccurenceCount(): number {
        return 0;
    }

    getValueTestCount(): number {
        return this.valueTestCount;
    }

    /* The threshold is always met, so the contentLabels are always applied if they exist 
    for propertyname detectors */
    isThresholdMet(): boolean {
        return true;
    }

    getContentLabels(propertyName: string): ContentLabel[] {
        const propertyNameMatches = this.getPropertyNameMatches();

        let found = false;
        for (const match of propertyNameMatches) {
            if (propertyName.match(match) != null) {
                found = true;
                break;
            }
        }

        return [
            {
                ocurrenceCount: found ? 1 : 0,
                valuesTestedCount: this.valueTestCount,
                hidden: !found,
                label: this.getLabel(),
                appliedByContentDetector: this.constructor.name
            }
        ];
    }
}
