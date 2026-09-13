import { supabase } from "../supabase.js";
import { getJobPilotTaxProfile, getJobPilotTaxContext } from "../regional-tax.js";

const SECTION_ID="jp-regional-tax-section";
const SETTINGS_KEY="jobpilot_settings";

function addStyles(){
  if(document.getElementById("jp-regional-tax-styles")) return;
  const style=document.createElement("style");
  style.id="jp-regional-tax-styles";
  style.textContent=`#${SECTION_ID} .jp-tax-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}#${SECTION_ID} .jp-tax-field{display:flex;flex-direction:column;gap:6px}#${SECTION_ID} .jp-tax-field label{font-size:13px;font-weight:600}#${SECTION_ID} .jp-tax-field input,#${SECTION_ID} .jp-tax-field select{border:1px solid rgba(0,0,0,.16);border-radius:8px;padding:9px 10px;background:var(--card-bg,#fff);color:inherit;font:inherit}#${SECTION_ID} .jp-tax-help{font-size:12px;opacity:.65;line-height:1.4}#${SECTION_ID} .jp-tax-toggle{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px}@media(max-width:700px){#${SECTION_ID} .jp-tax-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

function syncLegacySettings(payload){
  try{
    const current=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");
    localStorage.setItem(SETTINGS_KEY,JSON.stringify({...current,vatRate:payload.tax_rate,taxRate:payload.tax_rate,taxLabel:payload.tax_label,taxSystem:payload.tax_system,taxEnabled:payload.tax_enabled}));
  }catch{}
}

async function loadSettings(){
  const {data:{user}={}}=await supabase.auth.getUser();
  if(!user) return {user:null,settings:{}};
  const {data,error}=await supabase.from("user_settings").select("country_code,tax_system,tax_label,tax_rate,tax_enabled,tax_registration_label,tax_registration_number,default_vat_rate").eq("user_id",user.id).maybeSingle();
  if(error) throw error;
  return {user,settings:data||{}};
}

// Migrate legacy UK tax defaults into the correct regional tax default.
// This updates the stored quote/invoice default and the legacy browser
// settings used by existing quote and invoice forms.
async function syncRegionalTaxDefaults(){
  try{
    const {data:{user}={}}=await supabase.auth.getUser();
    if(!user) return;

    const {data:settings,error}=await supabase.from("user_settings").select("country_code,tax_system,tax_label,tax_rate,tax_enabled,default_vat_rate").eq("user_id",user.id).maybeSingle();
    if(error || !settings) return;

    const profile=getJobPilotTaxProfile(settings.country_code || "GB");
    const taxRate=Number(settings.tax_rate);
    const legacyVatRate=Number(settings.default_vat_rate);

    // Non-UK accounts must use their regional tax profile when the stored
    // defaults still contain the legacy UK 20% tax value. The previous
    // migration could leave default_vat_rate at 10 while tax_rate remained 20.
    const legacyUkDefault = taxRate === 20 || legacyVatRate === 20 || settings.tax_system === "VAT" || settings.tax_label === "VAT";
    if(profile.countryCode !== "GB" && legacyUkDefault && profile.defaultRate !== 20){
      const payload={
        tax_system:profile.taxSystem,
        tax_label:profile.taxLabel,
        tax_rate:profile.defaultRate,
        default_vat_rate:profile.defaultRate,
        tax_enabled:profile.enabledByDefault
      };
      const {error:updateError}=await supabase.from("user_settings").update(payload).eq("user_id",user.id);
      if(updateError){
        console.error("JobPilot regional tax migration:",updateError);
        return;
      }
      syncLegacySettings(payload);
      window.JobPilotRegionalTaxSettings={...payload,country_code:profile.countryCode};
      window.dispatchEvent(new CustomEvent("jobpilot:tax-settings-changed",{detail:window.JobPilotRegionalTaxSettings}));
    }
  }catch(error){
    console.error("JobPilot regional tax defaults:",error);
  }
}

function field(label,id,type,value,options=""){
  const control=type==="select" ? `<select id="${id}">${options}</select>` : `<input id="${id}" type="${type}" value="${String(value??"").replace(/"/g,"&quot;")}">`;
  return `<div class="jp-tax-field"><label for="${id}">${label}</label>${control}</div>`;
}

