import { orderHistory } from "../../app.js";
import i18n from "../../services/i18n.js";

let OrderHistory = {

    render: async () => {

        //strings to hold all the text (to be used within the HTML template literal)
        let historyTitle = i18n.getString("OrderHistory", "historyTitle");
        let dateHeading = i18n.getString("OrderHistory", "dateHeading");
        let numberHeading = i18n.getString("OrderHistory", "numberHeading");
        let totalHeading = i18n.getString("OrderHistory", "totalHeading");
        let statusHeading = i18n.getString("OrderHistory", "statusHeading");
        let emptyHistory = i18n.getString("OrderHistory", "emptyHistory");

        //one message, two numbers, nested plurals: "3 orders in the last 6 months"
        let historySummary = i18n.t("OrderHistory", "historySummary", {
            count: orderHistory.length,
            months: 6
        });

        //view is solely for HTML markup, contains no static text
        let view = `
        <section class="orderHistory">
            <h1>${historyTitle}</h1>
            <p class="summaryLine">${historySummary}</p>
            <div class="headings">
                <h3>${dateHeading}</h3>
                <h3>${numberHeading}</h3>
                <h3>${totalHeading}</h3>
                <h3>${statusHeading}</h3>
            </div>`;

        if (orderHistory.length === 0) {
            view += `<h3>${emptyHistory}</h3>`;
        }

        orderHistory.forEach((order, index) => {
            //"Placed 2 days ago" — the relative phrase comes from Intl, the
            //sentence around it comes from the resource file
            let placed = i18n.t("OrderHistory", "orderPlacedRelative", {
                when: order.getRelativeDate()
            });
            //"2 items" — plural form chosen by the locale's CLDR rules
            let items = i18n.t("OrderHistory", "orderItems", { count: order.itemCount });
            //"Your 1st order" — ordinals differ per language, so they are a message too
            let rank = i18n.t("OrderHistory", "orderRank", {
                position: orderHistory.length - index
            });

            view += `
                <article class="orderItem">
                    <div class="orderDate">
                        <h3>${order.getOrderDate("long")}</h3>
                        <span class="subtle">${placed}</span>
                    </div>

                    <div class="orderNumber">
                        <h3>${order.orderNumber}</h3>
                        <span class="subtle">${rank}</span>
                    </div>

                    <div class="gridPrice">
                        ${i18n.formatCurrency(order.total)}
                        <span class="subtle">${items}</span>
                    </div>

                    <h3>${order.getStatusLine()}</h3>
                </article>`;
        });
        view += `
        </section>`;

        return view;
    }
    , after_render: async () => {

    }
}

export default OrderHistory;
