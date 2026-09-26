# Najd Arena — public-site review

Reviewed 26 September 2026. Recommendations only: no application changes in this review.

## Direction agreed with Mazen

- Primary audience: people comparing models for Arabic and Saudi use cases.
- Reference: Artificial Analysis's information density and interactions, with a distinct Najd identity.
- Interface language: English for now.
- Default comparison: one clearly labeled setting first, with all levels available through expansion.
- Scope: public site first. Signed-in organization management, live endpoint submission, and admin operations are deferred.
- Preserve all requested category destinations, real HUMAIN/MiniMax logos, configuration-specific scores, and private-source boundaries.
- Do not reintroduce homepage counters for model families, thinking settings, or case IDs.

## Assessment

The homepage has a stronger visual direction than the rest of the site. The largest remaining problem is that the site behaves like several presentations of one experiment. A visitor needs a coherent decision tool: find a task, compare models under the same conditions, inspect a model, and share that exact comparison.

The next release should establish that comparison workflow before adding more decorative sections. Retain the dark green identity, editorial serif for the home headline, quiet surfaces, authentic provider assets, and visible evidence status. Use compact sans-serif typography for the analysis tools.

## Coverage and limits

| Surface | Review evidence |
| --- | --- |
| Home | Rendered desktop/mobile, full-page capture, component/source review; filters, tooltip, drill-down, and CSV exercised during this and the immediately preceding session |
| Models and releases | Both rendered; source reviewed; shared model-selection, chart/table, execution, benchmark, and level controls reviewed |
| HUMAIN and MiniMax profiles | Both rendered; full captures; every component section read; task group and empty-search state exercised |
| Release detail aliases | HUMAIN alias rendered; MiniMax alias shares the same route implementation and was inspected in source |
| Coding Agents | Rendered and source reviewed |
| Image, Speech, Video, Inference | Each rendered and source reviewed; Image also checked at mobile width |
| Recommender | Rendered desktop/mobile; every task mapping read; earlier tool-use configuration interaction verified |
| Leaderboards | Rendered empty state and populated-table code reviewed; no published canonical run was available to inspect visually |
| About, Methodology, AI Trends, Changelog | Each rendered, captured, and source reviewed |
| Public submission/login | Signed-out screen rendered desktop/mobile; both providers disabled in this local environment; no sign-in attempted |
| Historical M3 archive | Rendered and source reviewed |
| 404 | Unknown model route rendered; recovery action inspected |
| Loading and server-error screens | Source reviewed; loading seen during navigation; error screen not deliberately triggered |
| Published run detail | Source reviewed only; live populated state remains unverified |
| Authenticated workspace/admin | Deferred at Mazen's request |

Screenshots were captured under `/tmp/najd-ui-audit/` on this machine. These are review artifacts, not durable publication assets. Mobile checks used a 390×844 viewport; desktop used the browser's normal viewport. This is a product/UI review, not a full security, browser-compatibility, or assistive-technology certification.

## Priorities

