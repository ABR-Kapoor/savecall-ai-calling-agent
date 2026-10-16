import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";

const CallEndInput = z.object({
  callSessionId: z.string().uuid(),
  durationSeconds: z.number().int().nonnegative(),
  turnsCount: z.number().int().nonnegative().optional().default(0),
  reason: z.string().max(100).optional().default("user_ended"),
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

          const { error } = await insforgeServer.database
            .from("call_sessions")
            .update({
              status: "completed",
              ended_at: new Date().toISOString(),
              duration_seconds: body.durationSeconds,
              turn_count: body.turnsCount,
            })
            .eq("id", body.callSessionId);

          if (error) {
            console.warn("Failed to persist call session completion:", error.message);
          }

          return json({ success: true, callSessionId: body.callSessionId });
        } catch (err: any) {
          console.error("Call end error:", err);
          return json({ error: err.message || "Failed to finalize call session" }, 400);
        }
      },
    },
  },
});
