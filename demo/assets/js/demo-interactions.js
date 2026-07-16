(() => {
  "use strict";

  const slug = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");
  const isMobile = slug.endsWith("-mobile");
  const pageUrl = (name, suffix = "") => window.demoUrl(name, suffix);
  let toastTimer;

  function notify(message) {
    let toast = document.querySelector(".demo-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "demo-toast";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function targetFor(text) {
    const value = text.replace(/\s+/g, " ").trim().toLowerCase();
    const mobileSuffix = isMobile ? "-mobile" : "-desktop";

    if (/proceed to checkout|return to checkout/.test(value)) return "checkout-delivery";
    if (/continue to payment/.test(value)) return "checkout-payment";
    if (/review order|place order|confirm purchase/.test(value)) return "order-success";
    if (/continue shopping/.test(value)) return "marketplace-home-desktop";
    if (/view order details|view tracking/.test(value)) return `order-tracking${mobileSuffix}`;
    if (/back to orders/.test(value)) return "buyer-orders";
    if (/secure purchase|add to cart|add to collection|buy now/.test(value)) return `cart${mobileSuffix}`;
    if (/visit storefront|view storefront/.test(value)) return `seller-storefront${mobileSuffix}`;
    if (/go to inventory|view in inventory|products/.test(value) && slug.startsWith("seller-")) return "seller-products";
    if (/edit product/.test(value)) return "seller-product-edit";
    if (/import another file/.test(value)) return "seller-import-upload";
    if (/continue/.test(value) && slug === "seller-import-upload") return "seller-import-validation";
    if (/proceed to import/.test(value)) return "seller-import-results";
    if (/orders/.test(value) && slug.startsWith("seller-")) return "seller-orders";
    if (/storefront|settings/.test(value) && slug.startsWith("seller-")) return "storefront-settings";
    if (/overview|dashboard/.test(value) && slug.startsWith("seller-")) return "seller-dashboard";
    if (/audit log/.test(value)) return "admin-audit-log";
    if (/payouts/.test(value)) return "admin-payouts";
    if (/sellers/.test(value) && slug.startsWith("admin-")) return "admin-seller-review";
    if (/products/.test(value) && slug.startsWith("admin-")) return "admin-moderation";
    if (/overview|dashboard/.test(value) && slug.startsWith("admin-")) return "admin-dashboard";
    if (/quote requests/.test(value)) return "logistics-quotes";
    if (/incidents/.test(value)) return "logistics-incidents";
    if (/drivers/.test(value)) return "driver-routes";
    if (/routes/.test(value)) return "logistics-routes";
    if (/operations|logistics/.test(value) && slug.startsWith("logistics-")) return "logistics-command-center";
    if (/orders/.test(value) && /buyer|order-/.test(slug)) return "buyer-orders";
    if (/overview|account|profile|person/.test(value) && !slug.startsWith("seller-") && !slug.startsWith("admin-")) return "buyer-account";
    if (/shopping_bag|shopping bag|your cart|cart/.test(value)) return `cart${mobileSuffix}`;
    if (/established lines/.test(value) && !slug.startsWith("seller-")) return `seller-storefront${mobileSuffix}`;
    if (/finn juhl|chieftain chair|danish teak lounge|brass arch lamp|brutalist oak table|untitled composition/.test(value)) return `product${mobileSuffix}`;
    if (/shop new arrivals|shop the collection|explore collection|view all|category|furniture|seating|tables|lighting|objets d'art/.test(value)) return `catalog${mobileSuffix}`;
    if (/marketplace|the guild|^home$/.test(value)) return `marketplace-home${mobileSuffix}`;
    return null;
  }

  function enhanceLinks() {
    document.querySelectorAll("a, button").forEach((control) => {
      if (control.closest(".demo-toolbar")) return;
      const target = targetFor(control.textContent || control.getAttribute("aria-label") || "");
      if (!target) return;
      control.dataset.demoTarget = target;
      if (control.tagName === "A") control.href = pageUrl(target);
    });

    if (slug.startsWith("catalog-")) {
      document.querySelectorAll("article.cursor-pointer").forEach((card) => {
        card.dataset.demoTarget = `product${isMobile ? "-mobile" : "-desktop"}`;
        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `Open product: ${(card.textContent || "product").replace(/\s+/g, " ").trim()}`);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") location.href = pageUrl(card.dataset.demoTarget);
        });
      });
    }
  }

  function toggleMobileMenu() {
    const existing = document.querySelector(".demo-mobile-menu");
    if (existing) {
      existing.remove();
      return;
    }
    const menu = document.createElement("aside");
    menu.className = "demo-mobile-menu";
    menu.innerHTML = `
      <a href="${pageUrl("marketplace-home-mobile")}">Marketplace</a>
      <a href="${pageUrl("catalog-mobile", "?category=all")}">Shop / Catalog</a>
      <a href="${pageUrl("seller-storefront-mobile")}">Seller Storefront</a>
      <a href="${pageUrl("buyer-account")}">Account</a>
      <a href="${pageUrl("cart-mobile")}">Cart</a>`;
    document.body.append(menu);
  }

  document.addEventListener("submit", (event) => {
    event.preventDefault();
    notify("Demo form submitted successfully — no data was sent.");
  });

  document.addEventListener("click", (event) => {
    const control = event.target.closest("a, button, [data-demo-target]");
    if (!control || control.closest(".demo-toolbar")) return;
    const text = (control.textContent || control.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();

    if (/^menu$/i.test(text)) {
      event.preventDefault();
      toggleMobileMenu();
      return;
    }

    if (/inquire|make an offer|contact seller|contact support|contact concierge|report issue|report an issue/i.test(text)) {
      event.preventDefault();
      notify("Demo action recorded. This workflow is not connected to a backend.");
      return;
    }

    if (/^(add|remove|delete|close)$/i.test(text)) {
      event.preventDefault();
      const count = Math.max(0, Number(sessionStorage.getItem("demoCartCount") || 2) + (/add/i.test(text) ? 1 : -1));
      sessionStorage.setItem("demoCartCount", String(count));
      notify(`Demo cart now contains ${count} item${count === 1 ? "" : "s"}.`);
      return;
    }

    const target = control.dataset.demoTarget || targetFor(text);
    if (target && control.tagName !== "A") {
      event.preventDefault();
      location.href = pageUrl(target);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    enhanceLinks();
    document.querySelectorAll("[data-alt][style*='background-image']").forEach((image, index, images) => {
      if (images.length < 2 || !slug.includes("product")) return;
      image.style.cursor = "pointer";
      image.addEventListener("click", () => {
        const first = images[0];
        const background = first.style.backgroundImage;
        first.style.backgroundImage = image.style.backgroundImage;
        image.style.backgroundImage = background;
        notify("Gallery image changed (demo). ");
      });
    });
  }, { once: true });
})();
