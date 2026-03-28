# MCPSpec — Future Work & Strategic Analysis

> Last updated: February 2026
> Based on deep competitive research, ArXiv literature review, and ecosystem analysis.

---

## Table of Contents

1. [Strategic Position](#strategic-position)
2. [Competitive Landscape](#competitive-landscape)
3. [What MCPSpec Has That Nobody Else Does](#what-mcpspec-has-that-nobody-else-does)
4. [Priority 1: Contract Snapshots](#priority-1-contract-snapshots)
5. [Priority 2: MCP Quality Index (Registry Report)](#priority-2-mcp-quality-index-registry-report)
6. [Priority 3: Official MCP Ecosystem Integration](#priority-3-official-mcp-ecosystem-integration)
7. [Evaluated & Rejected Ideas](#evaluated--rejected-ideas)
8. [Competitive Matrix](#competitive-matrix)
9. [Key Research & Prior Art](#key-research--prior-art)

---

## Strategic Position

MCPSpec is the **only comprehensive developer-focused testing platform** for MCP servers. Every competitor is a narrow single-purpose tool (security-only, scoring-only, config-only, or research-only). MCPSpec is the only tool where a developer can write test collections, run security audits, benchmark performance, generate docs, produce a quality score, record sessions, create mocks, and integrate everything into CI/CD — all from one CLI.

The path to visibility is **adoption, not novelty**. The tool that wins is the one developers use every day.

### MCPSpec's Unique Capabilities (No Competitor Has These)

| Capability | Status |
|---|---|
| Recording → Replay → Mock pipeline | Shipped (v1.1.0+) |
| Collection-based test runner with 10 assertion types | Shipped (v0.1.0+) |
| Mock server generation from recordings (standalone .js) | Shipped (v1.2.0) |
| All-in-one CLI (test + security + score + bench + docs + mock) | Shipped (13 commands) |
| Dynamic active security testing (adversarial payloads to running servers) | Shipped (8 rules, 3 modes) |
| Behavior-based quality scoring (5 categories, 6 schema sub-criteria) | Shipped (v1.0.0) |
| CI/CD pipeline generation (GitHub Actions, GitLab CI, shell) | Shipped (v1.1.0) |

---

## Competitive Landscape

### MCP Security Scanners (28+ tools identified)

| Tool | Backer | Approach | Open Source? | Public Report? |
|---|---|---|---|---|
| **Snyk/Invariant agent-scan** | Snyk (enterprise) | Config scanning, tool description analysis, proxy mode | Yes | No |
| **Cisco MCP Scanner** | Cisco | YARA rules + behavioral code analysis (docstring vs implementation) | Yes | No |
| **Enkrypt AI** | VC-funded SaaS | Source code SAST, published "1,000 servers scanned" | No (SaaS) | One-time blog |
| **earezki/Kai** | Independent | Scanned 518 registry servers for auth presence | N/A | One-time blog |
| **Adversa AI** | Adversa AI | TOP 25 vulnerability taxonomy, scanned 539 endpoints | No | One-time report |
| **Proximity (Nova)** | Independent | NOVA rules + LLM analysis for tool poisoning | Yes | No |
| **MCPShield** | Independent | Supply chain (typosquats, CVEs, hardcoded creds) | Yes | No |
| **APIsec MCP Audit** | APIsec | Config scanning, secrets detection, AI-BOM generation | Yes | No |
| **Lasso MCP Gateway** | Lasso Security | Runtime proxy with guardrail plugins | Yes | No |

### MCP Quality Scoring / Leaderboards

| Platform | Servers | Scoring Method | Dynamic Testing? |
|---|---|---|---|
| **MCP Scorecard (Gigabrain)** | 2,300+ | Provenance, maintenance, popularity, permissions (metadata) | No |
| **mcpscan.dev** | Unknown | Compliance, security, agent-friendliness | Partial |
| **best-of-mcp-servers** | 410+ | GitHub metrics (stars, contributors, activity) | No |
| **MCP Market** | 100 | GitHub stars only | No |
| **mcp.so** | 17,186+ | Catalog, ranking by popularity | No |
| **Vigile AI** | Unknown | Trust scores (opaque methodology) | No |

### MCP Testing Frameworks

| Tool | Scope | vs MCPSpec |
|---|---|---|
| **Official MCP Inspector** | Manual REPL exploration | MCPSpec's `inspect` is one of 13 commands |
| **Official MCP Conformance** | Basic handshake/init tests | MCPSpec's planned probe goes much deeper |
| **MCP Validator (Janix-ai)** | Protocol compliance only | MCPSpec adds functional + security + quality |
| **haakco testing framework** | Test generation + coverage | No security, no scoring, no recording/mock |

### Key Finding

**Nobody connects to a running server, calls tools with adversarial inputs, measures response quality, benchmarks performance, AND produces a quality score.** Every competitor operates at a single level (metadata, source code, config files, or popularity metrics). MCPSpec is the only tool that does dynamic active testing.

---

## Priority 1: Contract Snapshots

**Status:** Not started
**Effort:** 3-4 weeks
**Source:** Codex proposal (evaluated and approved)

### What It Does

Infers tool response schemas from real traffic (test runs, recordings, inspector sessions), saves them as "contract snapshots," and enforces backward-compatibility in CI with a semantic diff gate.

### Why It's the Highest Priority

1. **Zero ongoing user effort** — run `mcpspec contract save` once, CI enforces forever
2. **No competitor has this** — most tools test outputs, few learn the contract and guard its evolution
3. **Makes every existing MCPSpec feature more valuable** — every test run and recording becomes training data for contracts
4. **Solves the hardest regression class** — silent breaking changes not directly asserted in tests
5. **Low adoption friction** — one command to save, one line in CI

### Implementation Sketch

- `ContractInferencer` in `@mcpspec/core` — consumes tool results, produces JSON-schema-like shapes
- `ContractStore` (like BaselineStore) — save/load snapshots by name
- `ContractDiffer` — classifies changes:
  - **Breaking:** removed fields, type changes, stricter enums, narrowed value ranges
  - **Non-breaking:** added optional fields, widened ranges, new enum values
- CLI commands:
  - `mcpspec contract save <name>` — from test runs or recordings
  - `mcpspec contract check <name>` — enforce compatibility (exit code 1 on breaking)
- UI page + WebSocket progress (similar to audit/benchmark)

### Content Sources

- Tool call capture: `TestExecutor`, `RecordingReplayer`
- Baseline storage: `BaselineStore` pattern
- Diffing: `RecordingDiffer`, `ResultDiffer` patterns
- Server DB: JSON blob storage already exists

---

## Priority 2: MCP Quality Index (Registry Report)

**Status:** Not started
**Effort:** 3-4 weeks (after Contract Snapshots)
**Risk:** Auth barrier limits dynamic testing to ~50-100 servers

### The Auth Problem

Most MCP servers require API keys, database credentials, or OAuth tokens. This is why:
- Enkrypt scans **source code** (never runs servers)
- earezki only checked **whether auth existed** (didn't authenticate)
- MCP Scorecard uses **GitHub metrics** (never connects to servers)

### Tiered Approach

**Tier 1 — All servers (500+):** Passive security + schema quality + documentation scoring
- Passive audit (5 rules): tool poisoning, excessive agency, input validation, info disclosure, path traversal patterns
- Schema quality (6 sub-criteria): structure, property types, descriptions, required fields, constraints, naming
- Documentation quality: tool descriptions, parameter docs

**Tier 2 — Auth-free servers (~50-100):** Full dynamic testing
- Active security probing (all 8 rules)
- Error handling scoring (real tool calls)
- Performance benchmarks (latency stats)
- Full 5-category MCP Score

### Differentiators vs Existing Leaderboards

| Feature | MCP Scorecard | mcpscan.dev | MCPSpec Quality Index |
|---|---|---|---|
| Scoring basis | Metadata (GitHub metrics) | Shallow compliance | Behavior-based (actual server testing) |
| Security depth | Permissions check | Basic | 8 rules, active + passive |
| Schema analysis | No | Unknown | 6 sub-criteria, opinionated linting |
| Performance data | No | No | Latency benchmarks |
| Reproducible | No | No | Yes (`mcpspec score <server>`) |
| Badge ecosystem | No | No | Yes (shields.io-style SVG) |

### Implementation Plan

1. **Automated scanner** — iterates registry, spawns each server via npx, runs audit + score + bench
2. **Static site generator** — per-server pages with scores, findings, badges
3. **Weekly cron** (GitHub Actions) — re-scan and redeploy
4. **Score trends** — track changes over time, detect regressions
5. **"Run it yourself" CTA** — `mcpspec score "npx <server>"` for local verification
6. **Badge embeds** — server authors embed score badges in READMEs

### The Pitch

*"We scored 500+ MCP servers on security and quality. For the 80 we could fully test, here are performance benchmarks and active security results. Want the full score for your server? Run `mcpspec score` yourself."*

---

## Priority 3: Official MCP Ecosystem Integration

**Status:** Not started
**Effort:** Ongoing

### Targets

1. **Linux Foundation Agentic AI Foundation (AAIF)** — governs MCP, Goose, AGENTS.md. MCPSpec could be recommended as the testing tool.
2. **Official MCP conformance suite** — currently bare-bones (handshake/init only). MCPSpec's planned probe goes significantly deeper. Contribute upstream or position as the de facto conformance tool.
3. **MCP server template repos** — get MCPSpec included in official "create an MCP server" templates with a default `mcpspec.yaml`.
4. **Registry integrations** — publish MCPSpec scores to mcp.so, Smithery, Glama.

---

## Evaluated & Rejected Ideas

### "Syscall" — Neuro-Symbolic Kernel for the LLM OS

**Source:** Gemini proposal
**Verdict:** Rejected — every component has significant prior art from major research labs.

| Claimed Feature | Prior Art |
|---|---|
| Agent kernel / syscall abstraction | AIOS (Rutgers, COLM 2025) — peer-reviewed |
| Taint tracking through tool calls | FIDES (Microsoft Research, May 2025) — open source, 100% attack prevention on AgentDojo |
| Z3/SMT runtime verification | VeriGuard (Google Research), AgentSpec (ICSE 2026), Invariant Labs (acquired by Snyk) |
| Context paging / virtual memory | MemGPT (Oct 2023) — now a company called Letta |
| Policy DSL for agent constraints | Invariant Labs, AgentSpec, NeMo Guardrails (Colang) |
| MCP safety proxy | Lasso Gateway, AWS MCP Proxy (GA Oct 2025) |

**Key problem:** Z3-based verification of open-ended safety properties is a multi-year research problem. Taint tracking through LLMs is fundamentally undecidable (the LLM is an opaque function). Researchers at Anthropic/Google/OpenAI would recognize this immediately.

### "Aegis" / Ephemeral-MCP — Agent-as-a-Function Firewall

**Source:** Gemini proposal
**Verdict:** Rejected — the useful parts already exist, the novel parts are infeasible.

| Claimed Feature | Prior Art |
|---|---|
| Ephemeral execution per tool call | AWS Bedrock AgentCore, Google GKE Agent Sandbox, Cloudflare Workers |
| One-time scoped capability tokens | CyberArk (product), Token Security (product), OWASP standard guidance |
| MCP gateway with policy enforcement | InfoQ published the exact architecture (MCP + OPA + ephemeral runners) |
| Sandboxed tool execution | Firecracker MicroVMs (~125ms boot), gVisor, V8 isolates |

**Fundamental contradiction:** Making the *agent* (LLM) ephemeral per-action destroys multi-step reasoning — the entire point of agents. The orchestrator that decides what to spawn IS the persistent, stateful, high-privilege component the architecture claims to eliminate (OMNI-LEAK, arXiv 2602.13477). Google DeepMind's CaMeL solves this better with dual-LLM + capabilities + control flow integrity.

**Name collision:** "The Aegis Protocol" is already a published arXiv paper (2508.19267) on agent identity using W3C DIDs + post-quantum cryptography.

### "Sentry" — Runtime MCP Proxy/Firewall

**Source:** Gemini proposal
**Verdict:** Deferred — good vision but wrong timing.

**Strengths:**
- Flight recorder (production bugs → regression tests) is genuinely valuable
- Leverages existing MCPSpec code (recording, mocking, security rules)
- Changes product category from dev-tool to runtime infrastructure

**Problems:**
- High adoption friction (requires reconfiguring MCP client configs)
- Must be rock-solid reliable (it's in the critical path)
- Crowded space: Lasso Gateway, AWS MCP Proxy, NeMo Guardrails, LlamaFirewall
- Implementation complexity: 3 transports, backpressure, crash handling

**Decision:** Contract Snapshots and Quality Index first. Revisit Sentry after MCPSpec has more adoption.

### "MCP Probe" — Protocol Conformance Tester

**Source:** CLAUDE.md v1.2.5 roadmap
**Verdict:** Still planned but lower priority than Contract Snapshots.

**Assessment:** Useful but incremental. Doesn't change what MCPSpec is. Can be built after higher-impact features ship.

---

## Competitive Matrix (Full)

| Capability | MCPSpec | Snyk | Cisco | Enkrypt | Proximity | MCPShield | Lasso | MCP Scorecard | mcpscan.dev |
|---|---|---|---|---|---|---|---|---|---|
| Functional test runner | Yes | No | No | No | No | No | No | No | Partial |
| Dynamic security (active) | Yes (8 rules) | No | Partial | No (SAST) | No | No | Runtime | No | Partial |
| Static security | Metadata | Metadata | Source + YARA | Source code | Metadata + NOVA | Config | N/A | N/A | Unknown |
| Quality scoring | Yes (5 cat) | No | No | No | No | No | No | Yes (4 dim) | Yes (3 scores) |
| Performance benchmarks | Yes | No | No | No | No | No | No | No | No |
| Doc generation | Yes | No | No | No | No | No | No | No | No |
| CI/CD integration | Yes (JUnit, exit codes) | Partial | Static mode | No | No | Yes | No | No | No |
| Recording/Replay | Yes | No | No | No | No | No | No | No | No |
| Mock server generation | Yes | No | No | No | No | No | No | No | No |
| Supply chain analysis | No | Partial | No | No | No | Yes | No | Partial | No |
| Runtime protection | No | Proxy mode | No | No | No | No | Yes | No | No |
| Source code analysis | No | No | Yes | Yes | No | No | No | No | No |

---

## Key Research & Prior Art

### Agent Security (Must-Read Papers)

| Paper | Authors | Key Contribution |
|---|---|---|
| [FIDES](https://arxiv.org/abs/2505.23643) | Microsoft Research | Information-flow control with taint tracking, 100% policy-violating attack prevention on AgentDojo |
| [CaMeL](https://arxiv.org/abs/2503.18813) | Google DeepMind | Dual-LLM + capability-based security, provable guarantees, defeats prompt injection "by design" |
| [VeriGuard](https://arxiv.org/abs/2510.05156) | Google Research | Formal verification of synthesized agent policies + runtime monitoring |
| [AgentSpec](https://arxiv.org/abs/2503.18666) | Singapore Mgmt Univ | DSL for runtime agent constraints, >90% unsafe execution prevention, ms overhead |
| [LlamaFirewall](https://arxiv.org/abs/2505.03574) | Meta | Layered guardrails: prompt injection detection, CoT auditing, code scanning |
| [IsolateGPT](https://arxiv.org/abs/2403.04960) | NDSS 2025 | Hub-and-spoke execution isolation, <30% overhead |
| [AIOS](https://arxiv.org/abs/2403.16971) | Rutgers (COLM 2025) | Agent OS with syscalls, scheduling, resource management |
| [MCPTox](https://arxiv.org/abs/2508.14925) | Academic | Tool poisoning benchmark, 45 real MCP servers, 353 tools, 1,312 test cases |
| [OMNI-LEAK](https://arxiv.org/html/2602.13477) | Academic | Data leakage through orchestration layer in multi-agent systems |
| [Promptware Kill Chain](https://arxiv.org/pdf/2601.09625) | Academic | Formalizes how prompt injections escalate across turns |

### Benchmarks

| Benchmark | What It Measures |
|---|---|
| [AgentDojo](https://arxiv.org/abs/2406.13352) | Agent security — prompt injection, tool misuse |
| [MCP-Atlas (Scale AI)](https://scale.com/leaderboard/mcp_atlas) | LLM model ability to use MCP tools (1,000 tasks, 36 servers) |
| [MCPMark](https://mcpmark.ai/) | LLM model MCP task completion (127 tasks, 5 environments) |

### Industry Standards

| Standard | Organization | Relevance |
|---|---|---|
| [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) | OWASP | Best practices for agent security |
| [Adversa AI MCP Security TOP 25](https://adversa.ai/mcp-security-top-25-mcp-vulnerabilities/) | Adversa AI | Vulnerability taxonomy for MCP |
| [MCP Specification](https://spec.modelcontextprotocol.io/) | Linux Foundation AAIF | Protocol spec |

---

## Implementation Roadmap

```
v1.2.5 (Next)
├── Contract Snapshots (3-4 weeks)
│   ├── ContractInferencer
│   ├── ContractStore
│   ├── ContractDiffer (breaking vs non-breaking)
│   ├── CLI: mcpspec contract save/check
│   └── UI page + WebSocket
│
├── MCP Probe (2 weeks)
│   ├── Protocol edge case testing
│   ├── CLI: mcpspec probe
│   └── Conformance report
│
v1.3.0
├── MCP Quality Index (3-4 weeks)
│   ├── Automated registry scanner
│   ├── Static site with per-server pages
│   ├── Tiered scoring (passive all, active where possible)
│   ├── Weekly cron re-scan
│   ├── Badge generation + embed codes
│   └── Blog post with findings
│
v1.4.0 (Revisit)
├── Sentry (runtime proxy) — if adoption warrants it
├── Source code analysis — if Cisco/Enkrypt approach proves valuable
└── Supply chain analysis — if MCPShield patterns are worth integrating
```
