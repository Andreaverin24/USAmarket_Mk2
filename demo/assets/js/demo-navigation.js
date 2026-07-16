(() => {
  "use strict";

  const pages = [
    ["marketplace-home-desktop", "Marketplace Home — Desktop"],
    ["marketplace-home-mobile", "Marketplace Home — Mobile"],
    ["catalog-desktop", "Catalog — Desktop"],
    ["catalog-mobile", "Catalog — Mobile"],
    ["product-desktop", "Product Detail — Desktop"],
    ["product-mobile", "Product Detail — Mobile"],
    ["cart-desktop", "Cart — Desktop"],
    ["cart-mobile", "Cart — Mobile"],
    ["seller-storefront-desktop", "Seller Storefront — Desktop"],
    ["seller-storefront-mobile", "Seller Storefront — Mobile"],
    ["seller-storefront-product", "Seller Branded Product"],
    ["about-established-lines", "Seller About"],
    ["seller-dashboard", "Seller Dashboard"],
    ["seller-dashboard-mobile", "Seller Dashboard — Mobile"],
    ["seller-products", "Seller Products"],
    ["seller-product-edit", "Seller Product Editor"],
    ["seller-import-upload", "Seller Import — Upload"],
    ["seller-import-validation", "Seller Import — Validation"],
    ["seller-import-results", "Seller Import — Results"],
    ["seller-orders", "Seller Orders (placeholder)"],
    ["storefront-settings", "Storefront Settings (placeholder)"],
    ["admin-dashboard", "Admin Dashboard (placeholder)"],
    ["admin-seller-review", "Admin Seller Review"],
    ["admin-moderation", "Admin Product Moderation"],
    ["admin-payouts", "Admin Payouts"],
    ["admin-audit-log", "Admin Audit Log"],
    ["logistics-command-center", "Logistics Command Center"],
    ["logistics-routes", "Dispatcher Route Planning"],
    ["logistics-quotes", "Shipping Quote Management"],
    ["logistics-incidents", "Incident Handling"],
    ["driver-routes", "Driver Routes (placeholder)"],
    ["auth", "Authentication (placeholder)"],
    ["buyer-account", "Buyer Account"],
    ["buyer-orders", "Buyer Orders"],
    ["order-tracking-desktop", "Order Tracking — Desktop"],
    ["order-tracking-mobile", "Order Tracking — Mobile"],
    ["checkout-delivery", "Checkout — Delivery"],
    ["checkout-payment", "Checkout — Payment"],
    ["order-success", "Order Confirmation"]
  ];

  window.DEMO_PAGES = pages.map(([slug, title]) => ({ slug, title }));

  const ownScript = document.currentScript;
  const rootUrl = new URL("../../", ownScript.src);
  window.demoUrl = (slug, suffix = "") => new URL(`pages/${slug}.html${suffix}`, rootUrl).href;
  window.demoIndexUrl = new URL("index.html", rootUrl).href;

  const currentFile = location.pathname.split("/").pop() || "index.html";
  const currentSlug = currentFile.replace(/\.html$/, "");
  const currentIndex = pages.findIndex(([slug]) => slug === currentSlug);
  const previousIndex = currentIndex > 0 ? currentIndex - 1 : pages.length - 1;
  const nextIndex = currentIndex >= 0 && currentIndex < pages.length - 1 ? currentIndex + 1 : 0;

  const toolbar = document.createElement("nav");
  toolbar.className = "demo-toolbar";
  toolbar.setAttribute("aria-label", "Demo navigation");
  toolbar.innerHTML = `
    <span class="demo-toolbar__badge">DEMO</span>
    <a class="demo-toolbar__index" href="${window.demoIndexUrl}">← Demo Index</a>
    <a class="demo-toolbar__previous" href="${window.demoUrl(pages[previousIndex][0])}">Previous</a>
    <a class="demo-toolbar__next" href="${window.demoUrl(pages[nextIndex][0])}">Next</a>
    <select aria-label="All demo screens">
      <option value="${window.demoIndexUrl}"${currentIndex < 0 ? " selected" : ""}>Demo Index</option>
      ${pages.map(([slug, title]) => `<option value="${window.demoUrl(slug)}"${slug === currentSlug ? " selected" : ""}>${title}</option>`).join("")}
    </select>`;

  const mount = () => {
    document.body.prepend(toolbar);
    toolbar.querySelector("select").addEventListener("change", (event) => {
      location.href = event.target.value;
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();

