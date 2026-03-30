import { AICapability } from "./types";

export const AI_CAPABILITIES: AICapability[] = [
  { id: "detect_patterns", label: "Detect patterns", description: "Find recurring themes or behaviors in data." },
  { id: "predict_events", label: "Predict events", description: "Forecast future outcomes based on historical data." },
  { id: "recommend_content", label: "Recommend content", description: "Suggest relevant items to users." },
  { id: "summarize_info", label: "Summarize information", description: "Condense large amounts of data into key points." },
  { id: "generate_content", label: "Generate content", description: "Create new text, images, or media." },
  { id: "personalize_exp", label: "Personalize experiences", description: "Tailor UI and content to individual users." },
  { id: "optimize_decisions", label: "Optimize decisions", description: "Find the best path or choice among many." },
  { id: "identify_anomalies", label: "Identify anomalies", description: "Spot unusual data points or security threats." },
  { id: "rank_prioritize", label: "Rank/prioritize", description: "Order items by importance or relevance." },
  { id: "translate", label: "Translate", description: "Convert between languages or formats." },
];
