// JobPilot regional tax display normalizer.
// Prevents legacy or AI-generated VAT terminology from appearing in markets
// that use a different tax system. It does not change stored tax amounts.

import { getJobPilotTaxProfile } from "./regional-tax.js";

let updating=false;

function getCountry(){
  try{
    const local=JSON.parse(localStorage.getItem("jobpilot_app_preferences")||"{}");
    return String(local.countryCode||"GB").toUpperCase();
  }catch{return "GB";}
}

function normalizeText(text){
  if(!text) return text;
  const profile=getJobPilotTaxProfile(getCountry());
  if(profile.taxLabel==="VAT") return text;
  let result=text;
  result=result.replace(/\bValue Added Tax\b/gi,profile.taxLabel);
  result=result.replace(/\bVAT\b/gi,profile.taxLabel);
  return result;
}

function normalizeNode(node){
  if(!node) return;
  if(node.nodeType===Node.TEXT_NODE){
    const next=normalizeText(node.nodeValue);
    if(next!==node.nodeValue) node.nodeValue=next;
    return;
  }
  if(node.nodeType!==Node.ELEMENT_NODE) return;
  if(node.matches("script,style,noscript,option")) return;
  node.childNodes.forEach(normalizeNode);
  ["placeholder","title","aria-label"].forEach(attribute=>{
    if(!node.hasAttribute(attribute)) return;
    const current=node.getAttribute(attribute);
    const next=normalizeText(current);
    if(next!==current) node.setAttribute(attribute,next);
  });
}

function refresh(){
  if(updating) return;
  updating=true;
  try{document.body?.childNodes.forEach(normalizeNode);}finally{updating=false;}
}

function start(){
  if(!document.body) return;
  refresh();
  const observer=new MutationObserver(mutations=>{
    if(updating) return;
    updating=true;
    try{
      mutations.forEach(m=>{
        m.addedNodes.forEach(normalizeNode);
        if(m.type==="characterData") normalizeNode(m.target);
      });
    }finally{updating=false;}
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener("jobpilot:preferences-changed",refresh);
  window.addEventListener("jobpilot:tax-settings-changed",refresh);
  window.JobPilotRegionalTaxDisplay={refresh};
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
