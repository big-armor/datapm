import { DPMConfiguration } from "../../../../lib/dist/src/PackageUtil";

export enum ParameterType {
    AutoComplete = "autocomplete",
    Confirm = "confirm",
    Text = "text",
    Select = "select",
    MultiSelect = "multiselect",
    Number = "number",
    Password = "password"
}

export interface Parameter {
    type: ParameterType;
    name: string;
    defaultValue?: string | boolean | number;
    message: string;
    options?: { title: string; value?: string | boolean | number; selected?: boolean }[];
    min?: number;
    validate?: (value: string | number | boolean) => boolean | string;

    /** The configuration object on which the parameter value should be set. Required because
     * configurations can be heirarchical (for nested use cases)
     */
    configuration: DPMConfiguration;
}
