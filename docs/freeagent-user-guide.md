# JobPilot CRM — FreeAgent Integration User Guide

## Overview

JobPilot integrates with FreeAgent to help keep your accounting records up to date. The current integration supports connecting your FreeAgent account, syncing JobPilot expenses into FreeAgent, and reconciling paid JobPilot invoices against transactions already imported by your FreeAgent bank feed.

FreeAgent is connected from **Management → Accounting**.

## Connecting FreeAgent

1. Open JobPilot.
2. Select **Management** from the main navigation.
3. Open **Accounting**.
4. Select **Connect FreeAgent**.
5. JobPilot opens the secure FreeAgent authorisation flow.
6. Sign in to FreeAgent and approve the requested access.
7. Return to JobPilot.
8. The Accounting page will show **FreeAgent connected** and display the connected company name.

JobPilot uses OAuth to connect to FreeAgent. Your FreeAgent password is not stored by JobPilot.

## Checking your connection

Open **Management → Accounting**. A successful connection shows:

- **FreeAgent connected**
- The connected FreeAgent company name
- The FreeAgent connection button disabled while the account is connected

If FreeAgent is not connected, the page shows **Not connected** and provides the connection button.

## Expenses

JobPilot can send expenses recorded in JobPilot to FreeAgent.

When an expense is synced, JobPilot uses the FreeAgent expense categories available to the connected account. The expense amount, date, description, currency and VAT information are passed to FreeAgent where applicable.

An expense that has already been linked to a FreeAgent expense is not duplicated during a later sync.

### Expense category matching

For an expense to sync successfully, JobPilot needs to find a matching FreeAgent expense category. If a category cannot be matched, the expense is not created in FreeAgent and the error should identify the category that needs attention.

Choose an appropriate FreeAgent category when entering the expense in JobPilot.

## Customer payments and reconciliation

JobPilot can reconcile paid invoices against transactions already imported by your FreeAgent bank feed.

This process is deliberately designed **not to create a second bank transaction**. Instead, JobPilot finds the existing bank-feed transaction and creates a FreeAgent bank transaction explanation linked to the relevant invoice.

To reconcile payments:

1. Open **Management → Accounting**.
2. Scroll to **Customer Payments**.
3. Confirm that FreeAgent is connected.
4. Select **Sync Payments to FreeAgent**.
5. JobPilot checks the connected FreeAgent bank accounts for transactions matching paid JobPilot invoices.
6. Successfully matched payments are marked **Reconciled**.

JobPilot checks transactions within seven days before and after the invoice payment date and uses the invoice number, customer name and transaction date to help identify the correct transaction.

### Payment statuses

You may see:

- **Reconciled** — the payment has been successfully explained in FreeAgent.
- **Awaiting match** — more than one possible bank transaction was found, or no unique transaction was found.
- **Error** — the payment could not be reconciled because an error occurred.
- **FreeAgent invoice not linked** — the JobPilot invoice does not currently have a FreeAgent invoice link required for reconciliation.
- **Not reconciled** — the invoice has not yet been reconciled.

JobPilot will not automatically choose between multiple possible bank transactions.

## Bank feed requirement

Payment reconciliation relies on the relevant transaction already being available in a FreeAgent bank feed. JobPilot does not create a duplicate bank transaction for the payment.

If a payment is not appearing as available for reconciliation, check that:

- The relevant bank account is connected to FreeAgent.
- The transaction has reached FreeAgent.
- The transaction amount matches the JobPilot invoice.
- The transaction date is reasonably close to the invoice payment date.
- The invoice has a FreeAgent invoice link.

## Disconnecting FreeAgent

To disconnect or change the connected FreeAgent account, use the FreeAgent connection controls under **Management → Accounting**.

After disconnecting, JobPilot will no longer be able to perform FreeAgent synchronisation until a FreeAgent account is connected again.

## Security

JobPilot uses a secure OAuth connection with FreeAgent. Never share your FreeAgent password, OAuth credentials, access tokens or other private credentials with anyone claiming to provide support.

## Troubleshooting

### FreeAgent says “Not connected”

Open **Management → Accounting** and select **Connect FreeAgent**. Complete the FreeAgent authorisation process and return to JobPilot.

### FreeAgent connection fails

Make sure you complete the FreeAgent authorisation screen and approve the requested access. If the authorisation is cancelled or rejected, return to JobPilot and try again.

### An expense will not sync

Check the expense category. JobPilot must be able to match it to an available FreeAgent expense category. Also check that the expense amount is greater than zero.

### A payment is “Awaiting match”

This means JobPilot did not find exactly one suitable bank transaction. Check the FreeAgent bank feed and confirm the transaction is present, for the correct amount and close to the payment date.

### A payment is marked “Error”

Review the error shown in the Customer Payments section and correct the underlying issue before running the payment sync again.

### FreeAgent access has expired or changed

JobPilot can refresh an expiring FreeAgent access token when a refresh token is available. If the connection can no longer be refreshed, reconnect FreeAgent from **Management → Accounting**.

## Important notes

- JobPilot does not store your FreeAgent password.
- Payment reconciliation uses existing FreeAgent bank-feed transactions rather than creating duplicates.
- Multiple possible bank transactions are not automatically selected.
- FreeAgent remains the accounting system of record for the connected accounting data.

## Support

If you need help with the JobPilot FreeAgent integration, contact JobPilot support with the exact error message shown in JobPilot. Do not send passwords, access tokens or other private credentials.

---

**JobPilot CRM · FreeAgent integration user documentation · Version 1.0 · September 2026**
