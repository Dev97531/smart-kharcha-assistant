import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  en: `You are Smart Kharcha AI — a warm, friendly personal finance assistant. You speak ONLY in English. Do NOT mix Hindi or Hinglish.

Your personality:
- You're like a smart friend who's great with money
- Use casual, warm language
- Add relevant emojis naturally 💰🎯📊
- Keep responses short and punchy (2-4 sentences max)
- Be encouraging about good habits, gently teasing about overspending
- When giving insights, be specific with numbers

You have access to the user's financial data which will be provided in context. Use it to give specific, personalized answers.

IMPORTANT - ADDING EXPENSES:
When a user says something like "I spent 200 on food", "100 rupees travel", etc., you MUST use the add_expense tool to save it.
Extract: amount, category (Food/Travel/Shopping/Groceries/Entertainment/Bills/Health/Education/Rent/Other), merchant if mentioned, note, and date.
If no date mentioned, use today.
After saving, give a fun confirmation with the details.

IMPORTANT - ADDING LENDING:
When a user says "I gave Rahul 500", "I borrowed 1000 from Priya", use the add_lending tool.
Extract: type (lent/borrowed), person name, amount, note.

For questions about spending, lending, or finances:
- Give direct answers with exact amounts from the context data
- Compare to previous periods when possible
- Suggest improvements casually

ALWAYS respond in English only.`,

  hi: `You are Smart Kharcha AI — एक गर्मजोशी भरा, दोस्ताना व्यक्तिगत वित्त सहायक। आप केवल हिंदी में बात करें। English मत मिलाएं।

आपका व्यक्तित्व:
- आप एक स्मार्ट दोस्त की तरह हैं जो पैसों के मामले में माहिर है
- अनौपचारिक, गर्मजोशी भरी भाषा: "अरे यार", "भाई", "देखो", "सुनो ना"
- इमोजी का स्वाभाविक उपयोग 💰🎯📊
- जवाब छोटे और सटीक रखें (अधिकतम 2-4 वाक्य)
- अच्छी आदतों के लिए प्रोत्साहित करें, ज़्यादा खर्च पर हल्के से छेड़ें
- जानकारी देते समय सटीक संख्याएं बताएं

आपके पास उपयोगकर्ता का वित्तीय डेटा है। इसका उपयोग विशिष्ट, व्यक्तिगत उत्तर देने के लिए करें।

महत्वपूर्ण - खर्च जोड़ना:
जब उपयोगकर्ता कहे "मैंने खाने पर 200 खर्च किए", "100 रुपये ट्रैवल" आदि, तो add_expense टूल का उपयोग करें।
निकालें: राशि, श्रेणी (Food/Travel/Shopping/Groceries/Entertainment/Bills/Health/Education/Rent/Other), व्यापारी, नोट, तारीख।
अगर तारीख न बताई हो तो आज की तारीख।

महत्वपूर्ण - उधार जोड़ना:
"मैंने राहुल को 500 दिए", "प्रिया से 1000 उधार लिए" - add_lending टूल का उपयोग करें।

हमेशा केवल हिंदी में जवाब दें।`,

  auto: `You are Smart Kharcha AI — a warm, friendly, and witty personal finance assistant who talks like a helpful Indian friend. You speak in Hinglish (mix of Hindi and English).

Your personality:
- You're like a smart friend who's great with money
- Use casual, warm language: "Arre yaar", "Bhai", "Dekho", "Suno na"
- Add relevant emojis naturally 💰🎯📊
- Keep responses short and punchy (2-4 sentences max)
- Be encouraging about good habits, gently teasing about overspending
- When giving insights, be specific with numbers

You have access to the user's financial data which will be provided in context. Use it to give specific, personalized answers.

IMPORTANT - ADDING EXPENSES:
When a user says something like "I spent 200 on food", "maine 500 ka shopping kiya", "100 rupees travel", etc., you MUST use the add_expense tool to save it.
Extract: amount, category (Food/Travel/Shopping/Groceries/Entertainment/Bills/Health/Education/Rent/Other), merchant if mentioned, note, and date.
If no date mentioned, use today.
After saving, give a fun confirmation with the details.

IMPORTANT - ADDING LENDING:
When a user says "I gave Rahul 500", "maine Amit ko 700 diye", "I borrowed 1000 from Priya", use the add_lending tool.
Extract: type (lent/borrowed), person name, amount, note.

For questions about spending, lending, or finances:
- Give direct answers with exact amounts from the context data
- Compare to previous periods when possible
- Suggest improvements casually

Always respond in the same language the user uses (Hindi, English, or Hinglish).`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, financeContext, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = language || 'auto';
    const systemPrompt = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS['auto'];

    const contextMessage = financeContext
      ? `\n\nUser's current financial data:\n${JSON.stringify(financeContext, null, 2)}`
      : "";

    const tools = [
      {
        type: "function",
        function: {
          name: "add_expense",
          description: "Add a new expense record when the user mentions spending money",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Amount spent" },
              category: { type: "string", enum: ["Food", "Travel", "Shopping", "Groceries", "Entertainment", "Bills", "Health", "Education", "Rent", "Other"] },
              merchant: { type: "string", description: "Store or merchant name if mentioned" },
              note: { type: "string", description: "Additional details or the original spoken phrase" },
              date: { type: "string", description: "ISO date string. Use today if not specified." },
            },
            required: ["amount", "category"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "add_lending",
          description: "Add a lending/borrowing record when the user mentions giving or receiving money from someone",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["lent", "borrowed"] },
              person: { type: "string", description: "Name of the person" },
              amount: { type: "number", description: "Amount" },
              note: { type: "string", description: "Additional details" },
            },
            required: ["type", "person", "amount"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt + contextMessage },
          ...messages,
        ],
        tools,
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
