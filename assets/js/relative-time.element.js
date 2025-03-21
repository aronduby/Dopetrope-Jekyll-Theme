class RelativeTime extends HTMLElement {

    static observedAttributes = ['datetime', 'max-diff'];

    constructor() {
        super();
        this._internals = this.attachInternals();

        this.loading = true;
        this.relative = true;
    }

    get loading() {
        return this._internals.states.has('loading');
    }

    set loading(val) {
        this._internals.states[val ? 'add' : 'delete']('loading');
    }

    get relative() {
        return this._internals.states.has('relative');
    }

    set relative(val) {
        this._internals.states[val ? 'add' : 'delete']('relative');
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.updateContent();
    }

    updateContent() {
        this.loading = true;

        const d = new Date(this.getAttribute('datetime'));
        const maxDiff = this.getAttribute('max-diff');

        const data = this.#getTimeStrings(d, maxDiff ?? undefined);

        this.textContent = data[data.display];

        if (data.display === 'relative') {
            this.setAttribute('title', data.absolute);
        } else {
            this.removeAttribute('title');
        }

        this.loading = false;
        this.relative = data.display === 'relative';
    }

    /**
     * Formats recent dates as relative time string like "a minute ago", "in 2 hours", "yesterday", "3 months ago", etc.
     * But if the relative time is greater than the supplied max it does an absolute formatted date instead.
     * This uses Intl.RelativeTimeFormat and Intl.DateTimeFormat for built-in internationalization
     *
     * @property {Date|number} date the date to compare against
     * @property {number} maxDiff if the diff is greater than this many sections, stop doing relative and do absolute
     *  defaults to  7_776_000 which is 3 months
     * @property {string} lang language to use for the formatters
     *
     * @returns {{ display: 'absolute'|'relative', absolute: 'string', relative?: 'string' }}
     */
    #getTimeStrings(date, maxDiff = 7_776_000, lang = navigator.language) {
        // Allow dates or times to be passed
        const timeMs = typeof date === "number" ? date : date.getTime();
        // Get the amount of seconds between the given date and now
        const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

        // greater than our max, do a nicely formatted absolute date
        const dtf = new Intl.DateTimeFormat(lang, { dateStyle: "full", timeStyle: "short" });
        const absolute = dtf.format(date);

        if (Math.abs(deltaSeconds) > maxDiff) {
            return {
                absolute,
                display: 'absolute'
            };
        }

        // Array representing one minute, hour, day, week, month, etc in seconds
        const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];

        // Array equivalent to the above but in the string representation of the units
        const units = ["second", "minute", "hour", "day", "week", "month", "year"];

        // Grab the ideal cutoff unit
        const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds));

        // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
        // is one day in seconds, so we can divide our seconds by this to get the # of days
        const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

        // Intl.RelativeTimeFormat do its magic
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
        const relative = rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);

        return {
            absolute, relative,
            display: 'relative'
        }
    }
}

customElements.define("relative-time", RelativeTime);