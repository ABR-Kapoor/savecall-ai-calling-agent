import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Headphones,
  LoaderCircle,
  MessageSquareText,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  provider?: "groq" | "gemini";
  citations?: Array<{ sourceName?: string; pageNumber?: number | null }>;
};

const suggestions = [
  "What is an insurance deductible?",
  "What information is on a policy schedule?",
  "How does a premium differ from a claim?",
  "What does third-party liability mean?",
];

export function InsuranceHeroPanel() {
  const { user } = useUser();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, isLoading]);

  const sendMessage = async (value: string) => {
    const query = value.trim();
    if (!query || isLoading) return;

    setError(null);
    setMessages((previous) => [...previous, { id: nextId.current++, role: "user", text: query }]);
    setDraft("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, isLandingDemo: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "The preview is unavailable. Please try again.");
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("The assistant returned an empty response. Please try again.");

      const citations = Array.isArray(data.citations)
        ? data.citations.filter(
            (item: unknown) =>
              !!item &&
              typeof item === "object" &&
              typeof (item as { sourceName?: unknown }).sourceName === "string" &&
              Boolean((item as { sourceName: string }).sourceName.trim()),
          )
        : [];
      setMessages((previous) => [
        ...previous,
        {
          id: nextId.current++,
          role: "assistant",
          text: reply,
          ...(data.provider === "gemini" || data.provider === "groq"
            ? { provider: data.provider }
            : {}),
          citations,
        },
      ]);
    } catch (caught) {
      setDraft(query);
      setError(
        caught instanceof Error ? caught.message : "The preview is unavailable. Please retry.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      aria-label="InsurCall interactive text preview"
      className="overflow-hidden rounded-[1.35rem] border border-[#D5E0DB] bg-white shadow-[0_24px_65px_-40px_rgba(20,43,45,0.55)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#E4EBE7] bg-[#FCFDFC] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#123B3D] text-[#C1E2D4]">
            <Headphones className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-[#193331]">
              InsurCall assistant
            </p>
            <p className="mt-0.5 text-[10px] text-[#71807A]">
              Interactive preview · general information
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DFE9E3] bg-white px-2.5 py-1 text-[10px] font-medium text-[#52675D]">
          <MessageSquareText className="size-3.5" /> Text
        </span>
      </header>

      <div className="px-4 pt-4 sm:px-5">
        <div
          ref={threadRef}
          role="log"
          aria-label="Preview conversation"
          aria-live="polite"
          aria-relevant="additions"
          className="max-h-[230px] min-h-[106px] space-y-3 overflow-y-auto overscroll-contain pr-1"
        >
          {messages.length === 0 ? (
            <div className="py-1">
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#193331]">
                Hi. What would you like to understand about insurance?
              </p>
              <p className="mt-1 text-xs text-[#75817B]">
                Choose a general question or type your own. Please don’t enter personal or policy
                details.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    message.role === "user"
                      ? "bg-[#173E3B] text-white"
                      : "border border-[#E4EBE7] bg-[#F7F9F7] text-[#394B45]"
                  }`}
                >
                  {message.role === "assistant" && (
                    <p className="mb-1 border-b border-[#E6EDE9] pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#3A6B56]">
                      {message.provider
                        ? `General information · ${message.provider === "gemini" ? "Gemini" : "Groq"}`
                        : "General information"}
                    </p>
                  )}
                  <p>{message.text}</p>
                  {message.citations?.map((citation, index) => (
                    <p
                      key={`${citation.sourceName}-${index}`}
                      className="mt-1 text-[10px] text-[#527867]"
                    >
                      Source: {citation.sourceName}
                      {citation.pageNumber ? ` · p. ${citation.pageNumber}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#6F7E77]" role="status">
              <LoaderCircle className="size-3.5 animate-spin text-[#087F8C]" /> Checking the
              available information…
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Suggested general questions">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                disabled={isLoading}
                onClick={() => void sendMessage(question)}
                className="min-h-8 rounded-full border border-[#DCE6E0] bg-white px-2.5 py-1.5 text-left text-[10px] leading-tight text-[#43554D] transition-colors hover:border-[#8DB6A3] hover:bg-[#F5F9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C] disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(draft);
          }}
        >
          <label className="sr-only" htmlFor="insurance-preview-question">
            Type a general insurance question
          </label>
          <textarea
            id="insurance-preview-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(draft);
              }
            }}
            maxLength={500}
            rows={1}
            placeholder="Ask a general insurance question…"
            disabled={isLoading}
            className="min-h-10 max-h-24 min-w-0 flex-1 resize-y rounded-lg border border-[#DCE5E0] bg-white px-3 py-2.5 text-xs text-[#263A35] outline-none placeholder:text-[#909B95] focus:border-[#5B9886] focus:ring-2 focus:ring-[#087F8C]/15 disabled:bg-[#F7F9F7]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isLoading}
            aria-label="Send message"
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#087F8C] text-white transition-colors hover:bg-[#076C77] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#B7C7C0]"
          >
            <ArrowUpRight className="size-4" />
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            {error}
          </p>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF1EE] px-4 py-3 text-[10px] text-[#818D86] sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-[#528271]" /> Preview answers are not policy
          decisions.
        </span>
        <Link
          to={user ? "/voice" : "/auth"}
          className="inline-flex min-h-8 items-center gap-1 font-medium text-[#356B60] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C]"
        >
          <Mic className="size-3.5" /> {user ? "Open LiveKit voice" : "Sign in for voice"}
          <ArrowUpRight className="size-3" />
        </Link>
      </footer>
    </section>
  );
}
