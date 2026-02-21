# Phase 5: Complete (v1.0.0) — Doc Generator, MCP Score, Dark Mode

## Context

Phases 1-4 are complete. Phase 5 stubs exist (throw `NotImplementedError`) for documentation generation and MCP scoring. This plan implements:
- **Doc Generator**: Markdown + HTML documentation from server introspection
- **MCP Score**: 0-100 quality rating across 5 categories + SVG badge
- **CLI Commands**: `mcpspec docs` and `mcpspec score` (functional)
- **Server API Routes**: For UI integration of docs + score
- **UI Pages**: Docs and Score pages
- **Dark Mode**: Toggle in sidebar, persisted to localStorage
- **Unit Tests**: For doc generator, scorer, and badge generator

## Step 1: Core — Documentation Generation

### 1a. Replace `packages/core/src/documentation/markdown-generator.ts`

Pure function: takes `ServerDocData` → returns markdown string.

Output structure:
- `# {name} v{version}` header
- Tools table (name | description) + per-tool detail sections with JSON schema code blocks
- Resources table (uri | name | description | mimeType)
- Footer with generation timestamp

### 1b. Replace `packages/core/src/documentation/html-generator.ts`

Same data → HTML output. Uses inline Handlebars template (same pattern as `packages/core/src/testing/reporters/html-reporter.ts`). Styled HTML doc page with tool cards, schema code blocks, resource table.

Register a `jsonPretty` Handlebars helper for `JSON.stringify(obj, null, 2)`.

### 1c. Replace `packages/core/src/documentation/doc-generator.ts`

Orchestrator class:

```typescript
interface DocGeneratorOptions {
  format: 'markdown' | 'html';
  outputDir?: string;
}

interface ServerDocData {
  serverName: string;
  serverVersion?: string;
  tools: ToolInfo[];
  resources: ResourceInfo[];
  generatedAt: Date;
}

class DocGenerator {
  async generate(client: MCPClientInterface, options: DocGeneratorOptions): Promise<string>;
  async introspect(client: MCPClientInterface): Promise<ServerDocData>;
}
```

- `introspect()`: calls `getServerInfo()`, `listTools()`, `listResources()` (catch errors on resources → empty array)
- `generate()`: introspect → delegate to MarkdownGenerator or HtmlDocGenerator → optionally write to `outputDir/README.md` or `outputDir/index.html`
- Uses `writeFileSync`/`mkdirSync` from `node:fs` (same as `baseline-store.ts`)

## Step 2: Core — MCP Score

### 2a. Replace `packages/core/src/scoring/mcp-score.ts`

```typescript
interface ScoreProgress {
  onCategoryStart?: (category: string) => void;
  onCategoryComplete?: (category: string, score: number) => void;
}

class MCPScoreCalculator {
  async calculate(client: MCPClientInterface, progress?: ScoreProgress): Promise<MCPScore>;
}
```

**Scoring categories** (private methods, no separate criteria files):

| Category (weight) | Measurement |
|--------------------|-------------|
| documentation (25%) | % of tools+resources with non-empty `description` |
| schemaQuality (25%) | % of tools with `inputSchema` having `type` + `properties` + `required` (1/3 each) |
| errorHandling (20%) | Call up to 5 tools with `{}` args: `isError:true` = full, normal response = 50%, connection crash = 0. Average. |
| performance (15%) | Call first tool 5 times, median latency: <100ms=100, <500ms=80, <1s=60, <5s=40, else=20 |
| security (15%) | Passive scan via `SecurityScanner` + `ScanConfig({mode:'passive'})`: 0 findings=100, 1-2=70, 3-5=40, >5=20 |

Overall = `Math.round(doc*0.25 + schema*0.25 + error*0.20 + perf*0.15 + sec*0.15)`

**Reuses**: `SecurityScanner` from `../security/security-scanner.js`, `ScanConfig` from `../security/scan-config.js`, `performance.now()` for latency timing. MCPScore type already defined in `@mcpspec/shared`.

### 2b. Replace `packages/core/src/scoring/badge-generator.ts`

```typescript
class BadgeGenerator {
  generate(score: MCPScore): string;  // Returns SVG string
  getColor(score: number): string;    // #4c1 green, #dfb317 yellow, #e05d44 red
}
```

SVG badge: shields.io style, ~120x20px. Left="MCP Score", Right="{score}/100". Template literal interpolation (no Handlebars needed).

## Step 3: Core Exports

