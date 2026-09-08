import { supabase } from "./supabase.js";

(() => {
  let opening = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const getContent = () => document.getElementById("pageContent");

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

  async function openPlanDirect(planId) {
    if (opening || !planId) return;
    opening = true;
    const content = getContent();
    const previousVisibility = content?.style.visibility || "";

    try {
      if (content) content.style.visibility = "hidden";

      const tools = document.getElementById("jobpilot-tools-button");
      if (!tools) throw new Error("Tools could not be opened.");
      tools.click();

      let plannerButton = null;
      for (let i = 0; i < 80; i++) {
        await sleep(100);
        plannerButton = [...document.querySelectorAll("button, [role=button], a")]
          .find(el => String(el.textContent || "").trim() === "Job Planner");
        if (plannerButton) break;
      }
      if (!plannerButton) throw new Error("Job Planner could not be opened.");

      plannerButton.click();

      // The planner loads its own saved-plan list asynchronously. Wait for
      // the exact plan button belonging to this job, then open that plan.
      let planButton = null;
      for (let i = 0; i < 120; i++) {
        await sleep(100);
        planButton = [...document.querySelectorAll("[data-plan-id]")]
          .find(el => String(el.dataset.planId || "") === String(planId));
        if (planButton) break;
      }
      if (!planButton) throw new Error("The saved Job Planner plan could not be found.");

      planButton.click();

      // Give the planner time to replace the list with the selected plan.
      for (let i = 0; i < 80; i++) {
        await sleep(100);
        if (document.querySelector(".jp-planner-card") &&
            !document.querySelector(`[data-plan-id="${CSS.escape(String(planId))}"]`)) {
          break;
        }
      }
    } catch (error) {
      console.warn("JobPilot direct plan open:", error);
      alert(error.message || "Could not open this Job Planner plan.");
    } finally {
      if (content) content.style.visibility = previousVisibility;
      opening = false;
    }
  }

  async function decorateJobRows() {
    const rows = [...document.querySelectorAll(".job-row[data-job-id]")];
    if (!rows.length) return;

    for (const row of rows) {
      if (row.dataset.jpPlanDecorated === "true") continue;
      row.dataset.jpPlanDecorated = "true";

      const plan = await loadPlanForJob(row.dataset.jobId);
      if (!plan) continue;

      const action = document.createElement("button");
      action.type = "button";
      action.className = "button secondary";
      action.dataset.openJobPlan = plan.id;
      action.textContent = "Open plan";
      action.title = plan.status === "completed" ? "Open finalised plan" : "Open Job Planner plan";
      action.style.marginLeft = "10px";
      action.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openPlanDirect(plan.id);
      });

      const right = row.lastElementChild;
      if (right) {
        right.style.display = "flex";
        right.style.alignItems = "center";
        right.style.gap = "8px";
        right.appendChild(action);
      } else {
        row.appendChild(action);
      }
    }
  }

  const observer = new MutationObserver(() => {
    decorateJobRows().catch(error => console.warn("JobPilot plan cards:", error));
  });
  observer.observe(document.body, { childList: true, subtree: true });
  decorateJobRows();
})();