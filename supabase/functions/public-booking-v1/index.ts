import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PORTAL_URL="https://portal.jobpilotcrm.co.uk/portal/";
const db=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const url=new URL(req.url),body=req.method==="POST"?await req.json().catch(()=>({})):{};
    const action=String(url.searchParams.get("action")||body.action||"config"),slug=cleanSlug(String(url.searchParams.get("slug")||body.slug||""));
    if(!slug)return json({error:"Missing booking link."},400);
    const{data:s,error:se}=await db.from("booking_settings").select("company_id,enabled,slug,slot_interval_minutes,min_notice_hours,max_days_ahead,require_address").eq("slug",slug).eq("enabled",true).maybeSingle();
    if(se)throw se;if(!s)return json({error:"This booking page is not available."},404);
    const[{data:c},{data:services},{data:hours}]=await Promise.all([
      db.from("companies").select("id,name,owner_id").eq("id",s.company_id).single(),
      db.from("booking_services").select("id,name,description,duration_minutes,price,display_order").eq("company_id",s.company_id).eq("active",true).order("display_order"),
      db.from("booking_hours").select("day_of_week,open_time,close_time,enabled").eq("company_id",s.company_id).order("day_of_week")
    ]);
    if(!c)return json({error:"Business not found."},404);
    if(action==="config"&&req.method==="GET")return json({company:{id:c.id,name:c.name},settings:{slot_interval_minutes:s.slot_interval_minutes,min_notice_hours:s.min_notice_hours,max_days_ahead:s.max_days_ahead,require_address:s.require_address},services:services||[],hours:hours||[]});
    const service=(services||[]).find((x:any)=>x.id===body.service_id);if(!service)return json({error:"Please choose a valid service."},400);

    if(action==="quote_request"&&req.method==="POST"){
      const name=cleanText(body.name,120),phone=cleanText(body.phone,40),email=cleanText(body.email,160).toLowerCase(),address=cleanText(body.address,300),notes=cleanText(body.notes,1000),preferredDate=cleanText(body.preferred_date,10);
      if(!name||!phone)return json({error:"Name and phone number are required for a quote request."},400);
      if(email&&!/^\S+@\S+\.\S+$/.test(email))return json({error:"Please enter a valid email address."},400);
      if(preferredDate&&!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate))return json({error:"Invalid preferred date."},400);
      if(s.require_address&&!address)return json({error:"Address is required for this quote request."},400);
      const hasFixedPrice=service.price!==null&&service.price!==undefined&&service.price!=="";
      const servicePrice=Number(service.price);
      if(hasFixedPrice&&Number.isFinite(servicePrice)&&servicePrice>=0)return json({error:"This service has a set price and should be booked online."},400);

      let customer:any=null;
      if(email){
        const{data:matches,error:e}=await db.from("customers").select("id").eq("company_id",s.company_id).ilike("email",email).limit(1);if(e)throw e;customer=matches?.[0]||null;
      }
      if(!customer&&phone){
        const{data:matches,error:e}=await db.from("customers").select("id").eq("company_id",s.company_id).eq("phone",phone).limit(1);if(e)throw e;customer=matches?.[0]||null;
      }
      if(customer){
        const{error:e}=await db.from("customers").update({name,phone,email:email||null,address_line1:address||null}).eq("id",customer.id);if(e)throw e;
      }else{
        const{data:newCustomer,error:e}=await db.from("customers").insert({company_id:s.company_id,user_id:c.owner_id,name,phone,email:email||null,address_line1:address||null}).select("id").single();if(e)throw e;customer=newCustomer;
      }

      const description=`Service requested: ${service.name}${notes?`\n\nCustomer notes: ${notes}`:"\n\nCustomer has requested a quote for this service."}`;
      const{data:request,error:re}=await db.from("quote_requests").insert({company_id:s.company_id,requested_by:null,customer_name:name,phone,email:email||null,address:address||null,description,preferred_date:preferredDate||null,image_paths:[]}).select("id").single();
      if(re)throw re;

      const portal=await ensurePortal(customer.id,email,s.company_id);
      return json({success:true,request_id:request.id,service:service.name,business:c.name,portal});
    }

    if(action!=="book"||req.method!=="POST")return json({error:"Invalid request."},400);
    const hasFixedPrice=service.price!==null&&service.price!==undefined&&service.price!=="";
    const servicePrice=Number(service.price);
    if(!hasFixedPrice||!Number.isFinite(servicePrice)||servicePrice<0)return json({error:"This service is available by quote request only."},400);
    const name=cleanText(body.name,120),phone=cleanText(body.phone,40),email=cleanText(body.email,160).toLowerCase(),address=cleanText(body.address,300),notes=cleanText(body.notes,1000),date=cleanText(body.date,10),time=cleanText(body.time,5);
    if(!name||!date||!time)return json({error:"Name, date and time are required."},400);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return json({error:"Invalid date or time."},400);
    if(s.require_address&&!address)return json({error:"Address is required for this booking."},400);
    if(email&&!/^\S+@\S+\.\S+$/.test(email))return json({error:"Please enter a valid email address."},400);
    const requested=new Date(`${date}T${time}:00`),now=new Date();
    if(Number.isNaN(requested.getTime())||requested.getTime()<now.getTime()+Number(s.min_notice_hours)*3600000||requested.getTime()>now.getTime()+Number(s.max_days_ahead)*86400000)return json({error:"That date is outside the available booking window."},400);
    const day=requested.getDay(),hour=(hours||[]).find((x:any)=>Number(x.day_of_week)===day);
    if(!hour?.enabled||time<fmtTime(hour.open_time)||time>=fmtTime(hour.close_time))return json({error:"That time is outside the available hours."},400);
    if(Number(time.slice(3))%Number(s.slot_interval_minutes)!==0)return json({error:"Please choose one of the available time slots."},400);
    const{data:existing}=await db.from("jobs").select("id,scheduled_time,status").eq("company_id",s.company_id).eq("scheduled_date",date).neq("status","cancelled");
    const rm=toMin(time);if((existing||[]).some((j:any)=>j.scheduled_time&&Math.abs(toMin(j.scheduled_time)-rm)<Number(service.duration_minutes)))return json({error:"That time has just become unavailable. Please choose another time."},409);

    let customer:any=null;
    if(email){const{data:matches,error:e}=await db.from("customers").select("id").eq("company_id",s.company_id).ilike("email",email).limit(1);if(e)throw e;customer=matches?.[0]||null;}
    if(customer){const{error:e}=await db.from("customers").update({name,phone:phone||null,email,address_line1:address||null}).eq("id",customer.id);if(e)throw e;}
    else{const{data:newCustomer,error:e}=await db.from("customers").insert({company_id:s.company_id,user_id:c.owner_id,name,phone:phone||null,email:email||null,address_line1:address||null}).select("id").single();if(e)throw e;customer=newCustomer;}

    const{data:job,error:je}=await db.from("jobs").insert({company_id:s.company_id,customer_id:customer.id,user_id:c.owner_id,title:service.name,description:service.description||null,scheduled_date:date,scheduled_time:time,status:"scheduled",price:servicePrice,notes:notes||null}).select("id").single();if(je)throw je;
    const{data:r,error:re}=await db.from("booking_requests").insert({company_id:s.company_id,service_id:service.id,customer_id:customer.id,job_id:job.id,requested_date:date,requested_time:time,customer_name:name,customer_phone:phone||null,customer_email:email||null,customer_address:address||null,notes:notes||null,status:"confirmed"}).select("id").single();if(re)throw re;
    const portal=await ensurePortal(customer.id,email,s.company_id);
    return json({success:true,booking_id:r.id,job_id:job.id,date,time,service:service.name,business:c.name,price:servicePrice,portal});
  }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500)}
});

