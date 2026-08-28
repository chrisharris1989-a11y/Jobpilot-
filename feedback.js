import { supabase } from "./supabase.js";

export function showFeedbackForm() {
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `<div class="modal-content"><div class="modal-header"><div><h2>Feedback & Report a Problem</h2><p>Help us improve JobPilot.</p></div><button class="close">×</button></div><form id="feedbackForm"><label>What would you like to do?</label><select id="feedbackType" required><option value="bug">🐛 Report a problem</option><option value="feature">💡 Suggest an improvement</option><option value="general">💬 General feedback</option></select><label>Subject *</label><input id="feedbackSubject" required maxlength="150" placeholder="e.g. Invoice won't save"><label>Tell us what happened *</label><textarea id="feedbackMessage" required rows="7" maxlength="5000" placeholder="Tell us what happened or what you would like to see..."></textarea><label>Priority</label><select id="feedbackPriority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select><div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Send Feedback</button></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll(".close").forEach(button=>button.addEventListener("click",()=>modal.remove()));
  modal.querySelector("#feedbackForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){alert("You must be logged in to send feedback.");return;}
    const feedback={user_id:user.id,type:modal.querySelector("#feedbackType").value,subject:modal.querySelector("#feedbackSubject").value.trim(),message:modal.querySelector("#feedbackMessage").value.trim(),priority:modal.querySelector("#feedbackPriority").value,status:"open",page:window.location.hash||document.title,user_agent:navigator.userAgent};
    const {data:inserted,error}=await supabase.from("feedback").insert(feedback).select("id").single();
    if(error){console.error("Feedback error:",error);alert("Your feedback could not be sent:\n\n"+error.message);return;}
    if(inserted?.id){
      const {data:pushData,error:pushError}=await supabase.functions.invoke("admin-push-v2",{body:{action:"feedback",feedback_id:inserted.id}});
      console.log("Admin push result:",pushData,pushError);
      if(pushError){console.error("Admin push invocation failed:",pushError);}
    }
    modal.remove();
    alert("Thank you! Your feedback has been sent.");
  });
}
