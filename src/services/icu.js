/**
 * icu.js — a small ICU MessageFormat runtime.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Translators cannot translate a sentence that the code has glued together at
 * runtime. "You have " + n + " items" is three fragments; in Polish it needs
 * four different forms, in Chinese it needs one, and in German the word order
 * moves. So instead of gluing, we store ONE message that contains the rules:
 *
 *     "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}"
 *
 * The translator edits that whole message, including which plural forms their
 * language needs. This file reads that syntax and produces the final string.
 *
 * WHAT IT SUPPORTS
 *   {name}                            simple placeholder
 *   {name, number}                    locale-aware number
 *   {name, number, currency:USD}      locale-aware currency
 *   {name, number, percent}
 *   {name, date, short|medium|long|full}
 *   {name, time, short|medium}
 *   {name, plural, offset:1 =0{} one{} other{}}    # = the number
 *   {name, selectordinal, one{} two{} few{} other{}}
 *   {name, select, key{} other{}}
 *   '{'  '}'                          literal braces, ''  = literal apostrophe
 *
 * Plural categories (one / few / many / other …) come from Intl.PluralRules,
 * which is the browser's built-in copy of the Unicode CLDR plural data. We do
 * not hard-code language rules anywhere.
 */

"use strict";

/* ------------------------------------------------------------------ *
 * 1. PARSER — turns a message string into a small tree
 * ------------------------------------------------------------------ */

function parse(pattern) {
    let index = 0;

    function parseText(stopAtBrace) {
        let out = "";
        const parts = [];
        while (index < pattern.length) {
            const char = pattern[index];

            // Apostrophe escaping, the ICU way: '{ '} '' are literals.
            if (char === "'") {
                const next = pattern[index + 1];
                if (next === "'") { out += "'"; index += 2; continue; }
                if (next === "{" || next === "}" || next === "#") {
                    // consume until the closing apostrophe
                    index += 1;
                    while (index < pattern.length && pattern[index] !== "'") {
                        out += pattern[index];
                        index += 1;
                    }
                    index += 1; // skip closing '
                    continue;
                }
                out += "'"; index += 1; continue;
            }

            if (char === "}" && stopAtBrace) break;

            if (char === "{") {
                if (out) { parts.push({ type: "text", value: out }); out = ""; }
                parts.push(parseArgument());
                continue;
            }

            if (char === "#") { // only meaningful inside a plural branch
                if (out) { parts.push({ type: "text", value: out }); out = ""; }
                parts.push({ type: "pound" });
                index += 1;
                continue;
            }

            out += char;
            index += 1;
        }
        if (out) parts.push({ type: "text", value: out });
        return parts;
    }

    function skipSpace() {
        while (index < pattern.length && /\s/.test(pattern[index])) index += 1;
    }

    function readWord() {
        const start = index;
        while (index < pattern.length && /[^\s,{}:]/.test(pattern[index])) index += 1;
        return pattern.slice(start, index);
    }

    function parseArgument() {
        index += 1; // skip {
        skipSpace();
        const name = readWord();
        skipSpace();

        if (pattern[index] === "}") { index += 1; return { type: "arg", name }; }

        index += 1; // skip ,
        skipSpace();
        const kind = readWord();
        skipSpace();

        // {n, number} / {n, date, long} — a value plus an optional style
        if (kind === "number" || kind === "date" || kind === "time") {
            let style = "";
            if (pattern[index] === ",") {
                index += 1;
                skipSpace();
                const start = index;
                while (index < pattern.length && pattern[index] !== "}") index += 1;
                style = pattern.slice(start, index).trim();
            }
            skipSpace();
            index += 1; // skip }
            return { type: kind, name, style };
        }

        // plural / selectordinal / select — a set of named branches.
        // The comma after the keyword has not been consumed yet, so drop it.
        if (pattern[index] === ",") { index += 1; skipSpace(); }

        const node = { type: kind, name, offset: 0, options: {} };
        while (index < pattern.length && pattern[index] !== "}") {
            skipSpace();
            if (pattern[index] === "}") break;

            if (pattern.startsWith("offset:", index)) {
                index += 7;
                skipSpace();
                const start = index;
                while (index < pattern.length && /[\d.-]/.test(pattern[index])) index += 1;
                node.offset = Number(pattern.slice(start, index));
                continue;
            }

            const key = readWord();
            skipSpace();
            index += 1; // skip {
            node.options[key] = parseText(true);
            index += 1; // skip }
            skipSpace();
        }
        index += 1; // skip closing }
        return node;
    }

    return parseText(false);
}

