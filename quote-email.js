import { supabase } from "./supabase.js";

const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
}[char]));

function modal(body, id = "jobpilot-quote-forms-modal") {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = id;
  el.className = "modal show";
  el.innerHTML = `<div class="modal-content" style="max-width:760px;width:94vw">${body}</div>`;
  document.body.appendChild(el);
  el.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => el.remove()));
  return el;
}

async function getQuoteFromCurrentPage() {
  const title = document.getElementById("pageTitle")?.textContent || "";
  const quoteNumber = title.replace(/^Quote #/i, "").trim();
  if (!quoteNumber) throw new Error("The quote could not be identified.");

  const { data: quote, error } = await supabase
    .from("quotes").select("*").eq("quote_number", quoteNumber).maybeSingle();
  if (error) throw error;
  if (!quote) throw new Error("Quote could not be found.");

  const { data: customer, error: customerError } = await supabase
    .from("customers").select("id,name,email").eq("id", quote.customer_id).maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw new Error("The customer attached to this quote could not be found.");

  return { quote, customer };
}

async function generatePdf(quoteId) {
  if (typeof window.__jobpilotGenerateQuotePdf !== "function") {
    throw new Error("The quote PDF system is not available. Please refresh JobPilot and try again.");
  }
  await window.__jobpilotGenerateQuotePdf(quoteId);
}

async function previewPdf(quoteId) {
  if (typeof window.__jobpilotPreviewQuotePdf !== "function") {
    throw new Error("The in-app PDF viewer is not available. Please refresh JobPilot and try again.");
  }
  await window.__jobpilotPreviewQuotePdf(() => window.__jobpilotGenerateQuotePdf(quoteId));
}

function businessName() {
  try {
    return JSON.parse(localStorage.getItem("jobpilot_settings") || "{}").businessName || "our business";
  } catch {
    return "our business";
  }
}

async function openEmailQuote() {
  const { quote, customer } = await getQuoteFromCurrentPage();
  if (String(quote.status).toLowerCase() === "converted") {
    alert("This quote has already been converted to a job.");
    return;
  }

  const name = businessName();
  const total = `£${Number(quote.total || 0).toFixed(2)}`;
  const defaultMessage = `Hi ${customer.name},\n\nPlease find attached your quotation from ${name}.\n\nQuote #${quote.quote_number || "—"}\nDescription: ${quote.title || quote.description || "Quotation"}\nTotal: ${total}\n${quote.valid_until ? `Valid until: ${quote.valid_until}\n\n` : "\n"}Please let us know if you have any questions or would like to go ahead.\n\nKind regards,\n${name}`;

  const m = modal(`
    <div class="modal-header"><div><h2>Email Quote</h2><p>Prepare the customer email from the quote Forms workflow.</p></div><button class="close" type="button">×</button></div>
    <form id="jobpilotEmailQuoteForm">
      <label>To</label><input id="jobpilotEmailTo" type="email" required value="${esc(customer.email || "")}" placeholder="customer@example.com">
      <label>Subject</label><input id="jobpilotEmailSubject" required value="${esc(`Quotation ${quote.quote_number || ""} from ${name}`)}">
      <label>Message</label><textarea id="jobpilotEmailMessage" rows="12" required>${esc(defaultMessage)}</textarea>
      <p class="muted" style="margin-top:10px">JobPilot will prepare the latest PDF first, then open your email application. The PDF can be attached from your device.</p>
      <div id="jobpilotEmailQuoteMessage" class="muted" style="margin-top:10px"></div>
      <div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Generate PDF & Open Email</button></div>
    </form>`);

  m.querySelector("#jobpilotEmailQuoteForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = m.querySelector("button[type=submit]");
    const message = m.querySelector("#jobpilotEmailQuoteMessage");
    const to = m.querySelector("#jobpilotEmailTo").value.trim();
    const subject = m.querySelector("#jobpilotEmailSubject").value.trim();
    const body = m.querySelector("#jobpilotEmailMessage").value.trim();
    if (!to) { message.textContent = "Enter the customer's email address."; return; }
    button.disabled = true;
    button.textContent = "Preparing PDF…";
    message.textContent = "Generating the latest quote PDF…";
    try {
      await generatePdf(quote.id);
      await supabase.from("quotes").update({ status: "sent" }).eq("id", quote.id).neq("status", "converted");
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      m.remove();
    } catch (error) {
      console.error("JobPilot email quote:", error);
      message.textContent = error.message || "The quote email could not be prepared.";
      button.disabled = false;
      button.textContent = "Generate PDF & Open Email";
    }
  });
}

async function openForms() {
  const { quote, customer } = await getQuoteFromCurrentPage();
  const templateName = quote.details?.templateId ? "Selected custom quote template" : "Standard JobPilot quote template";
  const m = modal(`
    <div class="modal-header"><div><h2>Quote Forms</h2><p>Preview, email or download this quote from one place.</p></div><button class="close" type="button">×</button></div>
    <div style="border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:16px;margin-bottom:14px">
      <strong>Quote ${esc(quote.quote_number || "")}</strong>
      <div class="muted" style="margin-top:4px">${esc(customer.name || "Customer")} · ${esc(templateName)}</div>
    </div>
    <div style="display:grid;gap:10px">
      <button id="jpFormsView" type="button" class="button primary">View PDF</button>
      <button id="jpFormsEmail" type="button" class="button secondary">Email Quote</button>
      <button id="jpFormsDownload" type="button" class="button secondary">Download PDF</button>
    </div>
    <p class="muted" style="margin-top:14px">This follows the Simpro-style Forms workflow: choose the form, preview it, then email or download it.</p>`);

  const run = async (button, action) => {
    button.disabled = true;
    const old = button.textContent;
    button.textContent = "Preparing…";
    try { await action(); } catch (error) { console.error(error); alert(error.message || "The quote form could not be prepared."); }
    finally { button.disabled = false; button.textContent = old; }
  };

  m.querySelector("#jpFormsView").onclick = () => run(m.querySelector("#jpFormsView"), async () => {
    await previewPdf(quote.id);
  });
  m.querySelector("#jpFormsDownload").onclick = () => run(m.querySelector("#jpFormsDownload"), async () => {
    const viewer = window.__jobpilotQuotePdfViewerMode;
    window.__jobpilotQuotePdfViewerMode = "download";
    try { await generatePdf(quote.id); } finally { window.__jobpilotQuotePdfViewerMode = viewer; }
  });
  m.querySelector("#jpFormsEmail").onclick = async () => { m.remove(); await openEmailQuote(); };
}

function installFormsButton() {
  const deleteButton = document.getElementById("deleteQuote");
  if (!deleteButton?.parentElement) return;
  if (document.getElementById("jobpilotQuoteFormsButton")) return;

  const button = document.createElement("button");
  button.id = "jobpilotQuoteFormsButton";
  button.type = "button";
  button.className = "button primary";
  button.textContent = "📄 Forms";
  button.addEventListener("click", async event => {
    event.stopPropagation();
    button.disabled = true;
    try { await openForms(); } catch (error) { console.error(error); alert(error.message || "Quote Forms could not be opened."); }
    finally { button.disabled = false; }
  });
  deleteButton.parentElement.insertBefore(button, deleteButton);
}

function renameGenerateButton() {
  const button = document.querySelector(".jpq2-pdf");
  if (!button) return;
  button.textContent = "📄 View PDF";
  button.title = "Preview the quote PDF inside JobPilot";
}

const observer = new MutationObserver(() => {
  installFormsButton();
  renameGenerateButton();
});
observer.observe(document.body, { childList: true, subtree: true });
installFormsButton();
renameGenerateButton();