| Priority | Recommendation | Why | Acceptance evidence |
| --- | --- | --- | --- |
| P1 | One shared comparison state, persisted in the URL | Home highlights and the deep explorer can currently show different settings; model links lose context | Change execution/level/task, copy URL, reload, open model detail: selections remain consistent |
| P1 | Configuration-specific task breakdowns on model pages | The top chart uses one configuration while lower task bars pool all configurations | Every score visible in a comparison follows the selected configuration, or an explicitly separate aggregate mode |
| P1 | Separate Models, Releases, and Leaderboards by purpose | Models and Releases currently reuse nearly the same screen; the leaderboard is empty despite scores elsewhere | Each destination has a distinct question, data layout, and primary action |
| P1 | Reduce time to first result on mobile | At 390px the first homepage bar is below the initial viewport; Models is mostly controls before results | A visitor reaches a labeled comparison without scrolling through editorial cards and a large settings block |
| P1 | Improve text contrast and minimum sizes | Many labels use 9–11px text; some foreground/background combinations are weak | Critical labels are readable at default zoom; audited contrast tokens and visible keyboard focus |
| P1 | Repair empty-state semantics | Database errors can be converted to empty arrays or null, which can look like no published data | Distinct unavailable, no results, no matching filters, and not-yet-evaluated states |
| P2 | Unify the design system | Repeated CSS overrides, logo implementations, buttons, and arrow styles cause inconsistent pages | Shared page heading, tabs, provider badge, chart shell, table, empty state, and metric definition components |
| P2 | Add explicit evidence metadata near each metric | Date, protocol, execution boundary, and denominator are scattered | Every shareable chart exposes its dataset/protocol, run snapshot, metric definition, and limitations |
| P2 | Make category pages useful before rankings exist | Current pages repeat tall planned cards and empty notices | Compact roadmap, candidate metrics, contribution/contact action, and relevant existing results |
| P2 | Support model catalog growth through data | Registry, opponent selection, slug handling, and colors assume HUMAIN/MiniMax | Add a third model through data without editing comparison algorithms or page markup |

## Global elements

| Element | Keep/change | Recommendation |
| --- | --- | --- |
| Najd wordmark | Keep | Keep the clean text identity; establish one official asset/wordmark treatment for header, exports, favicon, and social preview |
| Header | Change | Align to content grid; retain visible destinations; make Models the strongest comparison entry |
| Navigation density | Change | Use consistent 13–14px navigation on desktop rather than tiny labels; define active and hover states across aliases |
| Mobile navigation | Change | The horizontal strip hides Leaderboards/About/AI Trends off-screen with little discovery cue; add an accessible menu or visible scroll affordance while retaining access to all sections |
| Submit model | Keep, reduce emphasis | Keep available globally but make model exploration the visitor's main path; submission serves a secondary audience |
| Language control | Defer | English for now, as agreed. Do not add a decorative language toggle; keep data labels and mixed Arabic text ready for future localization |
| Typography | Change | Editorial type for marketing headings; one sans-serif scale for tools. Increase small labels and eliminate inconsistent heading proportions |
| Colors | Keep/refine | Preserve Najd green; define provider color separately from correctness/status colors; use labels as well as color |
| Icons | Change | One SVG family/stroke/size; replace remaining Unicode arrows/checkmarks in shared UI; use external arrows only for external destinations |
| Provider logos | Keep/refine | Use the supplied HUMAIN image in full. One ProviderLogo component everywhere; maintain optical sizes and prevent stretched, cropped, or enlarged low-resolution assets |
| Logo repetition | Reduce | Keep one legend/provider identity per chart where possible, rather than repeating the same logo on every thinking row |
| Cards | Change | Fewer nested card borders. Reserve panels for true groups; use whitespace/dividers for prose |
| Buttons/tabs | Change | Standardize selected, hover, disabled, focus, and busy states; avoid mixing pill tabs, square tabs, and form buttons without a reason |
| Form labels | Change | Consistent visible labels, sentence case, helper text, and named units; explain execution vs thinking |
| Empty states | Change | Short explanation + one recovery action; no large decorative empty panels repeated below already-empty cards |
| Footer | Expand | Add clear links to Models, methodology, founder/about, GitHub, Hugging Face, contact, and changelog; include privacy/terms only when real policies exist |
| Page titles/social previews | Change | Distinct titles and descriptions; canonical URLs for aliases; a branded share image with real chart/protocol context |
| Sticky-header anchors | Change | Ensure section titles and focus targets remain visible after jumps on desktop and mobile |
| Local development widget | Deployment check | The Next.js development widget is visible locally; verify the reviewable production build omits it rather than styling it into the product |

### Readability measurements

Computed from the current CSS colors, using the relative luminance formula. These are specific combinations, not a complete accessibility audit.

