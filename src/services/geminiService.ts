import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const geminiService = {
  async rankJobs(jobs: any[], query: string) {
    if (!query || jobs.length === 0) return jobs;
    try {
      const prompt = `Rank these job IDs based on resonance with the query: "${query}". 
      Context: ProSync Oman professional networking platform.
      Return ONLY a JSON array of IDs.
      Jobs: ${JSON.stringify(jobs.map((j: any) => ({ id: j.id, title: j.title, description: j.description })))}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER }
          }
        }
      });

      const rankedIds = JSON.parse(response.text || "[]");
      return rankedIds.map((id: number) => jobs.find(j => j.id === id)).filter(Boolean);
    } catch (error) {
      console.error("AI ranking failed:", error);
      return jobs;
    }
  },

  async shortlistApplicants(jobDescription: string, applicants: any[]) {
    if (!jobDescription || applicants.length === 0) return applicants;
    try {
      const prompt = `Analyze these applicants for the job: "${jobDescription}". 
      Return a JSON array of objects with: applicantId, score (0-100), and reasoning.
      Applicants: ${JSON.stringify(applicants.map((a: any) => ({ id: a.user_id, name: a.full_name, headline: a.headline })))}`;

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
                reasoning: { type: Type.STRING }
              },
              required: ["applicantId", "score", "reasoning"]
            }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI shortlisting failed:", error);
      return null;
    }
  },

  async magicPost(content: string, instruction?: string) {
    if (!content && !instruction) return null;
    try {
      const prompt = `You are a professional social media manager for ProSync Oman, a high-end networking platform.
      Current Post Content: "${content || "(Empty)"}"
      User Request/Instruction: "${instruction || "Optimize this post for professional engagement."}"
      
      Instruction: 
      - If the user provided a request/instruction, follow it precisely to modify or generate the post content.
      - If only an instruction is provided (no content), write a full, engaging, and detailed post from scratch.
      - If current post content is provided, rewrite/optimize it based on the instruction.
      - Focus on the Omani professional market (ProSync Oman).
      - Output the post content in a clean, professional Markdown format (.md).
      - High-level Structure:
        1. Start with a punchy headline using an H2 header (e.g., ## The Future of Tech in Oman).
        2. Follow with 2-3 engaging paragraphs using professional yet encouraging tone.
        3. Use bullet points for key takeaways or highlights.
        4. End with 3-5 relevant professional hashtags (e.g., #OmanTech #Innovation).
      - Do NOT use H1 headers (keep it to H2/H3 for feed compatibility).
      - Do NOT wrap the result in code blocks like \`\`\`markdown.
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
                  correctIndex: { type: Type.INTEGER }
                }
              },
              poll: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            required: ["optimizedContent", "suggestedTags"]
          }
        }
      });

      return JSON.parse(response.text || "null");
    } catch (error) {
      console.error("AI magic post failed:", error);
      return null;
    }
  },

  async magicJobDescription(title: string, company: string, currentDescription: string, instruction?: string) {
    try {
      const prompt = `You are a professional technical recruiter for ProSync Oman.
      Job Title: "${title || "(TBD)"}"
      Company: "${company || "(TBD)"}"
      Current Description: "${currentDescription || ""}"
      Instruction: "${instruction || "Write an engaging, professional job description."}"
      
      Requirements:
      - Use professional Markdown (.md).
      - Include sections: ## Role Overview, ### Key Responsibilities, ### Requirements.
      - **CRITICAL**: Use specific bracket notation for skills: [SkillName] (e.g., [React], [Project Management]).
      - Mention the Omani market context.
      - Include 3-5 hashtags at the end (e.g., #OmanJobs #MuscatCareers).
      - Return JUST the Markdown content as a JSON object: { description }.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING }
            },
            required: ["description"]
          }
        }
      });

      return JSON.parse(response.text || "null");
    } catch (error) {
      console.error("AI job magic failed:", error);
      return null;
    }
  },

  async generateInteractiveContent(topic: string, type: 'quiz' | 'poll') {
    if (!topic) return null;
    try {
      const prompt = `Generate a professional ${type} about "${topic}" for ProSync Oman. return JSON.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: type === 'quiz' ? {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER }
            },
            required: ["question", "options", "correctIndex"]
          } : {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["question", "options"]
          }
        }
      });

      return JSON.parse(response.text || "null");
    } catch (error) {
      console.error("AI interactive content generation failed:", error);
      return null;
    }
  }
};
