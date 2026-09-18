import { supabase, getCachedUserResponse, getCachedCompanyMembership } from "./supabase.js";
import { formatJobPilotMoney } from "./regional-currency.js";

const BUSINESS_PLANS = new Set(["business", "pro"]);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}

function money(value) {
  return formatJobPilotMoney(Number(value || 0), { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function getCompanyContext() {
  const { data: { user } = {}, error: userError } = await getCachedUserResponse();
  if (userError || !user) throw new Error("Please sign in again to view Business Overview.");

  const { data: membership, error: membershipError } = await getCachedCompanyMembership(user.id);
  if (membershipError) throw membershipError;
  if (!membership?.company_id) throw new Error("Your company could not be found.");

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,name,plan")
    .eq("id", membership.company_id)
    .maybeSingle();
  if (companyError) throw companyError;
  return { user, membership, company };
}

function renderStyles() {
  if (document.getElementById("jp-business-overview-styles")) return;
  const style = document.createElement("style");
  style.id = "jp-business-overview-styles";
  style.textContent = `
    .jp-overview-page{display:flex;flex-direction:column;gap:18px}
    .jp-overview-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .jp-overview-header h2{margin:0 0 5px;font-size:22px}
    .jp-overview-header p{margin:0;color:#64748b}
    .jp-overview-period{font-size:13px;color:#64748b;padding:8px 11px;border:1px solid var(--border,#e5e7eb);border-radius:9px;background:#fff;white-space:nowrap}
    .jp-overview-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
    .jp-overview-kpi{padding:17px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04))}
    .jp-overview-kpi-label{font-size:12px;color:#64748b;margin-bottom:8px}
    .jp-overview-kpi-value{font-size:23px;font-weight:700;line-height:1.15}
    .jp-overview-kpi-sub{font-size:12px;color:#64748b;margin-top:6px}
    .jp-overview-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px}
    .jp-overview-panel{border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;padding:18px;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04))}
    .jp-overview-panel h3{margin:0 0 14px;font-size:16px}
    .jp-overview-bars{height:190px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:7px;align-items:end}
    .jp-overview-bar-col{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;min-width:0}
    .jp-overview-bar{width:100%;max-width:28px;min-height:3px;border-radius:5px 5px 2px 2px;background:var(--primary,#2563eb)}
    .jp-overview-bar-label{font-size:10px;color:#64748b}
    .jp-overview-bar-value{font-size:9px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55px}
    .jp-overview-list{display:flex;flex-direction:column;gap:11px}
    .jp-overview-row{display:flex;justify-content:space-between;gap:12px;font-size:13px}
    .jp-overview-row span:first-child{color:#64748b}
    .jp-overview-row strong{font-weight:600}
    .jp-overview-error{padding:18px;border:1px solid #fecaca;border-radius:12px;background:#fff7f7;color:#991b1b}
    .jp-overview-loading{padding:30px;text-align:center;color:#64748b}
    @media(max-width:1050px){.jp-overview-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.jp-overview-grid{grid-template-columns:1fr}}
    @media(max-width:650px){.jp-overview-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.jp-overview-header{flex-direction:column}.jp-overview-period{white-space:normal}.jp-overview-bars{gap:4px}}
  `;
  document.head.appendChild(style);
}

function openBillingUpgrade() {
  const managementButton = document.getElementById("jobpilot-management-button");
  managementButton?.click();

  // Management navigation is handled by a capture-phase guard, so wait until
  // that landing page has rendered before opening its Billing section.
  setTimeout(() => {
    const billing = window.renderManagementBillingPage;
    if (typeof billing === "function") {
      const title = document.getElementById("pageTitle");
      if (title) title.textContent = "Billing";
      billing();
      return;
    }
    console.error("JobPilot: Billing page is not available.");
  }, 0);
}

function renderLocked(content) {
  content.innerHTML = `
    <div class="jp-overview-page">
      <div class="jp-overview-header"><div><h2>Business Overview</h2><p>See the key numbers that show how your business is performing.</p></div></div>
      <div class="jp-overview-panel" style="text-align:center;padding:42px 24px">
        <div style="font-size:34px;margin-bottom:10px">📊</div>
        <h3 style="font-size:20px;margin-bottom:8px">Business Overview</h3>
        <p style="color:#64748b;max-width:520px;margin:0 auto 18px;line-height:1.5">Business Overview is available on the Business and Pro plans. Upgrade to see revenue, expenses, profit, jobs and business performance in one place.</p>
        <button type="button" id="jp-overview-upgrade" style="border:0;border-radius:9px;padding:10px 16px;background:var(--primary,#2563eb);color:#fff;font:inherit;font-weight:600;cursor:pointer">View plans</button>
      </div>
    </div>`;
  document.getElementById("jp-overview-upgrade")?.addEventListener("click", openBillingUpgrade);
}

function renderOverview(content, data) {
  const { company, invoices, expenses, jobs, customerCount } = data;
  const now = new Date();
  const currentMonth = monthStart(now);
  const currentStart = isoDate(currentMonth);
  const currentEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const paidInvoices = invoices.filter(item => String(item.status || "").toLowerCase() === "paid");
  const outstandingInvoices = invoices.filter(item => !["paid", "cancelled", "void"].includes(String(item.status || "").toLowerCase()));
  const revenue = paidInvoices.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const outstanding = outstandingInvoices.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const profit = revenue - expenseTotal;
  const completedJobs = jobs.filter(item => ["completed", "complete", "done"].includes(String(item.status || "").toLowerCase())).length;
  const currentJobs = jobs.filter(item => item.scheduled_date >= currentStart && item.scheduled_date <= currentEnd).length;
  const currentRevenue = paidInvoices.filter(item => String(item.paid_date || item.issue_date || "").slice(0, 7) === now.toISOString().slice(0, 7)).reduce((sum, item) => sum + Number(item.total || 0), 0);

  const months = Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1));
  const monthlyRevenue = months.map(month => {
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return paidInvoices.filter(item => String(item.paid_date || item.issue_date || "").slice(0, 7) === key).reduce((sum, item) => sum + Number(item.total || 0), 0);
  });
  const maxRevenue = Math.max(...monthlyRevenue, 1);

  content.innerHTML = `
    <div class="jp-overview-page">
      <div class="jp-overview-header">
        <div><h2>Business Overview</h2><p>${escapeHtml(company?.name || "Your business")} — a snapshot of your business performance.</p></div>
        <div class="jp-overview-period">Last 12 months</div>
      </div>
      <div class="jp-overview-kpis">
        <div class="jp-overview-kpi"><div class="jp-overview-kpi-label">Revenue</div><div class="jp-overview-kpi-value">${money(revenue)}</div><div class="jp-overview-kpi-sub">Paid invoices</div></div>
        <div class="jp-overview-kpi"><div class="jp-overview-kpi-label">Expenses</div><div class="jp-overview-kpi-value">${money(expenseTotal)}</div><div class="jp-overview-kpi-sub">Recorded expenses</div></div>
        <div class="jp-overview-kpi"><div class="jp-overview-kpi-label">Profit</div><div class="jp-overview-kpi-value">${money(profit)}</div><div class="jp-overview-kpi-sub">Revenue less expenses</div></div>
        <div class="jp-overview-kpi"><div class="jp-overview-kpi-label">Outstanding</div><div class="jp-overview-kpi-value">${money(outstanding)}</div><div class="jp-overview-kpi-sub">Unpaid invoices</div></div>
        <div class="jp-overview-kpi"><div class="jp-overview-kpi-label">Customers</div><div class="jp-overview-kpi-value">${customerCount.toLocaleString()}</div><div class="jp-overview-kpi-sub">Active company customers</div></div>
      </div>
      <div class="jp-overview-grid">
        <section class="jp-overview-panel"><h3>Revenue over the last 12 months</h3><div class="jp-overview-bars">${monthlyRevenue.map((value, index) => `<div class="jp-overview-bar-col"><div class="jp-overview-bar-value">${money(value)}</div><div class="jp-overview-bar" style="height:${Math.max(3, Math.round((value / maxRevenue) * 150))}px"></div><div class="jp-overview-bar-label">${monthLabel(months[index])}</div></div>`).join("")}</div></section>
        <section class="jp-overview-panel"><h3>This month</h3><div class="jp-overview-list">
          <div class="jp-overview-row"><span>Revenue</span><strong>${money(currentRevenue)}</strong></div>
          <div class="jp-overview-row"><span>Jobs scheduled</span><strong>${currentJobs.toLocaleString()}</strong></div>
          <div class="jp-overview-row"><span>Jobs completed</span><strong>${completedJobs.toLocaleString()}</strong></div>
          <div class="jp-overview-row"><span>Total customers</span><strong>${customerCount.toLocaleString()}</strong></div>
          <div class="jp-overview-row"><span>Outstanding invoices</span><strong>${money(outstanding)}</strong></div>
        </div></section>
      </div>
    </div>`;
}

async function openBusinessOverview() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Business Overview";
  if (subtitle) subtitle.textContent = "Business performance at a glance.";
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("jobpilot-tools-button")?.classList.add("active");
  renderStyles();
  content.innerHTML = `<div class="jp-overview-loading">Loading Business Overview…</div>`;

  try {
    const { company } = await getCompanyContext();
    const plan = String(company?.plan || "").toLowerCase();
    if (!BUSINESS_PLANS.has(plan)) {
      renderLocked(content);
      return;
    }

    const now = new Date();
    const from = isoDate(new Date(now.getFullYear() - 1, now.getMonth(), 1));
    const to = isoDate(now);
    const companyId = company.id;
    const [invoiceResult, expenseResult, jobResult, customerResult] = await Promise.all([
      supabase.from("invoices").select("id,total,status,issue_date,due_date,paid_date").eq("company_id", companyId).gte("issue_date", from).lte("issue_date", to),
      supabase.from("expenses").select("id,amount,expense_date").eq("company_id", companyId).gte("expense_date", from).lte("expense_date", to),
      supabase.from("jobs").select("id,status,scheduled_date").eq("company_id", companyId).gte("scheduled_date", from).lte("scheduled_date", to),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId)
    ]);
    for (const result of [invoiceResult, expenseResult, jobResult, customerResult]) if (result.error) throw result.error;
    renderOverview(content, { company, invoices: invoiceResult.data || [], expenses: expenseResult.data || [], jobs: jobResult.data || [], customerCount: Number(customerResult.count || 0) });
  } catch (error) {
    console.error("JobPilot Business Overview:", error);
    content.innerHTML = `<div class="jp-overview-page"><div class="jp-overview-error"><strong>Business Overview could not be loaded.</strong><div style="margin-top:6px">${escapeHtml(error?.message || "Please try again.")}</div></div></div>`;
  }
}

window.JobPilotBusinessOverview = Object.freeze({ open: openBusinessOverview });
