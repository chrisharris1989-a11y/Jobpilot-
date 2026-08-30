import { supabase } from "../supabase.js";

export function createCustomersModule({
  getCurrentUser,
  getJobs,
  loadJobs,
  showPage,
  showJobProfile,
  escapeHtml
}) {
  let customers = [];

  async function loadCustomers() {
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Customers:", error); return; }
    customers = data || [];
  }

  function getCustomers() { return customers; }

  function renderCustomersPage(content) {
    content.innerHTML = `<div class="page-actions"><div><h2>Customers</h2><p>Your customer database.</p></div><button id="addCustomerButton" class="button primary">+ Add Customer</button></div><div class="panel"><input id="customerSearch" class="search-input" placeholder="Search customers..."><div id="customerTable" class="table-container"></div></div>`;
    document.getElementById("addCustomerButton").addEventListener("click", showAddCustomerForm);
    document.getElementById("customerSearch").addEventListener("input", event => renderCustomerTable(event.target.value));
    renderCustomerTable();
  }

  function renderCustomerTable(search = "") {
    const table = document.getElementById("customerTable");
    if (!table) return;
    const term = search.toLowerCase().trim();
    const filtered = customers.filter(customer => [customer.name, customer.phone, customer.email, customer.city, customer.postcode].filter(Boolean).join(" ").toLowerCase().includes(term));
    if (!filtered.length) {
      table.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h3>No customers found</h3><p>Add your first customer to get started.</p></div>`;
      return;
    }
    table.innerHTML = `<div class="customer-list">${filtered.map(customer => `<div class="job-row customer-row" data-customer-id="${customer.id}" style="cursor:pointer;"><div><strong>${escapeHtml(customer.name)}</strong><div class="muted">${escapeHtml(customer.phone || customer.email || customer.city || "")}</div></div><span>View →</span></div>`).join("")}</div>`;
    table.querySelectorAll("[data-customer-id]").forEach(row => row.addEventListener("click", () => showCustomerProfile(row.dataset.customerId)));
  }

  function showAddCustomerForm() {
    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><div><h2>Add Customer</h2><p>Create a customer record.</p></div><button class="close">×</button></div><form id="customerForm"><label>Name *</label><input id="customerName" required><label>Phone</label><input id="customerPhone"><label>Email</label><input id="customerEmail" type="email"><label>Address</label><input id="customerAddress"><label>Town / City</label><input id="customerCity"><label>Postcode</label><input id="customerPostcode"><label>Notes</label><textarea id="customerNotes"></textarea><div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Save Customer</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("#customerForm").addEventListener("submit", async event => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      const customer = { user_id: currentUser.id, name: document.getElementById("customerName").value.trim(), phone: document.getElementById("customerPhone").value.trim(), email: document.getElementById("customerEmail").value.trim(), address_line1: document.getElementById("customerAddress").value.trim(), city: document.getElementById("customerCity").value.trim(), postcode: document.getElementById("customerPostcode").value.trim(), notes: document.getElementById("customerNotes").value.trim() };
      const { error } = await supabase.from("customers").insert(customer);
      if (error) { alert(error.message); return; }
      modal.remove();
      await loadCustomers();
      renderCustomersPage(document.getElementById("pageContent"));
    });
  }

  function showCustomerProfile(customerId) {
    const customer = customers.find(item => String(item.id) === String(customerId));
    if (!customer) return;
    const customerJobs = getJobs().filter(job => String(job.customer_id) === String(customer.id));
    const totalValue = customerJobs.reduce((total, job) => total + Number(job.price || 0), 0);
    const content = document.getElementById("pageContent");
    document.getElementById("pageTitle").textContent = customer.name;
    document.getElementById("pageSubtitle").textContent = "Customer profile";
    content.innerHTML = `<div class="page-actions"><button id="backCustomers" class="button secondary">← Customers</button><div><button id="editCustomer" class="button primary">Edit Customer</button><button id="deleteCustomer" class="button danger">Delete</button></div></div><div class="content-grid"><div class="panel"><h2>Customer Details</h2><div class="detail-list"><div><span>Name</span><strong>${escapeHtml(customer.name)}</strong></div><div><span>Phone</span><strong>${escapeHtml(customer.phone || "—")}</strong></div><div><span>Email</span><strong>${escapeHtml(customer.email || "—")}</strong></div><div><span>Address</span><strong>${escapeHtml(customer.address_line1 || "—")}</strong></div><div><span>Town / City</span><strong>${escapeHtml(customer.city || "—")}</strong></div><div><span>Postcode</span><strong>${escapeHtml(customer.postcode || "—")}</strong></div><div><span>Notes</span><strong>${escapeHtml(customer.notes || "—")}</strong></div></div></div><div class="panel"><h2>Customer Summary</h2><div class="stats"><div class="stat-card"><div><span>Jobs</span><strong>${customerJobs.length}</strong></div></div><div class="stat-card"><div><span>Job Value</span><strong>£${totalValue.toFixed(2)}</strong></div></div></div></div></div><div class="panel"><div class="panel-header"><div><h2>Job History</h2><p>Previous and upcoming work.</p></div></div>${customerJobs.length ? customerJobs.map(job => `<div class="job-row" style="cursor:pointer;" data-history-job="${job.id}"><div><strong>${escapeHtml(job.title)}</strong><div class="muted">${job.scheduled_date || "No date"}</div></div><strong>£${Number(job.price || 0).toFixed(2)}</strong></div>`).join("") : `<div class="empty-state"><div class="empty-icon">📋</div><h3>No jobs yet</h3><p>This customer doesn't have any jobs.</p></div>`}</div>`;
    document.getElementById("backCustomers").addEventListener("click", () => showPage("customers"));
    document.getElementById("editCustomer").addEventListener("click", () => showEditCustomerForm(customer.id));
    document.getElementById("deleteCustomer").addEventListener("click", () => deleteCustomer(customer.id));
    content.querySelectorAll("[data-history-job]").forEach(row => row.addEventListener("click", () => showJobProfile(row.dataset.historyJob)));
  }

  function showEditCustomerForm(customerId) {
    const customer = customers.find(item => String(item.id) === String(customerId));
    if (!customer) return;
    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><div><h2>Edit Customer</h2><p>Update customer details.</p></div><button class="close">×</button></div><form id="editCustomerForm"><label>Name *</label><input id="editCustomerName" value="${escapeHtml(customer.name || "")}" required><label>Phone</label><input id="editCustomerPhone" value="${escapeHtml(customer.phone || "")}"><label>Email</label><input id="editCustomerEmail" type="email" value="${escapeHtml(customer.email || "")}"><label>Address</label><input id="editCustomerAddress" value="${escapeHtml(customer.address_line1 || "")}"><label>Town / City</label><input id="editCustomerCity" value="${escapeHtml(customer.city || "")}"><label>Postcode</label><input id="editCustomerPostcode" value="${escapeHtml(customer.postcode || "")}"><label>Notes</label><textarea id="editCustomerNotes">${escapeHtml(customer.notes || "")}</textarea><div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Save Changes</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("#editCustomerForm").addEventListener("submit", async event => {
      event.preventDefault();
      const updates = { name: document.getElementById("editCustomerName").value.trim(), phone: document.getElementById("editCustomerPhone").value.trim(), email: document.getElementById("editCustomerEmail").value.trim(), address_line1: document.getElementById("editCustomerAddress").value.trim(), city: document.getElementById("editCustomerCity").value.trim(), postcode: document.getElementById("editCustomerPostcode").value.trim(), notes: document.getElementById("editCustomerNotes").value.trim() };
      const { error } = await supabase.from("customers").update(updates).eq("id", customer.id);
      if (error) { alert(error.message); return; }
      modal.remove();
      await loadCustomers();
      showCustomerProfile(customer.id);
    });
  }

  async function deleteCustomer(customerId) {
    const customer = customers.find(item => String(item.id) === String(customerId));
    if (!customer) return;
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) { alert(error.message); return; }
    await loadCustomers();
    await loadJobs();
    showPage("customers");
  }

  return { loadCustomers, getCustomers, renderCustomersPage, renderCustomerTable, showAddCustomerForm, showCustomerProfile, showEditCustomerForm, deleteCustomer };
}
