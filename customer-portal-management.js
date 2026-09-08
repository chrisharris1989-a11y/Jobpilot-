import { supabase } from './supabase.js';

async function companyContext() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const { data, error } = await supabase.from('company_members').select('company_id, role').eq('user_id', user.id).eq('status','active').in('role',['owner','admin']).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Only company owners and admins can manage customer portals.');
  return data;
}

async function getPortalStatus(customerId) {
  const { data, error } = await supabase.from('customer_portal_accounts').select('id,status,invited_at,activated_at').eq('customer_id',customerId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function openCustomerPortalManager(customerId) {
  const customer = window.jobpilotCustomers?.find?.(c => c.id === customerId);
  const { data: customerRow } = await supabase.from('customers').select('id,name,email').eq('id',customerId).maybeSingle();
  const c = customer || customerRow;
  if (!c) return;
  const status = await getPortalStatus(customerId);
  const modal=document.createElement('div'); modal.className='modal show';
  modal.innerHTML=`<div class="modal-content"><div class="modal-header"><div><h2>Customer Portal</h2><p>${escapeHtml(c.name||'Customer')}</p></div><button class="close">×</button></div><div class="panel" style="box-shadow:none;border:1px solid var(--border,#e5e7eb)"><p><strong>Status:</strong> ${status?.status==='active'?'Enabled':'Not enabled'}</p><p class="muted">${escapeHtml(c.email||'No email address')}</p>${status?.invited_at?`<p class="muted">Invitation: ${new Date(status.invited_at).toLocaleString('en-GB')}</p>`:''}<button id="portalInvite" class="button primary" ${!c.email?'disabled':''}>${status?'Resend / enable portal':'Enable & send invitation'}</button><p id="portalResult" class="muted"></p></div></div>`;
  document.body.appendChild(modal); modal.querySelectorAll('.close').forEach(b=>b.onclick=()=>modal.remove());
  modal.querySelector('#portalInvite').onclick=async()=>{const result=modal.querySelector('#portalResult');result.textContent='Sending invitation...';try{await companyContext();const {data:{session}}=await supabase.auth.getSession();const {data,error}=await supabase.functions.invoke('invite-customer-portal',{body:{customer_id:customerId,redirect_to:`${location.origin}/portal.html`},headers:{Authorization:`Bearer ${session.access_token}`}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'Unable to send invitation.');result.textContent=data.message||'Invitation sent.';}catch(e){result.textContent=e.message||'Unable to send invitation.';}};
}

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function injectPortalButtons(){
  const table=document.getElementById('customerTable'); if(!table) return;
  table.querySelectorAll('[data-customer-id]').forEach(row=>{
    if(row.querySelector('.customer-portal-button')) return;
    const id=row.dataset.customerId;
    const button=document.createElement('button'); button.type='button'; button.className='button secondary customer-portal-button'; button.textContent='Portal'; button.style.marginLeft='10px';
    button.onclick=e=>{e.stopPropagation();openCustomerPortalManager(id);}; row.appendChild(button);
  });
}
const observer=new MutationObserver(injectPortalButtons); observer.observe(document.body,{childList:true,subtree:true});
injectPortalButtons();
