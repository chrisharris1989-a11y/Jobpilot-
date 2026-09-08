import { supabase } from "./supabase.js";

(() => {
  const loadedPlans = new Map();
  let loading = false;

  async function loadCompletedPlans() {
    if (loading) return;
    loading = true;
    try {
      const { data, error } = await supabase
        .from("job_plans")
        .select("id,job_id,status")
        .eq("status", "completed");
      if (error) throw error;
      loadedPlans.clear();
      (data || []).forEach(plan => {
        if (plan.job_id) loadedPlans.set(String(plan.job_id), plan);
      });
    } catch (error) {
      console.warn("JobPilot completed plan buttons:", error);
    } finally {
      loading = false;
    }
  }

  async function openPlan(planId) {
    const tools = document.getElementById("jobpilot-tools-button");
    if (tools) tools.click();

    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const plannerCard = [...document.querySelectorAll("button, [role=button], a")]
        .find(el => String(el.textContent || "").trim().startsWith("Job Planner"));
      if (plannerCard) {
        plannerCard.click();
        break;
      }
    }

    for (let i = 0; i < 40; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const button = document.querySelector(`[data-plan-id="${CSS.escape(String(planId))}"]`);
      if (button) {
        button.click();
        return;
      }
    }

    alert("Could not open the Job Planner plan. Please open Job Planner and try again.");
  }

  function decorateJobCards() {
    document.querySelectorAll("[data-job-id]").forEach(card => {
      const jobId = String(card.dataset.jobId || "");
      const plan = loadedPlans.get(jobId);
      if (!plan) return;

      // Hide the old notes-handoff control. The plan is already linked to the job.
      [...card.querySelectorAll("button")].forEach(button => {
        const text = String(button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (text.includes("add plan to job")) button.style.display = "none";
      });

      if (card.querySelector("[data-open-job-plan]")) return;

      const action = document.createElement("button");
      action.type = "button";
      action.className = "button secondary";
      action.dataset.openJobPlan = plan.id;
      action.textContent = "Open plan";
      action.style.marginLeft = "8px";
      action.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openPlan(plan.id);
      });

      const actionHost = card.lastElementChild;
      if (actionHost) actionHost.appendChild(action);
      else card.appendChild(action);
    });
  }

  // Prevent the old notes-based handoff from changing the job's Notes field.
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const text = String(button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!text.includes("add plan to job")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  const observer = new MutationObserver(async () => {
    if (!document.querySelector("[data-job-id]")) return;
    if (!loadedPlans.size) await loadCompletedPlans();
    decorateJobCards();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  loadCompletedPlans().then(decorateJobCards);
})();
