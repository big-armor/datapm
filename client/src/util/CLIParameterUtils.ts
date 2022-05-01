import { Parameter, ParameterAnswer, ParameterType } from "datapm-lib";
import prompts, { PromptObject } from "prompts";
import { defaultPromptOptions } from "./DefaultParameterOptions";

function parametersToPrompts(parameters: Parameter[]): PromptObject[] {
    return parameters.map((promptParameter) => {
        if ([ParameterType.Confirm].includes(promptParameter.type)) {
            return {
                type: "autocomplete",
                name: promptParameter.name,
                message: promptParameter.message,
                min: promptParameter.numberMinimumValue,
                max: promptParameter.numberMaximumValue,
                hint: promptParameter.hint,
                choices: [
                    {
                        title: "Yes",
                        value: true,
                        selected: promptParameter.defaultValue === true
                    },
                    { title: "No", value: false, selected: promptParameter.defaultValue !== true }
                ],
                validate: (value) => validatePromptResponse(value, promptParameter)
            };
        } else if ([ParameterType.Text, ParameterType.Password, ParameterType.Number].includes(promptParameter.type)) {
            return {
                type: promptParameter.type,
                name: promptParameter.name,
                message: promptParameter.message,
                initial: promptParameter.defaultValue,
                min: promptParameter.numberMinimumValue,
                hint: promptParameter.hint,
                validate: (value) => validatePromptResponse(value, promptParameter)
            };
        } else if (
            [
                ParameterType.AutoCompleteMultiSelect,
                ParameterType.AutoComplete,
                ParameterType.Select,
                ParameterType.MultiSelect
            ].includes(promptParameter.type)
        ) {
            if (!promptParameter.options || promptParameter.options.length === 0) {
                throw new Error(
                    `Prompt ${promptParameter.name} is a ${promptParameter.type}, but no options were provided`
                );
            }

            if (promptParameter.type === ParameterType.Select) promptParameter.type = ParameterType.AutoComplete;

            return {
                type: promptParameter.type,
                name: promptParameter.name,
                message: promptParameter.message,
                hint: promptParameter.hint,
                initial: promptParameter.defaultValue,
                choices: promptParameter.options.filter((o) => o.disabled !== true),
                min: promptParameter.multiSelectMinimumCount,
                max: promptParameter.multiSelectMaximumCount,
                suggest: promptParameter.onChange,
                // onState allows the user to enter text not related to an option
                // which makes more sense for autocomplete
                onState: function () {
                    if (promptParameter.allowFreeFormInput === true) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const self = this as any;
                        self.fallback = { title: self.input, description: `Selects ${self.input}`, value: self.input };

                        // Check to make sure there are no suggestions so we do not override a suggestion
                        if (self.suggestions.length === 0) {
                            self.value = self.input;
                        }
                    }
                }
            };
        }

        throw new Error(`Parameter type ${promptParameter.type} not recognized`);
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validatePromptResponse(value: any, parameter: Parameter): string | true {
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

export async function cliHandleParameters<T extends string>(
    defaults: boolean,
    parameters: Array<Parameter<T>>
): Promise<ParameterAnswer<T>> {
    const answers: ParameterAnswer<string> = {};

    for (const parameter of parameters) {
        let defaultFound = false;
        if (defaults) {
            if (
                parameter.defaultValue != null &&
                (parameter.type === ParameterType.Text ||
                    parameter.type === ParameterType.Number ||
                    parameter.type === ParameterType.Password)
            ) {
                parameter.configuration[parameter.name] = parameter.defaultValue;
                answers[parameter.name] = parameter.defaultValue;
                defaultFound = true;
            } else if (parameter.type === ParameterType.Select && parameter.options?.find((o) => o.selected) != null) {
                const selectedOption = parameter.options?.find((o) => o.selected);

                if (selectedOption == null) throw new Error("SELECTED_OPTION_NOT_FOUND");

                parameter.configuration[parameter.name] = selectedOption?.value as string | number | boolean;
                answers[parameter.name] = selectedOption?.value as string | number | boolean;

                defaultFound = true;
            } else if (
                parameter.type === ParameterType.MultiSelect &&
                parameter.options?.find((o) => o.selected) != null
            ) {
                const selectOptions = parameter.options?.filter((o) => o.selected).map((o) => o.value);

                parameter.configuration[parameter.name] = selectOptions as string[];
                answers[parameter.name] = selectOptions;
                defaultFound = true;
            }
        }

        if (defaultFound) continue;

        const promptObjects: PromptObject[] = parametersToPrompts([parameter]);
        const newConfigValues = await prompts(promptObjects, defaultPromptOptions);
        Object.keys(newConfigValues).forEach((key) => {
            parameter.configuration[key] = newConfigValues[key];
            answers[key] = newConfigValues[key];
        });
    }
    return answers;
}
