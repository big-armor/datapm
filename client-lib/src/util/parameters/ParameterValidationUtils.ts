import { Parameter, ParameterType } from "datapm-lib";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function validatePromptResponse(value: any, parameter: Parameter): string | true {
    if (parameter.validate) {
        const valid = parameter.validate(value, parameter);
        if (valid !== true) return valid;
    }

    if (parameter.type === ParameterType.Text || parameter.type === ParameterType.Password) {
        if (parameter.stringRegExp !== undefined) {
            if (value === undefined) return "Please enter a value";

            if (!value.match(parameter.stringRegExp)) {
                return parameter.stringRegExp.message;
            }
        }

        if (
            parameter.stringMinimumLength !== undefined &&
            (value === undefined || value.length < parameter.stringMinimumLength)
        ) {
            return (
                "Must have at least " +
                parameter.stringMinimumLength +
                " character" +
                (parameter.stringMinimumLength > 1 ? "s" : "")
            );
        }

        if (
            parameter.stringMaximumLength !== undefined &&
            value !== undefined &&
            value.length > parameter.stringMaximumLength
        ) {
            return (
                "May not have more than " +
                parameter.stringMaximumLength +
                " character" +
                (parameter.stringMaximumLength > 1 ? "s" : "")
            );
        }
    }

    if (parameter.type === ParameterType.Number) {
        const valueToEvaluate =
            value === "" && parameter.defaultValue !== undefined ? parameter.defaultValue : (value as number);

        if (parameter.numberMaximumValue !== undefined && (valueToEvaluate as number) > parameter.numberMaximumValue) {
            return "Must be less than " + parameter.numberMaximumValue;
        }

        if (parameter.numberMinimumValue !== undefined && (valueToEvaluate as number) < parameter.numberMinimumValue) {
            return "Must be greater than " + parameter.numberMinimumValue;
        }
    }

    if (parameter.type === ParameterType.AutoCompleteMultiSelect || parameter.type === ParameterType.MultiSelect) {
        if (parameter.multiSelectMinimumCount != null) {
            if (value === undefined || value.length < parameter.multiSelectMinimumCount) {
                return (
                    `Must select at least ${parameter.multiSelectMinimumCount} option` +
                    (parameter.multiSelectMinimumCount > 1 ? "s" : "")
                );
            }
        }
        if (parameter.multiSelectMaximumCount != null) {
            if (value === undefined || value.length > parameter.multiSelectMaximumCount) {
                return (
                    `Must select at less than ${parameter.multiSelectMinimumCount} option` +
                    (parameter.multiSelectMaximumCount > 1 ? "s" : "")
                );
            }
        }
    }

    return true;
}
