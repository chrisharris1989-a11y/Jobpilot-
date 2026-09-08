# JobPilot – GoCardless Integration User Guide

**Version 1.0 — September 2026**

## 1. Overview

JobPilot integrates with GoCardless to allow businesses to collect customer payments as part of their normal invoicing workflow.

GoCardless is connected from **Settings → Management & Accounting → Connections**. Once connected, GoCardless can be selected when sending an invoice.

JobPilot uses GoCardless-hosted payment and mandate pages. Customers enter their bank details directly with GoCardless rather than into JobPilot.

## 2. Connecting GoCardless

1. Open JobPilot and go to **Settings**.
2. Open **Management & Accounting → Connections**.
3. Select **Connect GoCardless**.
4. JobPilot opens the secure GoCardless authorisation flow.
5. Sign in to an existing GoCardless account or create a new account.
6. Authorise JobPilot to access the GoCardless account.
7. You are returned to JobPilot.
8. JobPilot displays the connection status and the connected GoCardless organisation.

JobPilot uses OAuth for authorisation. Your GoCardless password is never entered into JobPilot.

## 3. Account verification

GoCardless may require the connected business to complete account verification before payments can be processed or paid out.

If GoCardless requests additional information or verification, complete those steps through the GoCardless account before processing live payments.

## 4. Taking a payment from an invoice

1. Create or open an invoice in JobPilot.
2. Select **Send Invoice**.
3. Select **GoCardless** as the payment method.
4. JobPilot creates a GoCardless payment request for the invoice.
5. JobPilot generates a secure GoCardless payment link.
6. Send the payment link to the customer by email.
7. The customer follows the link and completes the payment through the GoCardless-hosted payment experience.
8. GoCardless sends payment events back to JobPilot.
9. JobPilot updates the payment and invoice status as the payment progresses.

## 5. Direct Debit and customer bank details

JobPilot does not collect or store the customer's bank account details itself.

Customer bank details are entered through GoCardless's hosted payment and mandate experience. This keeps sensitive bank information within the GoCardless flow.

Where supported, JobPilot can pre-fill available customer information such as name and contact details into the GoCardless flow.

## 6. Payment status and reconciliation

JobPilot receives GoCardless webhook events and uses them to keep payment information synchronised.

The current payment status is displayed against the relevant invoice. When GoCardless confirms a payment, JobPilot marks the corresponding invoice as **Paid** and records the payment confirmation.

Mandate status is also displayed in the customer's Direct Debit information where available.

If a payment fails or another payment exception occurs, JobPilot does not incorrectly mark the invoice as paid.

## 7. Refunds

Where refunds have been enabled for the connected GoCardless account, a paid GoCardless invoice can be refunded from the JobPilot invoice workflow.

To issue a refund:

1. Open the relevant paid invoice.
2. Select **Refund**.
3. Enter the refund amount.
4. Enter a reason if required.
5. Confirm the refund.

JobPilot sends the refund request to GoCardless against the original payment. JobPilot records the GoCardless refund ID and status.

Partial refunds are supported. A further refund can only be made for the remaining refundable amount.

GoCardless may apply timing, safety and account-level restrictions to refunds. Refund availability is controlled by GoCardless and may need to be enabled for the connected account.

## 8. Disconnecting or changing the GoCardless account

GoCardless connection controls are available in **Settings → Management & Accounting → Connections**.

If the connected GoCardless organisation needs to be changed, use the supported GoCardless connection flow rather than sharing credentials manually.

Never share a GoCardless password or access token with JobPilot support.

## 9. Security

JobPilot uses OAuth to authorise access to the connected GoCardless account.

Access credentials are handled by JobPilot's secure backend integration and are not exposed to customers.

Payment and mandate updates are received through authenticated GoCardless webhook requests.

Customers enter bank details through GoCardless-hosted pages rather than through a JobPilot-built bank-detail form.

## 10. Troubleshooting

### GoCardless is not showing as connected

Go to **Settings → Management & Accounting → Connections** and check the GoCardless connection status.

### A payment link cannot be created

Check that GoCardless is connected and that the invoice has a valid customer contact email.

### A customer has paid but the invoice has not updated

GoCardless payment events are processed by JobPilot automatically. Refresh the invoice after allowing time for the payment event to be received and processed.

### Refund is unavailable

Confirm that:

- the original invoice is marked as paid;
- the payment was collected through GoCardless;
- the invoice has a linked GoCardless payment; and
- refunds are enabled for the connected GoCardless account.

### GoCardless requests verification

Follow the verification instructions provided by GoCardless.

## 11. Support

For JobPilot product support, use the support channel provided with your JobPilot account.

For GoCardless account verification, payment processing, refund enablement or account-level restrictions, contact GoCardless support or your GoCardless account contact.

---

**JobPilot**  
GoCardless integration user documentation