import { supabase } from "./supabase.js";

(() => {
  let currentJobId = null;
  let currentPlan = null;
  let opening = false;

  async function loadPlanForJob(jobId) {
    if (!jobId) return null;
    const { data, error } = await supabase
      .from("job_plans")
      .select("id,job_id,status,title")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("JobPilot job plan lookup:", error);
      return null;
    }
    return data || null;
  }

  async function openPlan(planId) {
    if (opening) return;
    opening = true;
    try {
      const tools = document.getElementById("jobpilot-tools-button");
      if (tools) tools.click();

      // Open Job Planner, then immediately open this exact plan.
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const plannerCard = [...document.querySelectorAll("button, [role=button], a")]
          .find(el => String(el.textContent || "").trim() === "Job Planner");
        if (plannerCard) {
          plannerCard.click();
          break;
        }
      }

      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const button = document.querySelector(`[data-plan-id="${CSS.escape(String(planId))}"]`);
        if (button) {
          button.click();
          return;
        }
      }

      alert("Could not open this Job Planner plan. Please try again.");
    } finally {
      opening = false;
    }
  }

  async function decorateJobProfile() {
    const subtitle = document.getElementById("pageSubtitle");
    const title = document.getElementById("pageTitle");
    if (!subtitle || subtitle.textContent.trim() !== "Job details" || !currentJobId) return;

    const actions = document.getElementById("editJob")?.parentElement;
    if (!actions || actions.querySelector("[data-open-job-plan]")) return;

    const plan = currentPlan || await loadPlanForJob(currentJobId);
    currentPlan = plan;
    if (!plan) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary";
    button.dataset.openJobPlan = plan.id;
    button.textContent = "Open plan";
    button.title = plan.status === "completed" ? "Open finalised plan" : "Open Job Planner plan";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openPlan(plan.id);
    });

    actions.insertBefore(button, actions.firstChild);
  }

  // Capture the exact job ID before the existing app click handler opens the job profile.
  document.addEventListener("click", event => {
    const row = event.target?.closest?.("[data-job-id]");
    if (!row) return;
    currentJobId = String(row.dataset.jobId || "");
    currentPlan = null;
  }, true);

  // Also support opening a job from customer history or recurring-job lists.
  document.addEventListener("click", event => {
    const history = event.target?.closest?.("[data-history-job]");
    const recurring = event.target?.closest?.("[data-recurring-job-id]");
    const id = history?.dataset.historyJob || recurring?.dataset.recurringJobId;
    if (id) {
      currentJobId = String(id);
      currentPlan = null;
    }
  }, true);

  const observer = new MutationObserver(() => {
    decorateJobProfile().catch(error => console.warn("JobPilot plan button:", error));
  });

  observer.observe(document.body, { childList: true, subtree: true });
  decorateJobProfile();
})();