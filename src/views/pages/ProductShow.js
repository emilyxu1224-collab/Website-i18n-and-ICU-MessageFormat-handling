import Utils from '../../services/Utils.js';
import { productList, addToCart } from '../../app.js';
import i18n from '../../services/i18n.js';

let product;
let productID;
let type;

let ProductShow = {

    render: async () => {

        //static strings to hold all the text (to be used within the HTML template literal)
        let qtyLabel = i18n.getString("ProductShow", "qtyLabel");
        let qtyOptions = [1, 2, 3, 4];
        let addToCartLabel = i18n.getString("ProductShow", "addToCartLabel");

        //get the id
        let request = Utils.parseRequestURL();
        productID = parseInt(request.id);
        type = request.resource;
        //get a reference to the correct product Map based on type
        let productMap = productList.get(type);
        //get the correct product from the product Map based on ID and type
        product = productMap.get(productID);

        //Demo data: stock and reviews are derived from the product ID so the
        //page shows a stable mix of 0, 1 and many — the three cases that break
        //hand-written plurals.
        let stockOnHand = productID % 3 === 0 ? 0 : (productID % 3 === 1 ? 1 : productID + 4);
        let reviewCount = productID % 4 === 0 ? 0 : productID * 3;
        let rating = 4.5;

        //Estimated arrival: three days from now, written the locale's own way
        let arrival = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        let stockLevel = i18n.t("ProductShow", "stockLevel", { count: stockOnHand });
        let ratingSummary = i18n.t("ProductShow", "ratingSummary", { rating: rating, count: reviewCount });
        let deliveryEstimate = i18n.t("ProductShow", "deliveryEstimate", { date: arrival });

        //return HTML markup
        return `
            <section class="productShow">
                <article class="leftDetailPane">
                    <img src="${product.imageURL}" class="detailImage">
                </article>
                <article class="detailContent">
                    <h1>${product.title}</h1>
                    <p class="summaryLine">${ratingSummary}</p>
                    <div class="gridPrice">
                        ${i18n.formatCurrency(product.price, "b")}
                    </div>
                    <p class="summaryLine">${stockLevel}</p>
                    <p class="summaryLine">${deliveryEstimate}</p>
                    <div class="qty">
                        <h3>${qtyLabel}</h3>
                        <select class="qtyDrop checkoutInput">
                            <option value="${qtyOptions[0]}">${qtyOptions[0]}</option>
                            <option value="${qtyOptions[1]}">${qtyOptions[1]}</option>
                            <option value="${qtyOptions[2]}">${qtyOptions[2]}</option>
                            <option value="${qtyOptions[3]}">${qtyOptions[3]}</option>
                        </select>
                    </div>
                    <button class="addToCart">${addToCartLabel}</button>
                    <p class="summaryLine" id="addedConfirmation" role="status" aria-live="polite"></p>
                    <p>${product.desc}</p>
                </article>
            </section>
        `;
    }
    , after_render: async () => {
        const addButt = document.querySelector(".addToCart");

        //there's a bug where adding same item with different
        addButt.addEventListener("click", getQtyandAddToCart, false);
    }
}

var getQtyandAddToCart = () => {
    //get the qty and modify selected item
    let qtySel = document.querySelector(".qtyDrop");
    let qty = parseInt(qtySel.options[qtySel.selectedIndex].value)
    product.qty += qty;
    //pass item to cart
    addToCart(product);

    //"1 item added" / "3 items added" — announced to screen readers too
    let confirmation = i18n.t("ProductShow", "addedConfirmation", { count: qty });
    let region = document.querySelector("#addedConfirmation");
    if (region) region.textContent = confirmation;
}

export default ProductShow;