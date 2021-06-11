import { Context } from "../context";
import { hashPassword } from "../util/PasswordUtil";
import { v4 as uuid } from "uuid";
import { AuthenticationError } from "apollo-server-errors";
import {
    dailyNotifications,
    instantNotifications,
    monthlyNotifications,
    weeklyNotifications
} from "../service/notification-service";

export const runJob = async (
    _0: any,
    { key, job }: { key: string; job: string },
    context: Context,
    info: any
): Promise<void> => {
    if (process.env["SCHEDULER_KEY"] == null) {
        throw new Error("SCHEDULER_KEY environment variable not defined");
    }

    // for security purposes, create a random salt and hash the in memory key, if it has not already been done
    if (process.env["SCHEDULER_KEY_SALT"] === undefined) {
        process.env["SCHEDULER_KEY_SALT"] = uuid();

        process.env["SCHEDULER_KEY"] = hashPassword(
            process.env["SCHEDULER_KEY"],
            process.env["SCHEDULER_KEY_SALT"] as string
        );
    }

    const hashedKeyValue = hashPassword(key, process.env["SCHEDULER_KEY_SALT"] as string);
    if (hashedKeyValue !== process.env["SCHEDULER_KEY"]) {
        throw new AuthenticationError("SCHEDULER_KEY not correct");
    }

    if (job === "instantNotifications") {
        instantNotifications();
    } else if (job === "dailyNotifications") {
        dailyNotifications();
    } else if (job === "weeklyNotifications") {
        weeklyNotifications();
    } else if (job === "monthlyNotifications") {
        monthlyNotifications();
    } else {
        throw new Error("JOB_NOT_RECOGNIZED - " + job);
    }
};
