/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable camelcase */
import moment, { utc } from "moment";
moment.suppressDeprecationWarnings = true;

const re_zh = /^(\d{4})\s*[^x00-xff]\s*(\d{1,2})\s*[^x00-xff]\s*(\d{1,2})\s*[^x00-xff]$/;
// 2012-02-28, 2012.02.28, 2012/02/28
const re_ymd = /^\d{4}([/\-.])\d{1,2}(\1)\d{1,2}$/;
const re_mdy = /^\d{1,2}([/\-.])\d{1,2}(\1)\d{4}$/;

// toDateString(): "Tue Aug 30 2016"
const re_Dmdy = /^(\w{3}) (\w{3}) (\d{2}) (\d{4})$/.source;
const re_en = new RegExp(
    [
        // toUTCString(): "Tue, 30 Aug 2016 03:01:19 GMT"
        /^(\w{3}), (\d{2}) (\w{3}) (\d{4}) ((\d{2}):(\d{2}):(\d{2})) GMT/.source,

        // toString():  "Tue Aug 30 2016 11:02:45 GMT+0800"
        /^(\w{3}) (\w{3}) (\d{2}) (\d{4}) ((\d{2}):(\d{2}):(\d{2})) GMT\+\d{4}/.source,

        // toISOString(): "2016-08-30T03:01:19.543Z"
        /^(\d{4})-(\d{2})-(\d{2})T((\d{2}):(\d{2}):(\d{2}))\.(\d{3,6})Z/.source,

        // Big Query Date Format: "2020-02-24 18:00:00 UTC"
        /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) UTC/.source,

        // 2022-05-06T03:05-0400
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}))?-\d{4}/.source,

        // 05/05/2020 05:25:08 PM
        /^(\d{1,2})[\\/-](\d{1,2})[\\/-](\d{4}) (\d{1,2}):(\d{1,2})(:(\d{1,2}))? ?(PM)?(AM)?/.source,

        // 2020/05/05 05:25:08 PM
        /^(\d{4})[\\/-](\d{1,2})[\\/-](\d{1,2}) (\d{1,2}):(\d{1,2})(:(\d{1,2}))? ?(PM)?(AM)?/.source
    ].join("|"),
    "m"
);
// 00:00:00, 00:00, 0:0, 0:0:00.0 and with or without three letter timezone or Z
const re_time = /(\d{1,2}:\d{1,2})(:\d{1,2}(\.[0-9]{3})?)?((?:\s?[A-Z]{2,3})|(?:[-+]?\d{4})|Z)?$/;

function normalizeDate(date: any) {
    return moment(date).format("YYYY-MM-DD");
}

function normalizeTime(time: string): string {
    const normalizedTime = time
        .split(":")
        .map((section) => section.padStart(2, "0"))
        .join(":");
    return normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime;
}

export function normalizeDateTime(str = ""): string {
    if (!isDateTime(str)) {
        return "";
    }
    return `${normalizeDate(str)} ${normalizeTime(str)}`;
}

export function isDate(str = ""): boolean {
    let sections = null;

    if (!str) return false;

    str = String(str).trim();

    if ((sections = str.match(re_zh))) {
        return true;
    }

    if ((sections = str.match(re_ymd))) {
        return true;
    }

    // For now, dmy format is not recognized so consider it as string.
    if ((sections = str.match(re_mdy)) && moment(str).isValid()) {
        return true;
    }

    if ((sections = str.match(re_Dmdy))) {
        return true;
    }

    return false;
}

export function _isDate(str = ""): string | false {
    let sections = null;

    if (!str) return str;

    str = String(str).trim();

    if ((sections = str.match(re_zh))) {
        return normalizeDate([sections[1], sections[2], sections[3]].join("/"));
    }

    if ((sections = str.match(re_ymd))) {
        return normalizeDate(sections[0].replace(/[/\-.]/g, "/"));
    }

    // For now, dmy format is not recognized so consider it as string.
    if ((sections = str.match(re_mdy)) && moment(str).isValid()) {
        return normalizeDate(sections[0].replace(/[/\-.]/g, "/"));
    }

    if ((sections = str.match(re_en))) {
        return normalizeDate(new Date(sections[0]));
    }

    return false;
}

export function isDateTime(str = ""): boolean {
    let sections = null;

    if (!str) return false;

    const adjustedStr = str.trim();

    if ((sections = adjustedStr.match(re_en))) {
        return true;
    }

    return false;
}

/** Returns YYYY-MM-DD format date */
export function createDateFromString(str = ""): Date | null {
    const utcDate = moment.utc(str).toDate();
    utcDate.getDate();
    return isNaN(utcDate.getTime()) ? null : utcDate;
}

export function createUTCDateTimeFromString(str = ""): Date | null {
    const utcDate = moment.utc(str).toDate();
    return isNaN(utcDate.getTime()) ? null : utcDate;
}

export function formatRemainingTime(seconds: number): string {
    const duration = moment.duration(seconds, "seconds");
    if (seconds < 60) {
        return `${seconds} seconds`;
    }
    if (seconds < 3600) {
        return `${duration.minutes()} minutes ${duration.seconds()} seconds`;
    }
    return `${duration.hours()} hours ${duration.minutes()} minutes ${duration.seconds()} seconds`;
}
