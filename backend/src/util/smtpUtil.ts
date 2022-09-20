import { UserEntity } from "../entity/UserEntity";
import { createTransport } from "nodemailer";
import * as fs from "fs";
import { Address } from "nodemailer/lib/mailer";
import Mustache from "mustache";
import { getEnvVariable } from "./getEnvVariable";

export enum EMAIL_SUBJECTS {
    NEW_API_KEY = "⚠ New API Key Created",
    VERIFY_EMAIL = "✓ Verify Your New Account",
    FORGOT_PASSWORD = "⚠ Recover Your Account",
    INVITE_USER = "🚀 Invite to Collaborate",
    DATA_SHARED = "📦 Data Shared",
    USER_SUSPENDED = "Your account has been suspended"
}

export class NotificationActionTemplate {
    constructor(values: {
        userDisplayName?: string;
        userSlug?: string;
        prefix?: string;
        itemSlug?: string;
        itemName?: string;
        postfix?: string;
    }) {
        this.userDisplayName = values.userDisplayName;
        this.userSlug = values.userSlug;
        this.prefix = values.prefix;
        this.itemSlug = values.itemSlug;
        this.itemName = values.itemName;
        this.postfix = values.postfix;
    }

    userDisplayName?: string;
    get hasUserDisplayName(): boolean {
        return this.userDisplayName != null;
    }

    userSlug?: string;
    get hasUserSlug(): boolean {
        return this.userSlug != null;
    }

    prefix?: string;
    get hasPrefix(): boolean {
        return this.prefix != null;
    }

    itemSlug?: string;
    get hasItemSlug(): boolean {
        return this.itemSlug != null;
    }

    itemName?: string;
    get hasItemName(): boolean {
        return this.itemName != null;
    }

    get hasItemNameAndSlug(): boolean {
        return this.hasItemName && this.hasItemSlug;
    }

    get hasItemNameNotSlug(): boolean {
        return this.hasItemName && !this.hasItemSlug;
    }

    postfix?: string;

    get hasPostfix(): boolean {
        return this.postfix != null;
    }
}

export interface NotificationResourceTypeTemplate {
    slug: string;
    displayName: string;
    actions: NotificationActionTemplate[];
}

export interface NotificationEmailTemplate {
    frequency: string;
    recipientFirstName?: string;
    hasPackageChanges: boolean;
    packages: NotificationResourceTypeTemplate[];
    hasCatalogChanges: boolean;
    catalogs: NotificationResourceTypeTemplate[];
    hasCollectionChanges: boolean;
    collections: NotificationResourceTypeTemplate[];
    hasUserChanges: boolean;
    users: NotificationResourceTypeTemplate[];
}

export async function sendFollowNotificationEmail(
    user: UserEntity,
    frequency: string,
    notification: NotificationEmailTemplate
): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/follow-notification.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/follow-notification.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = Mustache.render(emailText, notification);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = Mustache.render(emailHTML, notification);

    return sendEmail(user, frequency.toLowerCase() + ` data updates`, emailText, emailHTML);
}

export async function sendAPIKeyCreatedEmail(user: UserEntity, apiKeyLabel: string): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/api-key-created.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/api-key-created.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{api_key_label}}/g, apiKeyLabel);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{api_key_label}}/g, apiKeyLabel);

    await sendEmail(user, EMAIL_SUBJECTS.NEW_API_KEY, emailText, emailHTML);
}

export async function sendUserSuspendedEmail(user: UserEntity, message: string): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/user-suspended.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/user-suspended.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{message}}/g, message);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{message}}/g, message);

    return sendEmail(user, EMAIL_SUBJECTS.USER_SUSPENDED, emailText, emailHTML);
}

export async function sendForgotPasswordEmail(user: UserEntity, token: string): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/forgot-password.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/forgot-password.html", "utf8");
    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{token}}/g, token);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{token}}/g, token);

    return sendEmail(user, EMAIL_SUBJECTS.FORGOT_PASSWORD, emailText, emailHTML);
}

