import { supabase } from "../supabase.js";

export let jobs = [];

export async function loadJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Jobs:", error);
    return [];
  }

  jobs = data || [];
  return jobs;
}

export async function createJob(job) {
  const { data, error } = await supabase
    .from("jobs")
    .insert(job)
    .select()
    .single();

  if (error) throw error;
  jobs = [data, ...jobs];
  return data;
}

export async function updateJob(id, updates) {
  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  jobs = jobs.map(job => job.id === id ? data : job);
  return data;
}

export async function deleteJob(id) {
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id);

  if (error) throw error;
  jobs = jobs.filter(job => job.id !== id);
}
