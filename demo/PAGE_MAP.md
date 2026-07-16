# Stitch page map

The inventory covers the recursively scanned `../Stich` directory. The deployable demo uses the 34 extracted HTML templates; archive copies are documented below and are not copied again.

| Source Stitch file | New name | Purpose | Related pages |
|---|---|---|---|
| `Stich/marketplace_home_desktop/code.html` | `pages/marketplace-home-desktop.html` | Marketplace landing, desktop | catalog, buyer account, cart |
| `Stich/marketplace_home_mobile/code.html` | `pages/marketplace-home-mobile.html` | Marketplace landing, mobile | mobile catalog, buyer account, mobile cart |
| `Stich/category_results_desktop/code.html` | `pages/catalog-desktop.html` | Buyer catalog/category results, desktop | marketplace, product detail |
| `Stich/category_results_mobile/code.html` | `pages/catalog-mobile.html` | Buyer catalog/category results, mobile | mobile marketplace, mobile product |
| `Stich/product_detail_page_desktop/code.html` | `pages/product-desktop.html` | Marketplace product detail, desktop | catalog, seller storefront, cart |
| `Stich/product_detail_page_mobile/code.html` | `pages/product-mobile.html` | Marketplace product detail, mobile | mobile catalog, mobile storefront, mobile cart |
| `Stich/shopping_cart_desktop/code.html` | `pages/cart-desktop.html` | Shopping cart, desktop | product, checkout delivery |
| `Stich/shopping_cart_mobile/code.html` | `pages/cart-mobile.html` | Shopping cart, mobile | mobile product, checkout delivery |
| `Stich/established_lines_home_desktop/code.html` | `pages/seller-storefront-desktop.html` | Public seller storefront, desktop | branded product, seller about, catalog |
| `Stich/established_lines_home_mobile/code.html` | `pages/seller-storefront-mobile.html` | Public seller storefront, mobile | mobile catalog, branded product |
| `Stich/product_page_branded/code.html` | `pages/seller-storefront-product.html` | Seller-branded product page | seller storefront, cart |
| `Stich/about_established_lines/code.html` | `pages/about-established-lines.html` | Seller brand/about page | seller storefront |
| `Stich/overview_seller_os/code.html` | `pages/seller-dashboard.html` | Seller OS overview, desktop | products, orders, storefront settings |
| `Stich/dashboard_mobile_seller_os/code.html` | `pages/seller-dashboard-mobile.html` | Seller OS overview, mobile | seller dashboard, products |
| `Stich/product_inventory_seller_os/code.html` | `pages/seller-products.html` | Seller product inventory | edit product, import upload |
| `Stich/edit_product_seller_os/code.html` | `pages/seller-product-edit.html` | Seller product editor | products, storefront settings |
| `Stich/bulk_import_upload_csv_seller_os/code.html` | `pages/seller-import-upload.html` | Bulk import CSV upload | validation preview |
| `Stich/bulk_import_validation_preview_seller_os/code.html` | `pages/seller-import-validation.html` | Bulk import validation and preview | upload, import results |
| `Stich/bulk_import_results_seller_os/code.html` | `pages/seller-import-results.html` | Bulk import completion/results | products, import upload |
| `Stich/seller_onboarding_review/code.html` | `pages/admin-seller-review.html` | Admin seller onboarding review | admin dashboard, moderation |
| `Stich/product_moderation_queue/code.html` | `pages/admin-moderation.html` | Admin product moderation queue | admin dashboard, seller review |
| `Stich/financial_ledger_payouts/code.html` | `pages/admin-payouts.html` | Admin payout ledger | admin dashboard, audit log |
| `Stich/system_audit_log/code.html` | `pages/admin-audit-log.html` | Admin platform audit log | admin dashboard, payouts |
| `Stich/operations_command_center/code.html` | `pages/logistics-command-center.html` | Dispatcher operations command center | routes, quotes, incidents |
| `Stich/route_planning_sequencing/code.html` | `pages/logistics-routes.html` | Dispatcher route planning and sequencing | command center, driver routes |
| `Stich/shipping_quote_management/code.html` | `pages/logistics-quotes.html` | Shipping quote management | command center, incidents |
| `Stich/incident_exception_handling/code.html` | `pages/logistics-incidents.html` | Logistics incident and exception handling | command center, routes |
| `Stich/account_overview_desktop/code.html` | `pages/buyer-account.html` | Buyer account overview | buyer orders, marketplace |
| `Stich/order_history_desktop/code.html` | `pages/buyer-orders.html` | Buyer order history | account, order tracking |
| `Stich/order_tracking_in_transit_desktop/code.html` | `pages/order-tracking-desktop.html` | In-transit order tracking, desktop | buyer orders |
| `Stich/order_tracking_in_transit_mobile/code.html` | `pages/order-tracking-mobile.html` | In-transit order tracking, mobile | buyer orders |
| `Stich/checkout_delivery_details_desktop/code.html` | `pages/checkout-delivery.html` | Checkout delivery/access step | cart, checkout payment |
| `Stich/checkout_payment_desktop/code.html` | `pages/checkout-payment.html` | Checkout payment/review step | delivery, order confirmation |
| `Stich/order_confirmation_desktop/code.html` | `pages/order-success.html` | Checkout success/confirmation | order tracking, marketplace |

## Added service placeholders

These minimal pages are not Stitch templates and are visibly marked `Screen is not designed yet`:

| New page | Reason | Nearest prepared screen |
|---|---|---|
| `pages/auth.html` | Authentication design is missing | Buyer account |
| `pages/admin-dashboard.html` | General admin dashboard is missing | Product moderation |
| `pages/seller-orders.html` | Seller order list is missing | Seller dashboard |
| `pages/storefront-settings.html` | Storefront editor/settings is missing | Public seller storefront |
| `pages/driver-routes.html` | Driver application screen is missing | Dispatcher route planning |

## Asset inventory

| Type | Found in extracted Stitch folders | Demo handling |
|---|---:|---|
| HTML | 34 | All 34 copied and normalized |
| PNG images | 34 | All 34 screen previews copied and used by Demo Navigator |
| Standalone CSS | 0 | Stitch styles remain inline; shared demo CSS added separately |
| Standalone JavaScript | 0 | Shared demo navigation/interaction scripts added separately |
| Local font files | 0 | Existing Google Fonts dependencies remain remote |
| Design markdown files | 6 | Used as design-system context; not deployable pages |
| ZIP archives | 4 | Recognized as source backups; not copied to deployable demo |

## Repeated and unclear pages

- Desktop/mobile pairs are responsive variants of the same workflow, retained as separate demo screens: marketplace home, catalog, product detail, cart, seller storefront, and order tracking.
- The four ZIP files repeat the extracted templates. Their copies are excluded to avoid redundant pages and assets.
- One archived `operations_command_center` file is an older 23,608-byte variant; the current extracted 21,855-byte template is used.
- No extracted HTML page lacks a meaningful title or content-based purpose. Generic source names such as `code.html` are disambiguated by their parent directory and renamed above.
