import i18n from "../../services/i18n.js";
import { locale } from "../../app.js";

/**
 * I18nDemo — a page that shows the machinery instead of hiding it.
 *
 * For each sentence it prints two things side by side:
 *   left  = the message exactly as a translator sees it in the resource file
 *   right = what the shopper sees after the rules run
 *
 * The messages shown here are the real ones the shop uses. Nothing on this
 * page is written for the demo, which is the point: the same message serves
 * 0, 1 and 1,000 in every language without a code change.
 */

// Locales used for the CLDR plural table. They are chosen for contrast:
// one form, two forms, three, four, six.
const PLURAL_TOUR = [
    "zh-CN", "ja-JP", "en-US", "de-DE",
    "fr-FR", "ru-RU", "pl-PL", "ga-IE", "ar-EG", "cy-GB"
];

// The live examples: which real message to show, and the argument it takes.
const LIVE_MESSAGES = [
    { view: "Cart", key: "itemCount", arg: "count" },
    { view: "Browse", key: "resultCount", arg: "count" },
    { view: "ProductShow", key: "stockLevel", arg: "count" },
    { view: "OrderHistory", key: "orderRank", arg: "position" },
    { view: "OrderHistory", key: "orderItems", arg: "count" }
];

var currentCount = 1;

/** Make a message pattern safe to print inside HTML. */
function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function renderLiveRows(count) {
    let rows = "";
    for (const item of LIVE_MESSAGES) {
        const pattern = i18n.getString(item.view, item.key);
        const values = {};
        values[item.arg] = count;
        const output = i18n.t(item.view, item.key, values);

        rows += `
            <tr>
                <td class="keyCell">${item.view}.${item.key}</td>
                <td><code>${escapeHTML(pattern)}</code></td>
                <td class="outputCell">${escapeHTML(output)}</td>
            </tr>`;
    }
    return rows;
}

function renderPluralTable() {
    let rows = "";
    for (const code of PLURAL_TOUR) {
        const cardinal = i18n.getPluralCategories(code, "cardinal");
        const ordinal = i18n.getPluralCategories(code, "ordinal");
        const isCurrent = code === locale ? " currentLocale" : "";
        rows += `
            <tr class="${isCurrent.trim()}">
                <td class="keyCell">${code}</td>
                <td>${cardinal.map(c => `<span class="tag">${c}</span>`).join(" ")}</td>
                <td>${ordinal.map(c => `<span class="tag">${c}</span>`).join(" ")}</td>
                <td class="countCell">${cardinal.length}</td>
            </tr>`;
    }
    return rows;
}

function renderFormatRows() {
    const sample = 1234567.891;
    const today = new Date();
    const rows = [
        ["Number", new Intl.NumberFormat(locale === "en-XA" ? "en-US" : locale).format(sample)],
        ["Currency", i18n.currencyText(sample)],
        ["Date, short", i18n.formatDate(today, "short")],
        ["Date, long", i18n.formatDate(today, "long")],
        ["Date, full", i18n.formatDate(today, "full")],
        ["Relative, 2 days ago", i18n.formatRelativeDate(new Date(Date.now() - 2 * 86400000))],
        ["Relative, in 3 days", i18n.formatRelativeDate(new Date(Date.now() + 3 * 86400000))],
        ["List", i18n.formatList(["A", "B", "C"])]
    ];
    return rows.map(([label, value]) => `
            <tr>
                <td class="keyCell">${label}</td>
                <td class="outputCell">${escapeHTML(value)}</td>
            </tr>`).join("");
}

let I18nDemo = {

    render: async () => {
        const demoTitle = i18n.getString("I18nDemo", "demoTitle");
        const demoIntro = i18n.getString("I18nDemo", "demoIntro");
        const patternHeading = i18n.getString("I18nDemo", "patternHeading");
        const outputHeading = i18n.getString("I18nDemo", "outputHeading");
        const countLabel = i18n.getString("I18nDemo", "countLabel");
        const pluralTitle = i18n.getString("I18nDemo", "pluralTitle");
        const pluralIntro = i18n.getString("I18nDemo", "pluralIntro");
        const localeHeading = i18n.getString("I18nDemo", "localeHeading");
        const categoriesHeading = i18n.getString("I18nDemo", "categoriesHeading");
        const ordinalHeading = i18n.getString("I18nDemo", "ordinalHeading");
        const formatTitle = i18n.getString("I18nDemo", "formatTitle");
        const formatIntro = i18n.getString("I18nDemo", "formatIntro");
        const qaTitle = i18n.getString("I18nDemo", "qaTitle");
        const qaIntro = i18n.getString("I18nDemo", "qaIntro");

        const missing = i18n.getMissingKeys();
        const qaMissing = i18n.t("I18nDemo", "qaMissing", { count: missing.length });

        return `
        <section class="i18nDemo" dir="${i18n.getDirection()}">

            <h1>${demoTitle}</h1>
            <p class="demoIntro">${demoIntro}</p>
            <p class="demoIntro"><span class="tag">${localeHeading}: ${locale}</span></p>

            <div class="demoControl">
                <label for="countSlider">${countLabel}</label>
                <input type="range" id="countSlider" min="0" max="25" value="${currentCount}">
                <output id="countValue">${currentCount}</output>
            </div>

            <table class="demoTable">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>${patternHeading}</th>
                        <th>${outputHeading}</th>
                    </tr>
                </thead>
                <tbody id="liveRows">${renderLiveRows(currentCount)}</tbody>
            </table>

            <h2>${pluralTitle}</h2>
            <p class="demoIntro">${pluralIntro}</p>
            <table class="demoTable">
                <thead>
                    <tr>
                        <th>${localeHeading}</th>
                        <th>${categoriesHeading}</th>
                        <th>${ordinalHeading}</th>
                        <th>#</th>
                    </tr>
                </thead>
                <tbody>${renderPluralTable()}</tbody>
            </table>

            <h2>${formatTitle}</h2>
            <p class="demoIntro">${formatIntro}</p>
            <table class="demoTable">
                <tbody>${renderFormatRows()}</tbody>
            </table>

            <h2>${qaTitle}</h2>
            <p class="demoIntro">${qaIntro}</p>
            <p class="demoIntro"><span class="tag">${escapeHTML(qaMissing)}</span></p>
            ${missing.length ? `<p class="demoIntro"><code>${escapeHTML(missing.join(", "))}</code></p>` : ""}

        </section>`;
    },

    after_render: async () => {
        const slider = document.querySelector("#countSlider");
        const value = document.querySelector("#countValue");
        const rows = document.querySelector("#liveRows");
        if (!slider) return;

        slider.addEventListener("input", () => {
            currentCount = parseInt(slider.value, 10);
            value.textContent = currentCount;
            //re-run the messages from scratch; never patch the rendered words
            rows.innerHTML = renderLiveRows(currentCount);
        }, false);
    }
};

export default I18nDemo;
