import { UserEntity } from "../entity/UserEntity";
import { createTransport } from "nodemailer";
import * as fs from "fs";
import { Address } from "nodemailer/lib/mailer";

export enum EMAIL_SUBJECTS {
    NEW_API_KEY = "⚠ New API Key Created",
    VERIFY_EMAIL = "✓ Verify Your New Account",
    FORGOT_PASSWORD = "⚠ Recover Your Account",
    INVITE_USER = "🚀 Data Invite"
}

export async function sendAPIKeyCreatedEmail(user: UserEntity, apiKeyLabel: string) {
    let emailText = fs.readFileSync("./static/email-templates/api-key-created.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/api-key-created.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{api_key_label}}/g, apiKeyLabel);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{api_key_label}}/g, apiKeyLabel);

    sendEmail(user, EMAIL_SUBJECTS.NEW_API_KEY, emailText, emailHTML);
}

export async function sendForgotPasswordEmail(user: UserEntity, token: string) {
    let emailText = fs.readFileSync("./static/email-templates/forgot-password.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/forgot-password.html", "utf8");
    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{token}}/g, token);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{token}}/g, token);

    sendEmail(user, EMAIL_SUBJECTS.FORGOT_PASSWORD, emailText, emailHTML);
}

export async function sendInviteUser(user: UserEntity, inviterName: string, dataName: string) {
    let emailText = fs.readFileSync("./static/email-templates/user-invite.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/user-invite.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{token}}/g, user.verifyEmailToken!);
    emailText = emailText.replace(/{{data_name}}/g, dataName);
    emailText = emailText.replace(/{{inviter_name}}/g, inviterName);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{token}}/g, user.verifyEmailToken!);
    emailHTML = emailHTML.replace(/{{data_name}}/g, dataName);
    emailHTML = emailHTML.replace(/{{inviter_name}}/g, inviterName);

    sendEmail(user, EMAIL_SUBJECTS.INVITE_USER, emailText, emailHTML);
}

export async function sendVerifyEmail(user: UserEntity, token: string) {
    let emailText = fs.readFileSync("./static/email-templates/validate-email-address.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/validate-email-address.html", "utf8");

    emailText = replaceCommonTokens(user, emailText);
    emailText = emailText.replace(/{{token}}/g, token);

    emailHTML = replaceCommonTokens(user, emailHTML);
    emailHTML = emailHTML.replace(/{{token}}/g, token);

    sendEmail(user, EMAIL_SUBJECTS.VERIFY_EMAIL, emailText, emailHTML);
}

/** Wether or not all of the required values for SMTP sending are configured as environment variables. SMTP sending is optional for some features, and therefore may not be required.  */
export function smtpConfigured(): boolean {
    if (process.env["SMTP_SERVER"] == null) return false;

    if (process.env["SMTP_PORT"] == null) return false;

    if (process.env["SMTP_USER"] === undefined) return false;

    if (process.env["SMTP_PASSWORD"] === undefined) return false;

    if (process.env["SMTP_FROM_ADDRESS"] == null) return false;

    if (process.env["SMTP_FROM_NAME"] == null) return false;

    if (process.env["SMTP_SECURE"] == null) return false;

    return true;
}

async function sendEmail(user: UserEntity, subject: string, bodyText: string, bodyHTML: string) {
    if (!smtpConfigured) throw new Error("SMTP_NOT_CONFIGURED");

    // create reusable transporter object using the default SMTP transport
    let transporter = createTransport({
        host: process.env["SMTP_SERVER"]!,
        port: Number.parseInt(process.env["SMTP_PORT"]!),
        secure: process.env["SMTP_SECURE"] == "true",
        ignoreTLS: process.env["SMTP_SECURE"] != "true",
        auth: {
            user: process.env["SMTP_USER"],
            pass: process.env["SMTP_PASSWORD"]
        }
    });

    let to: string | Address = user.emailAddress;

    if (user.firstName != null && user.lastName != null) {
        to = { name: user.firstName + " " + user.lastName, address: user.emailAddress };
    }

    await transporter
        .sendMail({
            from: '"' + process.env["SMTP_FROM_NAME"] + '" <' + process.env["SMTP_FROM_ADDRESS"] + ">",
            to,
            subject,
            text: bodyText,
            html: bodyHTML
        })
        .catch((err) => {
            console.error("Error sending email");
            console.error(JSON.stringify(err));
            throw err;
        });
}

function replaceCommonTokens(user: UserEntity, content: string): string {
    let returnValue = content.replace(/{{registry_name}}/g, process.env["REGISTRY_NAME"]!);
    returnValue = returnValue.replace(/{{registry_url}}/g, process.env["REGISTRY_URL"]!);
    returnValue = returnValue.replace(/{{username}}/g, user.username);

    return returnValue;
}
