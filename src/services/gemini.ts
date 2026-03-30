import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { UserContext, IdeaCard, IdeaGroup } from "../types";
import { AI_CAPABILITIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateUserContexts(domain: string): Promise<UserContext[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the domain: "${domain}". 
    Identify 6 diverse user segments, personas, or jobs-to-be-done that would benefit from AI integration. 
    Include a mix of B2C, B2B, and B2B2C. 
    Return a JSON array of objects with "id", "type" (short name), and "description" (one sentence).`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["id", "type", "description"],
        },
      },
    },
  });

  return JSON.parse(response.text);
}

const ideaSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    capability: { type: Type.STRING },
    user: { type: Type.STRING },
    concept: { type: Type.STRING },
    why_it_matters: { type: Type.STRING },
    why_this_capability_fits: { type: Type.STRING },
    value_scores: {
      type: Type.OBJECT,
      properties: {
        user_value: { type: Type.NUMBER },
        business_value: { type: Type.NUMBER },
        technical_feasibility: { type: Type.NUMBER },
      },
      required: ["user_value", "business_value", "technical_feasibility"],
    },
    ui_hint: { type: Type.STRING },
  },
  required: ["id", "title", "capability", "user", "concept", "why_it_matters", "why_this_capability_fits", "value_scores"],
};

export async function generateIdeas(
  domain: string,
  userTypes: string[],
  capabilities: string[],
  count: number,
  isWild: boolean
): Promise<IdeaCard[]> {
  const prompt = `You are an AI product ideation engine.
  Your task is to generate diverse product ideas using the matchmaking framework: Capability + Context = Concept.

  INPUT:
  - Domain: ${domain}
  - User Types: ${userTypes.join(", ")}
  - Selected AI Capabilities: ${capabilities.join(", ")}
  - Divergence Level: ${isWild ? "WILD / SPECULATIVE / FUTURE-FORWARD" : "PRACTICAL / FEASIBLE"}

  INSTRUCTIONS:
  1. Generate ${count} distinct product ideas.
  2. Each idea must clearly combine: One capability, One user type, and the domain.
  3. Focus on divergence (variety over refinement).
  4. ${isWild ? "Generate speculative, future-forward, and unconventional ideas that might not be immediately feasible but spark novel concepts." : "Focus on practical, useful, and relatively feasible ideas."}
  5. For each idea, explain WHY the selected AI capability is appropriate in "why_this_capability_fits". Focus on what problem characteristic makes this capability useful and what the AI is actually doing in simple terms.
  6. Rate each idea from 1–5 on User Value, Business Value, and Technical Feasibility. Be realistic, not optimistic.

  Return a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: ideaSchema,
      },
    },
  });

  return JSON.parse(response.text);
}

export async function identifyCapabilitiesForProblem(problem: string, domain: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following problem in the domain of "${domain}": "${problem}".
    Identify 3-5 most relevant AI capabilities from this list that could help solve it:
    ${AI_CAPABILITIES.map(c => c.label).join(", ")}.
    Return a JSON array of the capability labels.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });
  return JSON.parse(response.text);
}

export async function generateIdeasFromProblem(
  problem: string,
  domain: string,
  capabilities: string[],
  count: number,
  isWild: boolean
): Promise<IdeaCard[]> {
  const prompt = `You are an AI product ideation engine.
  Your task is to generate diverse product ideas using the matchmaking framework: Capability + Context = Concept.

  PROBLEM CONTEXT: ${problem}
  DOMAIN: ${domain}
  SELECTED AI CAPABILITIES: ${capabilities.join(", ")}
  DIVERGENCE LEVEL: ${isWild ? "WILD" : "PRACTICAL"}

  INSTRUCTIONS:
  1. Analyze the problem and identify relevant user contexts/personas.
  2. Generate ${count} distinct product ideas that address the problem.
  3. Each idea must combine one of the selected capabilities with one identified user type.
  4. Explain WHY the capability fits the problem in "why_this_capability_fits".
  5. Rate each idea from 1–5 on User Value, Business Value, and Technical Feasibility.

  Return a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: ideaSchema,
      },
    },
  });

  return JSON.parse(response.text);
}

export async function remixIdea(
  baseIdea: IdeaCard,
  remixType: "make_more_feasible" | "make_more_innovative" | "make_more_user_centered"
): Promise<IdeaCard> {
  const prompt = `Remix the following product idea.
  
  BASE IDEA:
  ${JSON.stringify(baseIdea, null, 2)}

  REMIX TYPE: ${remixType}

  INSTRUCTIONS:
  - make_more_feasible -> simplify and ground in current tech
  - make_more_innovative -> push creativity and future possibilities
  - make_more_user_centered -> improve alignment with user needs

  Return the revised idea in the same JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  });

  return JSON.parse(response.text);
}

export async function generateSingleIdea(
  domain: string,
  userType: string,
  capability: string,
  isWild: boolean
): Promise<IdeaCard> {
  const prompt = `You are an AI product ideation engine.
  Generate ONE distinct product idea using the matchmaking framework: Capability + Context = Concept.

  INPUT:
  - Domain: ${domain}
  - User Type: ${userType}
  - Selected AI Capability: ${capability}
  - Divergence Level: ${isWild ? "WILD" : "PRACTICAL"}

  INSTRUCTIONS:
  1. Generate ONE product idea combining the capability, user type, and domain.
  2. Explain WHY the AI capability fits in "why_this_capability_fits".
  3. Rate from 1–5 on User Value, Business Value, and Technical Feasibility.

  Return a JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  });

  return JSON.parse(response.text);
}

export async function generateSingleIdeaFromProblem(
  problem: string,
  domain: string,
  capability: string,
  isWild: boolean
): Promise<IdeaCard> {
  const prompt = `You are an AI product ideation engine.
  Generate ONE distinct product idea for the problem: "${problem}" in domain "${domain}".

  INPUT:
  - Selected AI Capability: ${capability}
  - Divergence Level: ${isWild ? "WILD" : "PRACTICAL"}

  INSTRUCTIONS:
  1. Identify a relevant user context/persona for this problem.
  2. Generate ONE product idea combining the capability and the user type to solve the problem.
  3. Explain WHY the capability fits in "why_this_capability_fits".
  4. Rate from 1–5 on User Value, Business Value, and Technical Feasibility.

  Return a JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  });

  return JSON.parse(response.text);
}

export async function clusterIdeas(ideas: IdeaCard[]): Promise<IdeaGroup[]> {
  const prompt = `Group the following product ideas into 3-5 thematic clusters based on their core value proposition or technology focus.
  
  IDEAS:
  ${ideas.map(i => `- [${i.id}] ${i.title}: ${i.concept}`).join("\n")}

  Return a JSON array of objects with "id", "name" (cluster name), and "ideaIds" (array of IDs from the input).`;

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
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            ideaIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["id", "name", "ideaIds"],
        },
      },
    },
  });

  return JSON.parse(response.text);
}
