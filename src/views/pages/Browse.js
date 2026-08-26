import Utils from '../../services/Utils.js';
import i18n from '../../services/i18n.js';
import {productList} from "../../app.js";

let type;

let Browse = {
    
    render : async () => {
        let request = Utils.parseRequestURL();
        type = request.resource;

        let productMap = null;

        let title;

        if(type == "droids") {
        productMap = productList.get('droids');
        title = i18n.getString("Browse", "browseDroids"); // 直接拿整句 "Browse Droids"
    }
    else if(type == "vehicles") {
        productMap = productList.get('vehicles');
        title = i18n.getString("Browse", "browseVehicles"); // 直接拿整句 "Browse Vehicles"
    }
    else {
        // 默认情况 (Browse All)
        title = i18n.getString("Browse", "browseTitleAll"); 
    }
        //"12 products" / "1 product" / "No products match" — one message, all cases
        let resultCount = i18n.t("Browse", "resultCount", {
            count: productMap ? productMap.size : 0
        });

        //view is solely for HTML markup, contains no static text
        let view = `<section class="browsePage">
                        <h1>${title}</h1>
                        <p class="summaryLine">${resultCount}</p>
                        <div class="browseGrid">`;

        productMap.forEach((product, key) => {
            //create box for each product
            view += `<article id="${key}">
                        <img src="${product.imageURL}" class="gridImage" alt="${product.title}">
                        <div class="gridDes">
                            <h3>${product.title}</h3>
                            <div class="gridPrice">
                                ${i18n.formatCurrency(product.price, "b")}
                            </div>
                        </div>
                    </article>`;
        });
                view += `
                </div>
            </section>
            `;   
        return view;
    },
    after_render: async () => {

        let grid = document.querySelector(".browseGrid");

        let articles = grid.querySelectorAll("article");

        //click listener to redirect on product click
        for(let curProduct of articles) {
            curProduct.addEventListener("click", function() {
                location.href=`./#/${type}/` + curProduct.id;
            }, false);
            curProduct.classList.add("zoom");
        }
    } 
}

export default Browse;