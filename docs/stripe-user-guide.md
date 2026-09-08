# JobPilot Stripe Integration User Guide

## 1. Overview

JobPilot integrates with Stripe to let you accept online card payments from customers directly from your invoice workflow.

Stripe is connected from **Management → Accounting**. Once connected, Stripe can be used when sending an invoice.

JobPilot sends customers to a secure Stripe-hosted checkout page to complete their card payment.

## 2. Connecting Stripe

1. Open JobPilot and select **Management** from the main navigation.
2. Open **Accounting**.
3. Find the **Stripe** section.
4. Select **Connect Stripe**.
5. JobPilot opens the Stripe connection/onboarding flow.
6. Sign in to your Stripe account or complete the requested Stripe business details.
7. Complete any verification or account setup requested by Stripe.
8. Return to JobPilot when the Stripe connection flow is complete.
9. JobPilot will show the Stripe connection status and account information.

JobPilot uses Stripe's secure connection flow. Your Stripe password should never be entered into JobPilot.

## 3. Stripe account setup

Stripe may require additional business, identity or banking information before your account can accept live payments.

If JobPilot shows **Stripe setup incomplete**, follow the Stripe onboarding steps and complete any outstanding requirements. Payments may not be available until Stripe enables the required account capabilities.

## 4. Checking your Stripe connection

Open **Management → Accounting** and view the Stripe section.

A successful connection is shown as **Stripe connected** together with the connected Stripe account information.

If the account is connected but setup is incomplete, JobPilot will show a warning and prompt you to complete the Stripe setup.

## 5. Sending an invoice with Stripe payment

1. Create or open an invoice in JobPilot.
2. Select **Send Invoice**.
3. Choose **Stripe** as the payment method.
4. JobPilot creates a secure Stripe checkout session for the invoice.
5. JobPilot provides the customer with the Stripe payment link as part of the invoice email workflow.
6. The customer opens the link and completes payment on Stripe's secure checkout page.

The invoice amount is taken from the JobPilot invoice, so check the invoice total before sending it to the customer.

## 6. Customer payment experience

The customer completes their payment on Stripe's hosted checkout page rather than entering card details into a JobPilot-built payment form.

The exact payment options displayed to the customer are controlled by Stripe and can depend on the connected Stripe account, payment configuration, customer location and Stripe's availability for the transaction.

## 7. Payment links and invoices

Stripe payment checkout is created from the specific JobPilot invoice. This means the payment request is associated with that invoice rather than being a generic payment link.

If an invoice cannot generate a Stripe payment link, check that:

- The Stripe account is connected.
- Stripe setup is complete.
- The invoice has a valid customer.
- The invoice has an amount greater than zero.
- The invoice is still outstanding.

## 8. Disconnecting Stripe

Stripe connection controls are available in **Management → Accounting**.

If Stripe is connected, JobPilot provides a **Disconnect Stripe** option.

Disconnecting Stripe from JobPilot does not delete your Stripe account. It removes the connection between that Stripe account and JobPilot.

If you later reconnect Stripe, complete the secure Stripe connection flow again.

## 9. Security

JobPilot uses Stripe's secure connection and hosted checkout flows for Stripe payments.

Customers enter their card details on Stripe's checkout experience rather than into a JobPilot card-payment form.

Never share your Stripe password, secret API keys or other Stripe credentials with anyone claiming to need them for JobPilot.

## 10. Troubleshooting

**Stripe is not showing as connected:** Open **Management → Accounting** and check the Stripe status.

**Stripe says setup is incomplete:** Complete the outstanding Stripe onboarding or verification requirements.

**The Stripe payment option is not working:** Confirm that Stripe is connected, the account is enabled for live payments, and the invoice has a valid outstanding amount.

**A payment link cannot be created:** Check the invoice customer details and invoice amount, then try again.

**The customer cannot complete payment:** Ask the customer to retry the Stripe checkout link. If Stripe displays a payment or verification message, follow the instructions shown by Stripe.

**You need to change the connected Stripe account:** Disconnect Stripe from **Management → Accounting**, then reconnect the required Stripe account using the secure connection flow.

## 11. Support

For JobPilot product support, use the support channel provided with your JobPilot account.

For Stripe account verification, payment-method availability, account restrictions or Stripe-specific payment issues, use Stripe support or the support options available in your Stripe account.

---

**JobPilot CRM · Stripe integration user documentation · Version 1.0 · September 2026**
