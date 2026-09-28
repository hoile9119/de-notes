# de-notes

Source for **[Data Engineering Notes](https://hoile9119.github.io/de-notes/)** —
an [MkDocs](https://www.mkdocs.org/) (Material theme) site published with
GitHub Pages.

Content lives under `docs/`, organized into section folders (`docs/streaming/`,
`docs/spark/`, `docs/lakehouse/`, …). Start at [`docs/index.md`](docs/index.md);
each section has its own `index.md` acting as that section's map. Navigation is
defined explicitly in [`mkdocs.yml`](mkdocs.yml) — **a new page is unreachable
until it is added to the `nav` there.**

## Running locally

Prerequisites: Python 3.

```bash
pip install -r requirements.txt
mkdocs serve
```

Then open <http://127.0.0.1:8000/>.

## Deployment

Pushes to `main` trigger [`.github/workflows/docs.yml`](.github/workflows/docs.yml),
which builds the site with `mkdocs build --strict` and publishes it to GitHub
Pages.
