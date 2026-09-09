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

captureReferralCode();
claimReferral();
supabase.auth.onAuthStateChange(() => { setTimeout(claimReferral, 0); });
