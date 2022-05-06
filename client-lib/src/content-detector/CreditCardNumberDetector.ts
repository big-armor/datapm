import { RegexDetector } from "./RegexDetector";

export const CREDIT_CARD_NUMBER = "credit_card_number";

export class CreditCardNumberDetector extends RegexDetector {
    getApplicableTypes(): ("string" | "integer")[] {
        return ["string", "integer"];
    }

    getRegExp(): RegExp {
        return /\b(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/;
    }

    getLabel(): string {
        return CREDIT_CARD_NUMBER;
    }
}
