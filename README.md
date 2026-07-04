# MAT4Person Knowledge Graph

Public static website for the MAT4Person knowledge graph — an evidence-first atlas of Turkish science built around four centennial scientists (Asım Orhan Barut, Dilhan Eryurt, Masatoshi Gündüz İkeda, Erdal İnönü).

This repository intentionally contains only the published website files. The private research/code repository remains separate as `math_fidani`.

Live site (GitHub Pages):

`https://ihsandemirelphd-quant.github.io/mat4person-knowledge-graph/`

Pages:

- `index.html` — animated constellation overview: the four suns, milestones timeline, relation families, sources & method
- `knowledge_graph.html` — full interactive graph with search, filters, and node/edge inspectors
- `id_cards.html` — searchable catalog card for every node, with a detail view
- `evidence_atlas.html` — evidence reader: every relation with its exact quote, source, and page
- `model_report.html` — model, token, cost, and coverage report for the extraction run

All run-specific text (model name, counts) is rendered from `assets/data.js` at runtime. Local entry point: `index.html`.

## Contributing

Know a documented relation that's missing? Click **"+ Suggest a relation"** on any page, or see [CONTRIBUTING.md](CONTRIBUTING.md).
