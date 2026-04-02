export type StepType =
  | "welcome"
  | "single_select"
  | "multi_select"
  | "short_text"
  | "long_text"
  | "name"
  | "phone"
  | "email"
  | "dropdown"
  | "date_range"
  | "textarea_optional"
  | "transfer_ready"
  | "connecting"
  | "connected"
  | "fallback"
  | "callback_confirmation";

export type StepOption = {
  key: string;
  label: string;
};

export type BranchCondition = {
  fieldKey: string;
  operator: "eq" | "neq" | "in" | "not_in" | "is_truthy" | "is_falsy";
  value?: string | string[] | boolean;
};

export type BranchRule = {
  conditions: BranchCondition[];
  nextStepKey: string;
  priority?: number;
};

export type WidgetStep = {
  key: string;
  type: StepType;
  title: string;
  description?: string;
  fieldKey?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: StepOption[];
  next?: string;
  branches?: BranchRule[];
  config?: Record<string, unknown>;
};

export type WidgetFlow = {
  id: string;
  version: number;
  name: string;
  steps: WidgetStep[];
};

export type WidgetBranding = {
  logoUrl?: string;
  avatarUrl?: string;
  welcomeVideoUrl?: string;
  primaryColor: string;
  accentColor?: string;
  widgetTitle: string;
  welcomeHeadline: string;
  welcomeBody: string;
  privacyUrl?: string;
  termsUrl?: string;
};

export type WidgetPublicConfig = {
  clientId: string;
  clientName: string;
  branding: WidgetBranding;
  flow: WidgetFlow;
  features: {
    callNowEnabled: boolean;
    smsFallbackEnabled: boolean;
    resumeEnabled: boolean;
  };
};
