import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";

/**
 * Text-to-Speech Router
 * Uses OpenAI's TTS API for natural, human-like voice synthesis
 */
export const ttsRouter = router({
  /**
   * Generate natural speech from text using OpenAI TTS
   * Returns audio as base64-encoded MP3
   */
  generateSpeech: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(4096), // OpenAI TTS limit
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
        speed: z.number().min(0.25).max(4.0).default(1.0),
      })
    )
    .mutation(async ({ input }) => {
      if (!ENV.openaiApiKey) {
        throw new Error("OpenAI API key not configured");
      }

      try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ENV.openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1", // Use tts-1-hd for even higher quality (but slower)
            input: input.text,
            voice: input.voice,
            speed: input.speed,
            response_format: "mp3",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[TTS] OpenAI API error:", errorText);
          throw new Error(`TTS API failed: ${response.status} ${response.statusText}`);
        }

        // Convert audio buffer to base64
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");

        return {
          audio: base64Audio,
          format: "mp3",
        };
      } catch (error: any) {
        console.error("[TTS] Error generating speech:", error.message);
        throw new Error(`Failed to generate speech: ${error.message}`);
      }
    }),
});