/* ------------------------------------------------------------------ *
 * 2. FORMATTER — walks the tree and produces the final string
 * ------------------------------------------------------------------ */

const DATE_STYLES = {
    short:  { year: "numeric", month: "numeric", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long:   { year: "numeric", month: "long", day: "numeric" },
    full:   { weekday: "long", year: "numeric", month: "long", day: "numeric" }
};

const TIME_STYLES = {
    short:  { hour: "numeric", minute: "numeric" },
    medium: { hour: "numeric", minute: "numeric", second: "numeric" }
};

function formatNodes(nodes, values, locale, poundValue) {
    let out = "";

    for (const node of nodes) {
        switch (node.type) {

            case "text":
                out += node.value;
                break;

            case "pound":
                out += new Intl.NumberFormat(locale).format(poundValue);
                break;

            case "arg":
                out += values[node.name] === undefined ? `{${node.name}}` : values[node.name];
                break;

            case "number": {
                const value = toNumber(values[node.name], node.name);
                let options = {};
                if (node.style === "percent") options = { style: "percent" };
                else if (node.style === "integer") options = { maximumFractionDigits: 0 };
                else if (node.style && node.style.indexOf("currency") === 0) {
                    options = { style: "currency", currency: node.style.split(":")[1] || "USD" };
                }
                out += new Intl.NumberFormat(locale, options).format(value);
                break;
            }

            case "date": {
                const value = toDate(values[node.name]);
                const options = DATE_STYLES[node.style] || DATE_STYLES.medium;
                out += new Intl.DateTimeFormat(locale, options).format(value);
                break;
            }

            case "time": {
                const value = toDate(values[node.name]);
                const options = TIME_STYLES[node.style] || TIME_STYLES.short;
                out += new Intl.DateTimeFormat(locale, options).format(value);
                break;
            }

            case "select": {
                const key = String(values[node.name]);
                const branch = node.options[key] || node.options.other || [];
                out += formatNodes(branch, values, locale, poundValue);
                break;
            }

            case "plural":
            case "selectordinal": {
                const raw = toNumber(values[node.name], node.name);
                const adjusted = raw - (node.offset || 0);

                // Exact matches like =0 or =1 always win over category matches.
                let branch = node.options["=" + raw];

                if (!branch) {
                    const type = node.type === "plural" ? "cardinal" : "ordinal";
                    const category = new Intl.PluralRules(locale, { type }).select(adjusted);
                    branch = node.options[category] || node.options.other || [];
                }
                out += formatNodes(branch, values, locale, adjusted);
                break;
            }

            default:
                break;
        }
    }
    return out;
}

/**
 * A missing or non-numeric argument should never reach the user as "NaN".
 * Warn loudly in the console (so it shows up in localization testing) and
 * fall back to zero, which selects a sensible branch in every language.
 */
function toNumber(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        console.warn(`ICU: argument "${name}" is missing or not a number`);
        return 0;
    }
    return number;
}

function toDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === "number" || typeof value === "string") return new Date(value);
    return new Date();
}

/* ------------------------------------------------------------------ *
 * 3. PUBLIC API (with a tiny cache, since parsing is the slow part)
 * ------------------------------------------------------------------ */

const cache = new Map();

function formatMessage(pattern, values, locale) {
    if (typeof pattern !== "string") return "";
    let tree = cache.get(pattern);
    if (!tree) {
        try {
            tree = parse(pattern);
        } catch (err) {
            console.warn("ICU parse failed, showing raw message:", pattern, err);
            tree = [{ type: "text", value: pattern }];
        }
        cache.set(pattern, tree);
    }
    try {
        return formatNodes(tree, values || {}, locale, 0);
    } catch (err) {
        console.warn("ICU format failed, showing raw message:", pattern, err);
        return pattern;
    }
}

/** Which plural forms does this language actually use? Straight from CLDR. */
function pluralCategories(locale, type) {
    const rules = new Intl.PluralRules(locale, { type: type || "cardinal" });
    if (typeof rules.resolvedOptions().pluralCategories !== "undefined") {
        return rules.resolvedOptions().pluralCategories;
    }
    // Older engines: probe a sample of numbers instead.
    const found = new Set();
    [0, 1, 2, 3, 5, 11, 21, 100, 1.5].forEach(n => found.add(rules.select(n)));
    return Array.from(found);
}

export default { formatMessage, pluralCategories, parse };
export { formatMessage, pluralCategories };
