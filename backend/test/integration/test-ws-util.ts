import { expect } from "chai";
import {
    ErrorResponse,
    JobMessageRequest,
    JobMessageResponse,
    JobRequestType,
    ParameterAnswer,
    SocketResponseType
} from "datapm-lib";
import { Socket } from "socket.io-client";

export type PromptResponse = {
    name: string;
    response: string | string[] | number | boolean;
};

export type PromptResponseState = {
    currentPromptIndex: number;
    promptResponses: PromptResponse[];
};

export async function handleJobMessages(
    client: Socket,
    channelName: string,
    promptResponses: PromptResponse[]
): Promise<JobMessageRequest> {
    let exitCallback: (message: JobMessageRequest) => void | undefined;
    let disconnectCallBack: () => void | undefined;
    let errorCallback: (error: Error) => void | undefined;

    const disconnectPromise = new Promise<JobMessageRequest>((resolve, reject) => {
        disconnectCallBack = reject;
    });

    const promptResponseState: PromptResponseState = {
        currentPromptIndex: 0,
        promptResponses
    };

    client.on(channelName, (message: JobMessageRequest, responseCallback: (response: JobMessageResponse) => void) => {
        exitCallback(message);
        // console.log(JSON.stringify(message));

        if (message.requestType === JobRequestType.END_TASK) {
            responseCallback(new JobMessageResponse(JobRequestType.END_TASK));
        } else {
            try {
                const response = messageHandler(message, promptResponseState);
                if (response) {
                    responseCallback(response);
                }
            } catch (error) {
                errorCallback(error);
            }
        }
    });

    client.on("disconnect", () => {
        disconnectCallBack();
    });

    const jobExitPromise = new Promise<JobMessageRequest>((resolve, reject) => {
        exitCallback = (message: JobMessageRequest) => {
            if (message.requestType === JobRequestType.EXIT) {
                if (message.jobResult?.exitCode === 0) {
                    resolve(message);
                } else {
                    reject(
                        new Error(
                            "Failed with exitCode: " +
                                message.jobResult?.exitCode +
                                " message: " +
                                message.jobResult?.errorMessage
                        )
                    );
                }
            }
        };

        errorCallback = (error: Error) => {
            reject(error);
        };
    });

    const startResponse = await new Promise<JobMessageResponse>((resolve, reject) => {
        client.emit(
            channelName,
            new JobMessageRequest(JobRequestType.START_JOB),
            (response: JobMessageResponse | ErrorResponse) => {
                if (response.responseType === SocketResponseType.ERROR) {
                    reject(new Error((response as ErrorResponse).message));
                }

                resolve(response as JobMessageResponse);
            }
        );
    });

    expect(startResponse.responseType).equal(JobRequestType.START_JOB);

    return Promise.race([disconnectPromise, jobExitPromise]);
}

function messageHandler(message: JobMessageRequest, promptResponseState: PromptResponseState) {
    if (message.requestType === JobRequestType.PRINT) {
        // console.log(message.message);
    } else if (message.requestType === JobRequestType.ERROR) {
        console.log("Error: " + message.message);
    } else if (message.requestType === JobRequestType.PROMPT) {
        const responses: ParameterAnswer<string> = {};

        if (message.prompts == null) throw new Error("No prompts found");

        if (
            promptResponseState.currentPromptIndex + message.prompts.length >
            promptResponseState.promptResponses.length
        )
            throw new Error("Not enough prompt responses: " + message.prompts[0].name);

        for (const prompt of message.prompts) {
            // console.log(prompt.message);

            const currentPrompt = promptResponseState.promptResponses[promptResponseState.currentPromptIndex];

            if (prompt.name === currentPrompt.name) {
                responses[prompt.name] = currentPrompt.response;
                promptResponseState.currentPromptIndex += 1;
            } else throw new Error("Unexpected prompt " + prompt.name);
        }

        const response = new JobMessageResponse(JobRequestType.PROMPT);
        response.answers = responses;

        return response;
    }

    return undefined;
}
