**English** · [Español](guide.es.md)

# Using the template

From "Use this template" to your own portfolio on GitHub Pages, and how to keep getting the
template's improvements afterwards.

## 1. Create your repo

1. On the template's GitHub page, click **Use this template** → *Create a new repository*.
2. The repo name decides the URL:
   - `<user>.github.io` publishes at `https://<user>.github.io/`.
   - Any other name (say `portfolio`) publishes at `https://<user>.github.io/portfolio/`.

   You don't need to edit anything: `site` and `base` are derived from the repo name in
   Actions (`GITHUB_REPOSITORY`, see `src/lib/site.ts`). For a custom domain, set the
   repository variables `SITE_URL` (e.g. `https://ada.dev`) and, if needed, `BASE_PATH`, and
   add them to the `env` of the `test` job in `.github/workflows/deploy.yml`.
3. In *Settings → Pages*, set **Source: GitHub Actions**. The next push to `main` runs the
   tests and deploys.

## 2. Run it locally

```sh
nvm use                                  # Node 24 (.nvmrc)
pnpm install
pnpm exec playwright install chromium    # only for the e2e tests
pnpm dev                                 # http://localhost:4321
```

You will see Ada, the fictitious demo profile.

## 3. Replace Ada with your content

```sh
git rm -r wiki/public && mkdir -p wiki/public
```

Only `wiki/public/` goes. `tests/fixtures/site/` is a copy of Ada that the tests use: leave it
alone.

1. Copy your sources (CV, LinkedIn export, notes…) to `raw/`. It is git-ignored: nothing
   there is published.
2. In Claude Code, run `/ingest raw/<file>` once per source. The agent writes `wiki/public/`
   (what the site shows) and `wiki/private/` (everything else, also git-ignored), and updates
   `wiki/index.md`. It asks you before using anything taken from the web.
3. Run `/lint` to look for leaks of private data, broken links and gaps.
4. Images:
   - Your photo: `wiki/public/profile.jpg` (the `photo` field of `profile.md`).
   - The image shown when the link is shared: `public/og-image.png`, 1200×627.
5. Run `pnpm build`. If a page is missing a field or a date is wrong, the Zod schemas
   (`src/lib/schemas.ts`) fail the build and say which file and field.

## 4. Tests

The suite has three layers, and none of them depends on your content:

| Layer | Runs on | When you change your content |
| --- | --- | --- |
| Unit and component (`tests/unit`, `tests/components`) | Inline data and fixtures | Nothing to touch |
| E2E and screenshots (`tests/e2e`) | A build of `tests/fixtures/site/` (Ada) | Nothing to touch: Ada does not change |
| Your content | `wiki/public/` and its `dist/` | Checked automatically: Zod schemas on build, privacy scan, JS budget and a generic smoke test (`tests/smoke`) |

So after `/ingest`, `pnpm test` and `pnpm test:e2e` stay green without changes.

You only touch tests when you change **code**: update the tests of what you changed and, if
the change is visual, regenerate the screenshots with `pnpm test:visual:update`
(screenshots depend on the system that renders them: generate them where they are compared).

To make sure some strings of yours never get published (a phone number, an address), list
them one per line in `wiki/private/forbidden-strings.txt`: when you run the tests locally (the
file is git-ignored, so CI does not have it), the privacy tests fail if they show
up in the site or in the repo.

## 5. Optional analytics

The site can count visits with [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)
(free, cookieless, no consent banner). It is off by default.

1. In Cloudflare: *Analytics & Logs → Web Analytics → Add a site*, with your GitHub Pages
   domain. Copy the `token` from the snippet.
2. In GitHub: *Settings → Secrets and variables → Actions → Variables*, create
   `CF_ANALYTICS_TOKEN` with that value (a variable, not a secret: the token ends up in the
   public HTML).
3. The next deploy loads the script and adds a line to the footer saying so.

To try it locally, copy `.env.example` to `.env`, fill in `PUBLIC_CF_ANALYTICS_TOKEN` and run
`pnpm build && pnpm preview`, preferably with a test token.

## 6. Get template updates

Your repo keeps working on its own. To bring in the template's improvements:

```sh
git remote add upstream https://github.com/ARubiose/llm-wiki-portfolio.git
printf 'wiki/public/** merge=ours\nwiki/index.md merge=ours\npublic/og-image.png merge=ours\n' > .gitattributes
git config merge.ours.driver true    # local setting, not versioned: repeat it in every clone
git add .gitattributes && git commit -m "chore: Keep my content on template merges"
git fetch upstream
git merge upstream/main --allow-unrelated-histories   # only the first time
```

`--allow-unrelated-histories` is needed once because *Use this template* creates a repo
without the template's history. In that first merge, resolve each conflict keeping your
version of the content (`git checkout --ours <path>`) and the template's version of
everything else (`git checkout --theirs <path>`), then run `pnpm test && pnpm test:e2e` and
commit.

From then on it is just:

```sh
git pull upstream main
```

`merge=ours` keeps your version of the content files whenever both sides changed them. It
only acts when there is something to merge, which is why the first merge is reviewed by hand.

Make your code improvements in the template (or send them as a pull request), not in your
copy: a local change to a shared file will conflict when you pull.
