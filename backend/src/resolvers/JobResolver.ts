import { Context } from "../context";
import { hashPassword } from "../util/PasswordUtil";
import { v4 as uuid } from "uuid";
import { AuthenticationError } from "apollo-server-errors";
import {
    dailyNotifications,
    hourlyNotifications,
    instantNotifications,
    monthlyNotifications,
    weeklyNotifications
} from "../service/notification-service";
import { JobType } from "../generated/graphql";
import { packageUpdateScheduling } from "../service/package-update-service";
import { GraphQLResolveInfo } from "graphql";

export const runJob = async (
    _0: unknown,
    { key, job }: { key: string; job: string },
    context: Context,
    info: GraphQLResolveInfo
): Promise<void> => {
    if (process.env.LEADER_ELECTION_DISABLED !== "true") {
        throw new Error("Leader election is not disabled. Jobs can not be invoked remotely.");
    }

    if (process.env.SCHEDULER_KEY == null) {
        throw new Error("SCHEDULER_KEY environment variable not defined");
    }

    // for security purposes, create a random salt and hash the in memory key, if it has not already been done
    if (process.env.SCHEDULER_KEY_SALT === undefined) {
        process.env.SCHEDULER_KEY_SALT = uuid();

        process.env.SCHEDULER_KEY = hashPassword(process.env.SCHEDULER_KEY, process.env.SCHEDULER_KEY_SALT as string);
    }

    const hashedKeyValue = hashPassword(key, process.env.SCHEDULER_KEY_SALT as string);
    if (hashedKeyValue !== process.env.SCHEDULER_KEY) {
        throw new AuthenticationError("SCHEDULER_KEY not correct");
    }

    if (job === JobType.INSTANT_NOTIFICATIONS) {
        await instantNotifications(context.connection);
    } else if (job === JobType.HOURLY_NOTIFICATIONS) {
        await hourlyNotifications(context.connection);
    } else if (job === JobType.DAILY_NOTIFICATIONS) {
        await dailyNotifications(context.connection);
    } else if (job === JobType.WEEKLY_NOTIFICATIONS) {
        await weeklyNotifications(context.connection);
    } else if (job === JobType.MONTHLY_NOTIFICATIONS) {
        await monthlyNotifications(context.connection);
    } else if (job === JobType.PACKAGE_UPDATE) {
        await packageUpdateScheduling(context.connection);
    } else {
        throw new Error("JOB_NOT_RECOGNIZED - " + job);
    }
};
