import { supabase } from "../supabase.js";
import { uploadBusinessLogo, deleteBusinessLogo } from "../integrations/supabase/storage.js";

const style = document.createElement("style");
style.textContent = `
  .settings-logo-block {
    grid-column: 1 / -1;
    margin: 2px 0 14px;
    padding: 16px;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 10px;
    background: var(--surface-soft, #f8fafc);
  }
  .settings-logo-heading { margin: 0 0 10px; font-weight: 600; }
  .settings-logo-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .settings-logo-preview,
  .settings-logo-placeholder {
    width: 88px;
    height: 88px;
    border-radius: 10px;
    border: 1px solid var(--border, #e5e7eb);
    background: #fff;
    object-fit: contain;
    padding: 6px;
  }
  .settings-logo-preview { display: none; }
  .settings-logo-placeholder {
    display: grid;
    place-items: center;
    text-align: center;
    font-size: 12px;
    color: #64748b;
    padding: 0;
  }
  .settings-logo-actions { display: flex; flex-direction: column; gap: 6px; }
  .settings-logo-help, .settings-logo-status { margin: 0; font-size: 12px; color: #64748b; }
  .management-logo-block {
    grid-column: 1 / -1;
    margin: 0 0 20px;
    padding: 16px;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 10px;
    background: var(--surface-soft, #f8fafc);
  }
  .management-logo-heading { margin: 0 0 10px; font-weight: 600; }
  .management-logo-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .management-logo-preview,
  .management-logo-placeholder {
    width: 88px;
    height: 88px;
    border-radius: 10px;
    border: 1px solid var(--border, #e5e7eb);
    background: #fff;
    object-fit: contain;
    padding: 6px;
  }
  .management-logo-preview { display: none; }
  .management-logo-placeholder {
    display: grid;
    place-items: center;
    text-align: center;
    font-size: 12px;
    color: #64748b;
    padding: 0;
  }
  .management-logo-actions { display: flex; flex-direction: column; gap: 6px; }
  .management-logo-help, .management-logo-status { margin: 0; font-size: 12px; color: #64748b; }
`;
document.head.append(style);

async function getUser() {
  return (await supabase.auth.getUser()).data.user;
}

async function loadLogoUrl(userId) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("business_logo_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.business_logo_url || null;
}

function wireLogoBlock(block, prefix) {
  const input = block.querySelector(`#${prefix}LogoFile`);
  const upload = block.querySelector(`#${prefix}UploadLogo`);
  const remove = block.querySelector(`#${prefix}RemoveLogo`);
  const preview = block.querySelector(`.${prefix === "management" ? "management" : "settings"}-logo-preview`);
  const placeholder = block.querySelector(`.${prefix === "management" ? "management" : "settings"}-logo-placeholder`);
  const status = block.querySelector(`.${prefix === "management" ? "management" : "settings"}-logo-status`);

  const show = (url) => {
    preview.src = url;
    preview.style.display = "block";
    placeholder.style.display = "none";
    remove.hidden = false;
  };

  upload.onclick = () => input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    const user = await getUser();
    if (!file || !user) return;

    upload.disabled = true;
    remove.disabled = true;
    status.textContent = "Uploading logo…";
    let oldUrl = null;
    let newLogo = null;

    try {
      oldUrl = await loadLogoUrl(user.id);
      newLogo = await uploadBusinessLogo(file, user.id);
      const { error } = await supabase
        .from("user_settings")
        .update({ business_logo_url: newLogo.url })
        .eq("user_id", user.id);
      if (error) throw error;
      if (oldUrl) await deleteBusinessLogo(user.id, oldUrl);
      show(newLogo.url);
      status.textContent = "Logo uploaded.";
    } catch (error) {
      if (newLogo?.url && newLogo.url !== oldUrl) {
        await deleteBusinessLogo(user.id, newLogo.url).catch(() => {});
      }
      status.textContent = error.message || "Could not upload the logo.";
    } finally {
      upload.disabled = false;
      remove.disabled = false;
      input.value = "";
    }
  };

  remove.onclick = async () => {
    if (!confirm("Remove your company logo?")) return;
    const user = await getUser();
    if (!user) return;

    upload.disabled = true;
    remove.disabled = true;
    status.textContent = "Removing logo…";

    try {
      const oldUrl = await loadLogoUrl(user.id);
      await deleteBusinessLogo(user.id, oldUrl);
      const { error } = await supabase
        .from("user_settings")
        .update({ business_logo_url: null })
        .eq("user_id", user.id);
      if (error) throw error;
      preview.style.display = "none";
      placeholder.style.display = "grid";
      remove.hidden = true;
      status.textContent = "Logo removed.";
    } catch (error) {
      status.textContent = error.message || "Could not remove the logo.";
    } finally {
      upload.disabled = false;
      remove.disabled = false;
    }
  };

  getUser()
    .then(user => user ? loadLogoUrl(user.id) : null)
    .then(url => url && show(url))
    .catch(() => {});
}

const waitForSettings = () => {
  const section = [...document.querySelectorAll(".settings-section > h2")]
    .find(h => h.textContent.trim() === "Business Details")
    ?.closest(".settings-section");
  if (!section || section.querySelector(".settings-logo-block")) return;

  const block = document.createElement("div");
  block.className = "settings-logo-block";
  block.innerHTML = `
    <p class="settings-logo-heading">Company Logo</p>
    <div class="settings-logo-row">
      <div class="settings-logo-placeholder">No logo<br>uploaded</div>
      <img class="settings-logo-preview" alt="Company logo preview">
      <div class="settings-logo-actions">
        <button type="button" class="secondary-button" id="settingsUploadLogo">Upload Logo</button>
        <button type="button" class="secondary-button" id="settingsRemoveLogo" hidden>Remove Logo</button>
        <p class="settings-logo-help">JPG, PNG, WebP, GIF or SVG · maximum 5 MB</p>
        <p class="settings-logo-status" aria-live="polite"></p>
      </div>
    </div>
    <input id="settingsLogoFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden>
  `;
  section.querySelector("h2").after(block);
  wireLogoBlock(block, "settings");
};

const waitForManagementCompany = () => {
  if (document.getElementById("pageTitle")?.textContent.trim() !== "Company") return;

  const section = [...document.querySelectorAll(".management-company-settings .settings-section > h2")]
    .find(h => h.textContent.includes("Company Details"))
    ?.closest(".settings-section");
  if (!section || section.querySelector(".management-logo-block")) return;

  const block = document.createElement("div");
  block.className = "management-logo-block";
  block.innerHTML = `
    <p class="management-logo-heading">Company Logo</p>
    <div class="management-logo-row">
      <div class="management-logo-placeholder">No logo<br>uploaded</div>
      <img class="management-logo-preview" alt="Company logo preview">
      <div class="management-logo-actions">
        <button type="button" class="secondary-button" id="managementUploadLogo">Upload Logo</button>
        <button type="button" class="secondary-button" id="managementRemoveLogo" hidden>Remove Logo</button>
        <p class="management-logo-help">JPG, PNG, WebP, GIF or SVG · maximum 5 MB</p>
        <p class="management-logo-status" aria-live="polite"></p>
      </div>
    </div>
    <input id="managementLogoFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden>
  `;
  section.querySelector("h2").after(block);
  wireLogoBlock(block, "management");
};

const observer = new MutationObserver(() => {
  waitForSettings();
  waitForManagementCompany();
});

observer.observe(document.body, { childList: true, subtree: true });
waitForSettings();
waitForManagementCompany();