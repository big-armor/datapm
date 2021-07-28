import prompts, { PromptObject } from "prompts";
import { DPMConfiguration } from "../../../../lib/dist/src/PackageUtil";
import { defaultPromptOptions } from "./DefaultParameterOptions";
import { Parameter, ParameterType } from "./Parameter";

/** Continuously calls the call back until it returns no parameters. Returns the number of prompts completed */
export async function repeatedlyPromptParameters(
    callBack: () => Promise<Parameter[]>,
    configuration: DPMConfiguration,
    defaults: boolean
): Promise<number> {
    let parameterCount = 0;
    let remainingParameters = await callBack();
    while (remainingParameters.length > 0) {
        if (defaults) {
            const noDefaults: Parameter[] = [];
            for (const parameter of remainingParameters) {
                if (parameter.defaultValue) {
                    parameter.configuration[parameter.name] = parameter.defaultValue;
                } else {
                    noDefaults.push(parameter);
                }
            }

            remainingParameters = noDefaults;

            if (remainingParameters.length === 0) {
                remainingParameters = await callBack();
                continue;
            }
        }

        parameterCount += remainingParameters.length;
        const promptObjects: PromptObject[] = parametersToPrompts(remainingParameters);

        // TODO Skip existing configs
        const newSinkConfig = await prompts(promptObjects, defaultPromptOptions);

        Object.keys(newSinkConfig).forEach((key) => {
            const parameter = remainingParameters.find((parameter) => parameter.name === key) as Parameter;
            parameter.configuration[key] = newSinkConfig[key];
        });

        remainingParameters = await callBack();
    }

    return parameterCount;
}

export function parametersToPrompts(parameters: Parameter[]): PromptObject[] {
    return parameters.map((promptParameter) => {
        if ([ParameterType.Confirm].includes(promptParameter.type)) {
            return {
                type: "autocomplete",
                name: promptParameter.name,
                message: promptParameter.message,
                choices: [
                    {
                        title: "Yes",
                        value: true,
                        selected: promptParameter.defaultValue === true
                    },
                    { title: "No", value: false, selected: promptParameter.defaultValue !== true }
                ],
                validate: promptParameter.validate
            };
        } else if ([ParameterType.Text, ParameterType.Password, ParameterType.Number].includes(promptParameter.type)) {
            return {
                type: promptParameter.type,
                name: promptParameter.name,
                message: promptParameter.message,
                initial: promptParameter.defaultValue,
                validate: promptParameter.validate
            };
        } else if (
            [ParameterType.AutoComplete, ParameterType.Select, ParameterType.MultiSelect].includes(promptParameter.type)
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
                choices: promptParameter.options,
                min: promptParameter.min,
                validate: promptParameter.validate
            };
        }

        throw new Error(`Parameter type ${promptParameter.type} not recognized`);
    });
}

export async function cliHandleParameters(defaults: boolean, parameters: Parameter[]): Promise<void> {
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
                defaultFound = true;
            } else if (parameter.type === ParameterType.Select && parameter.options?.find((o) => o.selected) != null) {
                const selectedOption = parameter.options?.find((o) => o.selected);

                if (selectedOption == null) throw new Error("SELECTED_OPTION_NOT_FOUND");

                parameter.configuration[parameter.name] = selectedOption?.value as string | number | boolean;
                defaultFound = true;
            } else if (
                parameter.type === ParameterType.MultiSelect &&
                parameter.options?.find((o) => o.selected) != null
            ) {
                const selectOptions = parameter.options?.filter((o) => o.selected).map((o) => o.value);

                parameter.configuration[parameter.name] = selectOptions?.join(",");
                defaultFound = true;
            }
        }

        if (defaultFound) continue;

        const promptObjects: PromptObject[] = parametersToPrompts([parameter]);
        const newConfigValues = await prompts(promptObjects, defaultPromptOptions);
        Object.keys(newConfigValues).forEach((key) => {
            if (Array.isArray(newConfigValues[key])) {
                parameter.configuration[key] = newConfigValues[key].join(",");
            } else parameter.configuration[key] = newConfigValues[key];
        });
    }
}
