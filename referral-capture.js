import { supabase } from "./supabase.js";

const STORAGE_KEY = "jobpilot_referral_code";

function captureReferralCode() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code?.trim()) localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
  } catch (error) {
    console.warn("JobPilot referral capture:", error);
  }
}

async function claimReferral() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    if (!code) return;
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await supabase.rpc("claim_referral_code", { p_code: code });
    if (error) { console.warn("JobPilot referral claim:", error.message); return; }
    if (data?.claimed || ["already_attributed", "invalid_code"].includes(data?.reason)) localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("JobPilot referral claim:", error);
  }
}

async function addPromoterDetailRemoveButton() {
  try {
    const backButton = document.getElementById("promoter-detail-back");
    if (!backButton || document.getElementById("promoter-detail-remove")) return;

    const detailPanel = backButton.closest("#pageContent") || document.getElementById("pageContent");
    if (!detailPanel) return;
    const referralInput = detailPanel.querySelector('input[readonly][value*="?ref="]');
    if (!referralInput) return;

    const match = String(referralInput.value || "").match(/[?&]ref=([^&]+)/i);
    if (!match?.[1]) return;
    const code = decodeURIComponent(match[1]);
    const { data: promoter, error } = await supabase
      .from("referral_promoters")
      .select("id,name")
      .eq("code", code)
      .maybeSingle();
    if (error || !promoter) return;

    const button = document.createElement("button");
    button.id = "promoter-detail-remove";
    button.type = "button";
    button.className = "button secondary";
    button.textContent = "Remove Promoter";
    button.style.cssText = "color:#b42318;border-color:#fecdca;margin-left:8px;";
    button.addEventListener("click", async () => {
      const confirmed = window.confirm(`Remove ${promoter.name || "this promoter"} as a JobPilot promoter?\n\nThis removes their promoter record and referral attribution records. Their JobPilot account and company will not be deleted.`);
      if (!confirmed) return;
      button.disabled = true;
      button.textContent = "Removing…";
      try {
        const { data, error: removeError } = await supabase.rpc("delete_promoter", { p_promoter_id: promoter.id });
        if (removeError) throw removeError;
        if (!data?.deleted) throw new Error("The promoter could not be removed.");
        await window.renderReferralsPage?.();
      } catch (removeError) {
        button.disabled = false;
        button.textContent = "Remove Promoter";
        alert(removeError?.message || "The promoter could not be removed.");
      }
    });

    backButton.parentElement?.appendChild(button);
  } catch (error) {
    console.warn("JobPilot promoter detail remove button:", error);
  }
}

function watchPromoterDetail() {
  addPromoterDetailRemoveButton();
  const observer = new MutationObserver(() => addPromoterDetailRemoveButton());
  observer.observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
}

captureReferralCode();
claimReferral();
supabase.auth.onAuthStateChange(() => { setTimeout(claimReferral, 0); });
watchPromoterDetail();
