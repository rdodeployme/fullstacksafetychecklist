import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationRequest = {
  eventType: string;
  issueId?: string;
};

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase service configuration", { status: 500 });
  }

  const body = (await request.json()) as NotificationRequest;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!body.issueId) {
    return Response.json({ ok: true, skipped: "No issue id provided" });
  }

  const { data: issue, error } = await supabase
    .from("issues")
    .select("id,title,priority,status,created_by_name")
    .eq("id", body.issueId)
    .single();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  // Wire an email provider here, for example Resend, SendGrid, or SMTP relay.
  // This function records the notification lifecycle server-side so secrets never
  // need to be exposed to the browser.
  await supabase
    .from("notification_events")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("issue_id", issue.id)
    .eq("event_type", body.eventType);

  return Response.json({ ok: true, issue });
});
