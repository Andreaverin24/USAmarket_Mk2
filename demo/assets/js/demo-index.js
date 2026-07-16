(() => {
  "use strict";
  const groups = [
    ["Marketplace / Buyer", [
      ["marketplace-home-desktop", "Marketplace Home — Desktop", "Buyer", "Marketplace landing page and curated collections."],
      ["marketplace-home-mobile", "Marketplace Home — Mobile", "Buyer", "Responsive mobile landing variant.", "Responsive variant"],
      ["catalog-desktop", "Catalog — Desktop", "Buyer", "Vintage seating category results and filters."],
      ["catalog-mobile", "Catalog — Mobile", "Buyer", "Mobile category results and filter controls.", "Responsive variant"],
      ["product-desktop", "Product Detail — Desktop", "Buyer", "Collector product detail and seller entry point."],
      ["product-mobile", "Product Detail — Mobile", "Buyer", "Mobile product detail and inquiry actions.", "Responsive variant"],
      ["cart-desktop", "Shopping Cart — Desktop", "Buyer", "Desktop shopping bag and checkout entry."],
      ["cart-mobile", "Shopping Cart — Mobile", "Buyer", "Mobile cart with demo quantity behavior.", "Responsive variant"]
    ]],
    ["Seller Storefront", [
      ["seller-storefront-desktop", "Established Lines — Desktop", "Seller", "Public branded seller storefront."],
      ["seller-storefront-mobile", "Established Lines — Mobile", "Seller", "Mobile public storefront.", "Responsive variant"],
      ["seller-storefront-product", "Branded Product Page", "Seller", "Seller-branded product presentation."],
      ["about-established-lines", "Established Lines — About", "Seller", "Seller philosophy and brand story."]
    ]],
    ["Seller Dashboard", [
      ["seller-dashboard", "Seller Dashboard Overview", "Seller", "Desktop Seller OS overview."],
      ["seller-dashboard-mobile", "Seller Dashboard — Mobile", "Seller", "Mobile Seller OS overview.", "Responsive variant"],
      ["seller-products", "Product Inventory", "Seller", "Seller product list and inventory controls."],
      ["seller-product-edit", "Edit Product", "Seller", "Product editing form with demo submit."],
      ["seller-import-upload", "Bulk Import — Upload", "Seller", "CSV upload entry screen."],
      ["seller-import-validation", "Bulk Import — Validation", "Seller", "Validation and preview stage."],
      ["seller-import-results", "Bulk Import — Results", "Seller", "Import completion and error summary."],
      ["seller-orders", "Seller Orders", "Seller", "Screen is not designed yet.", "Temporary"],
      ["storefront-settings", "Storefront Settings", "Seller", "Screen is not designed yet.", "Temporary"]
    ]],
    ["Admin / Operations", [
      ["admin-dashboard", "Admin Dashboard", "Admin", "Screen is not designed yet.", "Temporary"],
      ["admin-seller-review", "Seller Onboarding Review", "Admin", "Seller application review workflow."],
      ["admin-moderation", "Product Moderation Queue", "Admin", "Approve, reject, or request changes."],
      ["admin-payouts", "Payouts Ledger", "Admin", "Financial ledger and payout release."],
      ["admin-audit-log", "System Audit Log", "Admin", "Platform event and actor audit history."]
    ]],
    ["Logistics / Driver", [
      ["logistics-command-center", "Operations Command Center", "Dispatcher", "Logistics status overview and exceptions."],
      ["logistics-routes", "Route Planning & Sequencing", "Dispatcher", "Dispatcher route planning workspace."],
      ["logistics-quotes", "Shipping Quote Management", "Dispatcher", "Quote review and shipment creation."],
      ["logistics-incidents", "Incident & Exception Handling", "Dispatcher", "Incident response workflow."],
      ["driver-routes", "Driver Routes", "Driver", "Screen is not designed yet.", "Temporary"]
    ]],
    ["Authentication / Service pages", [
      ["auth", "Authentication", "Buyer", "Screen is not designed yet; no real sign-in is performed.", "Temporary"],
      ["buyer-account", "Buyer Account Overview", "Buyer", "Buyer profile, saved items, addresses, and orders."],
      ["buyer-orders", "Buyer Order History", "Buyer", "Order history and tracking links."],
      ["order-tracking-desktop", "Order Tracking — Desktop", "Buyer", "In-transit order detail and timeline."],
      ["order-tracking-mobile", "Order Tracking — Mobile", "Buyer", "Mobile in-transit order detail.", "Responsive variant"],
      ["checkout-delivery", "Checkout — Delivery", "Buyer", "Delivery details and access form."],
      ["checkout-payment", "Checkout — Payment", "Buyer", "Static payment review screen; no payment is submitted."],
      ["order-success", "Order Confirmation", "Buyer", "Successful checkout confirmation."]
    ]]
  ];

  const root = document.querySelector("#screen-groups");
  const imageSlugs = new Set(window.DEMO_PAGES.filter(({ title }) => !title.includes("placeholder")).map(({ slug }) => slug));
  root.innerHTML = groups.map(([groupName, screens], groupIndex) => `
    <section class="screen-group" aria-labelledby="group-${groupIndex}">
      <header class="screen-group__header">
        <h2 id="group-${groupIndex}">${groupIndex + 1}. ${groupName}</h2>
        <span class="screen-group__count">${screens.length} screens</span>
      </header>
      <div class="screen-grid">
        ${screens.map(([slug, title, user, description, status]) => `
          <article class="screen-card">
            <div class="screen-card__preview">
              ${imageSlugs.has(slug) ? `<img src="assets/images/${slug}.png" alt="Preview of ${title}" loading="lazy">` : "Not designed yet"}
            </div>
            <div class="screen-card__body">
              <div class="screen-card__meta"><span class="chip">${user}</span>${status ? `<span class="chip chip--warning">${status}</span>` : ""}</div>
              <h3>${title}</h3>
              <p>${description}</p>
              <a href="pages/${slug}.html">Open page →</a>
            </div>
          </article>`).join("")}
      </div>
    </section>`).join("");
})();