| Text / background | Approximate contrast | Recommendation |
| --- | ---: | --- |
| Muted `#737a76` on white | 4.40:1 | Darken body/helper text slightly |
| Axis label `#969e98` on white | 2.75:1 | Darken and enlarge axes |
| White on possible-correct `#6d9c84` | 3.12:1 | Use dark text or a darker segment |
| White on partial-correct `#c3a16c` | 2.43:1 | Use dark text or a darker segment |
| White on wrong `#a48486` | 3.37:1 | Use dark text or a darker segment |

## Home — `/`

| Element | Recommendation |
| --- | --- |
| Main headline | Keep the approved wording. Reduce mobile height; preserve the distinctive green/serif treatment |
| Eyebrow | Keep modest; do not make it the only indication of who operates the site |
| Intro copy | Keep one sentence focused on selecting a model |
| Right editorial links | Move below highlights on mobile; use dates only for actual updates; replace experiment-specific headline with an evergreen results entry as the catalog grows |
| Highlights heading | Keep; expose selected execution/thinking as a readable summary |
| Highlight settings | Define Direct vs Pi in one short help control; synchronize with the deep comparison or clearly separate and name scopes |
| Arabic card | Keep; link the task definition and coverage, not just a generic claim about all Arabic capability |
| Saudi card | Keep; distinguish cultural knowledge, service knowledge, and dialect evidence when those tracks are available |
| Tool-decisions card | Keep; state the exact task scope and avoid implying production action reliability |
| Bar axes | Increase contrast/size; label percentage units; keep zero baseline |
| Bar values | Use one decimal in overview, two in detail. Display missing measurements explicitly; current fallback can produce a zero-valued accessible label |
| Bar tooltip | Keep hover/focus/tap support. Add model name, metric, execution, thinking, denominator, and an accessible association with the bar |
| Provider labels | Keep recognizable logos and readable names; support additional providers without compressing labels into unreadable columns |
| Explore-results actions | Preserve the selected task/settings in the URL and destination |
| Recommender/build/changelog strip | Keep secondary to evidence; each icon/action should be consistent and have a specific destination |
| Section navigation | Move closer to results; highlight active section; avoid a large sticky layer on mobile |
| Comparison table | Make this the primary detailed comparison. Add column sorting, model search when useful, select-to-compare, and source date |
| Table score bars | Keep as quick visual aids; support text-only/table accessibility and explicit missing scores |
| CSV export | Keep; include metric definition, snapshot/protocol identity, execution, thinking, denominator, and failure handling in an accompanying metadata file or export columns |
| Answer-quality distribution | Keep in deeper analysis, not the main decision surface; state that it covers all tasks even when the comparison table is filtered to one task |
| Distribution segments | Fix low-contrast text and tiny unclickable failure segments; provide a complete accessible table alternative |
| Timing section | Move to Inference or a deeper diagnostics view; retain sample coverage and exploratory label; do not promote this as a controlled speed comparison |
| Timing controls | Show settings locally or provide persistent shared controls; currently changing them requires returning to the highlights |
| Deep thinking explorer | Move most of it to Models/Releases or collapse by default; avoid duplicate “Explore thinking levels” and “Compare model performance” headings |
| Closing submission CTA | Keep but shorten; secondary to a comparison/recommender CTA for the primary audience |

## Models — `/models`

| Element | Recommendation |
| --- | --- |
| Heading/intro | Replace oversized marketing intro with a compact “Models” title and a one-line purpose |
| Catalog body | Use a sortable model table with selected configuration, task scores, evidence date, and comparison selection |
| Search | Restore scalable model/provider search here; it should filter model rows, not merely hide all chart series |
| Filters | Separate model/provider, benchmark, execution, and thinking. Offer a clear reset |
| Browse releases link | Keep, but releases must contain distinct configuration/version information |
| Recommender link | Keep as “Choose by use case” |
| All-level chart | Secondary view rather than the whole catalog |
| Operational note | Replace generic prose with direct link to available timing evidence and explicit unavailable metrics |

## Releases — `/models/releases`

