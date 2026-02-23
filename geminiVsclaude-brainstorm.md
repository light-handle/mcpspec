Ok. This is what Gemini said when I asked to compare this project with alternative projects on the web and asked to be critical:

  I have researched the competitive landscape, specifically looking at the Official MCP Inspector, Promptfoo, and Smithery.

    Here is the "Devil's Advocate" critique. If I were an investor or a senior architect deciding whether to adopt mcpspec, this is how I would tear it down.


    1. "You are solving a problem Promptfoo already solved."
    The Critique:
    Promptfoo (https://promptfoo.dev) already has first-class MCP support. It can connect to an MCP server, simulate an agent, and assert on the results.
     * The Problem: Why would I learn your custom YAML syntax when Promptfoo lets me test the entire loop (LLM + Tool)?
     * The Risk: mcpspec tests the tool in a vacuum. But 90% of bugs aren't "the tool crashed"; they are "the tool's schema was so confusing the LLM used it wrong." mcpspec
  doesn't
       catch that. Promptfoo does.


    2. "The 'Inspector' is a waste of your engineering time."
    The Critique:
    The official @modelcontextprotocol/inspector is excellent. It has a polished Web UI, it's built by Anthropic/Model Labs, and it's the standard.
     * The Problem: You are spending weeks building a CLI/Web Inspector (mcpspec inspect) that is functionally identical to the official one.
     * The Risk: You will never keep up with their features. If they add a new protocol feature (e.g., "Sampling" or "Roots"), your inspector breaks, and users leave.


    3. "Testing Wrappers is redundant."
    The Critique:
    Most MCP servers are just thin wrappers around existing APIs (e.g., a GitHub MCP server just calls the GitHub API).
     * The Problem: The GitHub API is already tested by GitHub. The library you're using (e.g., octokit) is tested by the maintainers.
     * The Risk: You are asking developers to write regression tests for glue code. Most won't bother. They'll write one "does it work?" test and move on. The "Postman" model
  works for
       complex backends; does it work for simple pass-through proxies?


    4. "The Security Scanner is Security Theater."
    The Critique:
    Your scanner checks for things like SQL Injection and Path Traversal.
     * The Problem: In an MCP architecture, the "Attacker" is the LLM. The danger isn't that a user sends '; DROP TABLE; (the LLM sanitizes that). The danger is that the LLM is
  tricked
       into calling deleteUser({ id: 1 }) when it shouldn't.
     * The Risk: Your scanner checks for web app vulnerabilities (Injection, XSS) in a protocol where the threat model is totally different (Prompt Injection, Excessive Agency).
  You are
       fighting the last war.

    ---

    How to Pivot / Improvements


    If you want to survive against Promptfoo and the Official Inspector, you need to change your pitch.


    1. Don't be "The Inspector." Be "The CI/CD Gatekeeper."
     * Pivot: Admit the official inspector is better for manual debug. Position mcpspec purely as the fast, deterministic CI tool.
     * Feature: "Promptfoo is for quality (slow, uses LLMs). Mcpspec is for reliability (fast, no LLMs, runs on every commit)."
     * Action: Add a "GitHub Action Generator" command (mcpspec ci-init) that instantly adds a workflow to block PRs if the server crashes.


    2. Focus on "Schema Linting" (The thing Promptfoo doesn't do)
     * Pivot: The #1 problem in MCP is bad JSON Schemas (missing descriptions, wrong types) that confuse the LLM.
     * Feature: Make your "MCP Score" extremely strict about Schema semantics.
         * Bad: description: "Updates user"
         * Good: description: "Updates user profile. Requires 'id'. Warning: Irreversible."
     * Action: Build a "Linter" that explicitly warns if descriptions are too short or ambiguous for an LLM to understand.


    3. Make the Security Scanner "LLM-Aware"
     * Pivot: Don't just check for SQL injection. Check for Excessive Agency.
     * Feature: Flag tools that lack "confirmation steps."
         * Critique: "Tool delete_database has no require_confirmation parameter. This is dangerous for LLM use."
     * Action: Add specific rules that analyze the semantics of tool names and arguments, not just fuzzing inputs.


    4. "Mocking" is your Killer Feature
     * Pivot: Promptfoo and the Official Inspector require a running server.
     * Feature: If mcpspec can record a session and then simulate that server for other devs, you solve the "I can't test the Stripe MCP server because I don't have a Sandbox
  Key"
       problem.
     * Action: Prioritize the "Mock Server" feature (recording/replaying) above all else. This makes you indispensable for teams sharing tools.

  Tell me your thoughts. Think deeply and do your research and answer these points.

---------------------------------------------------------------------------------------------------------

⏺ Let me research the current state of these competitors before responding.

⏺ 3 Task agents finished (ctrl+o to expand)
   ├─ Research Promptfoo MCP support · 15 tool uses · 36.6k tokens
   │  ⎿  Done
   ├─ Research MCP Inspector features · 18 tool uses · 38.3k tokens
   │  ⎿  Done
   └─ Research MCP security threats · 23 tool uses · 51.0k tokens
      ⎿  Done

⏺ Here's my honest assessment of each critique, backed by the research.

  ---
  Critique 1: "You're solving a problem Promptfoo already solved"

  Verdict: Half right, half wrong.

  Promptfoo does have MCP support, but it's a secondary feature grafted onto an LLM evaluation framework, not a purpose-built MCP testing tool. The differences matter:

  ┌───────────────────────────────────┬─────────────────────────────┬────────────────────┐
  │              Aspect               │        Promptfoo MCP        │      MCPSpec       │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ LLM-free testing                  │ Partial (one provider mode) │ Always (by design) │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ JSONPath assertions               │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ Variable extraction between tests │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ Schema auto-validation            │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ CI exit codes                     │ Generic (0/1)               │ 8 granular codes   │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ JUnit XML output                  │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ Watch mode                        │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ Baseline comparison               │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ Test REPL                         │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ Docs generation                   │ No                          │ Yes                │
  ├───────────────────────────────────┼─────────────────────────────┼────────────────────┤
  │ MCP Score                         │ No                          │ Yes                │
  └───────────────────────────────────┴─────────────────────────────┴────────────────────┘

  Where Gemini is right: Promptfoo's LLM-in-the-loop testing ("does the LLM use this tool correctly?") is a genuinely valuable test that MCPSpec can't do. The observation that "90% of
   bugs are the LLM using the tool wrong" has real merit.

  Where Gemini is wrong: The claim that Promptfoo "already solved" MCP testing overstates it. Promptfoo's MCP provider requires you to manually format JSON tool calls in the prompt
  field — it has no call/with syntax, no structured response assertions, no variable extraction. Its assertion model is string-oriented (contains, equals on text), not
  response-structure-oriented ($.items[0].name == "foo"). For CI/CD gating — "did my MCP server break on this commit?" — MCPSpec is significantly better suited.

  The real positioning: These tools are complementary, not competitive. MCPSpec is the fast, deterministic CI gate ("does my server work?"). Promptfoo is the slow, LLM-powered quality
   check ("does my server work well with an LLM?"). The pitch should be: "Run mcpspec test on every commit in 5 seconds. Run Promptfoo weekly for LLM integration quality."

  ---
  Critique 2: "The Inspector is a waste of engineering time"

  Verdict: Mostly wrong.

  The official MCP Inspector is an excellent manual debugging tool. But it has:

  - No automated test runner — zero ability to define pass/fail criteria
  - No assertions — no schema validation, no latency checks, no expressions
  - No CI/CD integration — no JUnit output, no exit codes, no --ci mode
  - No test collections — no way to batch tests or run suites
  - No security scanning — it actually had its own critical CVE (CVE-2025-49596, CVSS 9.4)
  - No performance benchmarking
  - No documentation generation
  - No baseline comparison

  MCPSpec's inspect command overlaps ~20% with the official Inspector (both let you call tools interactively). The other 80% — automated testing, CI gates, security scanning,
  benchmarking, scoring, docs — is territory the Inspector explicitly doesn't cover and doesn't intend to.

  The honest concession: The inspect REPL specifically could be deprioritized. It's nice to have but isn't the differentiator. The real value is everything the Inspector can't do.

  ---
  Critique 3: "Testing wrappers is redundant"

  Verdict: Wrong framing, but identifies a real adoption challenge.

  This argument applies to all integration testing tools ("why test glue code?"), and the answer is the same as it's always been: the glue is where bugs live. A GitHub MCP server
  isn't just calling Octokit — it's:

  - Mapping MCP tool schemas to API parameters (wrong types break LLMs)
  - Handling pagination, rate limits, auth token refresh
  - Returning structured responses that the LLM must interpret correctly
  - Handling error cases (404s, permission denied, timeouts)

  Where the critique has merit: Developer adoption. Most MCP server authors won't write extensive test suites. The "one smoke test and move on" prediction is realistic. This means
  MCPSpec's value proposition should lean harder on zero-config value:

  - mcpspec score — instant quality rating, no test authoring needed
  - mcpspec docs — instant documentation, no effort
  - mcpspec audit — instant security scan, no configuration
  - mcpspec bench — instant performance baseline

  The "Postman model" (write detailed test collections) is for power users. The default experience should be: point MCPSpec at a server, get immediate value with zero YAML.

  ---
  Critique 4: "The Security Scanner is security theater"

  Verdict: Partially right — and this is the most actionable critique.

  Gemini is correct that the current scanner focuses on traditional web vulnerabilities (injection, path traversal, XSS-adjacent). But the claim that these are irrelevant to MCP is
  factually wrong.

  The OWASP MCP Top 10 (published 2025) explicitly includes:
  - MCP05: Command Injection & Execution — exactly what MCPSpec's injection rule tests
  - Path traversal is called out by the Semgrep MCP security guide as "old bugs in new context"
  - The MCP specification itself has an entire section on SSRF prevention

  These traditional vulnerabilities are amplified in MCP because an AI agent exercises them autonomously without human review. A path traversal bug in a REST API is medium severity;
  in an MCP server where an LLM automatically follows the traversal path, it's critical.

  Where Gemini is right: MCPSpec is missing the other half of the threat landscape — the LLM-specific attacks:

  ┌───────────────────┬──────────┬──────────────────────────────────────────────────────────────────┐
  │ Missing Category  │ OWASP ID │                       What It Would Check                        │
  ├───────────────────┼──────────┼──────────────────────────────────────────────────────────────────┤
  │ Tool Poisoning    │ MCP03    │ Hidden instructions in tool descriptions                         │
  ├───────────────────┼──────────┼──────────────────────────────────────────────────────────────────┤
  │ Excessive Agency  │ MCP02    │ Over-permissioned tools (delete capability without confirmation) │
  ├───────────────────┼──────────┼──────────────────────────────────────────────────────────────────┤
  │ Secret Exposure   │ MCP01    │ Hardcoded tokens in tool metadata                                │
  ├───────────────────┼──────────┼──────────────────────────────────────────────────────────────────┤
  │ Context Injection │ MCP10    │ Cross-context data leakage                                       │
  └───────────────────┴──────────┴──────────────────────────────────────────────────────────────────┘

  The tool poisoning one is particularly impactful — Invariant Labs demonstrated that a poisoned tool description could exfiltrate a user's entire WhatsApp history. This can be
  detected with regex heuristics (no LLM needed) by scanning tool descriptions for suspicious instruction patterns like "ignore previous instructions", hidden Unicode, or references
  to other tools.

  The "excessive agency" rule is also straightforward: flag tools with destructive names (delete_*, drop_*) that lack a confirmation or dryRun parameter in their schema.

  ---
  On the Pivot Suggestions

  1. "Be the CI/CD Gatekeeper, not the Inspector" — Agree. This should be the primary pitch. MCPSpec already has the best CI/CD story in the MCP ecosystem (JUnit XML, 8 exit codes,
  --ci flag, collection validation). Lean into it.

  2. "Schema Linting" — Agree, and MCPSpec already has the foundation with MCP Score. The suggestion to lint description quality ("too short", "ambiguous for LLM") is excellent. This
  is genuinely something nobody else does. Making the schema scoring stricter and more opinionated would be high-value, low-effort.

  3. "LLM-Aware Security Scanner" — Agree this is the biggest gap. Adding tool poisoning detection and excessive agency rules would be meaningful. These don't require an LLM to
  implement — pattern matching on tool descriptions and schema analysis is sufficient for the most common attack vectors.

  4. "Mocking/Recording" — Already on the roadmap (v1.1.5: Request/Response Diff & Replay). This is indeed a strong differentiator. Promptfoo and the Inspector both require a live
  server. Recording sessions and replaying them would solve real team workflow problems.

  ---
  TL;DR

  ┌───────────────────────────────┬──────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
  │           Critique            │                       Validity                       │                            Action                             │
  ├───────────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ Promptfoo already solved this │ Half true — complementary, not competitive           │ Position as "fast CI gate" vs Promptfoo's "LLM quality check" │
  ├───────────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ Inspector is a waste          │ Mostly wrong — Inspector has no testing capabilities │ Deprioritize inspect REPL, emphasize automated testing        │
  ├───────────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ Testing wrappers is redundant │ Wrong framing, but adoption concern is real          │ Push zero-config tools (score, audit, docs, bench)            │
  ├───────────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ Security scanner is theater   │ Partially right — missing LLM-specific threats       │ Add tool poisoning + excessive agency rules                   │
  └───────────────────────────────┴──────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘

  The strongest strategic moves would be: (1) add tool poisoning detection and excessive agency rules to the security scanner, (2) make schema linting more opinionated in MCP Score,
  and (3) accelerate the recording/replay feature. These create defensible differentiation that neither Promptfoo nor the Inspector can easily replicate.