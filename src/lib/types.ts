// src/lib/types.ts

export interface LogEntry {
  timestamp: string;
  generator: "faker" | "markov";
  site: string;
  domain: string;
  ip: string;
  country: string;
  method: string;
  path: string;
  status: number;
  response_bytes: number;
  response_time_ms: number;
  user_agent: string;
  attack_type: string;
  attacker_profile: string;
  referer: string;
  markov_state?: string;
}

export interface Personality {
  mbti_type: string;
  label: string;
  e_i_score: number;
  s_n_score: number;
  t_f_score: number;
  j_p_score: number;
  personality_description: string;
  threat_level: number;
}

export interface ClassifiedLog {
  session_id: string;
  generator: "faker" | "markov";
  site: string;
  country: string;
  features: Record<string, unknown>;
  classification: string;
  personality: Personality;
  ground_truth_distribution: Record<string, number>;
}

export interface AnomalySession {
  session_id: string;
  ip: string;
  site: string;
  country: string;
  generator: "faker" | "markov";
  total_requests: number;
  attack_types: Record<string, number>;
  features: Record<string, unknown>;
  anomaly_score: number;
  is_anomaly: boolean;
  anomaly_rank: number;
}

export interface AnomalyRequest {
  timestamp: string;
  ip: string;
  site: string;
  country: string;
  generator: "faker" | "markov";
  method: string;
  path: string;
  status: number;
  attack_type: string;
  anomaly_score: number;
  features: Record<string, unknown>;
}

export interface ClassificationReport {
  summary: { faker_sessions_analyzed: number; markov_sessions_analyzed: number };
  classification_accuracy: {
    faker: { total_sessions: number; correct: number; accuracy: number; mismatches: unknown[] };
    markov: { total_sessions: number; correct: number; accuracy: number; mismatches: unknown[] };
    delta: number;
    insight: string;
  };
  personality_profiles: {
    faker: { mbti_distribution: Record<string,number>; top_archetypes: Record<string,number>; avg_threat_level: number };
    markov: { mbti_distribution: Record<string,number>; top_archetypes: Record<string,number>; avg_threat_level: number };
  };
  sample_personalities: Array<{
    session_id: string; site: string; generator: string;
    mbti: string; label: string; description: string; threat_level: number;
  }>;
}

export interface AnomalyComparison {
  session_level: {
    faker:  { total_sessions: number; anomaly_count: number; anomaly_rate: number; avg_score: number; score_std: number; top_anomalous_ips: string[] };
    markov: { total_sessions: number; anomaly_count: number; anomaly_rate: number; avg_score: number; score_std: number; top_anomalous_ips: string[] };
    insight: string;
  };
  request_level: {
    faker:  { total_anomalous_requests: number; top_anomalous_attack_types: Record<string,number>; top_anomalous_sites: Record<string,number> };
    markov: { total_anomalous_requests: number; top_anomalous_attack_types: Record<string,number>; top_anomalous_sites: Record<string,number> };
    insight: string;
  };
}

// Attack color mapping from dashboard.py
export const ATTACK_COLORS: Record<string, string> = {
  reconnaissance:        "#556270",
  credential_stuffing:   "#ff4c6e",
  brute_force:           "#ff4c6e",
  api_key_probe:         "#f5c542",
  oauth_abuse:           "#f5a623",
  jwt_attack:            "#e8832a",
  token_exfiltration:    "#ff4c6e",
  lateral_movement:      "#c0392b",
  account_takeover:      "#e74c3c",
  scraping:              "#3498db",
  pii_scraping:          "#9b59b6",
  payment_probe:         "#e91e63",
  sql_injection:         "#00ffe0",
  data_exfiltration:     "#ff6b35",
  credential_harvesting: "#f39c12",
  aws_credential_probe:  "#f5c542",
  env_probe:             "#a855f7",
  framework_exploit:     "#00ffe0",
  cms_attack:            "#3498db",
  unknown:               "#2c3e50",
};

export const MBTI_THREAT: Record<string, number> = {
  INTJ:9, INTP:7, ENTJ:8, ENTP:6,
  INFJ:5, INFP:3, ENFJ:4, ENFP:3,
  ISTJ:8, ISFJ:4, ESTJ:7, ESFJ:3,
  ISTP:9, ISFP:4, ESTP:6, ESFP:2,
};