**Modify** `packages/core/src/index.ts` — add:
```
export { DocGenerator } from './documentation/doc-generator.js';
export type { DocGeneratorOptions, ServerDocData } from './documentation/doc-generator.js';
export { MarkdownGenerator } from './documentation/markdown-generator.js';
export { HtmlDocGenerator } from './documentation/html-generator.js';
export { MCPScoreCalculator } from './scoring/mcp-score.js';
export type { ScoreProgress } from './scoring/mcp-score.js';
export { BadgeGenerator } from './scoring/badge-generator.js';
```

## Step 4: CLI Commands

### 4a. Replace `packages/cli/src/commands/docs.ts`

Follow `audit.ts`/`bench.ts` pattern:
- Parse `<server>` argument, `--format`, `--output` options
- `MCPClient({ serverConfig: serverCommand })` → `connect()` → `DocGenerator.generate()` → `disconnect()`
- Print to stdout if no `--output`, else write files and print path

### 4b. Replace `packages/cli/src/commands/score.ts`

Follow `bench.ts` pattern:
- Parse `<server>` argument, `--badge` option
- Connect → `MCPScoreCalculator.calculate()` with progress callbacks → print category scores with colors → optional badge SVG write
- Color: green >=80, yellow 60-79, red <60

### 4c. Modify `packages/cli/src/index.ts`

- Import + `addCommand` for `docsCommand` and `scoreCommand`
- Bump version to `'1.0.0'`

## Step 5: Shared Schemas

**Modify** `packages/shared/src/schemas/api.ts` — add:
```typescript
export const docsGenerateSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
  format: z.enum(['markdown', 'html']).default('markdown'),
});

export const scoreCalculateSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
});
```

**Modify** `packages/shared/src/schemas/index.ts` — export both.

## Step 6: Server API Routes

### 6a. Create `packages/server/src/routes/docs.ts`

Single endpoint (no session needed — synchronous connect→generate→disconnect):
- `POST /api/docs/generate` — validates with `docsGenerateSchema`, connects MCPClient, runs `DocGenerator.generate()`, disconnects, returns `{ data: { content, format } }`

### 6b. Create `packages/server/src/routes/score.ts`

Session-based (scoring takes time due to error handling + perf + security checks):
- `POST /api/score/calculate` — validates with `scoreCalculateSchema`, connects, runs `MCPScoreCalculator.calculate()` with WebSocket progress (`score:{sessionId}` channel), returns `{ data: MCPScore }`
- `POST /api/score/badge` — accepts `{ score: MCPScore }`, returns SVG string

### 6c. Modify `packages/server/src/routes/index.ts`

Import + register `docsRoutes(app)` and `scoreRoutes(app, wsHandler)`.

## Step 7: UI Pages

### 7a. Modify `packages/ui/src/lib/api.ts`

Add `docs.generate(data)` and `score.calculate(data)` + `score.badge(score)` methods.

### 7b. Create `packages/ui/src/routes/pages/docs.tsx`

Two-phase UI:
- **Setup**: ServerConnector + format dropdown (markdown/html)
- **Results**: Generated content in a preformatted code block with Copy + Download buttons

### 7c. Create `packages/ui/src/routes/pages/score.tsx`

Three-phase UI:
- **Setup**: ServerConnector
- **Calculating**: Progress card showing current category
- **Results**: Large overall score with color, 5 category horizontal bars (CSS bars, no charting lib), Download Badge button

### 7d. Route tree + sidebar

**Modify** `packages/ui/src/routes/route-tree.tsx` — add `/docs` (DocsPage) and `/score` (ScorePage) routes.

**Modify** `packages/ui/src/components/layout/sidebar.tsx` — add:
- `{ href: '/docs', label: 'Docs', icon: FileOutput }`
- `{ href: '/score', label: 'Score', icon: Star }`

## Step 8: Dark Mode

### 8a. Modify `packages/ui/tailwind.config.ts`

Add `darkMode: 'class'` to the config object.

### 8b. Modify `packages/ui/src/styles/globals.css`

Add `.dark` block inside `@layer base` after `:root`:
```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 142 50% 40%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 142 50% 40%;
}
```

### 8c. Modify `packages/ui/src/stores/ui-store.ts`

Add `darkMode: boolean`, `toggleDarkMode()`, `initTheme()` to the store. Toggle applies/removes `dark` class on `document.documentElement`. Persists to `localStorage('mcpspec-theme')`. `initTheme()` checks localStorage then `prefers-color-scheme`.