| Element | Recommendation |
| --- | --- |
| Page purpose | Decide whether this is a release catalog or configuration catalog; current content provides configurations, not verified release dates |
| Listing | One row per model/configuration with filters for provider, execution, thinking, and benchmark |
| Release date | Display only when sourced; separate provider release date from evaluation date |
| Current repeated chart | Move behind a “Compare configurations” action |
| Configuration selection | Allow selection of a few rows for comparison rather than forcing every level |
| Deep links | Stable URLs for each evaluation configuration and copy-link action |

## Model details — both `/models/humain-m3` and `/models/minimax-m3`

| Element | Recommendation |
| --- | --- |
| Breadcrumb | Make “Models / model name” compact and conventional; remove decorative repetition across the page width |
| Logo/name | Combine into one identity row with provider link; the large detached logo consumes space |
| Intro | Replace generic description with a sourced model/system summary and evaluation date |
| Top metrics | Show selected-configuration overall/task results immediately; avoid making visitors scroll through seven repeated rows first |
| Self-selection chip | Remove the ability to hide the only model on its own profile; use “Compare with…” for a real action |
| Thinking comparison | Keep as expandable analysis; explain provider settings may not be equivalent |
| Section links | Move above the long chart; consider a compact sticky subnav |
| Summary | Write a computed, configuration-specific summary of observed strengths/weaknesses with limitations; current text mostly explains page mechanics |
| Task bars | Replace pooled-default bars with selected-configuration counts; keep aggregate-all-configurations as an explicit optional mode if still useful |
| Compare checkbox | Replace hardcoded other-model logic with a model picker; include provider logos |
| Capability group pills | Keep, unify styling with other filters, and show visible result count |
| Why-it-matters block | Keep the explanation but shorten the large callout; offer deeper definitions on demand |
| Task search | Keep; include clear/reset control and reset-all action in no-match state |
| Task sorting | Add low-to-high and largest-difference options when comparing; label criterion clearly |
| Per-task context | Keep disclosure, sample size, rubric, and task purpose together; no raw private items |
| Configuration table | Use execution-path terminology; default sort by settings rather than raw config identifier; support selected rows and export |
| Cost/speed placeholders | Replace four large “Not measured” boxes with a compact availability table plus observed timing link |
| Technical specifications | Put relevant verified facts near identity; use individual fields for unknown values and links to provider sources |
| Provenance accordion | Keep and expand with snapshot, judge/rubric, dataset revision, historical mismatch disclosure, and export metadata |
| Raw/PI labels | Standardize to Direct (Raw) and Pi agent; PI is an execution path, not simply a prompt setting |

### Detail aliases — `/models/releases/[slug]`

Redirect or provide canonical metadata to the primary model page. The current alias renders the same page and metadata, creating duplicate destinations rather than a true release/configuration view. Do not break existing links.

## Coding Agents — `/coding-agents`

| Element | Recommendation |
| --- | --- |
| Heading | Label current evidence “Coding questions” within the Coding Agents section |
| Five-case warning | Keep prominent; pair scores with “x / 5” so 100% cannot look like a mature agent benchmark |
| Chart scope | Lock the main content to coding questions; current tabs allow unrelated overall/Arabic metrics inside Coding Agents |
| Precision | Prefer counts and whole percentages for this small subset |
| Future agent evaluations | Show a compact planned protocol for repository tasks, tools, completion, and costs; no invented scores |

## Image — `/image`

| Element | Recommendation |
| --- | --- |
| Page heading/status | Put “Evaluations planned” beside the title |
| Why block | Keep one sentence explaining Arabic text/layout relevance |
| Three cards | Convert into compact task choices: generation, understanding, OCR; avoid large inactive cards that look clickable |
| OCR | Treat OCR as its own evaluation setup and metric family; later expose character/word error and layout measures when supported |
| Empty state | One small state with contact/contribute action and text-results link; remove repetition |

## Speech — `/speech`

