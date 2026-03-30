export interface UserContext {
  id: string;
  type: string;
  description: string;
}

export interface AICapability {
  id: string;
  label: string;
  description: string;
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
