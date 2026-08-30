// =====================================================
// JOBPILOT STRIPE PAYMENTS
// =====================================================

window.createInvoiceCheckout = async function (supabase, invoiceId) {

  const button =
    document.getElementById("payOnlineButton");

  try {

    if (button) {
      button.disabled = true;
      button.textContent = "Creating payment...";
    }

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session) {
      throw new Error("You are not logged in.");
    }

    const response = await fetch(
      "https://ncitqqhxaxjhepfsnltk.supabase.co/functions/v1/stripe-checkout-v1",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${session.access_token}`
        },

        body: JSON.stringify({
          invoice_id: String(invoiceId),
          origin: window.location.origin
        })
      }
    );

    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `Stripe server returned an invalid response (${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Could not create Stripe payment (${response.status}).`
      );
    }

    if (!result.url) {
      throw new Error(
        "Stripe did not return a checkout URL."
      );
    }

    window.location.assign(result.url);

  } catch (error) {

    console.error(
      "JobPilot Stripe checkout error:",
      error
    );

    alert(
      "Could not create payment:\n\n" +
      (error.message || String(error))
    );

    if (button) {
      button.disabled = false;
      button.textContent = "💳 Pay Online";
    }
  }
};