| Element | Recommendation |
| --- | --- |
| STT/TTS | Separate setups; each needs its own metric definition and ranking direction |
| Dialect coverage | Present as a dataset/filter dimension, not an interchangeable model task alongside STT and TTS |
| Why block | Keep accents, names, mixed-language speech relevance, in less vertical space |
| Planned/empty states | Use the same compact pattern as Image |

## Video — `/video`

| Element | Recommendation |
| --- | --- |
| Generation/understanding cards | Use a balanced two-column layout, rather than occupying two thirds of a three-column grid |
| Empty roadmap | Keep short with a clear contribution/contact path |
| Future results | Separate generation preference from understanding correctness; do not imply a shared metric |

## Inference — `/inference`

| Element | Recommendation |
| --- | --- |
| Page claim | “Compare model-serving performance” currently overpromises a page with no serving results |
| Existing timing evidence | House the exploratory timing recovered locally here with matching coverage/context |
| Controlled metrics | Explicitly separate TTFT, output tokens/s, end-to-end time, and cost; explain required measurement setup |
| Missing values | Compact availability table; no large empty result cards |
| Endpoint context | When measured, show provider/region, request size, concurrency, date, and token accounting alongside speed/cost |

## Leaderboards — `/leaderboard`

| Element | Recommendation |
| --- | --- |
| Landing purpose | Add clear “Available comparisons” and “Certified evaluations” views without combining incompatible scores |
| Title | Replace internal “Canonical” terminology with a visitor-facing protocol label and explanation |
| Current empty state | Keep truthful status but give a direct link to the available comparison; reduce repeated notices |
| Why block | Remove generic explanation of why leaderboards exist; use the space for protocol and filtering |
| Populated table | Provider logo, task/protocol filters, date, execution settings, coverage, score definition, source link |
| Errors | Do not turn a failed query into “No published evaluations”; show retry/unavailable state |

## Published results — `/runs/[id]` (source-only review)

| Element | Recommendation |
| --- | --- |
| Model/system identity | Include logo, source model identifier, serving organization, execution settings, and evaluation time |
| Organization-verified claim | Explain that organization identity verification does not itself verify the underlying model weights/version |
| Score summary | Clear label and formula for macro score; do not put case-weighted and macro scores side by side without explaining the distinction |
| Track profile | Interactive bars/table with counts, rubric links, and accessible labels |
| Reproduction | Link actual dataset revision, judge version, harness version and export; plain strings are insufficient |
| Missing/private/unpublished run | Explicit safe 404/recovery; preserve authorization boundaries |

## Recommender — `/recommender`

| Element | Recommendation |
| --- | --- |
| Positioning | Call the result an evidence-based shortlist; one proxy track cannot determine production suitability |
| Task chooser | Keep the four approved use cases; add concise examples rather than long introductory text |
| Settings | Standardize execution terminology and inherit shared comparison settings |
| Recommendation cards | Add provider logos, score bars, concise “why shown,” and a compare action |
| Ranking labels | Avoid treating trivial differences as a decisive winner; ties/small differences need neutral language |
| Evidence-gap text | Keep, but place beside the recommendation it qualifies; reduce the large generic callout |
| Hardcoded “two models” footer | Remove; derive available candidates from the catalog |
| Empty case | Add a “No measured evidence for these settings” state rather than an empty list |

## About — `/about`

| Element | Recommendation |
| --- | --- |
| Hero | Use “About Najd Arena”; the homepage tagline need not be repeated as another large hero |
| Contact button | Keep; one consistent contact destination |
| Provider row | Link provider logos to measured model profiles; keep identification/endorsement distinction understated |
| What we measure | Link each area to concrete results and methodology; compact cards rather than disconnected prose |
| Founder | Expand with a brief approved bio, founder website/social links, and photo only if supplied/approved |
| Independence | Explain funding, submission/judging arrangements, and correction policy using verified facts; avoid unsupported institutional claims |
| Join us | Separate follow, contribute, and request-evaluation actions |