### 8d. Modify `packages/ui/src/components/layout/sidebar.tsx`

Add dark mode toggle button (Moon/Sun icons from lucide-react) before the version footer.

### 8e. Modify `packages/ui/src/main.tsx`

Call `useUiStore.getState().initTheme()` before `createRoot` to prevent flash.

## Step 9: Unit Tests

### 9a. Create `packages/core/tests/unit/doc-generator.test.ts`

Uses `MockMCPClient` from `tests/fixtures/mock-mcp-client.ts`. Tests:
- MarkdownGenerator: produces valid markdown with tool tables, schema blocks, resources
- MarkdownGenerator: handles empty tools/resources
- HtmlDocGenerator: produces valid HTML containing tool names
- DocGenerator.introspect: returns correct ServerDocData
- DocGenerator.generate: delegates to correct generator by format
- DocGenerator: handles listResources failure gracefully

### 9b. Create `packages/core/tests/unit/mcp-score.test.ts`

Uses MockMCPClient. Tests:
- High scores for well-documented server (all descriptions, schemas, proper errors)
- Low documentation score when no descriptions
- Low schema score when no inputSchema
- Handles zero tools (edge case)
- Error handling: `isError: true` response = good score
- Error handling: throws = lower score
- Overall weighted correctly
- Performance scoring with fast mock

### 9c. Create `packages/core/tests/unit/badge-generator.test.ts`

Tests:
- Returns SVG string containing `<svg`
- Contains score number in text
- Green color for score >= 80
- Yellow for 60-79
- Red for < 60

## File Summary

| Action | File |
|--------|------|
| Replace | `packages/core/src/documentation/doc-generator.ts` |
| Replace | `packages/core/src/documentation/markdown-generator.ts` |
| Replace | `packages/core/src/documentation/html-generator.ts` |
| Replace | `packages/core/src/scoring/mcp-score.ts` |
| Replace | `packages/core/src/scoring/badge-generator.ts` |
| Replace | `packages/cli/src/commands/docs.ts` |
| Replace | `packages/cli/src/commands/score.ts` |
| Modify | `packages/core/src/index.ts` |
| Modify | `packages/cli/src/index.ts` |
| Modify | `packages/shared/src/schemas/api.ts` |
| Modify | `packages/shared/src/schemas/index.ts` |
| Create | `packages/server/src/routes/docs.ts` |
| Create | `packages/server/src/routes/score.ts` |
| Modify | `packages/server/src/routes/index.ts` |
| Modify | `packages/ui/src/lib/api.ts` |
| Create | `packages/ui/src/routes/pages/docs.tsx` |
| Create | `packages/ui/src/routes/pages/score.tsx` |
| Modify | `packages/ui/src/routes/route-tree.tsx` |
| Modify | `packages/ui/src/components/layout/sidebar.tsx` |
| Modify | `packages/ui/tailwind.config.ts` |
| Modify | `packages/ui/src/styles/globals.css` |
| Modify | `packages/ui/src/stores/ui-store.ts` |
| Modify | `packages/ui/src/main.tsx` |
| Create | `packages/core/tests/unit/doc-generator.test.ts` |
| Create | `packages/core/tests/unit/mcp-score.test.ts` |
| Create | `packages/core/tests/unit/badge-generator.test.ts` |

**Total**: 8 new files + 7 stub replacements + 11 modifications = 26 files

## Build Order

1. Shared schemas (Step 5)
2. Core: MarkdownGenerator, HtmlDocGenerator, DocGenerator (Step 1)
3. Core: BadgeGenerator, MCPScoreCalculator (Step 2)
4. Core exports (Step 3)
5. CLI commands + registration (Step 4)
6. Server routes + registration (Step 6)
7. UI API client + pages + routing + sidebar (Step 7)
8. Dark mode (Step 8)
9. Unit tests (Step 9)
10. `pnpm build` + `pnpm test`

## Verification

1. `pnpm build` — all 5 packages compile
2. `pnpm test` — all tests pass (existing 230 + ~20 new)
3. CLI: `node packages/cli/dist/index.js docs "npx @modelcontextprotocol/server-filesystem /tmp" --format markdown`
4. CLI: `node packages/cli/dist/index.js score "npx @modelcontextprotocol/server-filesystem /tmp" --badge /tmp/badge.svg`
5. UI: `node packages/cli/dist/index.js ui` → navigate to /docs, /score pages
6. UI: Toggle dark mode in sidebar → theme persists on refresh
