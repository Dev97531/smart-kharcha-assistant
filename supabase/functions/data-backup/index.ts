import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, data } = await req.json();

    if (action === "backup") {
      // Store backup data in a user-specific storage bucket
      const fileName = `backups/${user.id}/smart-kharcha-backup.json`;
      const backupData = JSON.stringify({
        ...data,
        backupDate: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
      });

      const { error: uploadError } = await supabase.storage
        .from("user-backups")
        .upload(fileName, new Blob([backupData], { type: "application/json" }), {
          upsert: true,
        });

      if (uploadError) {
        console.error("Backup upload error:", uploadError);
        return new Response(JSON.stringify({ error: "Backup failed: " + uploadError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Backup saved!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restore") {
      const fileName = `backups/${user.id}/smart-kharcha-backup.json`;
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("user-backups")
        .download(fileName);

      if (downloadError) {
        return new Response(JSON.stringify({ error: "No backup found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const text = await fileData.text();
      const parsed = JSON.parse(text);

      return new Response(JSON.stringify({ success: true, data: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Backup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