## Methodology — `/methodology`

| Element | Recommendation |
| --- | --- |
| Opening | Keep plain-language explanation; add a short table of contents |
| Two protocols | Use a comparison table for dataset scope, score formula, judge, evidence status, and allowed comparisons |
| Historical formula | Show a worked arithmetic example without private content |
| Canonical formula | Explain macro vs case-weighted scores with a small diagram/example |
| Raw/Pi and thinking | Dedicated definitions; identify execution boundaries and provider-specific setting behavior |
| Label meanings | Define correct, possible, partial, wrong, and technical status once; reuse tooltips sitewide |
| Uncertainty | Keep visible. Explain that absent confidence intervals cannot support significance claims |
| Timing evidence | Document partial elapsed-time sampling and exclusions; current generic “speed unmeasured” language needs nuance |
| Reproduction | Add public dataset/harness/code links, pinned versions, metric export schema, and correction/contact path |

## AI Trends — `/ai-trends`

| Element | Recommendation |
| --- | --- |
| Current two cards | Replace with a real editorial index when articles exist; avoid a destination that mostly redirects to another website |
| Najd content | Publish a sourced configuration analysis from the current evidence; label it analysis, not a time trend |
| External content | Keep attribution, date, short summary, and distinction from Najd measurements |
| Time-series absence | Compact empty state; do not manufacture historical trend lines |
| Future filtering | Topic/date/source filters after there are enough articles to warrant them |

## Changelog — `/changelog`

| Element | Recommendation |
| --- | --- |
| Local-preview copy | Keep only in preview/development; production visitors should see release status rather than internal deployment language |
| Entries | Include the recent chart/metric updates; distinguish UI, metric, dataset, and evaluation changes |
| Entry structure | Date, short title, impact, affected page links, protocol/version when applicable |
| Typography | Add list spacing and consistent heading/paragraph rhythm; current entry is visually compressed |

## Public submission — signed-out `/dashboard`

| Element | Recommendation |
| --- | --- |
| Mobile order | Put sign-in/availability first; currently an entire viewport of explanation precedes the login controls |
| Disabled sign-in | Give a useful “Request access/contact” action; avoid a dead-end CTA |
| Setup message | Replace implementation language with an honest visitor-facing availability message |
| Steps | Keep four steps, but condense to a numbered row/list |
| Cost responsibility | Clearly state that the submitting organization pays its endpoint usage and Najd supplies workers/judging, matching the intended model |
| Privacy | Link real key-handling and publication policy before accepting credentials |
| Further review | Signed-in functionality, permissions, live runs, and admin controls remain a separate pass |

## Historical archive — `/historical/m3`

| Element | Recommendation |
| --- | --- |
| Location | Keep out of primary navigation as requested |
| Pooled headline | Clearly mark archive/aggregate mode; link to current configuration comparison so direct visitors do not mistake it for the active headline |
| Large counters | Keep only as archival evidence details if needed; do not reintroduce on the homepage |
| Private report link | Label access restrictions; provide a sanitized public methodology summary rather than sending general visitors to an inaccessible Drive PDF |
| Tables | Add execution terminology, filter/export options, and consistent visual treatment |

## Loading, errors, empty states, accessibility

| Element/state | Recommendation |
| --- | --- |
| Loading | Skeletons matching the target page and a status label; avoid a large generic rectangle causing layout shifts |
| Fetch failure | Show retry and preserve selected filters; do not silently turn failures into no-results states |
| 404 | “Explore models” should link to `/models`, not `/`; add a clear home alternative |
| No model selected | Keep recovery text; add “Select all” where there are many models |
| Search no match | Add reset filters and clear search buttons |
| Zero score vs missing score | Never encode missing as 0; show unavailable text and omit the bar |
| Keyboard charts | Maintain visible focus; accessible labels with values and sample size; associate tooltip text with its trigger |
| Tap tooltips | Deterministic open/close behavior, dismissal, and no dependence on hover |
| Chart/table alternatives | Every visualization, including label distribution, should have an accessible data table |
| Narrow tables | Keep model name sticky; indicate horizontal overflow; prioritize essential columns on phones |
| Motion | Respect reduced-motion preference for scrolling as well as bar animation |
| RTL | If approved, test number formatting, mixed Arabic/English model identifiers, menus, charts, and table alignment; do not merely flip CSS direction |

