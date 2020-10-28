import { User } from "../entity/User";
import { createTransport } from "nodemailer";
import * as fs from "fs";

export async function sendVerifyEmail(user: User, token: string) {
    // read the text

    let emailText = fs.readFileSync("./static/email-templates/validate-email-address.txt", "utf8");
    let emailHTML = fs.readFileSync("./static/email-templates/validate-email-address.html", "utf8");

    emailText = emailText.replace(/{{registry_name}}/g, process.env["REGISTRY_NAME"]!);
    emailText = emailText.replace(/{{registry_url}}/g, process.env["REGISTRY_URL"]!);
    emailText = emailText.replace(/{{token}}/g, token);

    emailHTML = emailHTML.replace(/{{registry_name}}/g, process.env["REGISTRY_NAME"]!);
    emailHTML = emailHTML.replace(/{{registry_url}}/g, process.env["REGISTRY_URL"]!);
    emailHTML = emailHTML.replace(/{{token}}/g, token);

    sendEmail(user.emailAddress, "Verify Your New Account ✔", emailText, emailHTML);
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

async function sendEmail(to: string, subject: string, bodyText: string, bodyHTML: string) {
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
        });
}
