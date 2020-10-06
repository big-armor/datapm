const SECONDS_IN_MILLISECONDS = 1000;
const MINUTES_IN_MILLISECONDS = SECONDS_IN_MILLISECONDS * 60;
const HOURS_IN_MILLISECONDS = MINUTES_IN_MILLISECONDS * 60;
const DAYS_IN_MILLISECONDS = HOURS_IN_MILLISECONDS * 24;
const WEEKS_IN_MILLISECONDS = DAYS_IN_MILLISECONDS * 7;
const MONTHS_IN_MILLISECONDS = WEEKS_IN_MILLISECONDS * 4;

export function getTimeDifferenceLabel(date: Date, dateNow: Date): string {
    console.log(date.getMilliseconds());
    const differenceInMillis = dateNow.getMilliseconds() - date.getMilliseconds();
    let label;
    if (differenceInMillis <= SECONDS_IN_MILLISECONDS) {
        label = "seconds";
    } else if (differenceInMillis <= MINUTES_IN_MILLISECONDS) {
        label = "minutes";
    } else if (differenceInMillis <= HOURS_IN_MILLISECONDS) {
        label = "hours";
    } else if (differenceInMillis <= DAYS_IN_MILLISECONDS) {
        label = "days";
    } else if (differenceInMillis <= WEEKS_IN_MILLISECONDS) {
        label = "weeks";
    } else if (differenceInMillis <= MONTHS_IN_MILLISECONDS) {
        label = "months";
    } else {
        label = "years";
    }

    console.log("wow", differenceInMillis);

    return label + " ago.";
}