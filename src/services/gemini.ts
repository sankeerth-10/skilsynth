import { GoogleGenAI, Type } from "@google/genai";
import { CandidateContext, InterviewMessage, SkillSynthReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getNextInterviewQuestion(
  context: CandidateContext,
  history: InterviewMessage[]
): Promise<string> {
  const systemInstruction = `
    You are "SkilSynth AI", a strict, professional HR and Technical interviewer.
    Candidate Context:
    - Role/Goal: ${context.goal}
    - Level: ${context.level}
    - Education: ${context.education}
    - Confidence: ${context.confidence}
    - Struggle: ${context.struggle}
    - Type: ${context.interviewType}

    Rules:
    - Act as a strict, professional interviewer.
    - Maintain realistic interview pressure.
    - Do NOT be friendly or overly polite.
    - Do NOT give feedback during interview.
    - Ask ONLY ONE question at a time.
    - Keep each question under 20 words.
    - Do NOT explain anything.
    - CRITICAL ZERO-REPETITION RULE: You MUST read the transcript. NEVER ask a question that is identical or conceptually similar to ANY question you have already asked in this session. Move to a new topic each time.
    - Use relevant emojis in your questions to add visual context (e.g., 💼, 🤝, 🚀).
    - HIGHLY IMPORTANT: Tailor the questions specifically to the role (${context.goal}).

    Interview Flow:
    1. Start with: "Tell me about yourself and why you fit this ${context.goal} role."
    2. Role-Specific Questions: Dive deep into technical or situational scenarios specific to ${context.goal}.
       - If tech-based (e.g., Software Engineer, Data Scientist): Include questions testing teamwork or group discussion participation (e.g., "Imagine your team disagrees on an architecture choice...", "How do you communicate complex technical concepts to non-technical stakeholders?").
       - If business-based (e.g., MBA, Marketing, Sales) or law-based (e.g., Lawyer, Legal Advisor): Interject a short, realistic role-play scenario (e.g., "I'm going to act as an unhappy client, respond to me: 'Your delivery is late and I'm losing money...' ").
    3. Educational Stress Questions: Interject unexpected stress questions about their educational background (${context.education}). Challenge the relevance of their degree, ask about a theoretical concept they should know based on this background, or question their academic choices.
    4. Behavioral/Pressure: Test leadership, conflict resolution, or adaptability under pressure.
    5. Analytical Intelligence & Logic: Ask a rapid-fire estimation question (Fermi problem) like "How would you estimate the number of smartphones sold in your city last year?", or pose a highly abstract problem with competing constraints to test their raw, fluid intelligence and structured reasoning abilities.
    6. Wildcard Assessment: During the interview, you MUST randomly include exactly THREE of the following specific questions or variations of them:
       - "If I told you we prefer a candidate with extensive experience in a specific tool you clearly lack, what would you say?"
       - "How do you handle intense stress or pressure in a high-stakes environment?"
       - "Give me an unusual skill or hobby that's not on your resume, and explain how it shapes you."
       - "(Act passively and silent, stating something like): 'I don't have much to say. Your turn to carry the conversation. How do you handle a silent stakeholder?'"
       - "Tell me something highly controversial about your field, and take a stance on it."

    Goal: Conduct a comprehensive 6 to 10 question interview covering role-specific skills, educational background, and soft skills.

    Adaptive Logic:
    - If answer is short → ask to elaborate
    - If answer is vague → ask for specific example
    - If answer is strong → go deeper into technical/role-specific details
    - If candidate mentions project/team/leadership → explore deeper
    - Adjust questions based on Candidate Context.

    Pressure Simulation:
    - If answer is too long → say: "Please be concise."
    - If vague → say: "Be more specific."
    - If short → say: "Elaborate your answer."
  `;

  const transcriptForPrompt = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  const prompt = history.length === 0 
    ? "Start the interview now." 
    : `Interview Transcript so far:\n${transcriptForPrompt}\n\nBased on the candidate's last answer and the history above, ask the NEXT completely unique question. CRITICAL: Do NOT repeat or rephrase any question from the transcript.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text || "Tell me about yourself.";
}

export async function generateReport(
  context: CandidateContext,
  history: InterviewMessage[]
): Promise<SkillSynthReport> {
  const transcript = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  
  const systemInstruction = `
    You are "SkilSynth AI". Generate a structured "SkillSynth DNA Report" based on the interview transcript and candidate context.
    Be realistic and slightly strict. Be honest and slightly critical.
    
    CRITICAL INSTRUCTION: The output DNA result MUST strictly align with the interview answers given by the candidate. 
    - Do NOT invent strengths or weaknesses that are not supported by the transcript.
    - If the candidate gave short, poor, or irrelevant answers, the hireabilityScore MUST be low, and the feedback must reflect their poor performance.
    - If the candidate gave detailed, role-specific answers, reflect that in high scores.
    - Base the 'roleFitAnalysis' and 'detailedAISuggestions' directly on what they said. Cite their actual responses implicitly or explicitly.
    - For each 'detailedAISuggestions', you MUST provide 'resources' (real or highly relevant YouTube search links, article links, or course links) that directly address the specific mistakes they made or areas they need to improve.
    
    Output must be JSON.
  `;

  const prompt = `
    Candidate Context: ${JSON.stringify(context)}
    Transcript:
    ${transcript}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hireabilityScore: { type: Type.NUMBER },
          skillRatings: {
            type: Type.OBJECT,
            properties: {
              communication: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER },
              clarity: { type: Type.NUMBER },
              fluency: { type: Type.NUMBER },
              problemSolving: { type: Type.NUMBER },
              leadership: { type: Type.NUMBER },
              adaptability: { type: Type.NUMBER },
            },
            required: ["communication", "confidence", "clarity", "fluency", "problemSolving", "leadership", "adaptability"]
          },
          personalityTag: { type: Type.STRING },
          emotionalIntelligence: { type: Type.STRING },
          stressHandling: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          roleFitAnalysis: { type: Type.STRING },
          improvementPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
          competencyBreakdown: {
            type: Type.OBJECT,
            properties: {
              technical: { type: Type.NUMBER },
              behavioral: { type: Type.NUMBER },
              situational: { type: Type.NUMBER },
              communication: { type: Type.NUMBER },
            },
            required: ["technical", "behavioral", "situational", "communication"]
          },
          detailedAISuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                resources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["title", "url"]
                  }
                }
              },
              required: ["title", "description", "actionItems"]
            }
          },
        },
        required: ["hireabilityScore", "skillRatings", "personalityTag", "emotionalIntelligence", "stressHandling", "strengths", "weaknesses", "roleFitAnalysis", "improvementPlan", "competencyBreakdown", "detailedAISuggestions"]
      }
    },
  });

  return JSON.parse(response.text || '{}');
}
