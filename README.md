# 🕸️ Phantom Trace: Honeypot Intelligence with Faker, Markov, and LLM

> Synthetic attack log generation, LLM-powered classification, and MBTI-style attacker profiling — built as an AI systems engineering portfolio project.

![Python](https://img.shields.io/badge/Python-3.11+-00ffe0?style=flat-square&labelColor=0d1117)
![Streamlit](https://img.shields.io/badge/Streamlit-1.32+-ff4c6e?style=flat-square&labelColor=0d1117)
![Anthropic](https://img.shields.io/badge/Claude-Sonnet_4-f5c542?style=flat-square&labelColor=0d1117)
![License](https://img.shields.io/badge/License-MIT-556270?style=flat-square&labelColor=0d1117)

---

## What This Is

Most honeypot projects stop at log collection. This one starts there — but the real question is:

**Can an LLM meaningfully classify attacker behavior, and does the data generation method (random vs. sequential) affect that classification?**

To answer that without running a real honeypot (and the legal/security surface that comes with it), this project generates two flavors of synthetic attack logs and puts them through an LLM analysis pipeline.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DATA GENERATION                       │
│                                                         │
│   personas.py                                           │
│   ├── Site A: API-first SaaS  (OAuth, JWT, token theft) │
│   └── Site B: EC / PII        (credential stuffing, PII)│
│                                                         │
│   faker_generator.py   →  random sampling               │
│   markov_generator.py  →  state transition chains       │
│                                                         │
│   Output: honeypot_logs_faker.json                      │
│           honeypot_logs_markov.json                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  LLM PIPELINE                            │
│                                                         │
│   llm_pipeline.py                                       │
│   ├── Session feature extraction                        │
│   ├── Attack classification  (Structured Outputs)       │
│   ├── Threat scoring         (1–10)                     │
│   ├── Intent summarization   (natural language)         │
│   └── MBTI attacker profiling                           │
│                                                         │
│   Output: classified_logs_faker.json                    │
│           classified_logs_markov.json                   │
│           classification_report.json                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 VISUALIZATION                            │
│                                                         │
│   dashboard.py  (Streamlit)                             │
│   ├── Overview          — volume, origins, timeline     │
│   ├── Attack Analysis   — types, status codes, treemap  │
│   ├── Faker vs Markov   — distribution + accuracy delta │
│   ├── Attacker Profiles — MBTI cards + radar chart      │
│   └── Markov Graph      — NetworkX state transitions    │
└─────────────────────────────────────────────────────────┘
```

---

## Why Synthetic Data?

Running a real honeypot introduces:
- Legal gray areas (CFAA, GDPR)
- VPS security surface
- Unpredictable data quality and coverage

Synthetic data sidesteps all of that while enabling something a real honeypot cannot: **intentional design of attack scenarios** with ground truth labels. This makes the LLM classification meaningful — we can actually measure accuracy.

This is standard practice in security research (MITRE ATT&CK, Splunk BOSSEC).

---

## Faker vs Markov — Why Both?

| | Faker | Markov |
|---|---|---|
| **What it models** | Distribution of attack types | Sequential attacker behavior |
| **Session context** | None — each request independent | Full — transitions follow probability chains |
| **Realism** | Statistical realism | Behavioral realism |
| **LLM classification** | Harder — no sequential signal | Easier — intent emerges from sequence |

The hypothesis: **Markov logs will be classified more accurately** because sequential context makes attacker intent legible to the LLM. The dashboard shows whether this holds.

---

## MBTI Attacker Profiling

The LLM maps each attacker session onto a modified MBTI framework:

| Axis | Security Interpretation |
|------|------------------------|
| **E / I** | Broad scanner vs. targeted, focused attack |
| **S / N** | Known CVEs and tools vs. exploratory, unknown endpoints |
| **T / F** | Automated and systematic vs. manual and adaptive |
| **J / P** | Planned phase progression vs. opportunistic and chaotic |

Each session gets a type (e.g. `INTJ`), an archetype label (e.g. *"The Architect"*), a behavioral description, and a threat score.

This is not serious threat intelligence. It is a deliberate design choice to make the analysis **memorable and explainable** — which matters for a portfolio.

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Data generation | `faker`, `random`, custom Markov engine |
| LLM pipeline | `anthropic` SDK, Structured Outputs, async Batch API |
| Analysis | `pandas`, `networkx`, `scikit-learn` (Isolation Forest) |
| Visualization | `streamlit`, `plotly` |

---

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/honeypot-intelligence
cd honeypot-intelligence
pip install -r requirements.txt
```

**Generate logs:**
```bash
python main.py
```

**Run LLM pipeline** (requires Anthropic API key):
```bash
export ANTHROPIC_API_KEY=your_key_here
python llm_pipeline.py
```

**Launch dashboard:**
```bash
streamlit run dashboard.py
```

---

## Project Structure

```
honeypot-intelligence/
├── personas.py              # Honeypot site definitions + Markov transition matrices
├── faker_generator.py       # Random sampling log generator
├── markov_generator.py      # Markov chain log generator
├── main.py                  # Run both generators
├── llm_pipeline.py          # LLM classification + MBTI profiling
├── dashboard.py             # Streamlit visualization dashboard
├── requirements.txt
└── README.md
```

---

## Key Findings

- **LLM classification accuracy**: Faker `20%` · Markov `40%`  
  Markov logs are classified twice as accurately — sequential context  
  makes attacker intent legible to the LLM. The low absolute numbers  
  reflect the challenge of classifying granular attack sub-types from  
  HTTP logs alone, not a failure of the pipeline.
- **Faker sessions show tighter anomaly clustering** — random distribution
  creates a cleaner baseline for Isolation Forest; Markov's sequential
  context makes individual sessions more predictable, so true outliers
  stand out differently
- **Request-level anomalies concentrate around state transitions** —
  `/wp-admin/` and `/oauth/authorize` 302 redirects were the most
  anomalous requests in Markov logs, suggesting phase shifts are the
  most detectable moments in an attack chain
- **ISTJ dominates** (25/40 sessions) — the majority of simulated
  attackers profile as methodical, systematic, and tool-driven rather
  than creative or adaptive
- **Top archetypes**: The Credential Harvester · The Methodical
  Cartographer · The Corporate Auditor

---

## What I Learned

This project sits at the intersection of:

- **Data engineering** — designing synthetic datasets with intentional statistical and behavioral properties
- **Statistical modeling** — Markov chains as a behavioral model, Isolation Forest for anomaly detection
- **LLM engineering** — Structured Outputs for reliable JSON extraction, prompt design for security classification
- **Visualization** — communicating technical findings to a non-technical audience

The most interesting result was not the accuracy numbers — it was observing *where* the LLM misclassified, and what that reveals about how sequential context affects language model inference.

---

## Note on Ethics

All data in this project is fully synthetic. No real user data, IP addresses, or attack traffic was collected or used. Attacker IP addresses are procedurally generated and do not correspond to real systems.

---

## License

MIT
