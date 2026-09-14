// Regional billing bridge. Routes billing requests through the current regional Stripe function
// and adds the selected JobPilot market to Stripe billing requests.
(function () {
  const originalFetch = window.fetch.bind(window);
  const allowed = new Set(["GB", "US", "AU", "NZ", "IE", "CA"]);
  const country = () => {
    const value = String(localStorage.getItem("jobpilot_selected_country") || "GB").toUpperCase();
    return allowed.has(value) ? value : "GB";
  };

  window.fetch = async function (input, init) {
    let url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("/functions/v1/stripe-billing-v1")) {
      url = url.replace("/functions/v1/stripe-billing-v1", "/functions/v1/stripe-billing-v2");
      if (typeof input === "string") input = url;
      else if (input?.url) input = new Request(url, input);
    }
    if (url.includes("/functions/v1/stripe-billing-v2") && init?.body) {
      try {
        const body = JSON.parse(init.body);
        body.country = country();
        init = { ...init, body: JSON.stringify(body) };
      } catch (_) {}
    }
    return originalFetch(input, init);
  };
})();
