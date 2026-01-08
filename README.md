# Uxnote

Uxnote is an annotation bar for mockups and websites. Drop a single script to get text highlights, element pins, numbered cards, color theming, a dimmed focus mode, import/export, and email handoff. No plugin and no backend required.

## Who it is for
- Agencies and freelancers: clients comment directly on the page, then export a clean review file.
- Product and UX teams: review in the browser where interfaces live, without touching existing code.

## Core features
- Text highlights and element pins with numbered badges.
- Unified or per-type highlight colors, plus a toggleable dim overlay.
- Import and export to a single JSON file (title + date), with re-import support.
- Email handoff for sharing feedback with developers.

## How it works
1. Inject the script on each page (or via a global tag manager).
2. Share the URL with your client.
3. Clients annotate text or elements; everything appears in the Uxnote panel.
4. Export JSON or send by email to collect and process feedback.

## Install (copy/paste)
Place the script right before `</body>` so the DOM is ready. If you must place it in `<head>`, add `defer`.

```html
<script src="https://uxnote.ninefortyone.studio/uxnote-tool/uxnote.js"></script>
```

## Script tag options
The landing page builder exposes these options:
- `colorForHighlight` or `colorForTextHighlight` + `colorForElementHighlight`
- `isBackdropVisible`
- `isToolOnTopAtLaunch`
- `isToolVisibleAtFirstLaunch`
- `data-mailto` (recipient for email export)

You can also block areas from annotations with `data-uxnote-ignore`, and re-enable a child with `data-uxnote-allow`.

## Storage and data
Annotations are stored in `localStorage` for the current origin and per URL. No data is sent to a server unless you export a JSON file or send annotations by email.

## Compatibility notes
- Works on staging, previews, or localhost as long as the script loads and `localStorage` is allowed.
- For SPAs, route changes might require a reload or re-init to render annotations for the new URL.
- If CSP is strict, allow the Uxnote script origin and inline styles (or add a nonce/hash).
- Same-origin iframes work if you inject Uxnote inside the iframe document.

## License
Uxnote is source-available under the PolyForm Noncommercial 1.0.0 license. You may use, modify, and redistribute it for noncommercial purposes only. Commercial use is not permitted. See `LICENSE`.

## Project layout
- `index.html` - landing page and documentation copy.
- `assets/` - landing styles and language data.
- `uxnote-tool/uxnote.js` - Uxnote tool script.
- `uxnote-tool/ressources/` - icons and logos.
