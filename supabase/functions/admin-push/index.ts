import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BHHdZvpO9n1O9GkxaVLo7qmocYkmZQJC49wzHrJ8X78IySOrB-tnlTMfEuoKj54Mhyo3bff9LPa_Q_Vabg9c5qo";
const VAPID_SUBJECT = "mailto:admin@jobpilot.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPrivateKey) return json({ error: "Push notifications are not configured yet." }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));

  if (body.action === "subscribe") {
    if (user.id !== ADMIN_USER_ID) return json({ error: "Forbidden" }, 403);

    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription?.p256dh || !subscription?.auth) {
      return json({ error: "Invalid push subscription." }, 400);
    }

    const { error } = await adminClient.from("push_subscriptions").upsert({
      user_id: ADMIN_USER_ID,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: subscription.user_agent || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });

    if (error) {
      console.error(error);
      return json({ error: "Could not save push subscription." }, 500);
    }

    return json({ ok: true, vapid_public_key: VAPID_PUBLIC_KEY });
  }

  if (body.action === "feedback") {
    if (!body.feedback_id) return json({ error: "Missing feedback id." }, 400);

    const { data: feedback, error: feedbackError } = await adminClient
      .from("feedback")
      .select("id, user_id, type, subject, message, priority, created_at")
      .eq("id", body.feedback_id)
      .maybeSingle();

    if (feedbackError || !feedback || feedback.user_id !== user.id) {
      return json({ error: "Feedback not found." }, 404);
    }

    const { data: subscriptions, error: subscriptionError } = await adminClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", ADMIN_USER_ID);

    if (subscriptionError) return json({ error: "Could not load push subscriptions." }, 500);

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, vapidPrivateKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, business_name")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = profile?.full_name || profile?.business_name || "JobPilot user";
    const payload = JSON.stringify({
      title: "New JobPilot feedback",
      body: `${senderName}: ${feedback.subject}`,
      url: "/#feedback",
      tag: `feedback-${feedback.id}`
    });

    let sent = 0;
    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        }, payload, { TTL: 60 });
        sent++;
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from("push_subscriptions").delete().eq("id", subscription.id);
        } else {
          console.error("Push delivery failed:", error);
        }
      }
    }

    return json({ ok: true, sent });
  }

  return json({ error: "Unknown action." }, 400);
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