async function render(){
  const host=document.querySelector(".jp-app-preferences");
  if(!host || document.getElementById(SECTION_ID)) return;
  const country=document.getElementById("jpPrefCountry")?.value || "GB";
  const {user,settings}=await loadSettings();
  const profile=getJobPilotTaxProfile(country);
  const context=getJobPilotTaxContext({...settings,countryCode:settings.country_code||country});
  addStyles();
  const section=document.createElement("div");
  section.id=SECTION_ID;
  section.className="jp-pref-section";
  section.innerHTML=`<h3>Tax Settings</h3><p class="jp-tax-help">Tax terminology follows the selected business country. Rates are defaults only and can be changed for your business.</p><div class="jp-tax-grid">${field("Tax system","jpTaxSystem","select",context.taxSystem,`<option value="VAT">VAT</option><option value="GST">GST</option><option value="GST/HST">GST/HST</option><option value="SALES_TAX">Sales Tax</option>`)}${field("Tax label","jpTaxLabel","text",context.taxLabel)}${field("Default tax rate (%)","jpTaxRate","number",context.taxRate)}${field("Registration number label","jpTaxRegistrationLabel","text",context.taxRegistrationLabel)}${field("Registration number","jpTaxRegistrationNumber","text",context.taxRegistrationNumber)}</div><label class="jp-tax-toggle"><input id="jpTaxEnabled" type="checkbox" ${context.taxEnabled?"checked":""}> Apply tax by default to new quotes and invoices</label><div id="jpTaxStatus" class="jp-document-status" role="status" aria-live="polite"></div>`;
  host.appendChild(section);

  const save=async()=>{
    const payload={tax_system:document.getElementById("jpTaxSystem").value,tax_label:document.getElementById("jpTaxLabel").value.trim()||profile.taxLabel,tax_rate:Number(document.getElementById("jpTaxRate").value)||0,tax_enabled:document.getElementById("jpTaxEnabled").checked,tax_registration_label:document.getElementById("jpTaxRegistrationLabel").value.trim()||profile.registrationLabel,tax_registration_number:document.getElementById("jpTaxRegistrationNumber").value.trim()||null,default_vat_rate:Number(document.getElementById("jpTaxRate").value)||0};
    const status=document.getElementById("jpTaxStatus");
    if(!user){status.textContent="Tax settings require a signed-in account.";return;}
    const {error}=await supabase.from("user_settings").update(payload).eq("user_id",user.id);
    if(error){console.error("JobPilot tax settings:",error);status.textContent=error.message||"Could not save tax settings.";status.style.color="#b91c1c";return;}
    syncLegacySettings(payload);
    window.JobPilotRegionalTaxSettings={...payload,country_code:document.getElementById("jpPrefCountry")?.value||country};
    window.dispatchEvent(new CustomEvent("jobpilot:tax-settings-changed",{detail:window.JobPilotRegionalTaxSettings}));
    status.textContent="Tax settings saved.";status.style.color="#166534";
  };
  section.querySelectorAll("input,select").forEach(el=>el.addEventListener("change",save));
  document.getElementById("jpPrefCountry")?.addEventListener("change",()=>{
    const nextProfile=getJobPilotTaxProfile(document.getElementById("jpPrefCountry").value);
    document.getElementById("jpTaxSystem").value=nextProfile.taxSystem;
    document.getElementById("jpTaxLabel").value=nextProfile.taxLabel;
    document.getElementById("jpTaxRate").value=String(nextProfile.defaultRate);
    document.getElementById("jpTaxRegistrationLabel").value=nextProfile.registrationLabel;
    document.getElementById("jpTaxEnabled").checked=nextProfile.enabledByDefault;
    save();
  });
}

void syncRegionalTaxDefaults();

const observer=new MutationObserver(()=>{ if(document.querySelector(".jp-app-preferences")) void render(); });
observer.observe(document.body,{childList:true,subtree:true});
if(document.querySelector(".jp-app-preferences")) void render();
