import prompts, { PromptObject } from "prompts";
import { defaultPromptOptions } from "./DefaultParameterOptions";
import { Parameter, ParameterType } from "./Parameter";

export function parametersToPrompts(parameters: Parameter[]): PromptObject[] {
    return parameters.map((promptParameter) => {
        if (
            [ParameterType.Confirm, ParameterType.Text, ParameterType.Password, ParameterType.Number].includes(
                promptParameter.type
            )
        ) {
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