export function validateMessageContents(message: string): void {
    if (message.length > 250) throw new Error("MESSAGE_TOO_LONG");

    if (message.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gim) != null)
        throw new Error("MESSAGE_CANNOT_CONTAIN_EMAIL_ADDRESS");

    if (
        message.match(
            /(?:(?:https?|ftp|file):\/\/)(?:\([-a-zA-Z0-9+&@#\\/%=~_|$?!:,.]*\)|[-a-zA-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\([-a-zA-Z0-9+&@#\\/%=~_|$?!:,.]*\)|[a-zA-Z0-9+&@#\\/%=~_|$])/gm
        ) != null
    )
        throw new Error("MESSAGE_CANNOT_CONTAIN_URL");

    if (message.match(/<[^>]*>/gi) != null) throw new Error("MESSAGE_CANNOT_CONTAIN_HTML_TAGS");
}

export async function sendShareNotification(
    user: UserEntity,
    inviterName: string,
    dataName: string,
    relativeUrl: string,
    message: string
): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/share-notification.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/share-notification.html", "utf8");

    validateMessageContents(message);

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{url}}/g, getEnvVariable("REGISTRY_URL") + relativeUrl);
    emailText = emailText.replace(/{{data_name}}/g, dataName);
    emailText = emailText.replace(/{{inviter_name}}/g, inviterName);

    emailText = emailText.replace(/{{message}}/g, message);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{url}}/g, getEnvVariable("REGISTRY_URL") + relativeUrl);
    emailHTML = emailHTML.replace(/{{data_name}}/g, dataName);
    emailHTML = emailHTML.replace(/{{inviter_name}}/g, inviterName);

    emailHTML = emailHTML.replace(/{{message}}/g, message);

    return sendEmail(user, EMAIL_SUBJECTS.DATA_SHARED, emailText, emailHTML);
}

export async function sendInviteUser(
    user: UserEntity,
    inviterName: string,
    dataName: string,
    message: string
): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/user-invite.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/user-invite.html", "utf8");

    validateMessageContents(message);

    if (user.verifyEmailToken == null) throw new Error("User does not have a verify email token");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{token}}/g, user.verifyEmailToken);
    emailText = emailText.replace(/{{data_name}}/g, dataName);
    emailText = emailText.replace(/{{inviter_name}}/g, inviterName);

    emailText = emailText.replace(/{{message}}/g, message);

    emailHTML = replaceCommonTokens(user, emailHTML);

    emailHTML = emailHTML.replace(/{{token}}/g, user.verifyEmailToken);
    emailHTML = emailHTML.replace(/{{data_name}}/g, dataName);
    emailHTML = emailHTML.replace(/{{inviter_name}}/g, inviterName);

    emailHTML = emailHTML.replace(/{{message}}/g, message);

    return sendEmail(user, EMAIL_SUBJECTS.INVITE_USER, emailText, emailHTML);
}

export async function sendVerifyEmail(user: UserEntity, token: string): Promise<void> {
    let emailText = fs.readFileSync("./static/email-templates/validate-email-address.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/validate-email-address.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{token}}/g, token);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{token}}/g, token);

    return sendEmail(user, EMAIL_SUBJECTS.VERIFY_EMAIL, emailText, emailHTML);
}

/** Wether or not all of the required values for SMTP sending are configured as environment variables. SMTP sending is optional for some features, and therefore may not be required.  */
export function smtpConfigured(): boolean {
    if (process.env.SMTP_SERVER == null) return false;

    if (process.env.SMTP_PORT == null) return false;

    if (process.env.SMTP_USER === undefined) return false;

    if (process.env.SMTP_PASSWORD === undefined) return false;

    if (process.env.SMTP_FROM_ADDRESS == null) return false;

    if (process.env.SMTP_FROM_NAME == null) return false;

    if (process.env.SMTP_SECURE == null) return false;

    return true;
}

async function sendEmail(user: UserEntity, subject: string, bodyText: string, bodyHTML: string) {
    if (!smtpConfigured) throw new Error("SMTP_NOT_CONFIGURED");

    // create reusable transporter object using the default SMTP transport
    const transporter = createTransport({
        host: process.env.SMTP_SERVER,
        port: Number.parseInt(process.env.SMTP_PORT || "25"),
        secure: process.env.SMTP_SECURE === "true",
        ignoreTLS: process.env.SMTP_SECURE !== "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    let to: string | Address = user.emailAddress;

    if (user.firstName != null && user.lastName != null) {
        to = { name: user.firstName + " " + user.lastName, address: user.emailAddress };
    }

    await transporter
        .sendMail({
            from: '"' + process.env.SMTP_FROM_NAME + '" <' + process.env.SMTP_FROM_ADDRESS + ">",
            to,
            subject,
            text: bodyText,
            html: bodyHTML
        })
        .catch((err) => {
            console.error("Error sending email");
            console.error(JSON.stringify(err));
        });
}

function replaceCommonTokens(user: UserEntity, content: string): string {
    if (process.env.REGISTRY_NAME == null) {
        throw new Error("REGISTRY_NAME environment variable not set");
    }

    if (getEnvVariable("REGISTRY_URL") == null) {
        throw new Error("REGISTRY_URL environment variable not set");
    }

    let returnValue = content.replace(/{{registry_name}}/g, process.env.REGISTRY_NAME);
    returnValue = returnValue.replace(/{{registry_url}}/g, getEnvVariable("REGISTRY_URL"));
    returnValue = returnValue.replace(/{{username}}/g, user.username);

    return returnValue;
}
