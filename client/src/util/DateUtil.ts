/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable camelcase */
import moment from "moment";
moment.suppressDeprecationWarnings = true;

const // 2012 年 2 月 28 日
    re_zh = /^(\d{4})\s*[^x00-xff]\s*(\d{1,2})\s*[^x00-xff]\s*(\d{1,2})\s*[^x00-xff]/;
// 2012-02-28, 2012.02.28, 2012/02/28
const re_ymd = /^\d{4}([/\-.])\d{1,2}(\1)\d{1,2}/;
// 02/28/2012 etc.
const re_mdy = /^\d{1,2}([/\-.])\d{1,2}(\1)\d{4}/;
const re_en = new RegExp(
    [
        // toUTCString(): "Tue, 30 Aug 2016 03:01:19 GMT"
        /^(\w{3}), (\d{2}) (\w{3}) (\d{4}) ((\d{2}):(\d{2}):(\d{2})) GMT/.source,

        // toString():  "Tue Aug 30 2016 11:02:45 GMT+0800 (中国标准时间)"
        /^(\w{3}) (\w{3}) (\d{2}) (\d{4}) ((\d{2}):(\d{2}):(\d{2})) GMT\+\d{4}/.source,

        // toISOString(): "2016-08-30T03:01:19.543Z"
        /^(\d{4})-(\d{2})-(\d{2})T((\d{2}):(\d{2}):(\d{2}))\.(\d{3})Z/.source,

        // toDateString(): "Tue Aug 30 2016"
        /^(\w{3}) (\w{3}) (\d{2}) (\d{4})/.source
    ].join("|"),
    "m"
);
// 00:00:00, 00:00, 0:0, 0:0:00.0 and with or without three letter timezone or Z
const re_time = /(\d{1,2}:\d{1,2})(:\d{1,2}(\.[0-9]{3})?)?((?:\s?[A-Z]{2,3})|Z)?$/;

function normalizeDate(date: any) {
    return moment(new Date(date)).format("YYYY-MM-DD");
}

function normalizeTime(time: string): string {
    const normalizedTime = time
        .split(":")
        .map((section) => section.padStart(2, "0"))
        .join(":");
    return normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime;
}

export function normalizeDateTime(str = ""): string {
    if (!isDate(str) || !isTime(str)) {
        return "";
    }
    return `${normalizeDate(str)} ${normalizeTime(str)}`;
}

export function isDate(str = ""): string {
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

    return "";
}

export function isTime(str = ""): string {
    let sections = null;

    if (!str) return str;

    if ((sections = str.match(re_time))) {
        return sections[0];
    }

    return "";
}

export function createUTCDateFromString(str = ""): Date | null {
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
