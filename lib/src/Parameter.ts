import { DPMConfiguration } from "./PackageUtil";

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
    value?: string | boolean | number | unknown;
    selected?: boolean;
}

export type ValueOrFunc<T extends string> = T;

export interface Parameter<T extends string = string> {
    type: ParameterType;
    name: ValueOrFunc<T>;
    defaultValue?: string | boolean | number;
    message: string;
    hint?: string;
    options?: ParameterOption[];
    numberMinimumValue?: number;
    numberMaximumValue?: number;
    stringMinimumLength?: number;
    stringMaximumLength?: number;
    stringRegExp?: { pattern: RegExp; message: string };
    validate?: (value: string | number | boolean) => boolean | string;

    /** The configuration object on which the parameter value should be set. Required because
     * configurations can be heirarchical (for nested use cases)
     */
    configuration: DPMConfiguration;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParameterAnswer<T extends string> = { [id in T]: any };
