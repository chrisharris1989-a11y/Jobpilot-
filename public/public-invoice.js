const FUNCTION_URL =
  "https://qxoynttvipducubmczwl.supabase.co/functions/v1/public-invoice-v1";

const params =
  new URLSearchParams(window.location.search);

const token =
  params.get("token");

const paymentStatus =
  params.get("payment");

const container =
  document.getElementById(
    "invoiceContainer"
  );

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

function money(value) {

  return `£${Number(value || 0).toFixed(2)}`;

}

async function loadInvoice() {

  if (!token) {

    container.innerHTML = `
      <div class="invoice-card">
        <h2>Invalid invoice link</h2>
        <p>
          This invoice link is missing or invalid.
        </p>
      </div>
    `;

    return;
  }

  try {

    const response =
      await fetch(
        `${FUNCTION_URL}?token=${encodeURIComponent(token)}`
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.error ||
        "Could not load invoice."
      );

    }

    renderInvoice(
      result.invoice,
      result.customer,
      result.business
    );

  } catch (error) {

    container.innerHTML = `
      <div class="invoice-card">
        <h2>Unable to load invoice</h2>
        <p>
          ${escapeHtml(error.message)}
        </p>
      </div>
    `;

  }

}

function renderInvoice(
  invoice,
  customer,
  business
) {

  const paid =
    invoice.status === "paid";

  const paymentMessage =
    paymentStatus === "success"
      ? `
        <div class="invoice-message">
          Payment submitted successfully.
          Thank you.
        </div>
      `
      : "";

  container.innerHTML = `

    <div class="invoice-card">

      <div class="invoice-header">

        <div>

          <h1>
            ${escapeHtml(
              business?.business_name ||
              "Invoice"
            )}
          </h1>

          ${
            business?.contact_name
              ? `
                <p>
                  ${escapeHtml(
                    business.contact_name
                  )}
                </p>
              `
              : ""
          }

        </div>

        <div>

          <strong>
            Invoice #${escapeHtml(
              invoice.invoice_number || "—"
            )}
          </strong>

          <p>
            ${invoice.issue_date || ""}
          </p>

        </div>

      </div>

      <hr>

      <h3>
        Bill To
      </h3>

      <p>
        <strong>
          ${escapeHtml(
            customer?.name ||
            "Customer"
          )}
        </strong>
      </p>

      ${
        customer?.address_line1
          ? `
            <p>
              ${escapeHtml(
                customer.address_line1
              )}
              <br>
              ${escapeHtml(
                [
                  customer.city,
                  customer.postcode
                ]
                  .filter(Boolean)
                  .join(", ")
              )}
            </p>
          `
          : ""
      }

      ${
        invoice.description
          ? `
            <h3>
              Description
            </h3>

            <p>
              ${escapeHtml(
                invoice.description
              )}
            </p>
          `
          : ""
      }

      ${
        invoice.invoice_items?.length
          ? `
            <h3>
              Items
            </h3>

            ${
              invoice.invoice_items
                .map(item => `
                  <div class="invoice-row">

                    <span>
                      ${escapeHtml(
                        item.description
                      )}
                    </span>

                    <strong>
                      ${money(
                        item.total
                      )}
                    </strong>

                  </div>
                `)
                .join("")
            }
          `
          : ""
      }

      <div class="invoice-row">

        <span>
          Subtotal
        </span>

        <strong>
          ${money(invoice.subtotal)}
        </strong>

      </div>

      <div class="invoice-row">

        <span>
          VAT
        </span>

        <strong>
          ${money(invoice.vat)}
        </strong>

      </div>

      <div class="invoice-row">

        <strong>
          Total
        </strong>

        <strong class="invoice-total">
          ${money(invoice.total)}
        </strong>

      </div>

      ${
        paid
          ? `
            <div class="invoice-message">
              ✅ This invoice has been paid.
            </div>
          `
          : `
            <button
              id="payButton"
              class="pay-button"
            >
              💳 Pay Online
            </button>
          `
      }

      ${paymentMessage}

    </div>
  `;

  if (!paid) {

    document
      .getElementById("payButton")
      .addEventListener(
        "click",
        createPayment
      );

  }

}

async function createPayment() {

  const button =
    document.getElementById(
      "payButton"
    );

  button.disabled = true;

  button.textContent =
    "Creating secure payment...";

  try {

    const response =
      await fetch(
        FUNCTION_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            token,
            origin:
              window.location.origin
          })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.error ||
        "Could not create payment."
      );

    }

    if (!result.url) {

      throw new Error(
        "Stripe did not return a payment URL."
      );

    }

    window.location.href =
      result.url;

  } catch (error) {

    alert(
      "Could not create payment:\n\n" +
      error.message
    );

    button.disabled = false;

    button.textContent =
      "💳 Pay Online";

  }

}

loadInvoice();
