# Najd Arabic and Saudi evaluation standard

Status: proposal, not a validated standard or current implementation guarantee.

## Outcome

Help an engineer choosing an AI model for an Arabic or Saudi workload identify a suitable model, the evidence supporting that choice, and the remaining uncertainty.

## Product structure

The reference is https://artificialanalysis.ai/models/grok-4-7 (inspected September 26, 2026). Its model identity, summary, capability breakdown, operational comparisons, and metric definitions inform the structure. Najd uses its own data and scoring.

| Page layer | Najd adaptation | Current evidence |
| --- | --- | --- |
| Model identity | Version, provider, configuration, evaluated modalities | Imported M3 names and configuration IDs; other metadata awaits verification |
| At-a-glance scores | Overall acceptable rate, Arabic task, Saudi task, technical completion | Historical pre-audit grades |
| Problem areas | Language, local context, retrieval, agent decisions, safety | Navigation groups over existing tasks; not validated composite indexes |
| Benchmarks | Paired model bars, task search, fixed scales, counts | Existing task aggregates |
| Configurations | Prompt and reasoning setting breakdown | 14 configurations per model |
| Operations | Cost per acceptable task, latency, throughput | Not measured in current import |
| Evidence | Dataset revision, grading policy, limitations, uncertainty | Historical provenance available; uncertainty not yet computed |

## Proposed measurement contracts

A language label alone does not establish local relevance. Each task needs a documented user problem, source rights, scoring rubric, and coverage boundaries.

| Dimension | Proposed evidence | Publication gate |
| --- | --- | --- |
| Arabic language | Native-authored MSA, specified dialect strata, code switching, instruction following | Native-speaker review, per-stratum counts, adjudication records |
| Saudi context | Local entities and practical workflows with dated authoritative sources | Source dates, correction process, scope reviewed by domain experts |
| Retrieval and documents | Answer correctness, citation support, abstention; OCR separated from downstream reasoning | Separate retrieval, extraction, and answer failures |
| Agent decisions | Tool choice, argument accuracy, clarification, abstention, end-to-end completion | Safe sandbox, deterministic checks where possible, fixed tool schemas |
| Safety and alignment | Harmful compliance and over-refusal measured separately, relevant contexts | Explicit rubric; no single opaque cultural-alignment score |
| Operations | TTFT, time to answer, p50/p95 task latency, Arabic characters/sec and tokens/sec, cost per acceptable task | Endpoint, client region, load, tokenizer, retries, date and pricing recorded |
| Reliability | Failed requests, invalid outputs, completion rate, repeat variance | All scheduled cases accounted for; errors stay in denominator |

Finance, law, health, and government-service suitability cannot be inferred from a generic Saudi score. They require dedicated evidence before capability claims.

## Rules for a defensible standard

1. A result identifies model/version, endpoint/provider, configuration, dataset content hash, harness version, judge/rubric version, execution date and scope.
2. Compare only compatible dataset contents and protocols. Keep historical evidence separate from certified current-release rankings.
3. Publish fixed aggregation weights before runs. Show component scores and denominators. Do not rename the current acceptable rate an intelligence index.
4. Estimate uncertainty using paired case-level comparisons; account for repeated configurations and source clustering. Never treat 14 runs of the same case as 14 independent cases.
5. Audit judge agreement against a stratified human-reviewed sample, including Arabic and dialect strata. Record disagreement and adjudication.
6. Keep public development cases separate from rights-cleared held-out evaluation material. Track contamination risk and rotate versioned tests without silently changing rankings.
7. Record test changes, corrections, appeals, conflicts of interest, and sponsorship. Payment must not change scores or publication criteria.
8. Publish reproducible aggregate artifacts and permitted examples; private prompts, model outputs, credentials, and employer material remain private.

## Milestones and gates

| Milestone | Artifact / owner | Acceptance evidence | Proceed / revise / stop |
| --- | --- | --- | --- |
| Model decision page | Arena maintainers | Real scores, scoped problem areas, paired visual comparisons, provenance, explicit missing metrics | Proceed after numeric reconciliation and interaction checks; stop fabricated metadata |
| Protocol v1 | Najd founder + Arabic/domain reviewers | Versioned task definitions, source rights, split policy, weights, human/judge agreement report | Revise poorly covered tasks; stop publication where rights or grading validity are unresolved |
| Matched rerun | Benchmark maintainers | Both models on identical pinned contents and configurations; complete case accounting | Proceed only with comparable protocol; label historical runs separately |
| Measurement release | Benchmark + Arena maintainers | Case-level uncertainty, latency/cost telemetry, downloadable permitted results | Withhold unsupported rankings and efficiency claims |
| Public standard candidate | Founder + independent reviewers | Reproduction by an independent runner, public change log, corrections process | Call it a proposed standard until independent adoption supports stronger claims |

Next scientific artifact: a matched-content M3 rerun manifest and a coverage audit of the present dataset. Dependency: exact model endpoints and a verified current benchmark protocol. Broader modalities remain visible but unranked until measured.
