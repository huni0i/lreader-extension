# Lreader

Local-first browser extension for translating comic and webtoon images.

## MVP scope

- Browsers: Chrome and Edge (Manifest V3)
- Source languages: Japanese, English, and Chinese
- Target languages: Korean, English, Japanese, and Chinese
- Processing model: collect a chapter, process it locally, then attach translation
  overlays to the original images

## Current milestone

The extension injects an isolated floating widget into web pages. The first
button scans the page for normal and lazy-loaded image URLs, filters out small
assets, and prints the collected image metadata to the browser console.

OCR and translation will be provided by the separate
[lreader-engine](https://github.com/huni0i/lreader-engine) local service.

## Extension development

```bash
npm install
npm run dev
```

For Edge:

```bash
npm run dev:edge
```

Production builds:

```bash
npm run build
npm run build:edge
```

## Planned pipeline

1. Collect and order chapter images.
2. Detect text regions with a multilingual comic layout model.
3. Route crops to a general or language-specialized OCR model.
4. Translate dialogue in chapter context.
5. Render translated text as DOM overlays.
6. Cache results by chapter, image hash, target language, and model version.
