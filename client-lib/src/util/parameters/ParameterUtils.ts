import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { JobContext } from "../../task/JobContext";

/** Continuously calls the call back until it returns no parameters. Returns the number of prompts completed */
export async function repeatedlyPromptParameters(
    jobContext: JobContext,
    callBack: () => Promise<Parameter[]>,
    defaults: boolean,
    overrideDefaultValues: DPMConfiguration = {}
): Promise<number> {
    let parameterCount = 0;
    let remainingParameters = await callBack();

    while (remainingParameters.length > 0) {
        for (const parameter of remainingParameters) {
            if (overrideDefaultValues[parameter.name] !== undefined) {
                parameter.defaultValue = overrideDefaultValues[parameter.name] as string | boolean | number;
            }
        }

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

        const parameterAnswers = await jobContext.parameterPrompt(remainingParameters);

        Object.keys(parameterAnswers).forEach((key) => {
            const parameter = remainingParameters.find((parameter) => parameter.name === key) as Parameter;
            parameter.configuration[key] = parameterAnswers[key];
        });

        remainingParameters = await callBack();
    }

    return parameterCount;
}
