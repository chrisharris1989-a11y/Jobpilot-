// =====================================================
// JOBPILOT STRIPE PAYMENTS
// =====================================================

window.createInvoiceCheckout = async function (supabase, invoiceId) {

  try {

    const button =
      document.getElementById("payOnlineButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Creating payment...";
    }

    const {
      data: {
        session
      },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("You are not logged in.");
    }

    const response =
      await fetch(
        "https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-checkout-v1",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization":
              `Bearer ${session.access_token}`
          },

          body: JSON.stringify({
            invoice_id: invoiceId,
            origin: window.location.origin
          })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not create Stripe payment."
      );
    }

    if (!result.url) {
      throw new Error(
        "Stripe did not return a checkout URL."
      );
    }

    window.location.href = result.url;

  } catch (error) {

    console.error(
      "Stripe checkout error:",
      error
    );

    alert(
      error.message ||
      "Could not connect to Stripe."
    );

    const button =
      document.getElementById("payOnlineButton");

    if (button) {
      button.disabled = false;
      button.textContent = "💳 Pay Online";
    }
  }
};
