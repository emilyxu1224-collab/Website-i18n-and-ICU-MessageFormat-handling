import i18n from "../../services/i18n.js";

class Order {
    constructor(total, newDate, number, itemCount) {
        if (newDate == null) {
            this.orderDate = new Date(); //$NON-NLS-L$
        } else {
            this.orderDate = newDate;
        }
        if (number == null) {
            this.orderNumber = Math.floor(Math.random() * (99999999 - 10000000) + 10000);
        } else {
            this.orderNumber = number;
        }

        this.total = total;
        this.itemCount = itemCount == null ? 1 : itemCount;
    }

    /**
     * Returns a locale-formatted date.
     * The old version built "MM/DD/YYYY" by hand, which is only correct in the
     * United States. Intl puts the parts in the order the locale expects.
     */
    getOrderDate(style) {
        return i18n.formatDate(this.orderDate, style || "short");
    }

    /** "2 days ago" / "vandaag" / "2天前", produced by Intl.RelativeTimeFormat. */
    getRelativeDate() {
        return i18n.formatRelativeDate(this.orderDate);
    }

    /**
     * Returns a status KEY, not a sentence. Keys are stable; the words that go
     * with them live in the resource files and can change per language.
     */
    getStatusKey() {
        let oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        let now = new Date(); //$NON-NLS-L$
        let diffDays = Math.floor(Math.abs((this.orderDate.getTime() - now.getTime()) / oneDay)); //$NON-NLS-L$

        if (diffDays < 2) return "processing"; //$NON-NLS-L$
        if (diffDays < 4) return "shipped";    //$NON-NLS-L$
        return "delivered";                    //$NON-NLS-L$
    }

    /** Kept for anything still calling the old method. */
    getOrderStatus() {
        const keyMap = {
            processing: "statusProcessing",
            shipped: "statusShipped",
            delivered: "statusDelivered"
        };
        return i18n.getString("Order", keyMap[this.getStatusKey()]);
    }

    /** Estimated or actual delivery date: three days after the order. */
    getEta() {
        return new Date(this.orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    /**
     * One sentence covering status AND date, built from a single ICU message.
     * Translators control the word order; "Arriving {date}" becomes
     * "预计 {date} 送达" without a code change.
     */
    getStatusLine() {
        return i18n.t("OrderHistory", "statusLine", {
            status: this.getStatusKey(),
            eta: this.getEta()
        });
    }
}

export { Order };
