import { ContentLabel, DPMPropertyTypes, DPMRecordValue, Schema, ValueTypeStatistics } from "datapm-lib";
import { EmailAddressDetector } from "./EmailContentDetector";
import { PersonNameDetector } from "./PersonNameDetector";
import { PhoneNumberDetector } from "./PhoneNumberDetector";
import { IpV6AddressDetector } from "./Ipv6AddressDetector";
import { CreditCardNumberDetector } from "./CreditCardNumberDetector";
import { SocialSecurityNumberDetector } from "./SocialSecurityNumberDetector";
import { IpV4AddressDetector } from "./Ipv4AddressDetector";
import { AgePropertyNameDetector } from "./AgePropertyNameDetector";
import { GenderPropertyNameDetector } from "./GenderPropertyNameDetector";
import { DateOfBirthPropertyNameDetector } from "./DateOfBirthPropertyNameDetector";
import { UsernamePropertyNameDetector } from "./UsernamePropertyNameDetector";
import { EthnicityPropertyNameDetector } from "./EthnicityPropertyNameDetector";
import { SecretPropertyNameDetector } from "./PasswordPropertyNameDetector";
import { NPIPropertyNameDetector } from "./NPIPropertyNameDetector";
import { PassportPropertyNameDetector } from "./PassportPropertyNameDetector";
import { DriversLicensePropertyNameDetector } from "./DriversLicensePropertyNameDetector";
import { GeoLatitudePropertyNameDetector } from "./GeoLatitudePropertyNameDetector";
import { GeoLongitudePropertyNameDetector } from "./GeoLongitudePropertyNameDetector";
import { discoverValueType } from "../util/SchemaUtil";

declare type Class<T extends ContentLabelDetectorInterface> = new () => T;

export const ContentLabelDetectors: Class<ContentLabelDetectorInterface>[] = [
    SocialSecurityNumberDetector,
    CreditCardNumberDetector,
    IpV6AddressDetector,
    IpV4AddressDetector,
    PhoneNumberDetector,
    PersonNameDetector,
    EmailAddressDetector,
    GenderPropertyNameDetector,
    DateOfBirthPropertyNameDetector,
    DriversLicensePropertyNameDetector,
    AgePropertyNameDetector,
    UsernamePropertyNameDetector,
    EthnicityPropertyNameDetector,
    SecretPropertyNameDetector,
    PassportPropertyNameDetector,
    NPIPropertyNameDetector,
    GeoLatitudePropertyNameDetector,
    GeoLongitudePropertyNameDetector

    /* 
	DEATH DATE
	PERSONAL ATTRIBUTE (HEIGHT, WEIGHT, )
	DNA?  */
];

export interface ContentLabelDetectorInterface {
    getApplicableTypes(): DPMPropertyTypes[];

    /** Given a value, return a list of the labels present
     */
    inspectValue(value: string | number): void;

    getOccurenceCount(): number;

    getValueTestCount(): number;

    /** Wehther the detection threshold (percentage, match confidence, etc) has been met */
    isThresholdMet(): boolean;

    /** Based on the observed state, and the existing labels applied by the same implementation, return a complete set of content labels that should be applied  */
    getContentLabels(propertyName: string, existingLabels: ContentLabel[]): ContentLabel[];
}

export function getContentLabelDetectorsForValueType(valueType: DPMPropertyTypes): ContentLabelDetectorInterface[] {
    const returnValue: ContentLabelDetectorInterface[] = [];

    for (const detector of ContentLabelDetectors) {
        // eslint-disable-next-line new-cap
        const instance = new detector();

        if (instance.getApplicableTypes().includes(valueType)) returnValue.push(instance);
    }

    return returnValue;
}
export class ContentLabelDetector {
    /** First level is the property name, second is the value type  */
    contentLabelDetectors: Record<string, Record<string, ContentLabelDetectorInterface[]>>;

    constructor() {
        this.contentLabelDetectors = {};
    }

    inspectValue(_schemaSlug: string, propertyName: string, value: DPMRecordValue): void {
        const valueType = discoverValueType(value);

        if (this.contentLabelDetectors[propertyName] == null) this.contentLabelDetectors[propertyName] = {};

        if (this.contentLabelDetectors[propertyName][valueType] == null)
            this.contentLabelDetectors[propertyName][valueType] = getContentLabelDetectorsForValueType(valueType);

        for (const contentLabelDetector of this.contentLabelDetectors[propertyName][valueType]) {
            const valueTestedCount = contentLabelDetector.getValueTestCount();

            let inspect = true;

            if (valueTestedCount > 100) inspect = Math.random() < 1 / valueTestedCount;

            try {
                if (inspect) contentLabelDetector.inspectValue(value as string | number);
            } catch (error) {
                // TODO note a warning that content lable detection didn't work
                // TODO debug log error
            }
        }
    }

    /** Applies the detected labels to the schema, while preserving prior labels and their hidden attribute */
    applyLabelsToSchemas(schemas: Schema[]): void {
        for (const schema of schemas) {
            if (schema.properties == null) continue;

            for (const propertyName of Object.keys(schema.properties)) {
                const property = schema.properties[propertyName];

                if (property.types == null) continue;

                for (const valueType of Object.keys(property.types || {})) {
                    const labels: ContentLabel[] = [];

                    const contentLabelDetectors = this.contentLabelDetectors[propertyName][valueType];

                    if (contentLabelDetectors == null) continue;

                    for (const contentLabelDetector of contentLabelDetectors) {
                        if (!contentLabelDetector.isThresholdMet()) {
                            continue;
                        }

                        const existingLabels = (Object(property.types)[valueType] as ValueTypeStatistics).contentLabels;

                        const newLabels = contentLabelDetector.getContentLabels(propertyName, existingLabels || []);

                        for (const newLabel of newLabels) {
                            if (newLabel.ocurrenceCount === 0) continue;

                            const oldLabel = existingLabels?.find((l) => l.label === newLabel.label);

                            if (oldLabel != null) {
                                newLabel.hidden = oldLabel.hidden === true ? true : newLabel.hidden;
                            }

                            labels.push(newLabel);
                        }

                        for (const oldLabel of existingLabels || []) {
                            const newLabel = labels.find((l) => l.label === oldLabel.label);
                            if (newLabel != null) continue;
                            labels.push(oldLabel);
                        }
                    }

                    (Object(property.types)[valueType] as ValueTypeStatistics).contentLabels = labels;
                }
            }
        }
    }
}
