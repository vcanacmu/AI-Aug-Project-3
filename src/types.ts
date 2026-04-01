export interface UserContext {
  id: string;
  label: string;
  description: string;
  opportunity_signal: "high" | "medium" | "low";
  opportunity_reason: string;
}

export interface UserContextGroup {
  category: string;
  users: UserContext[];
}

export interface AICapability {
  id: string;
  label: string;
  description: string;
  effort_level: "low" | "medium" | "high";
  expense_level: "low" | "medium" | "high";
}

export interface UserContextStepResponse {
  step: "user_context";
  selection_rules: {
    max_selection: number;
    cta_label: string;
  };
  user_context_groups: UserContextGroup[];
}

export interface UserProblem {
  id: string;
  problem_statement: string;
  severity: "high" | "medium" | "low";
  why_it_matters: string;
}

export interface ProblemDefinitionStepResponse {
  step: "problem_definition";
  selected_user: string;
  selection_rules: {
    max_selection: number;
    cta_label: string;
  };
  problems: UserProblem[];
  custom_input: {
    label: string;
    placeholder: string;
  };
}

export interface AICapabilityCategory {
  label: string;
  explanation: string;
  how_it_works: string;
  typical_models: string;
  implementation_hint: string;
  capabilities: AICapability[];
}

export interface CapabilitiesStepResponse {
  step: "capabilities";
  selection_rules: {
    max_selection: number | null;
    cta_label: string;
  };
  capability_categories: AICapabilityCategory[];
  custom_capability: {
    input_label: string;
    placeholder: string;
    validation?: {
      is_valid: boolean;
      assigned_category?: string;
      validated_capability?: AICapability;
      suggested_alternatives?: AICapability[];
    };
  };
}

export interface IdeaCard {
  id: string;
  title: string;
  capability: string;
  user: string;
  concept: string;
  why_it_matters: string;
  why_this_capability_fits: string;
  value_scores: {
    user_value: number;
    business_value: number;
    technical_feasibility: number;
  };
  ui_hint?: string;
}

export interface IdeaGroup {
  id: string;
  name: string;
  ideaIds: string[];
}
