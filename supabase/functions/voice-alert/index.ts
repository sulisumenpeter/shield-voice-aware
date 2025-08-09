import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoiceAlertRequest {
  text: string;
  voiceId?: string; // default Aria
  modelId?: string; // default eleven_turbo_v2_5
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const XI_API_KEY = Deno.env.get("XI_API_KEY");
    if (!XI_API_KEY) {
      console.error("XI_API_KEY is not set");
      return new Response(JSON.stringify({ error: "XI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceId, modelId }: VoiceAlertRequest = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "'text' is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vid = voiceId || "9BWtsMINqrJLrRacOk9x"; // Aria
    const mid = modelId || "eleven_turbo_v2_5";

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}?optimize_streaming_latency=2`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": XI_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: mid,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error("ElevenLabs error:", errTxt);
      return new Response(JSON.stringify({ error: "TTS failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuf = await resp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    const b64 = btoa(binary);

    return new Response(JSON.stringify({ audio: b64, format: "mp3" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-alert error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
