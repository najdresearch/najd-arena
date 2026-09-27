# Fixture and reference completion

Release `2026.09.27.1` keeps 6,089 cases. It includes 11 public fixture files and four
source-based Absher answer corrections. Two ambiguous prompts now ask for recorded
word meanings. Earlier results keep their original revision and are not rescored.

## Execution

| Task | Evidence and scoring |
|---|---|
| agentic-02 | Read contacts.csv, create answer.txt, then verify artifact and final answer |
| document-02 | Read dates and preserve event/date bindings |
| document-03 | Read refund policy and return its three conditions |
| document-05 | Read meeting decision, owner and deadline |
| document-08 | Read English brief and return requested JSON |
| rag-02 | Read corpus, distinguish chair/governor, cite the source |
| Four corrected Absher cases | Exact Arabic answer key; invalid format scores zero |

`fixture-tools-v1` provides read/write/finish JSON actions in a virtual filesystem.
It exposes no shell, network or host files. Sources are immutable, paths are validated,
and each case has a 12-response limit and 64 KB output limit. Hosted workers apply rate
and concurrency limits per model call, retaining summed usage and all tool evidence in S3.

Fixture artifacts are checked before a semantic judge sees the prompt, reference, source
files and execution evidence. Invalid judge responses are errors, not model failures.
Judge verdicts and returned judge model identifiers are saved as separate S3 artifacts.
Existing runs retain their dataset pins; the new protocol requires a new evaluation.

## Live smoke evidence

A development smoke run through OpenRouter used `qwen/qwen3-30b-a3b-instruct-2507`
on all ten cases. All ten received a grade: six fixture tasks passed, one corrected
MCQ passed, and three corrected MCQs failed the strict key contract (two included
answer text and one selected the wrong option). No result was silently omitted.
This verifies execution and grading plumbing; the same model judged its fixture answers,
so this is not an independent model-quality evaluation or a publishable leaderboard result.

Tests cover traversal, source immutability, output and turn limits, missing artifacts,
strict keys, invalid judge scores, run pins and incomplete publication prevention.
The full published release and all fixture hashes were downloaded and validated.
