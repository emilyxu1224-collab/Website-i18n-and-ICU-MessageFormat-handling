import { locale, updateLocale } from '../app.js';
import icu from './icu.js';

const SOURCE_LOCALE = "en-US";

// Strings for the locale the user picked, and the en-US safety net underneath.
var stringsJSON = {};
var fallbackJSON = {};

// Missing keys collected at runtime — useful evidence during l10n testing.
var missingKeys = [];

/** en-XA is a pseudo-locale: English, deliberately mangled, to expose bugs. */
const PSEUDO_LOCALE = "en-XA";

/** Which real locale should Intl use for formatting? */
var intlLocale = (someLocale) => (someLocale === PSEUDO_LOCALE ? "en-US" : someLocale);

async function fetchStrings(targetLocale) {
    const options = { method: 'GET', headers: { 'Content-Type': 'application/json' } };
    const response = await fetch(`./content/${targetLocale}/strings.json`, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

const i18n = {

    /** Load the resource file for a locale, keeping en-US underneath as backup. */
    loadStringsJSON: async (newLocale) => {
        missingKeys = [];

        if (Object.keys(fallbackJSON).length === 0) {
            try {
                fallbackJSON = await fetchStrings(SOURCE_LOCALE);
            } catch (err) {
                console.log('Error getting source strings', err);
            }
        }

        if (newLocale === PSEUDO_LOCALE) {
            stringsJSON = pseudoLocalize(fallbackJSON);
            return;
        }

        try {
            stringsJSON = await fetchStrings(newLocale);
        } catch (err) {
            console.log('Error getting strings', err);
            if (newLocale !== SOURCE_LOCALE) {
                updateLocale(SOURCE_LOCALE);
            }
        }
    },

    /**
     * Plain string lookup. Falls back to en-US, then to the key itself, so a
     * missing translation never blanks out or breaks the page.
     */
    getString: (view, key) => {
        const translated = stringsJSON[view] && stringsJSON[view][key];
        if (translated !== undefined) return translated;

        const source = fallbackJSON[view] && fallbackJSON[view][key];
        if (source !== undefined) {
            missingKeys.push(`${view}.${key}`);
            return source;
        }

        console.warn(`Missing string: ${view}.${key}`);
        return `${view}.${key}`;
    },

    /**
     * Look up a message AND fill in its placeholders.
     *   i18n.t("Cart", "itemCount", { count: 3 })
     * The message itself decides plural forms, word order and date style, so
     * translators can change all three without touching the code.
     */
    t: (view, key, values) => {
        const pattern = i18n.getString(view, key);
        return icu.formatMessage(pattern, values, intlLocale(locale));
    },

    /** Currency, formatted the way the selected locale writes money. */
    formatCurrency: (price, color) => {
        let converted = convertCurrency(price);
        let formatted = new Intl.NumberFormat(intlLocale(locale), {
            style: 'currency',
            currency: currencyMap[locale] || 'USD'
        }).format(converted); //$NON-NLS-L$
        return `<h4>${formatted}</h4>`;
    },

    /** Same as above but returns plain text, for use inside ICU messages. */
    currencyText: (price) => {
        return new Intl.NumberFormat(intlLocale(locale), {
            style: 'currency',
            currency: currencyMap[locale] || 'USD'
        }).format(convertCurrency(price)); //$NON-NLS-L$
    },

    /** Locale-based link to a static HTML file in the 'static' folder. */
    getHTML: () => {
        return `${locale === PSEUDO_LOCALE ? SOURCE_LOCALE : locale}/terms.html`; //$NON-NLS-L$
    },

    /**
     * Date, formatted by the locale's own conventions — never MM/DD/YYYY by
     * hand. "short" | "medium" | "long" | "full"; defaults to the original
     * weekday-short style so existing calls keep working.
     */
    formatDate: (date, style) => {
        const styles = {
            short:  { year: 'numeric', month: 'numeric', day: 'numeric' },
            medium: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' },
            long:   { year: 'numeric', month: 'long', day: 'numeric' },
            full:   { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        };
        const options = styles[style] || styles.medium;
        return new Intl.DateTimeFormat([intlLocale(locale), SOURCE_LOCALE], options).format(date); //$NON-NLS-L$
    },

    /** "2 days ago" / "eergisteren" / "2天前" — no hand-written English anywhere. */
    formatRelativeDate: (date) => {
        const oneDay = 24 * 60 * 60 * 1000;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfThen = new Date(date.getTime());
        startOfThen.setHours(0, 0, 0, 0);

        const days = Math.round((startOfThen - startOfToday) / oneDay);

        if (typeof Intl.RelativeTimeFormat !== "function") {
            return i18n.formatDate(date, "medium");
        }
        const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
        if (Math.abs(days) < 7) return formatter.format(days, "day");
        if (Math.abs(days) < 31) return formatter.format(Math.round(days / 7), "week");
        return formatter.format(Math.round(days / 30), "month");
    },

    /** "A, B and C" — the joining word and commas differ by language. */
    formatList: (items) => {
        if (typeof Intl.ListFormat !== "function") return items.join(", ");
        return new Intl.ListFormat(intlLocale(locale), { style: "long", type: "conjunction" }).format(items);
    },

    /** Which plural forms this locale needs, straight from CLDR. */
    getPluralCategories: (someLocale, type) => icu.pluralCategories(intlLocale(someLocale || locale), type),

    /** Keys that fell back to English on the last load — l10n QA evidence. */
    getMissingKeys: () => missingKeys.slice(),

    /** Text direction, so RTL locales can flip the layout. */
    getDirection: () => {
        const rtl = ["ar", "he", "fa", "ur"];
        return rtl.indexOf(String(locale).split("-")[0]) === -1 ? "ltr" : "rtl";
    },

    SOURCE_LOCALE,
    PSEUDO_LOCALE
};

/**
 * Pseudo-localization: keep the message readable, but pad it ~40% longer and
 * add accents. If a layout breaks or a string disappears here, it will break
 * in German or Russian too — and you find it before sending anything out.
 * Placeholders like {count} and ICU branches are left untouched on purpose.
 */
const ACCENTS = {
    a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í", j: "ĵ",
    k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ó", p: "þ", r: "ŕ", s: "š", t: "ţ", u: "ú",
    v: "ṽ", w: "ŵ", y: "ý", z: "ž",
    A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", G: "Ĝ", H: "Ĥ", I: "Í", J: "Ĵ", K: "Ķ",
    L: "Ļ", M: "Ṁ", N: "Ñ", O: "Ó", P: "Þ", R: "Ŕ", S: "Š", T: "Ţ", U: "Ú", W: "Ŵ", Y: "Ý", Z: "Ž"
};

function pseudoText(text) {
    
    const context = ["text"];
    let out = "";

    for (const char of text) {
        if (char === "{") {
            context.push(context[context.length - 1] === "text" ? "header" : "text");
            out += char;
            continue;
        }
        if (char === "}") {
            context.pop();
            out += char;
            continue;
        }
        out += context[context.length - 1] === "text" ? (ACCENTS[char] || char) : char;
    }

    // Pad ~40%: German and Russian routinely run that much longer than English.
    const padding = "~".repeat(Math.max(2, Math.ceil(out.length * 0.4)));
    return `[${out}${padding}]`;
}

function pseudoLocalize(source) {
    const output = {};
    for (const view in source) {
        if (typeof source[view] === "string") { output[view] = pseudoText(source[view]); continue; }
        output[view] = {};
        for (const key in source[view]) {
            output[view][key] = pseudoText(source[view][key]);
        }
    }
    return output;
}

//used to determine the correct currency symbol
var currencyMap = {
    'en-US': 'USD',
    'zh-CN': 'CNY',
    'de-DE': 'EUR',
    'en-XA': 'USD'
};

//function to perform rough conversion from galactic credits to real currencies
//Disabled for project
var convertCurrency = (price) => {
    return price;
}

export default i18n;
