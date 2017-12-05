'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const en = require("date-fns/locale/en");
const MillisecondsPerMinute = 60000;
const MillisecondsPerDay = 86400000;
function buildDistanceInWordsLocale() {
    const distanceInWordsLocale = {
        lessThanXSeconds: {
            one: 'less than a second',
            other: 'less than {{count}} seconds'
        },
        xSeconds: {
            one: '1 second',
            other: '{{count}} seconds'
        },
        halfAMinute: 'half a minute',
        lessThanXMinutes: {
            one: 'a few seconds',
            other: 'less than {{count}} minutes'
        },
        xMinutes: {
            one: 'a minute',
            other: '{{count}} minutes'
        },
        aboutXHours: {
            one: 'an hour',
            other: '{{count}} hours'
        },
        xHours: {
            one: 'an hour',
            other: '{{count}} hours'
        },
        xDays: {
            one: 'a day',
            other: '{{count}} days'
        },
        aboutXMonths: {
            one: 'a month',
            other: '{{count}} months'
        },
        xMonths: {
            one: 'a month',
            other: '{{count}} months'
        },
        aboutXYears: {
            one: 'a year',
            other: '{{count}} years'
        },
        xYears: {
            one: 'a year',
            other: '{{count}} years'
        },
        overXYears: {
            one: 'a year',
            other: '{{count}} years'
        },
        almostXYears: {
            one: 'a year',
            other: '{{count}} years'
        }
    };
    function localize(token, count, options) {
        options = options || {};
        if (count === 12 && token === 'xMonths') {
            token = 'aboutXYears';
            count = 1;
        }
        const result = distanceInWordsLocale[token];
        let value;
        if (typeof result === 'string') {
            value = result;
        }
        else {
            if (count === 1) {
                value = result.one;
            }
            else {
                value = result.other.replace('{{count}}', count.toString());
            }
        }
        if (!options.addSuffix)
            return value;
        if (options.comparison > 0)
            return 'in ' + value;
        return value + ' ago';
    }
    return {
        localize: localize
    };
}
en.distanceInWords = buildDistanceInWordsLocale();
const formatterOptions = { addSuffix: true, locale: en };
var Dates;
(function (Dates) {
    function dateDaysFromNow(date, now = Date.now()) {
        const startOfDayLeft = startOfDay(now);
        const startOfDayRight = startOfDay(date);
        const timestampLeft = startOfDayLeft.getTime() - startOfDayLeft.getTimezoneOffset() * MillisecondsPerMinute;
        const timestampRight = startOfDayRight.getTime() - startOfDayRight.getTimezoneOffset() * MillisecondsPerMinute;
        return Math.round((timestampLeft - timestampRight) / MillisecondsPerDay);
    }
    Dates.dateDaysFromNow = dateDaysFromNow;
    function startOfDay(date) {
        const newDate = new Date(typeof date === 'number' ? date : date.getTime());
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    }
    Dates.startOfDay = startOfDay;
    function toFormatter(date) {
        return {
            fromNow: () => {
                return date_fns_1.distanceInWordsToNow(date, formatterOptions);
            },
            format: (format) => date_fns_1.format(date, format)
        };
    }
    Dates.toFormatter = toFormatter;
})(Dates = exports.Dates || (exports.Dates = {}));
//# sourceMappingURL=date.js.map