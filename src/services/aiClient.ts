import * as api from "./api";

type MagicPostResult = {
  optimizedContent: string;
  suggestedTags: string[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
  } | null;
  poll?: {
    question: string;
    options: string[];
  } | null;
};

type MagicPostStreamOptions = {
  onChunk?: (chunkText: string, fullText: string) => void;
};

const readSSE = async (
  response: Response,
  handlers: {
    onChunk?: (payload: any) => void;
    onDone?: (payload: any) => void;
    onError?: (payload: any) => void;
  },
) => {
  if (!response.body) throw new Error("AI stream is not available");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const lines = rawEvent.split("\n");
      let eventName = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }

      if (!data) continue;
      let parsed: any = null;
      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = { text: data };
      }

      if (eventName === "chunk") handlers.onChunk?.(parsed);
      else if (eventName === "done") handlers.onDone?.(parsed);
      else if (eventName === "error") handlers.onError?.(parsed);
    }
  }
};

export const geminiService = {
  async rankJobs(jobs: any[], query: string) {
    const resp = await api.ai.rankJobs(jobs, query);
    return resp?.ranked || jobs;
  },

  async shortlistApplicants(jobDescription: string, applicants: any[]) {
    const resp = await api.ai.shortlistApplicants(jobDescription, applicants);
    return resp?.feedback || [];
  },

  async magicBio(bio: string, instruction: string): Promise<string | null> {
    const resp = await api.ai.magicBio(bio, instruction);
    return resp?.bio || null;
  },

  async generateInteractiveContent(topic: string, type: "quiz" | "poll") {
    const resp = await api.ai.generateInteractive(topic, type);
    return resp?.result || null;
  },

  async magicPost(content: string, instruction?: string, options?: MagicPostStreamOptions): Promise<MagicPostResult | null> {
    const response = await fetch("/api/ai/magic-post/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, instruction }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `AI stream failed with status ${response.status}`);
    }

    let finalResult: MagicPostResult | null = null;
    let streamErr: string | null = null;

    await readSSE(response, {
      onChunk: (payload) => {
        options?.onChunk?.(payload?.text || "", payload?.fullText || "");
      },
      onDone: (payload) => {
        finalResult = payload?.result || null;
      },
      onError: (payload) => {
        streamErr = payload?.message || "AI stream failed";
      },
    });

    if (streamErr) throw new Error(streamErr);
    return finalResult;
  },
};
