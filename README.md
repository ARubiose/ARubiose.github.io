**English** · [Español](README.es.md)

# LLM Wiki Portfolio

An **Astro** portfolio template whose content comes from a **knowledge base maintained by an
LLM agent** (Claude Code), following Andrej Karpathy's *LLM Wiki* pattern.

**Live demo:** https://arubiose.github.io/llm-wiki-portfolio/ (fictitious content)

## Quick start

1. Click **Use this template** → *Create a new repository*.
2. Run it locally:

   ```sh
   nvm use
   pnpm install
   pnpm dev          # http://localhost:4321, showing the demo profile (Ada)
   ```

3. Follow the [guide](docs/guide.md) to replace the demo content with yours and publish it on
   GitHub Pages.

## What the agent does

You drop raw material (CV, LinkedIn export, project notes) into `raw/`, or give it public
URLs whose data you validate before it enters the wiki. The agent (Claude Code) turns it into
a structured wiki in `wiki/`: one page per role, project, skill and degree, linked together,
with an index and a change log. It has three operations:

| Command | What it does |
| --- | --- |
| `/ingest raw/<file>` or `/ingest <URL>` | Reads a new source and creates or updates the affected pages |
| `/query <question>` | Answers from the wiki and can save the answer as a synthesis |
| `/lint` | Looks for broken links, orphan pages, contradictions and gaps |

The portfolio (`src/`) renders that content as a website in Spanish and English, with three
visual skins (Terminal, Tactical and Game).

## Prerequisites

- **Node.js** 24 or later (`engines` in `package.json`). The project pins Node 24 in `.nvmrc`: `nvm use`
- **pnpm** 12 (`corepack enable` or `npm i -g pnpm`)
- **Claude Code** for the wiki operations (`npm i -g @anthropic-ai/claude-code`)
- Optional: **Obsidian** to browse `wiki/` as a graph

## Development

Tests (the first time, `pnpm exec playwright install chromium`):

```sh
pnpm check        # types (astro check)
pnpm test         # unit, content contract, components and privacy
pnpm test:e2e     # Playwright on the demo content, smoke test on yours, privacy and JS budget
pnpm test:visual:update   # regenerates the reference screenshots after an intentional design change
```

pnpm 12 only runs install scripts for the packages approved in `pnpm-workspace.yaml`
(`esbuild`, `sharp`, `@tailwindcss/oxide`). If a new dependency needs them, approve it with
`pnpm approve-builds`.

To feed the wiki, copy your sources (CV, LinkedIn export, notes…) to `raw/` and run:

```sh
claude
> /ingest raw/<file>
```

Review the changes with `git diff wiki/` and commit.

### Public and private

The repo is public (it deploys to GitHub Pages), so the wiki is split:

- **Versioned:** the code and the agent configuration (`src/`, `docs/`, `CLAUDE.md`,
  `.claude/`) and `wiki/public/`, which holds what the website shows.
- **🔒 Local only (`.gitignore`):** `raw/` and `wiki/private/`, with contact details, personal
  notes, syntheses and the log. **Back them up yourself** (synced folder, external drive…),
  because git does not keep them.

The agent decides what goes where following the privacy rule in
[.claude/rules/wiki.md](.claude/rules/wiki.md); when in doubt, private. Run `/lint` before each
commit: it looks for leaks.

### Analytics (optional)

The site can count visits with [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/),
which is free, cookieless and needs no consent banner. It is **off** by default: without a
token no script is loaded and nothing is sent. See the [guide](docs/guide.md#5-optional-analytics).

## Structure

```text
.
├── CLAUDE.md               # General instructions for the agent
├── raw/                    # 🔒 Immutable sources (you write them)
├── wiki/                   # Knowledge base (the agent writes it)
│   ├── index.md            #   catalog of public pages
│   ├── public/             #   publishable: profile.md, experience/, projects/, skills/, education/
│   └── private/            #   🔒 index.md, log.md, notes/, synthesis/
├── .claude/
│   ├── rules/wiki.md       # wiki conventions (loaded when touching wiki/ or raw/)
│   ├── skills/             # /ingest, /query, /lint
│   └── settings.json       # permissions: raw/ is read-only
├── docs/
│   ├── guide.md            # How to use the template
│   ├── system-design.md    # Flow, design patterns and modules (Spanish)
│   └── decisions/          # Architecture decisions (Spanish)
├── tests/                  # Unit, contract, components, privacy, e2e, smoke
└── src/                    # Astro portfolio
```

## Scripts

| Command | Action |
| --- | --- |
| `pnpm dev` | Development server at `localhost:4321` |
| `pnpm build` | Builds the site into `dist/` |
| `pnpm preview` | Serves the build locally |

## More information

- [docs/guide.md](docs/guide.md): using the template, step by step
- [docs/system-design.md](docs/system-design.md): architecture and patterns
- [.claude/rules/wiki.md](.claude/rules/wiki.md): wiki conventions
- [CLAUDE.md](CLAUDE.md): general instructions for the agent

## License

Code under the [MIT license](LICENSE). The content in `wiki/public/` and the images in
`public/` belong to whoever publishes the site; in this template they are fictitious.