async function ensurePortal(customerId:string,email:string,companyId:string){
  if(!email)return {available:false};
  const{data:account,error:accountError}=await db.from("customer_portal_accounts").select("id,user_id,status").eq("company_id",companyId).eq("customer_id",customerId).maybeSingle();
  if(accountError)throw accountError;
  if(account){if(account.status!=="active"){const{error:e}=await db.from("customer_portal_accounts").update({status:"active",updated_at:new Date().toISOString()}).eq("id",account.id);if(e)throw e;}const link=await generateMagicLink(email);return {available:true,existing:true,sign_in_link:link};}

  const{data:userData}=await db.auth.admin.getUserByEmail(email);const authUser=userData?.user||null;
  if(authUser){
    const{data:userAccount,error:userAccountError}=await db.from("customer_portal_accounts").select("id,company_id,customer_id,status").eq("user_id",authUser.id).maybeSingle();if(userAccountError)throw userAccountError;
    if(userAccount&&userAccount.company_id===companyId&&userAccount.customer_id===customerId){const link=await generateMagicLink(email);return {available:true,existing:true,sign_in_link:link};}
    if(userAccount)return {available:false,reason:"existing_auth_account"};
    const{error:e}=await db.from("customer_portal_accounts").insert({user_id:authUser.id,customer_id:customerId,company_id:companyId,status:"active",invited_at:new Date().toISOString()});if(e)throw e;
    const link=await generateMagicLink(email);return {available:true,existing:false,sign_in_link:link};
  }

  const{data:invited,error:inviteError}=await db.auth.admin.inviteUserByEmail(email,{redirectTo:PORTAL_URL,data:{portal_user:true}});if(inviteError)throw inviteError;
  const{error:insertError}=await db.from("customer_portal_accounts").insert({user_id:invited.user.id,customer_id:customerId,company_id:companyId,status:"active",invited_at:new Date().toISOString()});if(insertError)throw insertError;
  return {available:true,existing:false,invited:true};
}

async function generateMagicLink(email:string){const{data,error}=await db.auth.admin.generateLink({type:"magiclink",email,options:{redirectTo:PORTAL_URL}});if(error||!data?.properties?.action_link)throw error||new Error("Could not create portal sign-in link.");return data.properties.action_link;}
function cleanSlug(v:string){return v.toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}
function cleanText(v:unknown,m:number){return String(v??"").trim().slice(0,m)}
function toMin(v:any){const s=String(v).slice(0,5);return Number(s.slice(0,2))*60+Number(s.slice(3,5))}
function fmtTime(v:any){return String(v).slice(0,5)}
function json(d:unknown,status=200){return new Response(JSON.stringify(d),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}