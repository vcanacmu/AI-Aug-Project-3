import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { UserContext, IdeaCard, IdeaGroup, UserContextStepResponse, ProblemDefinitionStepResponse, CapabilitiesStepResponse, AICapability } from "../types";
import { AI_CAPABILITIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateUserContextStep(domain: string): Promise<UserContextStepResponse> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI product system powering Step 1 of an onboarding flow for "AI Matchmaker Studio".
    
    DOMAIN: "${domain}"
    
    GOAL: Generate structured user contexts grouped by business model type.
    
    INSTRUCTIONS:
    1. Generate user contexts grouped into: B2C, B2B, B2B2C, C2C, D2C, Marketplace / Platform, Internal / Enterprise, Creator Economy, Government / Public Sector.
    2. For EACH category, generate 3–5 user types relevant to the domain.
    3. Each user must include: label, description (1 line max), opportunity_signal ("high", "medium", "low"), opportunity_reason (1–2 sentences).
    
    Return a JSON object matching the schema.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING, enum: ["user_context"] },
          selection_rules: {
            type: Type.OBJECT,
            properties: {
              max_selection: { type: Type.NUMBER },
              cta_label: { type: Type.STRING },
            },
            required: ["max_selection", "cta_label"],
          },
          user_context_groups: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                users: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      description: { type: Type.STRING },
                      opportunity_signal: { type: Type.STRING, enum: ["high", "medium", "low"] },
                      opportunity_reason: { type: Type.STRING },
                    },
                    required: ["id", "label", "description", "opportunity_signal", "opportunity_reason"],
                  },
                },
              },
              required: ["category", "users"],
            },
          },
        },
        required: ["step", "selection_rules", "user_context_groups"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function generateProblemDefinitionStep(domain: string, selectedUser: string, initialProblem?: string): Promise<ProblemDefinitionStepResponse> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI product system powering Step 2 of an onboarding flow for "AI Matchmaker Studio".
    
    DOMAIN: "${domain}"
    SELECTED USER: "${selectedUser}"
    ${initialProblem ? `INITIAL PROBLEM: "${initialProblem}"` : ""}
    
    GOAL: Generate 6–10 realistic user problems based on the domain and selected user.
    ${initialProblem ? `Use the INITIAL PROBLEM as the primary inspiration and generate related or more specific problems.` : ""}
    
    INSTRUCTIONS:
    1. Be specific and actionable.
    2. Reflect real friction, inefficiency, or unmet need.
    3. Phrased from the user's perspective.
    4. Avoid vague problems or solutions disguised as problems.
    5. Each problem must include: problem_statement, severity ("high", "medium", "low"), why_it_matters (1 sentence).
    
    Return a JSON object matching the schema.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING, enum: ["problem_definition"] },
          selected_user: { type: Type.STRING },
          selection_rules: {
            type: Type.OBJECT,
            properties: {
              max_selection: { type: Type.NUMBER },
              cta_label: { type: Type.STRING },
            },
            required: ["max_selection", "cta_label"],
          },
          problems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                problem_statement: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
                why_it_matters: { type: Type.STRING },
              },
              required: ["id", "problem_statement", "severity", "why_it_matters"],
            },
          },
          custom_input: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              placeholder: { type: Type.STRING },
            },
            required: ["label", "placeholder"],
          },
        },
        required: ["step", "selected_user", "selection_rules", "problems", "custom_input"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function generateCapabilitiesStep(domain: string, selectedUser: string, selectedProblem: string): Promise<CapabilitiesStepResponse> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI systems design assistant powering Step 4 of an onboarding flow for "AI Matchmaker Studio".
    
    DOMAIN: "${domain}"
    SELECTED USER: "${selectedUser}"
    SELECTED PROBLEM: "${selectedProblem}"
    
    GOAL: Generate AI capabilities organized into high-level categories and specific capabilities.
    
    INSTRUCTIONS:
    1. Create 6–10 HIGH-LEVEL AI CAPABILITY CATEGORIES (e.g. Predict outcomes, Recommend actions, Generate content, Understand language, Analyze patterns, Automate workflows, Optimize decisions, Perceive the physical world, Simulate scenarios, Retrieve and organize information).
    2. Categories must be action-based (verb-oriented) and broad.
    3. For EACH category include: label, explanation (1–2 sentences), how_it_works (non-technical), typical_models (types, not brands), implementation_hint (product team use case).
    4. Under EACH category, generate 3–6 SPECIFIC CAPABILITIES relevant to the domain/user/problem.
    5. Each specific capability must include: label (action), description (1 line), effort_level ("low", "medium", "high"), expense_level ("low", "medium", "high").
    
    Return a JSON object matching the schema.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING, enum: ["capabilities"] },
          selection_rules: {
            type: Type.OBJECT,
            properties: {
              max_selection: { type: Type.NULL },
              cta_label: { type: Type.STRING },
            },
            required: ["max_selection", "cta_label"],
          },
          capability_categories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                explanation: { type: Type.STRING },
                how_it_works: { type: Type.STRING },
                typical_models: { type: Type.STRING },
                implementation_hint: { type: Type.STRING },
                capabilities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      description: { type: Type.STRING },
                      effort_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
                      expense_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
                    },
                    required: ["id", "label", "description", "effort_level", "expense_level"],
                  },
                },
              },
              required: ["label", "explanation", "how_it_works", "typical_models", "implementation_hint", "capabilities"],
            },
          },
          custom_capability: {
            type: Type.OBJECT,
            properties: {
              input_label: { type: Type.STRING },
              placeholder: { type: Type.STRING },
            },
            required: ["input_label", "placeholder"],
          },
        },
        required: ["step", "selection_rules", "capability_categories", "custom_capability"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function validateCustomCapability(input: string): Promise<{
  is_valid: boolean;
  assigned_category?: string;
  validated_capability?: AICapability;
  suggested_alternatives?: AICapability[];
}> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Validate if the following input is a TRUE AI capability: "${input}".
    
    INSTRUCTIONS:
    1. Must describe something AI can DO (verb-based).
    2. Not a product or vague idea.
    3. If valid: 
       - Accept it and assign effort_level and expense_level.
       - Assign it to one of these categories: Predict outcomes, Recommend actions, Generate content, Understand language, Analyze patterns, Automate workflows, Optimize decisions, Perceive the physical world, Simulate scenarios, Retrieve and organize information.
    4. If NOT valid: Suggest 3–5 closest valid AI capabilities.
    
    Return a JSON object.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_valid: { type: Type.BOOLEAN },
          assigned_category: { type: Type.STRING },
          validated_capability: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              effort_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
              expense_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
            },
            required: ["id", "label", "description", "effort_level", "expense_level"],
          },
          suggested_alternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                effort_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
                expense_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
              },
              required: ["id", "label", "description", "effort_level", "expense_level"],
            },
          },
        },
        required: ["is_valid"],
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
