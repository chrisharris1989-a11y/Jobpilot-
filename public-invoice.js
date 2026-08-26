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


  // -------------------------------------------------
  // BUSINESS DETAILS
  // -------------------------------------------------

  const businessName =
    business?.business_name ||
    "Our Business";

  const contactName =
    business?.contact_name ||
    "";

  const businessPhone =
    business?.phone ||
    "";

  const businessEmail =
    business?.email ||
    "";

  const businessWebsite =
    business?.website ||
    "";

  const businessAddress =
    business?.address_line1 ||
    "";

  const businessCity =
    business?.city ||
    "";

  const businessPostcode =
    business?.postcode ||
    "";

  const businessLogo =
    business?.business_logo_url ||
    "";


  // -------------------------------------------------
  // PRIMARY COLOUR
  // -------------------------------------------------

  const primaryColour =
    business?.primary_colour ||
    "#2563eb";

  document.documentElement.style.setProperty(
    "--invoice-primary",
    primaryColour
  );


  // -------------------------------------------------
  // PAYMENT MESSAGE
  // -------------------------------------------------

  const paymentMessage =
    paymentStatus === "success"
      ? `
        <div class="invoice-message">
          Payment submitted successfully.
          Thank you.
        </div>
      `
      : "";


  // -------------------------------------------------
  // BUSINESS CONTACT DETAILS
  // -------------------------------------------------

  const businessContactDetails = [

    businessPhone
      ? `<div>${escapeHtml(businessPhone)}</div>`
      : "",

    businessEmail
      ? `<div>${escapeHtml(businessEmail)}</div>`
      : "",

    businessWebsite
      ? `
        <div>
          ${escapeHtml(businessWebsite)}
        </div>
      `
      : ""

  ].join("");


  // -------------------------------------------------
  // BUSINESS ADDRESS
  // -------------------------------------------------

  const businessAddressDetails = [

    businessAddress,
    businessCity,
    businessPostcode

  ]
    .filter(Boolean)
    .map(value =>
      escapeHtml(value)
    )
    .join("<br>");


  // -------------------------------------------------
  // CUSTOMER ADDRESS
  // -------------------------------------------------

  const customerAddress = [

    customer?.address_line1,
    customer?.city,
    customer?.postcode

  ]
    .filter(Boolean)
    .map(value =>
      escapeHtml(value)
    )
    .join("<br>");


  // -------------------------------------------------
  // INVOICE DATES
  // -------------------------------------------------

  const issueDate =
    invoice.issue_date ||
    "";

  const dueDate =
    invoice.due_date ||
    "";


  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------

  container.innerHTML = `

    <div
      class="invoice-card"
      style="
        border-top: 5px solid var(--invoice-primary);
      "
    >

      <!-- ========================================= -->
      <!-- BUSINESS HEADER -->
      <!-- ========================================= -->

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:25px;
          flex-wrap:wrap;
          margin-bottom:30px;
        "
      >

        <div>

          ${
            businessLogo
              ? `
                <img
                  src="${escapeHtml(
                    businessLogo
                  )}"
                  alt="${escapeHtml(
                    businessName
                  )}"
                  style="
                    max-width:180px;
                    max-height:80px;
                    object-fit:contain;
                    margin-bottom:12px;
                  "
                >
              `
              : ""
          }

          <h1
            style="
              margin:0;
              color:var(--invoice-primary);
              font-size:28px;
            "
          >
            ${escapeHtml(
              businessName
            )}
          </h1>

          ${
            contactName
              ? `
                <p
                  style="
                    margin:6px 0 0;
                    font-weight:600;
                  "
                >
                  ${escapeHtml(
                    contactName
                  )}
                </p>
              `
              : ""
          }

          ${
            businessAddressDetails
              ? `
                <p
                  style="
                    margin:12px 0 0;
                    line-height:1.5;
                  "
                >
                  ${businessAddressDetails}
                </p>
              `
              : ""
          }

          ${
            businessContactDetails
              ? `
                <p
                  style="
                    margin:12px 0 0;
                    line-height:1.5;
                  "
                >
                  ${businessContactDetails}
                </p>
              `
              : ""
          }

        </div>


        <!-- INVOICE INFORMATION -->

        <div
          style="
            text-align:right;
            min-width:180px;
          "
        >

          <div
            style="
              font-size:13px;
              text-transform:uppercase;
              letter-spacing:.08em;
              color:#697386;
              margin-bottom:5px;
            "
          >
            Invoice
          </div>

          <div
            style="
              font-size:22px;
              font-weight:700;
            "
          >
            #${escapeHtml(
              invoice.invoice_number || "—"
            )}
          </div>

          ${
            issueDate
              ? `
                <p
                  style="
                    margin:10px 0 0;
                  "
                >
                  <strong>
                    Date:
                  </strong>
                  ${escapeHtml(
                    issueDate
                  )}
                </p>
              `
              : ""
          }

          ${
            dueDate
              ? `
                <p
                  style="
                    margin:5px 0 0;
                  "
                >
                  <strong>
                    Due:
                  </strong>
                  ${escapeHtml(
                    dueDate
                  )}
                </p>
              `
              : ""
          }

        </div>

      </div>


      <hr>


      <!-- ========================================= -->
      <!-- BILL TO -->
      <!-- ========================================= -->

      <div
        style="
          margin:25px 0;
        "
      >

        <div
          style="
            font-size:13px;
            text-transform:uppercase;
            letter-spacing:.08em;
            color:#697386;
            margin-bottom:7px;
          "
        >
          Bill To
        </div>

        <div
          style="
            font-size:18px;
            font-weight:700;
          "
        >
          ${escapeHtml(
            customer?.name ||
            "Customer"
          )}
        </div>

        ${
          customerAddress
            ? `
              <div
                style="
                  margin-top:7px;
                  line-height:1.5;
                "
              >
                ${customerAddress}
              </div>
            `
            : ""
        }

        ${
          customer?.email
            ? `
              <div
                style="
                  margin-top:7px;
                "
              >
                ${escapeHtml(
                  customer.email
                )}
              </div>
            `
            : ""
        }

      </div>


      <!-- ========================================= -->
      <!-- DESCRIPTION -->
      <!-- ========================================= -->

      ${
        invoice.description
          ? `
            <div
              style="
                margin:25px 0;
              "
            >

              <h3>
                Description
              </h3>

              <p
                style="
                  line-height:1.6;
                  white-space:pre-line;
                "
              >
                ${escapeHtml(
                  invoice.description
                )}
              </p>

            </div>
          `
          : ""
      }


      <!-- ========================================= -->
      <!-- ITEMS -->
      <!-- ========================================= -->

      ${
        invoice.invoice_items?.length
          ? `

            <h3
              style="
                margin-top:30px;
              "
            >
              Work / Items
            </h3>

            <div
              style="
                margin-top:10px;
              "
            >

              ${
                invoice.invoice_items
                  .map(item => `

                    <div class="invoice-row">

                      <span>
                        ${escapeHtml(
                          item.description ||
                          ""
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

            </div>

          `
          : ""
      }


      <!-- ========================================= -->
      <!-- TOTALS -->
      <!-- ========================================= -->

      <div
        style="
          margin-top:20px;
        "
      >

        <div class="invoice-row">

          <span>
            Subtotal
          </span>

          <strong>
            ${money(
              invoice.subtotal
            )}
          </strong>

        </div>


        ${
          Number(invoice.vat || 0) > 0
            ? `
              <div class="invoice-row">

                <span>
                  VAT
                </span>

                <strong>
                  ${money(
                    invoice.vat
                  )}
                </strong>

              </div>
            `
            : ""
        }


        <div
          class="invoice-row"
          style="
            border-bottom:0;
            padding-top:20px;
          "
        >

          <strong
            style="
              font-size:20px;
            "
          >
            Total
          </strong>

          <strong
            class="invoice-total"
            style="
              color:var(--invoice-primary);
            "
          >
            ${money(
              invoice.total
            )}
          </strong>

        </div>

      </div>


      <!-- ========================================= -->
      <!-- PAYMENT -->
      <!-- ========================================= -->

      ${
        paid
          ? `
            <div
              class="invoice-message"
              style="
                margin-top:25px;
                padding:16px;
                border-radius:10px;
                background:#f0fdf4;
                color:#166534;
                font-weight:700;
              "
            >
              ✅ This invoice has been paid.
            </div>
          `
          : `
            <button
              id="payButton"
              class="pay-button"
              style="
                background:var(--invoice-primary);
              "
            >
              💳 Pay Online
            </button>
          `
      }


      <!-- ========================================= -->
      <!-- FOOTER / NOTES -->
      <!-- ========================================= -->

      ${
        business?.invoice_footer
          ? `
            <div
              style="
                margin-top:30px;
                padding-top:20px;
                border-top:1px solid #eee;
                line-height:1.6;
                white-space:pre-line;
                color:#697386;
              "
            >
              ${escapeHtml(
                business.invoice_footer
              )}
            </div>
          `
          : ""
      }


      ${paymentMessage}

    </div>

  `;


  // -------------------------------------------------
  // PAY BUTTON
  // -------------------------------------------------

  if (!paid) {

    const payButton =
      document.getElementById(
        "payButton"
      );

    if (payButton) {

      payButton.addEventListener(
        "click",
        createPayment
      );

    }

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
