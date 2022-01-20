import { DPMConfiguration } from "datapm-lib";

export enum ParameterType {
    AutoComplete = "autocomplete",
    Confirm = "confirm",
    Text = "text",
    Select = "select",
    MultiSelect = "multiselect",
    Number = "number",
    Password = "password"
}

export interface ParameterOption {
    title: string;
    value?: string | boolean | number;
    selected?: boolean;
}
export interface Parameter {
    type: ParameterType;
    name: string;
    defaultValue?: string | boolean | number;
    message: string;
    options?: ParameterOption[];
    numberMinimumValue?: number;
    numberMaximumValue?: number;
    stringMinimumLength?: number;
    stringMaximumLength?: number;
    stringRegExp?: { pattern: RegExp; message: string };
    validate2?: (value: string | number | boolean) => boolean | string;

    /** The configuration object on which the parameter value should be set. Required because
     * configurations can be heirarchical (for nested use cases)
     */
    configuration: DPMConfiguration;
}
