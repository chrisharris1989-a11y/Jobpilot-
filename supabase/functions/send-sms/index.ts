import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers:{...corsHeaders,"Content-Type":"application/json"}});
const VERIFIED_SENDER = "JobPilot";
const PHONE_MARKETS: Record<string,{callingCode:string;trunkPrefix:string}> = {GB:{callingCode:"44",trunkPrefix:"0"},AU:{callingCode:"61",trunkPrefix:"0"},NZ:{callingCode:"64",trunkPrefix:"0"},IE:{callingCode:"353",trunkPrefix:"0"},US:{callingCode:"1",trunkPrefix:""},CA:{callingCode:"1",trunkPrefix:""}};
const US_SMS_ALLOWANCES: Record<string,number> = {core:0,solo:500,team:1000,business:1500,pro:2000};
const US_SMS_OVERAGE = 0.02;
const GB_SMS_PRICE = 0.035;

function normalizeRecipient(value:string,countryCode="GB") {
  let raw=String(value??"").trim().replace(/[\u00a0\s().-]/g,"").replace(/[^\d+]/g,"");
  if(!raw)return "";
  if(raw.startsWith("+"))return raw;
  if(raw.startsWith("00"))return `+${raw.slice(2)}`;
  const market=PHONE_MARKETS[String(countryCode||"GB").trim().toUpperCase()]||PHONE_MARKETS.GB;
  let digits=raw;
  if(digits.startsWith(market.callingCode))return `+${digits}`;
  if((countryCode==="US"||countryCode==="CA")&&digits.length===10)return `+1${digits}`;
  if(market.trunkPrefix&&digits.startsWith(market.trunkPrefix))digits=digits.slice(market.trunkPrefix.length);
  return digits?`+${market.callingCode}${digits}`:"";
}
function monthStartUTC(){const now=new Date();return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);}
async function stripeRequest(secret:string,path:string,method:string,params?:Record<string,unknown>){const headers:Record<string,string>={Authorization:`Bearer ${secret}`};let body:string|undefined;if(params){headers["Content-Type"]="application/x-www-form-urlencoded";body=encodeForm(params);}const response=await fetch(`https://api.stripe.com${path}`,{method,headers,body});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||`Stripe request failed (${response.status}).`);return data;}
function encodeForm(value:Record<string,unknown>,prefix=""):string{const pairs:string[]=[];for(const[key,val]of Object.entries(value)){const fullKey=prefix?`${prefix}[${key}]`:key;if(val&&typeof val==="object"&&!Array.isArray(val))pairs.push(encodeForm(val as Record<string,unknown>,fullKey));else if(Array.isArray(val))val.forEach((item,index)=>pairs.push(encodeForm({[index]:item},fullKey)));else if(val!==undefined&&val!==null)pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(val))}`);}return pairs.join("&");}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const authHeader=req.headers.get("Authorization");
  if(!authHeader?.startsWith("Bearer "))return json({error:"Missing authorization"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),supabaseAnonKey=Deno.env.get("SUPABASE_ANON_KEY"),serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),pureSmsApiKey=Deno.env.get("PURESMS_API_KEY"),stripeSecret=Deno.env.get("STRIPE_SECRET_KEY");
  if(!supabaseUrl||!supabaseAnonKey||!serviceRoleKey||!pureSmsApiKey)return json({error:"SMS service is not configured"},500);
  const supabase=createClient(supabaseUrl,supabaseAnonKey,{global:{headers:{Authorization:authHeader}}});
  const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)return json({error:"Unauthorized"},401);
  let body:Record<string,unknown>;try{body=await req.json();}catch{return json({error:"Invalid JSON body"},400);}
  const customerId=typeof body.customer_id==="string"?body.customer_id:null;
  const recipient=typeof body.recipient==="string"?body.recipient.trim():null;
  const content=typeof body.content==="string"?body.content.trim():null;
  const messageType=typeof body.message_type==="string"&&body.message_type.trim()?body.message_type.trim():"manual";
  const testMessage=messageType==="test";
  if(!content)return json({error:"content is required"},400);
  if(content.length>160)return json({error:"content is too long. SMS messages are limited to 160 characters."},400);
  if(!recipient&&!customerId)return json({error:"recipient or customer_id is required"},400);
  let companyId:string|null=null;let destination=recipient;
  if(customerId){const {data:customer,error:customerError}=await supabase.from("customers").select("id, phone, company_id").eq("id",customerId).maybeSingle();if(customerError)return json({error:"Unable to load customer"},500);if(!customer)return json({error:"Customer not found"},404);companyId=customer.company_id;destination=destination||customer.phone;if(!destination)return json({error:"Customer has no phone number"},400);}
  if(!companyId){const {data:membership}=await supabase.from("company_members").select("company_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();companyId=membership?.company_id??null;}
  if(!companyId)return json({error:"No active company membership"},403);
  const {data:membership,error:membershipError}=await supabase.from("company_members").select("id").eq("company_id",companyId).eq("user_id",user.id).eq("status","active").maybeSingle();
  if(membershipError)return json({error:"Unable to verify company access"},500);if(!membership)return json({error:"You do not have access to this company"},403);
  const {data:company,error:companyError}=await admin.from("companies").select("country_code,plan,stripe_customer_id,billing_status").eq("id",companyId).maybeSingle();
  if(companyError||!company)return json({error:"Unable to load company billing settings"},500);
  const countryCode=String(company.country_code||"GB").toUpperCase();const plan=String(company.plan||"core").toLowerCase();
  if(countryCode==="US"&&!testMessage&&plan==="core")return json({error:"SMS is not included on the Core plan in the US. Upgrade to a paid plan to send SMS."},403);
  const normalizedRecipient=normalizeRecipient(destination!,countryCode);if(!/^\+[1-9]\d{7,14}$/.test(normalizedRecipient))return json({error:"Recipient must be in E.164 format, e.g. +447700900123"},400);

  const providerResponse=await fetch("https://connect-api.divergent.cloud/sms/send",{method:"POST",headers:{"X-Api-Key":pureSmsApiKey,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({sender:VERIFIED_SENDER,recipient:normalizedRecipient,content,unicode:"Allow",enableLinkShortening:true})});
  const responseText=await providerResponse.text();let providerBody:unknown=responseText;try{providerBody=JSON.parse(responseText);}catch{}
  if(!providerResponse.ok){
    console.error("PureSMS error",providerResponse.status,providerBody);const details=typeof providerBody==="object"&&providerBody!==null?providerBody as Record<string,unknown>:null;
    const providerMessage=details?["message","error","detail","description","reason"].map(k=>details[k]).find(v=>typeof v==="string"&&v.trim()) as string|undefined:typeof providerBody==="string"&&providerBody.trim()?providerBody.trim():undefined;
    const providerCode=details?["code","error_code","status_code"].map(k=>details[k]).find(v=>typeof v==="string"||typeof v==="number"):undefined;const errorMessage=providerMessage||"PureSMS rejected the SMS";
    await admin.from("sms_messages").insert({company_id:companyId,user_id:user.id,customer_id:customerId,recipient:normalizedRecipient,message:content,message_type:messageType,status:"rejected",segments:1,cost:0,error_message:errorMessage});
    return json({error:errorMessage,provider_status:providerResponse.status,...(providerCode!==undefined?{provider_code:providerCode}:{})},502);
  }

  const result=typeof providerBody==="object"&&providerBody!==null?providerBody as Record<string,unknown>:{};const providerId=typeof result.id==="string"?result.id:null;const sentAt=new Date().toISOString();
  const usageMonth=monthStartUTC();const includedMessages=countryCode==="US"?(US_SMS_ALLOWANCES[plan]??0):0;const overageUnitPrice=countryCode==="US"?US_SMS_OVERAGE:GB_SMS_PRICE;const usageCurrency=countryCode==="US"?"USD":"GBP";
  let totalMessages=0,included=0,overageMessages=0,isOverage=false;
  if(!testMessage){
    const {data:usage,error:usageError}=await admin.rpc("consume_sms_usage",{p_company_id:companyId,p_usage_month:usageMonth,p_included_messages:includedMessages,p_currency:usageCurrency,p_overage_unit_price:overageUnitPrice});
    if(usageError||!usage?.[0]){console.error("SMS usage tracking error",usageError);await admin.from("sms_messages").insert({company_id:companyId,user_id:user.id,customer_id:customerId,recipient:normalizedRecipient,message:content,message_type:messageType,status:"sent",provider_message_id:providerId,segments:1,cost:countryCode==="US"?0:GB_SMS_PRICE,sent_at:sentAt});return json({success:true,id:providerId,recipient:normalizedRecipient,billable:countryCode!=="US",usage_tracking_error:true});}
    totalMessages=Number(usage[0].total_messages||0);included=Number(usage[0].included_messages||0);overageMessages=Number(usage[0].overage_messages||0);isOverage=Boolean(usage[0].is_overage);
  }
  const billable=!testMessage&&(countryCode!=="US"||isOverage);const customerCharge=billable?overageUnitPrice:0;
  const {error:logError}=await admin.from("sms_messages").insert({company_id:companyId,user_id:user.id,customer_id:customerId,recipient:normalizedRecipient,message:content,message_type:messageType,status:"sent",provider_message_id:providerId,segments:1,cost:customerCharge,sent_at:sentAt});if(logError)console.error("SMS billing log error",logError);

  let stripeChargeError:string|undefined;
  if(billable&&stripeSecret&&company.stripe_customer_id&&!testMessage){
    try{
      const {data:usageRow}=await admin.from("sms_usage_monthly").select("stripe_invoice_item_id,overage_messages").eq("company_id",companyId).eq("usage_month",usageMonth).maybeSingle();
      const amountMinor=Math.round(Number(usageRow?.overage_messages||1)*(usageCurrency==="USD"?2:3.5));const description=`JobPilot SMS usage - ${usageMonth.slice(0,7)}`;let invoiceItemId=usageRow?.stripe_invoice_item_id||null;
      if(invoiceItemId)await stripeRequest(stripeSecret,`/v1/invoiceitems/${encodeURIComponent(invoiceItemId)}`,"POST",{amount:amountMinor,description});
      else{const invoiceItem=await stripeRequest(stripeSecret,"/v1/invoiceitems","POST",{customer:company.stripe_customer_id,amount:amountMinor,currency:usageCurrency.toLowerCase(),description,metadata:{company_id:companyId,usage_month:usageMonth,product:"jobpilot_sms"}});invoiceItemId=invoiceItem.id||null;if(invoiceItemId)await admin.from("sms_usage_monthly").update({stripe_invoice_item_id:invoiceItemId,stripe_customer_id:company.stripe_customer_id}).eq("company_id",companyId).eq("usage_month",usageMonth);}
    }catch(error){stripeChargeError=error instanceof Error?error.message:String(error);console.error("SMS Stripe usage charge error",error);}
  }
  return json({success:true,id:providerId,recipient:normalizedRecipient,billable,usage:{month:usageMonth,total:totalMessages,included,overage:overageMessages,remaining:Math.max(included-totalMessages,0),currency:usageCurrency,overage_unit_price:overageUnitPrice},...(stripeChargeError?{stripe_charge_error:stripeChargeError}:{})});
});
