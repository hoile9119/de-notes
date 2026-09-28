# AGENTS.md

Operational guide for AI agents working on this repository. Read this **before
adding or changing documentation content**.

For general engineering behaviour (simplicity, surgical changes, asking before
assuming), see [`CLAUDE.md`](CLAUDE.md). This file covers only what is specific
to *this* site.

---

## What this repo is

A [MkDocs](https://www.mkdocs.org/) site using the **Material** theme, published
to GitHub Pages at <https://hoile9119.github.io/de-notes/>.

| Thing | Where |
|---|---|
| Content | `docs/` |
| Navigation, theme, extensions | `mkdocs.yml` |
| Custom styling | `docs/assets/global.css` |
| Mermaid dark/light hook | `docs/assets/mermaid-theme.js` |
| Dependencies | `pyproject.toml` + `uv.lock` (uv-managed) |
| Deploy pipeline | `.github/workflows/docs.yml` |

Deployment is automatic on push to `main`. There is **no `gh-pages` branch** —
the workflow builds and uploads a Pages artifact.

---

## Commands

```bash
uv sync                    # install locked dependencies
uv run mkdocs serve        # local preview → http://127.0.0.1:8000/de-notes/
uv run mkdocs build --strict   # what CI runs; MUST pass with zero warnings
```

Use `uv`, not bare `pip`/`mkdocs`. If you change dependencies, run `uv lock` and
commit the updated `uv.lock`.

> The local URL carries the `/de-notes/` prefix because `site_url` includes it.
> That is intentional — local and production paths match.

---

## Adding a new page — checklist

Work through all six steps. Steps 2 and 6 are the ones most often forgotten, and
both cause real breakage.

1. **Create the file** under `docs/`, in the right section folder.
2. **Add it to `nav:` in `mkdocs.yml`.** Navigation is fully explicit — *a page
   not listed in `nav` is unreachable from the site's navigation*. Note that
   `--strict` does **not** catch this: the page still builds and is reachable by
   direct URL, so nothing fails. This step is entirely on you.
3. **Start the page with a back-link**, then the H1 (see below).
4. **Link it from its section's `index.md`** under `## In this section`, and
   remove the corresponding bullet from that page's `## Planned` list if it is
   now written.
5. **Consider `docs/index.md`** — add to the "Start here" list only if it is a
   genuinely significant page.
6. **Run `uv run mkdocs build --strict`** and confirm exit 0 with no warnings.

---

## Page conventions

**No YAML front matter.** This site was migrated off Jekyll; pages are plain
Markdown. Never add `---\nlayout: ...\n---` blocks, and never use
`{{ site.baseurl }}`.

**Every page except `docs/index.md` opens with a back-link to its parent section
index**, followed by a blank line and the H1:

```markdown
[← Streaming](../index.md)

# Architecture Overview
```

The link text is the **parent section's name**; the path is relative:

| Page location | Back-link |
|---|---|
| `docs/about.md` | `[← Home](index.md)` |
| `docs/spark/index.md` | `[← Home](../index.md)` |
| `docs/spark/pyspark-functions.md` | `[← Spark](index.md)` |
| `docs/spark/recipes/hdfs.md` | `[← Recipes](index.md)` |
| `docs/streaming/apache-flink/architecture.md` | `[← Streaming](../index.md)` |

**One H1 per page**, matching its `nav` label. **All internal links are relative
and include the `.md` extension** (`../lakehouse/index.md`), so MkDocs can
validate them — `--strict` catches broken ones.

---

## Section index conventions

Each section folder has an `index.md` acting as that section's map, using two
headings:

```markdown
[← Home](../index.md)

# Streaming

One or two sentences on what the section covers and where its boundary is.

## In this section

- [Page Title](page.md) — short description

## Planned

- **Topic** — what it will cover
```

`## Planned` is a roadmap of unwritten pages. When you write one, move it from
*Planned* to *In this section*. If a section has nothing written yet, it carries
only `## Planned` plus the line `*Not written yet.*` — remove that line as soon
as real content lands.

---

## Navigation conventions (`mkdocs.yml`)

Top-level `nav` entries become tabs (`navigation.tabs` is enabled). A section
with multiple pages labels its index `Overview:`:

```yaml
  - Streaming:
      - Overview: streaming/index.md
      - Apache Flink:
          - Architecture Overview: streaming/apache-flink/architecture.md
```

- **Single-page sections** stay flat: `- Databricks: databricks/index.md`
- **Sub-groups** (like `Apache Flink`) are plain nested keys — they need **no
  `index.md` of their own**
- Folder names are **lowercase-kebab-case** (`apache-flink`), matching URLs

> One inherited inconsistency: `spark/recipes/index.md` is listed bare (no
> `Overview:` label) rather than as `Overview:`. Follow the `Overview:` pattern
> for anything new.

---

## Available Markdown features

Enabled, so use them freely:

- **Admonitions** — `!!! note`, `!!! warning`, `!!! abstract`, `!!! info`,
  `!!! danger`, and collapsible `??? question`
- **Mermaid diagrams** — fenced ` ```mermaid ` blocks; they re-render on
  dark/light toggle
- **Code** — highlighting with line anchors, copy/select/annotate buttons
- **Tabbed content**, task lists, tables, footnote-style `def_list`,
  `attr_list`, `md_in_html`
- **pymdownx** — `details`, `caret`, `mark`, `tilde`, `critic`, `magiclink`,
  `snippets`, `emoji`
- **Plugins** — `mkdocs-video`, `mkdocs-pdf`, `mkdocs-jupyter` (`.ipynb` files
  can be added straight to `nav`)

> ⚠ `pymdownx.arithmatex` is enabled but **no MathJax/KaTeX script is loaded**,
> so math will not render until one is added to `extra_javascript`.

---

## Theme and styling

Light blue and white. Colours are defined **once**, as custom properties at the
top of `docs/assets/global.css` — a `:root` block for light mode and a
`[data-md-color-scheme="slate"]` block for dark.

**To re-tint the site, edit only those variables.** Do not hard-code colours in
the rules below them, and do not add per-page CSS.

Any new colour must pass **WCAG AA** against its background (4.5:1 for text,
3:1 for large headings). Current values were checked and pass.

`mkdocs.yml` sets `primary: light-blue` / `accent: light-blue`; `global.css`
overrides the header, tabs, links and headings on top of that.

---

## Content policy

**This is a public site. It must contain no employer-internal or confidential
material.** Before adding content — especially anything copied from another
repository — check for and remove:

- Company names, team names, and internal project names
- Internal URLs, hostnames, IP addresses, ticket IDs
- Internal environment variables, credentials, connection strings
- Real schema, table, or dataset names

Replace them with neutral placeholders (`worker01`, `schema_name`,
`https://your-log-url`). Generic ecosystem terms (HDFS `nameservice1`, YARN,
Impala) are fine.

When a page is ported from a private repo, **read it end to end** and report
what you scrubbed.

---

## Verification

A change is not done until:

```bash
uv run mkdocs build --strict
```

exits **0 with no `WARNING` lines**. `--strict` turns broken internal links into
build failures, and CI runs this exact command.

It does **not** detect a page missing from `nav`, or a page missing from its
section index — verify those two by eye.

For anything structural (new section, nav change), also `uv run mkdocs serve`
and confirm the page loads and its nav entry appears where intended.

---

## Gotchas

- `site/` is build output — **never commit it**; it is gitignored
- The standalone HTML tool at `docs/tools/spark-submit-generator/index.html` is
  copied verbatim and renders **outside** the theme; link to it with the
  explicit `index.html` path
- Mermaid `classDef` colours inside existing diagrams are content, not theme —
  do not recolour them as part of a styling change
- `README.md`, `CLAUDE.md` and this file sit at the repo root, outside `docs/`,
  so they are not published to the site
