import { supabase } from "../supabase.js";

const ADMIN_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";

async function getFunctionErrorMessage(error) {
  try {
    const context = error?.context;
    if (context?.json) {
      const body = await context.json();
      if (body?.error) return body.error;
    }
    if (context?.text) {
      const text = await context.text();
      try { const body = JSON.parse(text); if (body?.error) return body.error; } catch {}
      if (text) return text;
    }
  } catch {}
  return error?.message || "Unknown error";
}

function addDeleteAccountCard() {
  const content = document.getElementById("pageContent");
  if (!content || document.getElementById("deleteAccountCard")) return;
  const card = document.createElement("section");
  card.id = "deleteAccountCard";
  card.className = "panel";
  card.style.marginTop = "24px";
  card.innerHTML = `
    <div class="panel-header"><div><h2>Delete account</h2><p>Permanently delete your JobPilot account.</p></div></div>
    <p class="muted" style="margin:0 0 16px;">This permanently deletes your account and any companies you own, including their customers, jobs, invoices, quotes and other company data. This cannot be undone.</p>
    <button id="deleteOwnAccountButton" class="button danger" type="button">Delete my account</button>
  `;
  content.appendChild(card);

  const button = card.querySelector("#deleteOwnAccountButton");
  button.addEventListener("click", async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (user.id === ADMIN_ID) { alert("The JobPilot administrator account cannot be deleted."); return; }

    const first = window.confirm("Delete your JobPilot account and company data?\n\nThis permanently deletes every company you own and its customers, jobs, invoices, quotes and other company data. This cannot be undone.");
    if (!first) return;
    const typed = window.prompt("Type DELETE to permanently delete your account and company data.");
    if (typed !== "DELETE") return;

    button.disabled = true;
    button.textContent = "Deleting account...";
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error) {
      button.disabled = false;
      button.textContent = "Delete my account";
      alert(`Could not delete account: ${await getFunctionErrorMessage(error)}`);
      return;
    }
    if (!data?.success) {
      button.disabled = false;
      button.textContent = "Delete my account";
      alert(`Could not delete account: ${data?.error || "Unknown error"}`);
      return;
    }
    localStorage.removeItem("jobpilot_settings");
    await supabase.auth.signOut();
    window.location.reload();
  });
}

const observer = new MutationObserver(() => {
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle?.textContent?.trim() === "Settings") addDeleteAccountCard();
});
observer.observe(document.body, { childList: true, subtree: true });
