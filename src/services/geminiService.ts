import { fetchAPI } from "../lib/utils";

export const geminiService = {
  async rankJobs(jobs: any[], query: string) {
    if (!query || jobs.length === 0) return jobs;
    try {
      const rankedIds = await fetchAPI('/api/ai/rank-jobs', {
        method: 'POST',
        body: JSON.stringify({ query, jobs })
      });
      return rankedIds.map((id: number) => jobs.find(j => j.id === id)).filter(Boolean);
    } catch (error) {
      console.error("AI ranking failed:", error);
      return jobs;
    }
  },

  async shortlistApplicants(jobDescription: string, applicants: any[]) {
    if (!jobDescription || applicants.length === 0) return applicants;
    try {
      return await fetchAPI('/api/ai/shortlist-applicants', {
        method: 'POST',
        body: JSON.stringify({ jobDescription, applicants })
      });
    } catch (error) {
      console.error("AI shortlisting failed:", error);
      return null;
    }
  },

  async optimizePost(content: string) {
    try {
      return await fetchAPI('/api/ai/optimize-post', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    } catch (error) {
      console.error("AI post optimization failed:", error);
      return null;
    }
  },

  async generateInteractiveContent(topic: string, type: 'quiz' | 'poll') {
    try {
      return await fetchAPI('/api/ai/interactive-content', {
        method: 'POST',
        body: JSON.stringify({ topic, type })
      });
    } catch (error) {
      console.error("AI interactive content generation failed:", error);
      return null;
    }
  }
};
