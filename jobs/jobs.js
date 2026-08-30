import { supabase } from "../supabase.js";

export let jobs = [];

export async function loadJobs() {
  const { data, error } = await supabase.from("jobs").select("*").order("scheduled_date", { ascending: true, nullsFirst: false });
  if (error) { console.error("Jobs:", error); return []; }
  jobs = data || [];
  return jobs;
}

export async function createJob(job) {
  const { data, error } = await supabase.from("jobs").insert(job).select().single();
  if (error) throw error;
  jobs = [data, ...jobs];
  return data;
}

export async function updateJob(id, updates) {
  const { data, error } = await supabase.from("jobs").update(updates).eq("id", id).select().single();
  if (error) throw error;
  jobs = jobs.map(job => String(job.id) === String(id) ? data : job);
  return data;
}

export async function deleteJob(id) {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
  jobs = jobs.filter(job => String(job.id) !== String(id));
}

export async function createNextRecurringAppointment(sourceJob) {
  if (!sourceJob || !sourceJob.recurring || !sourceJob.recurring_active || !sourceJob.scheduled_date) return null;
  const interval = Number(sourceJob.recurring_interval_weeks) || 4;
  const seriesId = sourceJob.recurring_parent_id || sourceJob.id;
  let candidateDate = new Date(`${sourceJob.scheduled_date}T12:00:00`);
  let existingJob = true;
  while (existingJob) {
    candidateDate.setDate(candidateDate.getDate() + interval * 7);
    const candidateDateString = candidateDate.toISOString().split("T")[0];
    existingJob = jobs.find(item => String(item.recurring_parent_id || item.id) === String(seriesId) && String(item.scheduled_date) === candidateDateString);
  }
  const nextJob = {
    user_id: sourceJob.user_id,
    customer_id: sourceJob.customer_id,
    title: sourceJob.title,
    description: sourceJob.description,
    scheduled_date: candidateDate.toISOString().split("T")[0],
    scheduled_time: sourceJob.scheduled_time,
    status: "scheduled",
    price: sourceJob.price,
    notes: sourceJob.notes,
    recurring: true,
    recurring_interval_weeks: interval,
    recurring_parent_id: seriesId,
    recurring_active: true
  };
  const { data, error } = await supabase.from("jobs").insert(nextJob).select().single();
  if (error) throw error;
  jobs.push(data);
  return data;
}

export async function skipNextRecurringJob(jobId) {
  const job = jobs.find(item => String(item.id) === String(jobId));
  if (!job || !job.recurring || !job.recurring_active) return null;
  const seriesId = job.recurring_parent_id || job.id;
  const nextJob = jobs.filter(item => String(item.recurring_parent_id || item.id) === String(seriesId) && String(item.id) !== String(job.id) && String(item.status).toLowerCase() !== "completed" && String(item.status).toLowerCase() !== "cancelled").sort((a,b) => (a.scheduled_date || "9999-12-31").localeCompare(b.scheduled_date || "9999-12-31"))[0];
  if (!nextJob) return null;
  const { error } = await supabase.from("jobs").update({ status: "cancelled" }).eq("id", nextJob.id);
  if (error) throw error;
  await createNextRecurringAppointment(nextJob);
  await loadJobs();
  return nextJob;
}

export async function stopRecurringJob(jobId) {
  const job = jobs.find(item => String(item.id) === String(jobId));
  if (!job || !job.recurring) return null;
  const seriesId = job.recurring_parent_id || job.id;
  const { error } = await supabase.from("jobs").update({ recurring_active: false }).or(`id.eq.${seriesId},recurring_parent_id.eq.${seriesId}`);
  if (error) throw error;
  await loadJobs();
  return true;
}
