import { AICapability } from "./types";

export const AI_CAPABILITIES: AICapability[] = [
  { id: "detect_patterns", label: "Detect patterns", description: "Find recurring themes or behaviors in data.", effort_level: "medium", expense_level: "low" },
  { id: "predict_events", label: "Predict events", description: "Forecast future outcomes based on historical data.", effort_level: "high", expense_level: "medium" },
  { id: "recommend_content", label: "Recommend content", description: "Suggest relevant items to users.", effort_level: "medium", expense_level: "low" },
  { id: "summarize_info", label: "Summarize information", description: "Condense large amounts of data into key points.", effort_level: "low", expense_level: "low" },
  { id: "generate_content", label: "Generate content", description: "Create new text, images, or media.", effort_level: "medium", expense_level: "medium" },
  { id: "personalize_exp", label: "Personalize experiences", description: "Tailor UI and content to individual users.", effort_level: "medium", expense_level: "low" },
  { id: "optimize_decisions", label: "Optimize decisions", description: "Find the best path or choice among many.", effort_level: "high", expense_level: "medium" },
  { id: "identify_anomalies", label: "Identify anomalies", description: "Spot unusual data points or security threats.", effort_level: "medium", expense_level: "low" },
  { id: "rank_prioritize", label: "Rank/prioritize", description: "Order items by importance or relevance.", effort_level: "low", expense_level: "low" },
  { id: "translate", label: "Translate", description: "Convert between languages or formats.", effort_level: "low", expense_level: "low" },
];