## Maintainability behind the interface

| Finding | Proposed change |
| --- | --- |
| `globals.css` plus accumulating overrides in `analysis.css` | Consolidate shared tokens/components; delete superseded rules after visual parity checks |
| Repeated model names, logos, slug logic, and fixed rival selection | One typed provider/model/configuration registry |
| Static supplementary JSON alongside database scores | Tie both to an explicit evaluation snapshot/version in the view model; refuse to mix mismatched revisions |
| Different metric definitions spread across pages | One metric-definition registry with title, unit, direction, formula, scope, and caveat |
| Client-only filter state | URL-backed parameters with defaults, reset, and share action |
| Long minified JSX | Format components and separate data selection from presentation before expanding the catalog |
| Duplicate fallback category definitions | Remove unreachable duplicate About/Coding/Trends entries once dedicated routes are canonical |

## Recommended implementation order

| Slice | Deliverable | Completion check |
| --- | --- | --- |
| 1. Comparison contract | Shared selection state, metric definitions, source version, URL sharing, and configuration-specific model breakdowns | Same context survives home → model → back → shared URL; all score counts reconcile |
| 2. Public design system | Typography, contrast, icons, logos, chart/table controls, and mobile navigation | Desktop + phone + keyboard checks across every public template |
| 3. Distinct discovery pages | Models catalog, configuration browser, model detail, evidence shortlist, clear leaderboard protocol views | A first-time visitor can shortlist models without knowing the experiment structure |
| 4. Supporting pages | Compact planned categories, stronger About/Methodology, real changelog/editorial index, public submission recovery | No misleading empty pages or dead-end navigation |
| 5. Production review | Metadata, canonical links, sharing, real auth availability, error handling, and production build | End-to-end public journey tested on the intended deployment |

## Sources

- Local application at http://localhost:3017/ and its public route implementations in `web/app/`.
- Shared components in `web/components/`, model registry and database mapping in `web/lib/`, and current stylesheet definitions.
- Design reference: https://artificialanalysis.ai/ (inspected in the preceding design pass). Reference informs density and interactions, not Najd data or claims.
- Metric provenance: `docs/historical-m3-results.md` and the verified aggregate export described there.

## Implementation follow-through — 26 September 2026

Implemented in the local preview:

- Shared URL-backed execution and thinking settings across overview, comparisons, model task breakdowns, recommender, and primary navigation.
- One setting by default; expand to compare all levels. Profiles no longer pool task scores across configurations.
- Searchable release catalog with configuration-specific model links; no-match reset and lowest-score task sorting.
- Available historical scores and certified results occupy separate leaderboard sections.
- Exploratory timing moved to Inference, with execution/thinking selectors and sample limitations retained.
- Compact planned category rows, clearer coding scope with counts, larger supporting text, contrast and keyboard focus improvements, mobile results sooner, and public contact/correction links.
- CSV includes dataset revision and historical evidence scope. Database failures on principal result pages reach the error boundary instead of masquerading as empty datasets.

Verification: TypeScript and ESLint passed. Browser checked shared Pi/high selection through to HUMAIN task scores, release search, one/seven-level expansion, Inference, Leaderboards, and the homepage at 390 × 844. No evaluation values were changed.

Remaining engineering follow-ups: consolidate legacy CSS; replace remaining hardcoded model metadata/opponent selection with a scalable registry; strengthen the supplemental-metric snapshot contract; implement authenticated submission as a separate workstream. No deployment was performed in this pass.
