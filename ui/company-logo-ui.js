import { supabase } from "../supabase.js";
import { uploadBusinessLogo, deleteBusinessLogo } from "../integrations/supabase/storage.js";

const waitForSettings = () => {
  const section = [...document.querySelectorAll(".settings-section > h2")]
    .find(h => h.textContent.trim() === "Business Details")?.closest(".settings-section");
  if (!section || section.querySelector(".settings-logo-block")) return !!section;
  const block = document.createElement("div");
  block.className = "settings-logo-block";
  block.innerHTML = `<p class="settings-logo-heading">Company Logo</p><div class="settings-logo-row"><div class="settings-logo-placeholder">No logo<br>uploaded</div><img class="settings-logo-preview" alt="Company logo preview"><div class="settings-logo-actions"><button type="button" class="secondary-button" id="settingsUploadLogo">Upload Logo</button><button type="button" class="secondary-button" id="settingsRemoveLogo" hidden>Remove Logo</button><p class="settings-logo-help">JPG, PNG, WebP, GIF or SVG · maximum 5 MB</p><p class="settings-logo-status" aria-live="polite"></p></div></div><input id="settingsLogoFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden>`;
  section.querySelector("h2").after(block);
  const input=block.querySelector("#settingsLogoFile"), upload=block.querySelector("#settingsUploadLogo"), remove=block.querySelector("#settingsRemoveLogo"), preview=block.querySelector(".settings-logo-preview"), placeholder=block.querySelector(".settings-logo-placeholder"), status=block.querySelector(".settings-logo-status");
  const show=url=>{preview.src=url;preview.style.display="block";placeholder.style.display="none";remove.hidden=false;};
  const user=async()=> (await supabase.auth.getUser()).data.user;
  upload.onclick=()=>input.click();
  input.onchange=async()=>{const file=input.files?.[0],u=await user();if(!file||!u)return;upload.disabled=remove.disabled=true;status.textContent="Uploading logo…";try{const url=await uploadBusinessLogo(file,u.id);const {error}=await supabase.from("user_settings").update({business_logo_url:url}).eq("user_id",u.id);if(error)throw error;show(url);status.textContent="Logo uploaded.";}catch(e){status.textContent=e.message||"Could not upload the logo.";}finally{upload.disabled=remove.disabled=false;input.value="";}};
  remove.onclick=async()=>{if(!confirm("Remove your company logo?"))return;const u=await user();if(!u)return;upload.disabled=remove.disabled=true;status.textContent="Removing logo…";try{const {data}=await supabase.from("user_settings").select("business_logo_url").eq("user_id",u.id).maybeSingle();await deleteBusinessLogo(u.id,data?.business_logo_url);const {error}=await supabase.from("user_settings").update({business_logo_url:null}).eq("user_id",u.id);if(error)throw error;preview.style.display="none";placeholder.style.display="grid";remove.hidden=true;status.textContent="Logo removed.";}catch(e){status.textContent=e.message||"Could not remove the logo.";}finally{upload.disabled=remove.disabled=false;}};
  user().then(u=>u&&supabase.from("user_settings").select("business_logo_url").eq("user_id",u.id).maybeSingle()).then(r=>r?.data?.business_logo_url&&show(r.data.business_logo_url));
  return true;
};
const observer=new MutationObserver(()=>{if(document.getElementById("pageTitle")?.textContent.trim()==="Settings")waitForSettings();});
observer.observe(document.body,{childList:true,subtree:true});
waitForSettings();