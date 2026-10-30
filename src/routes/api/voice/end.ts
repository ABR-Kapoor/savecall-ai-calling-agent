import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";
import { extractAuthUserFromRequest } from "@/lib/auth/clerk.server";

const CallEndInput = z.object({
  callSessionId: z.string().uuid(),
  durationSeconds: z.number().int().nonnegative(),
  turnsCount: z.number().int().nonnegative().optional().default(0),
  reason: z.string().max(100).optional().default("user_ended"),
  summary: z.string().max(200).optional(),
  recordingUrl: z.string().url().optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system", "tool"]),
        content: z.string(),
      })
    )
    .optional(),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/voice/end")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = CallEndInput.parse(await request.json().catch(() => ({})));
          const auth = await extractAuthUserFromRequest(request);
          const { data: session, error: sessionLookupError } = await insforgeServer.database
            .from("call_sessions")
            .select("id, tenant_id, status, metadata")
            .eq("id", body.callSessionId)
            .maybeSingle();
          if (sessionLookupError) throw new Error("Could not verify the voice session.");
          if (!session) return json({ error: "Voice session not found." }, 404);
          if (session.status !== "active") return json({ error: "Voice session is already closed." }, 409);

          const isPublicDemo = (session.metadata as Record<string, unknown> | null)?.["public_demo"] === true;
          if (!isPublicDemo) {
            if (!auth) return json({ error: "Sign in to close this organisation voice session." }, 401);
            const { data: membership } = await insforgeServer.database
              .from("tenant_members")
              .select("tenant_id")
              .eq("tenant_id", session.tenant_id)
              .eq("clerk_user_id", auth.userId)
              .eq("status", "active")
              .maybeSingle();
            if (!membership) return json({ error: "This voice session is outside your organisation." }, 403);
          }

          // Format or fallback to a concise 3-word summary
          let threeWordSummary = body.summary?.trim() || "";
          if (!threeWordSummary) {
            threeWordSummary = "Call Session Completed";
          } else {
            // Keep strictly to 3 words if longer
            const words = threeWordSummary.split(/\s+/).filter(Boolean);
            threeWordSummary = words.slice(0, 3).join(" ");
          }

          const updatePayload: Record<string, any> = {
            status: "completed",
            ended_at: new Date().toISOString(),
            duration_sec: body.durationSeconds,
            summary: threeWordSummary,
          };

          if (body.recordingUrl) {
            updatePayload["recording_url"] = body.recordingUrl;
          }

          const { error } = await insforgeServer.database
            .from("call_sessions")
            .update(updatePayload)
            .eq("id", body.callSessionId);

          if (error) throw new Error("Could not save the voice session result.");

          // Persist transcript turns into messages table
          if (body.transcript && body.transcript.length > 0) {
            try {
              const rows = body.transcript.map((t) => ({
                call_session_id: body.callSessionId,
                role: t.role,
                content: t.content,
              }));
              await insforgeServer.database.from("messages").insert(rows);
            } catch (mErr: any) {
              console.warn("Transcript messages insert notice:", mErr?.message);
            }
          }

          return json({
            success: true,
            callSessionId: body.callSessionId,
            summary: threeWordSummary,
          });
        } catch (err: any) {
          console.error("Call end error:", err);
          return json({ error: err.message || "Failed to finalize call session" }, 400);
        }
      },
    },
  },
});
