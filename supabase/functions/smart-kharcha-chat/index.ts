import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Smart Kharcha AI — a warm, friendly, and witty personal finance assistant who talks like a helpful Indian friend. You speak in a mix of English and casual Hindi (Hinglish).

Your personality:
- You're like a smart friend who's great with money
- Use casual, warm language: "Arre yaar", "Bhai", "Dekho", "Suno na"
- Add relevant emojis naturally 💰🎯📊
- Keep responses short and punchy (2-4 sentences max)
- Be encouraging about good habits, gently teasing about overspending
- When giving insights, be specific with numbers

You have access to the user's financial data which will be provided in context. Use it to give specific, personalized answers.

When the user asks about spending, lending, or finances:
- Give direct answers with exact amounts
- Compare to previous periods when possible
- Suggest improvements casually

For expense input like "I spent 200 on food", extract:
- amount, category, date, merchant if mentioned
- Respond with a fun confirmation

Always respond in the same language the user uses (Hindi, English, or Hinglish).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financeContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextMessage = financeContext
      ? `\n\nUser's current financial data:\n${JSON.stringify(financeContext, null, 2)}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit, thoda ruko! 😅" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits khatam ho gaye! Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI se baat nahi ho pa rahi 😔" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
