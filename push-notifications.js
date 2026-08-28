import { supabase } from "./supabase.js";
const ADMIN_USER_ID="9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY="BHHdZvpO9n1O9GkxaVLo7qmocYkmZQJC49wzHrJ8X78IySOrB-tnlTMfEuoKj54Mhyo3bff9LPa_Q_Vabg9c5qo";
const ios=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent), standalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const b64=s=>Uint8Array.from(atob((s+"=".repeat((4-s.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function sync(s){const j=s.toJSON();const {data,error}=await supabase.functions.invoke("admin-push",{body:{action:"subscribe",subscription:{endpoint:j.endpoint,keys:{p256dh:j.keys?.p256dh,auth:j.keys?.auth}},user_agent:navigator.userAgent}});if(error)throw error;if(!data?.success)throw Error(data?.error||"Subscription could not be saved.");}
export async function setupAdminPushNotifications(){
 const {data:{user}}=await supabase.auth.getUser();if(!user||user.id!==ADMIN_USER_ID)return;
 if(ios()&&!standalone())return;
 if(!("serviceWorker"in navigator)||!("PushManager"in window)||!("Notification"in window))return;
 const r=await navigator.serviceWorker.register("/sw.js",{scope:"/"});await navigator.serviceWorker.ready;
 let s=await r.pushManager.getSubscription();
 if(Notification.permission==="granted"&&s){try{await sync(s);const b=document.getElementById("jobpilot-push");if(b)b.remove();return;}catch(e){console.warn("Existing push subscription could not be synced",e);}}
 if(Notification.permission!=="granted"){
  let b=document.getElementById("jobpilot-push");if(b)return;
  b=document.createElement("button");b.id="jobpilot-push";b.textContent=ios()?"🔔 Enable iPhone notifications":"🔔 Enable phone notifications";b.style="position:fixed;right:20px;bottom:20px;z-index:99999;padding:12px 16px;border:0;border-radius:10px;font-weight:600";document.body.appendChild(b);
  b.onclick=async()=>{b.disabled=true;b.textContent="Enabling notifications…";try{const p=await Notification.requestPermission();if(p!=="granted")throw Error("Notification permission was not granted.");const reg=await navigator.serviceWorker.ready;s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID_PUBLIC_KEY)});await sync(s);b.remove();alert("Push notifications are now enabled on this device.")}catch(e){console.error(e);alert("Could not enable notifications: "+(e.message||e));b.disabled=false;b.textContent=ios()?"🔔 Enable iPhone notifications":"🔔 Enable phone notifications"}};
 }
}
window.addEventListener("load",()=>setTimeout(()=>setupAdminPushNotifications().catch(console.error),1500));
