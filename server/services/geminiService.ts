import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });

const ensureConfigured = () => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
};

const parseJsonSafe = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
};

const extractHashtags = (text: string): string[] => {
  const matches = text.match(/#[a-z0-9_]+/gi) || [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase()))).slice(0, 8);
};

export const geminiService = {
  async rankJobs(jobs: any[], query: string) {
    ensureConfigured();
    if (!query || jobs.length === 0) return jobs;

    try {
      const prompt = `Rank these job IDs based on resonance with the query: "${query}".
Context: ProSync Oman professional networking platform.
Return ONLY a JSON array of IDs.
Jobs: ${JSON.stringify(jobs.map((j: any) => ({ id: j.id, title: j.title, description: j.description })))} `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
          },
        },
      });

      const rankedIds = parseJsonSafe<any[]>(response.text, []);
      return rankedIds.map((id: number) => jobs.find((j) => j.id === id)).filter(Boolean);
    } catch (error) {
      console.error("AI ranking failed:", error);
      return jobs;
    }
  },

  async shortlistApplicants(jobDescription: string, applicants: any[]) {
    ensureConfigured();
    if (!jobDescription || applicants.length === 0) return applicants;

    try {
      const prompt = `Analyze these applicants for the job: "${jobDescription}".
Return a JSON array of objects with: applicantId, score (0-100), and reasoning.
Applicants: ${JSON.stringify(applicants.map((a: any) => ({ id: a.user_id, name: a.full_name, headline: a.headline })))} `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                applicantId: { type: Type.INTEGER },
                score: { type: Type.INTEGER },
                reasoning: { type: Type.STRING },
              },
              required: ["applicantId", "score", "reasoning"],
            },
          },
        },
      });

      return parseJsonSafe<any[]>(response.text, []);
    } catch (error) {
      console.error("AI shortlisting failed:", error);
      return null;
    }
  },

  async magicPost(content: string, instruction?: string) {
    ensureConfigured();
    if (!content && !instruction) return null;

    try {
      const prompt = `You are a professional social media manager for ProSync Oman, a high-end networking platform.
Current Post Content: "${content || "(Empty)"}"
User Request/Instruction: "${instruction || "Optimize this post for professional engagement."}"

Instruction:
- If the user provided a request/instruction, follow it precisely to modify or generate the post content.
- If the current post content is provided and the instruction is general, rewrite the content to be more professional, punchy, and engaging.
- If only an instruction is provided (no content), write a full, engaging, and detailed post from scratch following that instruction.
- Focus on the Omani professional market.
- Use Markdown formatting (bold, bullet points, headers) to make the content well-structured and highly readable.
- Include relevant professional hashtags.
- Return JSON object: { optimizedContent, suggestedTags, quiz, poll }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              optimizedContent: { type: Type.STRING },
              suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              quiz: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                },
              },
              poll: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            required: ["optimizedContent", "suggestedTags"],
          },
        },
      });

      return parseJsonSafe<any>(response.text, null);
    } catch (error) {
      console.error("AI magic post failed:", error);
      return null;
    }
  },

  async *magicPostStream(content: string, instruction?: string) {
    ensureConfigured();
    if (!content && !instruction) return;

    const prompt = `You are a professional social media manager for ProSync Oman, a high-end networking platform.
Current Post Content: "${content || "(Empty)"}"
User Request/Instruction: "${instruction || "Optimize this post for professional engagement."}"

Instruction:
- Return ONLY the final polished post text in markdown.
- Focus on the Omani professional market.
- Make it engaging, clear, and concise.
- Include relevant professional hashtags at the end.`;

    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    for await (const chunk of response) {
      const text = chunk.text || "";
      if (text) {
        yield text;
      }
    }
  },

  async generateInteractiveContent(topic: string, type: "quiz" | "poll") {
    ensureConfigured();
    if (!topic) return null;

    try {
      const prompt = `Generate a professional ${type} about "${topic}" for ProSync Oman. return JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema:
            type === "quiz"
              ? {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                  },
                  required: ["question", "options", "correctIndex"],
                }
              : {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["question", "options"],
                },
        },
      });

      return parseJsonSafe<any>(response.text, null);
    } catch (error) {
      console.error("AI interactive content generation failed:", error);
      return null;
    }
  },

  async magicBio(bio: string, instruction: string) {
    ensureConfigured();

    try {
      const prompt = `You are a professional profile writer for ProSync Oman, a high-end networking platform.
Current Bio: "${bio || "(Empty)"}"
User Instruction: "${instruction}"

Instructions:
- Rewrite or generate the bio following the user's instruction precisely.
- Keep it concise, professional, and in first-person voice.
- Use Markdown formatting (bold, bullet points, etc.) sparingly to enhance readability.
- Focus on the Omani professional market context.
- Return ONLY the new bio text, no explanations.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      return response.text?.trim() || null;
    } catch (error) {
      console.error("AI magic bio failed:", error);
      return null;
    }
  },

  buildMagicPostResultFromText(text: string) {
    return {
      optimizedContent: text,
      suggestedTags: extractHashtags(text),
      quiz: null,
      poll: null,
    };
  },
};
