import { supabase } from "../supabase.js";
import { getCompanyContext } from "../company-context.js";

(function () {
  let observerStarted = false;
  function isSettings() { return document.getElementById("pageTitle")?.textContent.trim() === "Settings"; }
  function manager() { const { membership } = getCompanyContext(); return membership?.status === "active" && ["owner", "admin"].includes(membership.role); }

  async function renderTeam() {
    if (!isSettings() || !manager()) return;
    const panel = document.querySelector(".settings-panel");
    if (!panel || panel.querySelector("#jobpilot-team-section")) return;
    const { company } = getCompanyContext(); if (!company) return;

    const { data: members, error: membersError } = await supabase.rpc("list_my_company_members");
    const { data: invites, error: invitesError } = await supabase.from("company_invitations").select("id,email,role,expires_at,created_at").eq("company_id", company.id).is("accepted_at", null).order("created_at", { ascending: false });
    if (membersError || invitesError) { console.error("Team management:", membersError || invitesError); return; }

    const section = document.createElement("section"); section.id = "jobpilot-team-section"; section.className = "settings-section";
    section.innerHTML = `<h2>Team</h2><p style="color:#64748b;margin-top:0;">Manage the people who can access ${escapeHtml(company.name)}.</p><div id="jobpilot-team-summary" style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0 20px;"></div><div id="jobpilot-team-members"></div><div style="border-top:1px solid #e5e7eb;margin-top:22px;padding-top:20px;"><h3 style="margin:0 0 12px;">Invite someone</h3><div style="display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:10px;align-items:end;"><label style="display:block;">Email<input id="jobpilot-invite-email" type="email" placeholder="employee@example.com" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;"></label><label style="display:block;">Role<select id="jobpilot-invite-role" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;"><option value="member">Member</option><option value="admin">Admin</option></select></label><button id="jobpilot-invite-button" class="button primary" type="button">Create invite</button></div><div id="jobpilot-invite-result" style="margin-top:12px;"></div></div><div id="jobpilot-pending-invites" style="margin-top:22px;"></div>`;
    panel.appendChild(section);

    const active = members.filter(m => m.status === "active").length; const pending = invites.filter(i => new Date(i.expires_at) > new Date()).length;
    section.querySelector("#jobpilot-team-summary").innerHTML = `<div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;"><strong>${active}</strong> / ${company.max_users} users</div><div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;"><strong>${pending}</strong> pending invite${pending === 1 ? "" : "s"}</div><div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;text-transform:capitalize;"><strong>${escapeHtml(company.plan)}</strong> plan</div>`;

    const membersBox = section.querySelector("#jobpilot-team-members");
    membersBox.innerHTML = members.map(member => `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eef2f7;"><div><strong>${escapeHtml(member.email || "User")}</strong><div style="font-size:13px;color:#64748b;">${escapeHtml(member.role)} · ${escapeHtml(member.status)}</div></div>${member.is_owner ? `<span style="font-size:13px;color:#64748b;">Owner</span>` : `<div style="display:flex;gap:8px;align-items:center;"><select data-role-id="${member.id}" ${member.status === "suspended" ? "disabled" : ""}><option value="member" ${member.role === "member" ? "selected" : ""}>Member</option><option value="admin" ${member.role === "admin" ? "selected" : ""}>Admin</option></select><button type="button" data-suspend-id="${member.id}" class="button">${member.status === "suspended" ? "Activate" : "Suspend"}</button><button type="button" data-remove-id="${member.id}" class="button">Remove</button></div>`}</div>`).join("");

    const pendingBox = section.querySelector("#jobpilot-pending-invites");
    pendingBox.innerHTML = invites.length ? `<h3 style="margin:0 0 10px;">Pending invitations</h3>` + invites.map(i => `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eef2f7;"><div><strong>${escapeHtml(i.email)}</strong><div style="font-size:13px;color:#64748b;">${escapeHtml(i.role)} · expires ${new Date(i.expires_at).toLocaleDateString()}</div></div><button type="button" data-cancel-id="${i.id}" class="button">Cancel</button></div>`).join("") : "";

    section.querySelector("#jobpilot-invite-button").addEventListener("click", inviteMember);
    section.querySelectorAll("[data-role-id]").forEach(el => el.addEventListener("change", () => changeRole(el.dataset.roleId, el.value)));
    section.querySelectorAll("[data-suspend-id]").forEach(el => el.addEventListener("click", () => toggleMember(el.dataset.suspendId, el.textContent.trim() === "Activate")));
    section.querySelectorAll("[data-remove-id]").forEach(el => el.addEventListener("click", () => removeMember(el.dataset.removeId)));
    section.querySelectorAll("[data-cancel-id]").forEach(el => el.addEventListener("click", () => cancelInvite(el.dataset.cancelId)));
  }

  async function inviteMember() {
    const section = document.getElementById("jobpilot-team-section"); const email = section.querySelector("#jobpilot-invite-email").value.trim(); const role = section.querySelector("#jobpilot-invite-role").value; const result = section.querySelector("#jobpilot-invite-result");
    result.textContent = "Creating invitation...";
    const { data, error } = await supabase.rpc("invite_company_member", { requested_email: email, requested_role: role });
    if (error) { result.textContent = error.message; result.style.color = "#b91c1c"; return; }
    const link = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(data.token)}`;
    try { await navigator.clipboard.writeText(link); } catch (_) {}
    result.style.color = "#166534"; result.innerHTML = `Invitation created and the link copied. <a href="${link}" target="_blank" rel="noopener">Open invite link</a>`;
    await refresh();
  }
  async function changeRole(id, role) { const { error } = await supabase.from("company_members").update({ role }).eq("id", id); if (error) alert(error.message); else await refresh(); }
  async function toggleMember(id, activate) { const { error } = await supabase.from("company_members").update({ status: activate ? "active" : "suspended" }).eq("id", id); if (error) alert(error.message); else await refresh(); }
  async function removeMember(id) { if (!confirm("Remove this team member from the company?")) return; const { error } = await supabase.from("company_members").delete().eq("id", id); if (error) alert(error.message); else await refresh(); }
  async function cancelInvite(id) { if (!confirm("Cancel this invitation?")) return; const { error } = await supabase.rpc("cancel_company_invitation", { invitation_id: id }); if (error) alert(error.message); else await refresh(); }
  async function refresh() { document.getElementById("jobpilot-team-section")?.remove(); await renderTeam(); }
  function start() { if (observerStarted) return; observerStarted = true; new MutationObserver(() => renderTeam()).observe(document.body, { childList: true, subtree: true }); window.addEventListener("jobpilot:company-ready", renderTeam); renderTeam(); }
  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value == null ? "" : String(value); return div.innerHTML; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
