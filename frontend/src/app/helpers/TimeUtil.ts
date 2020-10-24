const SECONDS_IN_MILLISECONDS = 1000;
const MINUTES_IN_MILLISECONDS = SECONDS_IN_MILLISECONDS * 60;
const HOURS_IN_MILLISECONDS = MINUTES_IN_MILLISECONDS * 60;
const DAYS_IN_MILLISECONDS = HOURS_IN_MILLISECONDS * 24;
const WEEKS_IN_MILLISECONDS = DAYS_IN_MILLISECONDS * 7;
const MONTHS_IN_MILLISECONDS = WEEKS_IN_MILLISECONDS * 4;
const YEARS_IN_MILLISECONDS = MONTHS_IN_MILLISECONDS * 12;

export function getTimeDifferenceLabel(date: Date, dateNow: Date): string {
    const differenceInMillis = dateNow.getTime() - date.getTime();
    let label;
    let period;
    if (differenceInMillis <= MINUTES_IN_MILLISECONDS) {
        period = SECONDS_IN_MILLISECONDS;
        label = "second";
    } else if (differenceInMillis <= HOURS_IN_MILLISECONDS) {
        period = MINUTES_IN_MILLISECONDS;
        label = "minute";
    } else if (differenceInMillis <= DAYS_IN_MILLISECONDS) {
        period = HOURS_IN_MILLISECONDS;
        label = "hour";
    } else if (differenceInMillis <= WEEKS_IN_MILLISECONDS) {
        period = DAYS_IN_MILLISECONDS;
        label = "day";
    } else if (differenceInMillis <= MONTHS_IN_MILLISECONDS) {
        period = WEEKS_IN_MILLISECONDS;
        label = "week";
    } else if (differenceInMillis <= YEARS_IN_MILLISECONDS) {
        period = MONTHS_IN_MILLISECONDS;
        label = "month";
    } else {
        period = YEARS_IN_MILLISECONDS;
        label = "year";
    }

    const value = Math.ceil(differenceInMillis / period);
    if (value != 1) {
        label += "s";
    }

    return value + " " + label + " ago";
}
