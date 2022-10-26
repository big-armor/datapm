import { Parameter, ParameterAnswer, ParameterType } from "datapm-lib";
import { validatePromptResponse } from "datapm-client-lib";
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
            if (!promptParameter.options) {
                promptParameter.options = [];
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
