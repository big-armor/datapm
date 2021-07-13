import { ContentLabel } from "datapm-lib";
import { ContentLabelDetectorInterface } from "./ContentLabelDetector";

export const PHONE_NUMBER_LABEL = "phone_number";

/** Applies the 'phone_number' label when any single phone number is found in any value */
export abstract class RegexDetector implements ContentLabelDetectorInterface {
	abstract getRegExp(): RegExp;
	abstract getLabel(): string;

	valueTestedCount = 0;
	ocurrenceCount = 0;

	getApplicableTypes(): ("string" | "number" | "boolean" | "date" | "date-time")[] {
		return ["string"];
	}

	getOccurenceCount(): number {
		return this.ocurrenceCount;
	}

	getValueTestCount(): number {
		return this.valueTestedCount;
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

	getContentLabels(_propertyName: string, _existingLabels: ContentLabel[]): ContentLabel[] {
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
