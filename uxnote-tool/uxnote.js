(() => {
  if (window.Uxnote) {
    return;
  }

  const script =
    document.currentScript ||
    Array.from(document.querySelectorAll('script')).find((s) =>
      (s.getAttribute('src') || '').includes('annotator.js')
    );
  const scriptSrc = script && script.getAttribute('src');
  const scriptBase = scriptSrc ? scriptSrc.split('/').slice(0, -1).join('/') : '';
  const iconBase = (script && script.dataset.icons) || `${scriptBase}/ressources`;
  const siteKey = `${location.protocol}//${location.host}`;
  let position = (script && script.dataset.position) || 'bottom';
  const positionStorageKey = 'wn-toolbar-pos';
  const dockMode = (script && (script.dataset.dock || script.dataset.layout)) || '';
  const storageKey = `uxnote:site:${siteKey}`;
  const pendingFocusKey = `uxnote:pending:${siteKey}`;
  const analyticsSrc = 'https://cloud.umami.is/script.js';
  const analyticsWebsiteId = '9ba5fe24-9047-43b9-bdc6-c4113d1cf0a5';

  // Central state (positions, annotations, DOM elements, filters...)
  const state = {
    mode: null,
    annotations: [],
    markers: {},
    highlightSpans: {},
    outlineBox: null,
    toolbar: null,
    panel: null,
    visibilityToggle: null,
    commentModal: null,
    dialogModal: null,
    markerLayer: null,
    elementOutlines: {},
    customPosition: false,
    filters: {
      priority: 'all',
      query: ''
    },
    hidden: false
  };

  // Entry point: load config, build UI, restore data
  function init() {
    const savedPos = loadSavedPosition();
    if (savedPos) position = savedPos;
    injectAnalytics();
    captureBasePadding();
    injectStyles();
    createShell();
    loadAnnotations();
    restoreAnnotations();
    focusPendingAnnotation();
    bindGlobalHandlers();
  }

  function injectAnalytics() {
    // Avoid duplicating the Umami tag if the host page already has it for Uxnote
    const existing = document.querySelector(
      `script[data-website-id="${analyticsWebsiteId}"][src="${analyticsSrc}"]`
    );
    if (existing || !document.head) return;
    const s = document.createElement('script');
    s.defer = true;
    s.src = analyticsSrc;
    s.setAttribute('data-website-id', analyticsWebsiteId);
    s.setAttribute('data-uxnote-analytics', 'true');
    document.head.appendChild(s);
  }

  function captureBasePadding() {
    const s = getComputedStyle(document.body);
    state.basePadding = {
      top: parseFloat(s.paddingTop) || 0,
      right: parseFloat(s.paddingRight) || 0,
      bottom: parseFloat(s.paddingBottom) || 0,
      left: parseFloat(s.paddingLeft) || 0
    };
  }

  // Inline style injection keeps the tool self-contained (no external CSS fetch).
  function injectStyles() {
    // Inject scoped CSS to avoid polluting host page
    const style = document.createElement('style');
    style.setAttribute('data-wn-style', 'annotator');
    style.textContent = `
      .wn-annotator * { box-sizing: border-box; }
      .wn-annot-toolbar {
        --wn-accent: #6d56c7;
        --wn-bg: #f6f2fb;
        --wn-icon-font: "SF Pro Symbols", "SF Pro Display", "SF Pro Text", -apple-system, system-ui, "Segoe UI", "Inter", sans-serif;
        --wn-group-gap: 12px;
        --wn-spacer: 50px;
        position: fixed;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 10px 14px;
        background: var(--wn-bg);
        color: #4b4557;
        z-index: 2147483647;
        font-family: var(--wn-icon-font);
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        box-shadow: 0 8px 24px rgba(73, 64, 157, 0.14);
        border-radius: 999px;
        border: 1px solid rgba(109, 86, 199, 0.15);
        backdrop-filter: blur(10px);
      }
      .wn-annot-toolbar button {
        border: none;
        background: transparent;
        color: #575062;
        padding: 0;
        cursor: pointer;
        font-size: 0;
        --wn-btn-size: 44px;
        width: var(--wn-btn-size);
        height: var(--wn-btn-size);
        min-width: var(--wn-btn-size);
        max-width: var(--wn-btn-size);
        min-height: var(--wn-btn-size);
        max-height: var(--wn-btn-size);
        aspect-ratio: 1 / 1;
        flex: 0 0 var(--wn-btn-size);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        transition: all 0.2s ease;
        border-radius: 50%;
        box-shadow: none;
      }
      .wn-annot-visibility-btn {
        position: fixed;
        left: 12px;
        bottom: 18px;
        --wn-btn-size: 55px;
        width: var(--wn-btn-size);
        height: var(--wn-btn-size);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid rgba(109, 86, 199, 0.15);
        background: #f6f2fb;
        color: #4b4557;
        box-shadow: 0 8px 24px rgba(73, 64, 157, 0.18);
        backdrop-filter: blur(10px);
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 2147483650;
        padding: 0;
        position: fixed;
      }
      .wn-annot-visibility-btn::after {
        content: attr(data-tip);
        position: absolute;
        left: 2px;
        bottom: calc(100% + 10px);
        background: rgba(35, 31, 74, 0.92);
        color: #fff;
        padding: 6px 8px;
        border-radius: 8px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transform: translateY(2px);
        transition: opacity 0.12s ease, transform 0.12s ease;
      }
      .wn-annot-visibility-btn:hover {
        background: rgba(109, 86, 199, 0.12);
        color: #3e384a;
      }
      .wn-annot-visibility-btn:hover::after { opacity: 1; transform: translateY(0); }
      .wn-annot-visibility-btn:active {
        background: rgba(109, 86, 199, 0.18);
      }
      .wn-annot-visibility-btn svg {
        width: 20px;
        height: 20px;
      }
      .wn-annot-visibility-btn.is-muted {
        opacity: 0.32;
      }
      .wn-annot-group {
        display: inline-flex;
        align-items: center;
        gap: var(--wn-group-gap);
      }
      .wn-annot-spacer {
        flex: 0 0 var(--wn-spacer);
        width: var(--wn-spacer);
        height: 1px;
      }
      .wn-annot-logo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding-top:5px;
        padding-left:15px;
        padding-right: 0px;
      }
      .wn-annot-logo svg {
        width: 60px;
        height: 24px;
        fill: currentColor;
      }
      @media (max-width: 640px) {
        .wn-annot-toolbar {
          gap: 8px;
          padding: 8px 10px;
        }
        .wn-annot-toolbar button {
          --wn-btn-size: 40px;
        }
        .wn-annot-group {
          gap: 8px;
        }
        .wn-annot-spacer {
          flex-basis: 16px;
          width: 16px;
        }
        .wn-annot-visibility-btn {
          --wn-btn-size: 42px;
          left: 10px;
        }
        .wn-annot-logo svg {
          width: 90px;
        }
      }
      .wn-annot-toolbar button:hover {
        background: rgba(109, 86, 199, 0.12);
        color: #3e384a;
      }
      .wn-annot-toolbar button:active {
        background: rgba(109, 86, 199, 0.18);
      }
      .wn-annot-toolbar button.active {
        background: var(--wn-accent);
        color: #fdfdff;
        box-shadow: 0 10px 24px rgba(109, 86, 199, 0.35);
        transform: translateY(0);
      }
      body.wn-annot-hidden .wn-annotator:not(.wn-annot-visibility-btn) {
        display: none !important;
      }
      body.wn-annot-hidden .wn-annot-highlight {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      body.wn-annot-hidden .wn-annot-visibility-btn {
        opacity: 0.26;
      }
      .wn-annot-icon {
        width: 20px;
        height: 20px;
        fill: currentColor;
        font-family: var(--wn-icon-font);
      }
      .wn-annot-img {
        width: 20px;
        height: 20px;
        object-fit: contain;
        display: block;
      }
      .wn-annot-logo-img {
        width: 80px;
        height: auto;
        object-fit: contain;
        display: block;
      }
      .wn-annot-label { display: none; }
      .wn-annot-btn {
        position: relative;
      }
      .wn-annot-btn::after {
        content: attr(data-tip);
        position: absolute;
        left: 50%;
        background: rgba(35, 31, 74, 0.92);
        color: #fff;
        padding: 6px 8px;
        border-radius: 8px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease, transform 0.12s ease;
      }
      .wn-annot-toolbar.wn-pos-bottom .wn-annot-btn::after {
        bottom: calc(100% + 10px);
        transform: translateX(-50%) translateY(2px);
      }
      .wn-annot-toolbar.wn-pos-top .wn-annot-btn::after {
        top: calc(100% + 10px);
        transform: translateX(-50%) translateY(-2px);
      }
      .wn-annot-btn:hover::after {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .wn-annot-toolbar.wn-pos-right {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        top: auto;
        bottom: 18px;
        flex-direction: row;
        border-radius: 32px;
      }
      .wn-annot-toolbar.wn-pos-right button,
      .wn-annot-toolbar.wn-pos-left button {
        width: 100%;
      }
      .wn-annot-toolbar.wn-pos-left {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        top: auto;
        bottom: 18px;
        flex-direction: row;
        border-radius: 32px;
      }
      .wn-annot-toolbar.wn-pos-top {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        top: 18px;
        bottom: auto;
        flex-direction: row;
        justify-content: center;
        border-radius: 32px;
      }
      .wn-annot-toolbar.wn-pos-bottom {
        bottom: 18px;
        left: 50%;
        right: auto;
        top: auto;
        transform: translateX(-50%);
        flex-direction: row;
        justify-content: center;
        border-radius: 32px;
      }
      .wn-annot-panel {
        position: fixed;
        top: 18px;
        right: 18px;
        bottom: 18px;
        width: min(360px, calc(100vw - 36px));
        max-height: calc(100vh - 36px);
        background: #fdfcff;
        color: #342d43;
        border: 1px solid rgba(109, 86, 199, 0.16);
        border-radius: 18px;
        box-shadow: 0 10px 26px rgba(73, 64, 157, 0.16);
        padding: 18px;
        overflow-y: auto;
        z-index: 2147483000;
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
        left: auto;
        display: flex;
        flex-direction: column;
      }
      .wn-annot-panel h3 {
        margin: 0 0 14px;
        font-size: 15px;
        letter-spacing: 0.2px;
        color: #3f3852;
        font-weight: 700;
      }
      .wn-annot-panel-head {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .wn-annot-panel-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .wn-annot-filters {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .wn-annot-filters select,
      .wn-annot-filters input[type="search"] {
        height: 34px;
        border-radius: 12px;
        border: 1px solid rgba(109, 86, 199, 0.18);
        background: #fff;
        padding: 6px 10px;
        font-size: 12px;
        color: #342d43;
      }
      .wn-annot-filters select:focus,
      .wn-annot-filters input[type="search"]:focus {
        outline: none;
        border-color: rgba(109, 86, 199, 0.6);
        box-shadow: 0 0 0 3px rgba(109, 86, 199, 0.14);
      }
      .wn-annot-filters .wn-annot-filter-label {
        font-size: 12px;
        color: #5a5266;
        font-weight: 600;
        margin-right: 4px;
      }
      .wn-annot-panel .wn-annot-empty {
        color: #7b7588;
        font-size: 13px;
        padding: 10px 0;
        background: rgba(109, 86, 199, 0.04);
        border: 1px dashed rgba(109, 86, 199, 0.18);
        border-radius: 12px;
        text-align: center;
      }
      .wn-annot-delete-all {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(209, 59, 59, 0.1);
        border: 1px solid rgba(209, 59, 59, 0.25);
        color: #b83232;
        padding: 6px 10px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .wn-annot-delete-all:hover {
        background: rgba(209, 59, 59, 0.16);
        border-color: rgba(209, 59, 59, 0.32);
      }
      .wn-annot-delete-all:active {
        transform: translateY(1px);
      }
      .wn-annot-delete-all svg {
        width: 16px;
        height: 16px;
      }
      .wn-annot-list {
        flex: 1 1 auto;
        overflow: auto;
      }
      .wn-annot-item {
        background: #ffffff;
        border: 1px solid rgba(109, 86, 199, 0.14);
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 8px 18px rgba(73, 64, 157, 0.08);
      }
      .wn-annot-item:hover {
        border-color: rgba(109, 86, 199, 0.32);
        transform: translateY(-1px);
        box-shadow: 0 12px 26px rgba(73, 64, 157, 0.15);
      }
      .wn-annot-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
        align-items: flex-start;
      }
      .wn-annot-card-top-left {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .wn-annot-card-top-right {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        min-width: 0;
      }
      .wn-annot-delete {
        border: 1px solid rgba(209, 59, 59, 0.2);
        background: rgba(209, 59, 59, 0.08);
        color: #d13b3b;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .wn-annot-delete:hover {
        background: rgba(209, 59, 59, 0.14);
        border-color: rgba(209, 59, 59, 0.3);
        color: #b83232;
      }
      .wn-annot-delete:active {
        transform: translateY(1px);
      }
      .wn-annot-edit {
        border: 1px solid rgba(109, 86, 199, 0.22);
        background: rgba(109, 86, 199, 0.08);
        color: #4b4557;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .wn-annot-edit:hover {
        background: rgba(109, 86, 199, 0.14);
        border-color: rgba(109, 86, 199, 0.3);
        color: #352f46;
      }
      .wn-annot-edit:active {
        transform: translateY(1px);
      }
      .wn-annot-edit svg {
        width: 16px;
        height: 16px;
      }
      .wn-annot-delete svg {
        width: 16px;
        height: 16px;
      }
      .wn-annot-footer {
        flex: 0 0 auto;
        padding-top: 6px;
        margin-top: auto;
        text-align: center;
        font-size: 12px;
        color: #7b7588;
        background: linear-gradient(180deg, transparent, rgba(255,255,255,0.75));
        position: sticky;
        bottom: 0;
        padding-bottom: 6px;
      }
      .wn-annot-footer a {
        color: inherit;
        text-decoration: none;
        font-weight: 700;
      }
      .wn-annot-number {
        min-width: 32px;
        height: 32px;
        padding: 0 10px;
        border-radius: 12px;
        background: rgba(109, 86, 199, 0.12);
        border: 1px solid rgba(109, 86, 199, 0.24);
        color: #4b4557;
        font-weight: 800;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        letter-spacing: 0.2px;
      }
      .wn-annot-meta {
        font-size: 11px;
        color: #7f7891;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        max-width: 220px;
        text-align: right;
        word-break: break-word;
        line-height: 1.4;
      }
      .wn-annot-meta-bottom {
        display: block;
        margin-left: auto;
        margin-top: 10px;
        width: 100%;
        text-align: right;
      }
      .wn-annot-priority {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #4b4557;
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid rgba(109, 86, 199, 0.2);
        background: rgba(109, 86, 199, 0.06);
      }
      .wn-annot-priority .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .wn-annot-priority.low { border-color: rgba(47,191,113,0.35); background: rgba(47,191,113,0.08); color: #1f7a4c; }
      .wn-annot-priority.low .dot { background: #2fbf71; }
      .wn-annot-priority.medium { border-color: rgba(227,178,60,0.35); background: rgba(227,178,60,0.08); color: #8a6b1f; }
      .wn-annot-priority.medium .dot { background: #e3b23c; }
      .wn-annot-priority.high { border-color: rgba(224,91,91,0.35); background: rgba(224,91,91,0.1); color: #a03232; }
      .wn-annot-priority.high .dot { background: #e05b5b; }
      .wn-annot-title {
        font-size: 13px;
        font-weight: 700;
        color: #352f46;
        margin-bottom: 8px;
      }
      .wn-annot-comment {
        font-size: 14px;
        font-weight: 700;
        color: #2f2740;
        margin-bottom: 8px;
        line-height: 1.45;
      }
      .wn-annot-snippet {
        font-size: 12px;
        color: #5a5266;
        background: rgba(109, 86, 199, 0.06);
        border: 1px dashed rgba(109, 86, 199, 0.3);
        border-radius: 12px;
        padding: 8px 10px;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        transition: max-height 0.2s ease;
      }
      .wn-annot-snippet.expanded {
        -webkit-line-clamp: unset;
      }
      .wn-annot-showmore {
        border: none;
        background: transparent;
        color: #6d56c7;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        margin-left: auto;
        margin-top: 6px;
      }
      .wn-annot-highlight {
        background: #ffee70;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
        padding: 0 2px;
        border-radius: 3px;
      }
      .wn-annot-marker-layer {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147482000;
      }
      .wn-annot-marker {
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #4e9cf6;
        color: #0b1622;
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        cursor: pointer;
        transform: translate(-50%, -50%);
      }
      .wn-annot-marker:hover { background: #72b3ff; }
      .wn-annot-outline {
        position: absolute;
        border: 2px dashed #4e9cf6;
        background: rgba(78,156,246,0.1);
        pointer-events: none;
        z-index: 2147482500;
      }
      .wn-annot-element-outline {
        position: absolute;
        border: 2px dashed #4e9cf6;
        background: rgba(78,156,246,0.08);
        pointer-events: none;
        z-index: 2147482495;
      }
      .wn-annot-tip {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        background: #f6f2fb;
        color: #342d43;
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 12px;
        z-index: 2147483100;
        pointer-events: none;
        opacity: 0;
        border: 1px solid rgba(109, 86, 199, 0.16);
        box-shadow: 0 10px 24px rgba(73, 64, 157, 0.15);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .wn-annot-tip.show { opacity: 1; }
      .wn-annot-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(28, 22, 48, 0.35);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2147483200;
        padding: 18px;
      }
      .wn-annot-modal-backdrop.show { display: flex; }
      .wn-annot-modal {
        background: #f6f2fb;
        color: #342d43;
        border: 1px solid rgba(109, 86, 199, 0.18);
        border-radius: 16px;
        box-shadow: 0 16px 38px rgba(73, 64, 157, 0.2);
        padding: 18px;
        min-width: min(440px, calc(100vw - 40px));
        max-width: 520px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      .wn-annot-modal h4 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #3f3852;
      }
      .wn-annot-dialog-message {
        font-size: 13px;
        line-height: 1.6;
        color: #3f3852;
      }
      .wn-annot-modal textarea {
        width: 100%;
        min-height: 90px;
        border-radius: 12px;
        border: 1px solid rgba(109, 86, 199, 0.22);
        background: #fff;
        padding: 10px 12px;
        font-size: 14px;
        color: #342d43;
        resize: vertical;
        outline: none;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
      }
      .wn-annot-modal textarea:focus {
        border-color: rgba(109, 86, 199, 0.55);
        box-shadow: 0 0 0 3px rgba(109, 86, 199, 0.15);
      }
      .wn-annot-modal .wn-annot-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .wn-annot-modal .wn-annot-pill {
        border: none;
        padding: 10px 14px;
        border-radius: 999px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .wn-annot-modal .wn-annot-pill.cancel {
        background: transparent;
        color: #5a5563;
        border: 1px solid rgba(109, 86, 199, 0.25);
      }
      .wn-annot-modal .wn-annot-pill.cancel:hover {
        background: rgba(109, 86, 199, 0.08);
      }
      .wn-annot-modal .wn-annot-pill.primary {
        background: #6d56c7;
        color: #fdfdff;
        box-shadow: 0 10px 24px rgba(109, 86, 199, 0.35);
      }
      .wn-annot-modal .wn-annot-pill.primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 28px rgba(109, 86, 199, 0.4);
      }
      .wn-annot-modal .wn-annot-prio {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .wn-annot-modal .wn-annot-prio label {
        font-size: 13px;
        color: #4b4557;
        font-weight: 600;
      }
      .wn-annot-modal .wn-annot-prio-options {
        display: flex;
        gap: 10px;
      }
      .wn-annot-modal .wn-annot-prio-btn {
        flex: 1 1 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(109, 86, 199, 0.22);
        background: #fff;
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 13px;
        font-weight: 600;
        color: #3e384a;
      }
      .wn-annot-modal .wn-annot-prio-btn .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .wn-annot-modal .wn-annot-prio-btn[data-priority="low"] .dot { background: #2fbf71; }
      .wn-annot-modal .wn-annot-prio-btn[data-priority="medium"] .dot { background: #e3b23c; }
      .wn-annot-modal .wn-annot-prio-btn[data-priority="high"] .dot { background: #e05b5b; }
      .wn-annot-modal .wn-annot-prio-btn.active {
        border-color: rgba(109, 86, 199, 0.6);
        box-shadow: 0 0 0 3px rgba(109, 86, 199, 0.16);
      }
    `;
    document.head.appendChild(style);
  }

  function createShell() {
    // Build toolbar, panel, and annotation layers
    const toolbar = document.createElement('div');
    toolbar.className = `wn-annot-toolbar wn-annotator wn-pos-${position}`;

    const makeButton = (btn) => {
      const b = document.createElement('button');
      b.className = 'wn-annot-btn wn-annotator';
      b.setAttribute('data-action', btn.action);
      if (btn.mode) b.setAttribute('data-mode', btn.mode);
      b.setAttribute('data-tip', btn.tip);
      b.innerHTML = btn.icon;
      return b;
    };

    const makeGroup = (btns) => {
      const g = document.createElement('div');
      g.className = 'wn-annot-group wn-annotator';
      btns.forEach((btn) => g.appendChild(makeButton(btn)));
      return g;
    };

    const makeSpacer = () => {
      const s = document.createElement('div');
      s.className = 'wn-annot-spacer wn-annotator';
      return s;
    };

  const frag = document.createDocumentFragment();

    const logo = document.createElement('div');
    logo.className = 'wn-annot-logo wn-annotator';
    logo.innerHTML = iconWordmark();
    frag.appendChild(logo);

  const editButtons = [
      { action: 'mode', mode: 'text', tip: 'Highlight text', icon: iconPen() },
      { action: 'mode', mode: 'element', tip: 'Annotate an element', icon: iconTarget() }
    ];
    const exportButtons = [
      { action: 'export', tip: 'Export JSON', icon: iconDownload() },
      { action: 'import', tip: 'Import JSON', icon: iconUpload() },
      { action: 'email', tip: 'Send by email', icon: iconMail() }
    ];
    const controlButtons = [
      { action: 'toggle-pos', tip: 'Toolbar top / bottom', icon: iconSwap() },
      { action: 'toggle-panel', tip: 'Show / hide annotations', icon: iconPanel() }
    ];

    frag.appendChild(makeSpacer());
    frag.appendChild(makeGroup(editButtons));
    frag.appendChild(makeSpacer());
    frag.appendChild(makeGroup(exportButtons));
    frag.appendChild(makeSpacer());
    frag.appendChild(makeGroup(controlButtons));

    toolbar.appendChild(frag);
    document.body.appendChild(toolbar);
    state.toolbar = toolbar;

    // Hidden input to pick a JSON file during import
    state.importInput = document.createElement('input');
    state.importInput.type = 'file';
    state.importInput.accept = 'application/json';
    state.importInput.style.display = 'none';
    state.importInput.className = 'wn-annotator';
    state.importInput.addEventListener('change', handleImportFile);
    document.body.appendChild(state.importInput);

    const panel = document.createElement('div');
    panel.className = 'wn-annot-panel wn-annotator';
    panel.innerHTML = `
      <div class="wn-annot-panel-head wn-annotator">
        <div class="wn-annot-panel-top wn-annotator">
          <h3>Page annotations</h3>
          <button class="wn-annot-delete-all wn-annotator" type="button">
            ${iconTrash()}<span>All</span>
          </button>
        </div>
        <div class="wn-annot-filters wn-annotator">
          <label class="wn-annot-filter-label wn-annotator" for="wn-filter-priority">Priority</label>
          <select id="wn-filter-priority" class="wn-annotator">
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input id="wn-filter-search" class="wn-annotator" type="search" placeholder="Keyword search" />
        </div>
      </div>
      <div class="wn-annot-list"></div>
    `;
    if (position === 'left') {
      panel.style.left = '18px';
      panel.style.right = 'auto';
    }
    document.body.appendChild(panel);
    state.panel = panel;
    const deleteAllBtn = panel.querySelector('.wn-annot-delete-all');
    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        await deleteAllAnnotations();
      });
    }

    const markerLayer = document.createElement('div');
    markerLayer.className = 'wn-annot-marker-layer wn-annotator';
    document.body.appendChild(markerLayer);
    state.markerLayer = markerLayer;

    const outline = document.createElement('div');
    outline.className = 'wn-annot-outline wn-annotator';
    outline.style.display = 'none';
    document.body.appendChild(outline);
    state.outlineBox = outline;

    const tip = document.createElement('div');
    tip.className = 'wn-annot-tip wn-annotator';
    tip.textContent = 'Active mode';
    document.body.appendChild(tip);
    state.tip = tip;

    toolbar.addEventListener('click', onToolbarClick);
    renderList();
    applyPageOffset();
    positionPanel();
    positionTip();
    updateToggleActive();
    initFilters();
    createVisibilityToggle();
  }

  function createVisibilityToggle() {
    if (state.visibilityToggle) return;
    // Floating toggle to hide/show every annotator element
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wn-annot-visibility-btn wn-annotator';
    btn.setAttribute('aria-label', 'Masquer Uxnote');
    btn.setAttribute('data-tip', 'Masquer Uxnote');
    btn.innerHTML = iconEyeOpen();
    btn.addEventListener('click', toggleAnnotatorVisibility);
    state.visibilityToggle = btn;
    document.body.appendChild(btn);
    positionVisibilityToggle();
    syncVisibilityButton();
  }

  function ensureCommentModal() {
    if (state.commentModal) return state.commentModal;
    const backdrop = document.createElement('div');
    backdrop.className = 'wn-annot-modal-backdrop wn-annotator';
    const modal = document.createElement('div');
    modal.className = 'wn-annot-modal wn-annotator';

    const title = document.createElement('h4');
    title.textContent = 'Add a comment';
    const textarea = document.createElement('textarea');
    textarea.className = 'wn-annotator';
    textarea.placeholder = 'Your comment...';

    const prioWrapper = document.createElement('div');
    prioWrapper.className = 'wn-annot-prio wn-annotator';
    const prioLabel = document.createElement('label');
    prioLabel.textContent = 'Priority';
    const prioOptions = document.createElement('div');
    prioOptions.className = 'wn-annot-prio-options wn-annotator';

    const makePrioBtn = (value, label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wn-annot-prio-btn wn-annotator';
      btn.setAttribute('data-priority', value);
      btn.innerHTML = `<span class="dot wn-annotator"></span><span class="wn-annotator">${label}</span>`;
      return btn;
    };

    const prioButtons = [makePrioBtn('low', 'Low'), makePrioBtn('medium', 'Medium'), makePrioBtn('high', 'High')];
    prioButtons.forEach((b) => prioOptions.appendChild(b));
    prioWrapper.appendChild(prioLabel);
    prioWrapper.appendChild(prioOptions);

    const actions = document.createElement('div');
    actions.className = 'wn-annot-actions wn-annotator';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'wn-annot-pill cancel wn-annotator';
    cancelBtn.textContent = 'Cancel';
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'wn-annot-pill primary wn-annotator';
    okBtn.textContent = 'Save';

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(title);
    modal.appendChild(textarea);
    modal.appendChild(prioWrapper);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    state.commentModal = { backdrop, modal, textarea, title, okBtn, cancelBtn, prioButtons };
    return state.commentModal;
  }

  function askForComment(label, defaultValue = '', defaultPriority = 'medium') {
    return new Promise((resolve) => {
      const modalState = ensureCommentModal();
      const { backdrop, textarea, title, okBtn, cancelBtn, prioButtons } = modalState;
      title.textContent = label || 'Add a comment';
      textarea.value = defaultValue || '';
      textarea.placeholder = 'Your comment...';
      prioButtons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-priority') === defaultPriority));
      const onPrioClick = (btn) => {
        prioButtons.forEach((bb) => bb.classList.remove('active'));
        btn.classList.add('active');
      };
      const prioHandlers = prioButtons.map((b) => (evt) => onPrioClick(b));
      prioButtons.forEach((b, idx) => b.addEventListener('click', prioHandlers[idx]));
      backdrop.classList.add('show');
      textarea.focus();
      textarea.select();

      const close = (val) => {
        backdrop.classList.remove('show');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        prioButtons.forEach((b, idx) => b.removeEventListener('click', prioHandlers[idx]));
        resolve(val);
      };
      const onOk = () => {
        const selected = prioButtons.find((b) => b.classList.contains('active'));
        const priority = selected ? selected.getAttribute('data-priority') : defaultPriority;
        close({ comment: textarea.value.trim(), priority });
      };
      const onCancel = () => close(null);
      const onBackdrop = (evt) => {
        if (evt.target === backdrop) close(null);
      };
      const onKey = (evt) => {
        if (evt.key === 'Escape') close(null);
        if (evt.key === 'Enter' && !(evt.shiftKey || evt.altKey)) {
          evt.preventDefault();
          onOk();
        }
      };

      okBtn.textContent = 'Save';
      cancelBtn.textContent = 'Cancel';
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  async function awaitComment(label) {
    const val = await askForComment(label);
    if (!val) return null;
    return val;
  }

  function ensureDialogModal() {
    if (state.dialogModal) return state.dialogModal;
    const backdrop = document.createElement('div');
    backdrop.className = 'wn-annot-modal-backdrop wn-annotator';
    const modal = document.createElement('div');
    modal.className = 'wn-annot-modal wn-annotator';
    const title = document.createElement('h4');
    title.className = 'wn-annotator';
    const message = document.createElement('div');
    message.className = 'wn-annot-dialog-message wn-annotator';
    const actions = document.createElement('div');
    actions.className = 'wn-annot-actions wn-annotator';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'wn-annot-pill cancel wn-annotator';
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'wn-annot-pill primary wn-annotator';

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    state.dialogModal = { backdrop, modal, title, message, okBtn, cancelBtn };
    return state.dialogModal;
  }

  function showDialog({ title = 'Information', message = '', okLabel = 'OK', cancelLabel = 'Cancel', dismissOnBackdrop = true }) {
    return new Promise((resolve) => {
      const { backdrop, title: titleEl, message: messageEl, okBtn, cancelBtn } = ensureDialogModal();
      titleEl.textContent = title;
      messageEl.textContent = message;
      okBtn.textContent = okLabel;
      const showCancel = Boolean(cancelLabel);
      cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';
      cancelBtn.textContent = cancelLabel || '';

      const close = (val) => {
        backdrop.classList.remove('show');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        resolve(val);
      };
      const onOk = () => close(true);
      const onCancel = () => close(false);
      const onBackdrop = (evt) => {
        if (evt.target === backdrop && dismissOnBackdrop) {
          close(false);
        }
      };
      const onKey = (evt) => {
        if (evt.key === 'Escape') close(false);
        if ((evt.metaKey || evt.ctrlKey) && evt.key === 'Enter') onOk();
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
      backdrop.classList.add('show');
      okBtn.focus();
    });
  }

  async function confirmDialog(message, title = 'Confirmation') {
    return showDialog({ title, message, okLabel: 'Confirm', cancelLabel: 'Cancel' });
  }

  async function alertDialog(message, title = 'Information') {
    await showDialog({ title, message, okLabel: 'OK', cancelLabel: null });
  }

  function bindGlobalHandlers() {
    // Global subscriptions to mouse/keyboard/resize to keep UI in sync
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
    document.addEventListener('pointerup', handleTextSelection);
    document.addEventListener('mousemove', handleElementHover);
    document.addEventListener('click', handleElementClick, true);
    window.addEventListener('resize', refreshMarkers);
    window.addEventListener('resize', applyPageOffset);
    window.addEventListener('resize', positionPanel);
    window.addEventListener('resize', positionTip);
    window.addEventListener('scroll', refreshMarkers, { passive: true });
  }

  function initFilters() {
    // Install filters (priority + search) and re-render on change
    if (!state.panel) return;
    const prioritySelect = state.panel.querySelector('#wn-filter-priority');
    const searchInput = state.panel.querySelector('#wn-filter-search');
    if (!prioritySelect || !searchInput) return;

    prioritySelect.value = state.filters.priority;
    searchInput.value = state.filters.query;

    const trigger = () => {
      state.filters.priority = prioritySelect.value;
      state.filters.query = searchInput.value.trim().toLowerCase();
      renderList();
    };

    prioritySelect.addEventListener('change', trigger);
    searchInput.addEventListener('input', trigger);
  }

  function setMode(nextMode, options = {}) {
    const keepOutline = options.keepOutline;
    // Toggle annotation mode and refresh associated UI
    if (state.mode === nextMode) {
      state.mode = null;
      updateToolbarActive();
      hideTip();
      if (!keepOutline) hideOutline();
      return;
    }
    state.mode = nextMode;
    updateToolbarActive();
    showTipForMode(nextMode);
    if (nextMode !== 'element') {
      hideOutline();
    }
  }

  function updateToolbarActive() {
    const buttons = state.toolbar.querySelectorAll('button[data-action="mode"]');
    buttons.forEach((btn) => {
      const mode = btn.getAttribute('data-mode');
      if (mode === state.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function showTipForMode(mode) {
    let text = '';
    if (mode === 'text') {
      text = 'Select text then release to add a note.';
    } else if (mode === 'element') {
      text = 'Hover an element, click to annotate.';
    }
    if (!text) return hideTip();
    state.tip.textContent = text;
    state.tip.classList.add('show');
    positionTip();
    requestAnimationFrame(positionTip);
    requestAnimationFrame(positionTip);
  }

  function hideTip() {
    state.tip.classList.remove('show');
  }

  function loadSavedPosition() {
    try {
      const saved = localStorage.getItem(positionStorageKey);
      if (saved === 'top' || saved === 'bottom') return saved;
    } catch (err) {
      // ignore
    }
    return null;
  }

  function positionTip() {
    if (!state.tip || !state.toolbar) return;
    const barRect = state.toolbar.getBoundingClientRect();
    const tip = state.tip;
    const gap = 10;
    const centerX = barRect.left + barRect.width / 2;
    const isBottom = position === 'bottom';

    tip.style.left = `${centerX}px`;
    tip.style.right = '';
    tip.style.transform = 'translateX(-50%)';
    tip.style.top = '';
    tip.style.bottom = '';

    const tipRect = tip.getBoundingClientRect();

    if (isBottom) {
      const top = Math.max(8, barRect.top - gap - tipRect.height);
      tip.style.top = `${top}px`;
    } else {
      const top = barRect.bottom + gap;
      tip.style.top = `${top}px`;
    }
  }

  // Local storage helpers
  function loadAnnotations() {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      state.annotations = (parsed || []).filter((ann) => ann.type !== 'region');
      // Backward compatibility: add pageKey if missing
      state.annotations.forEach((ann) => {
        if (!ann.pageKey) {
          ann.pageKey = normalizePageKey(ann.pageUrl || window.location.href);
        }
      });
    } catch (err) {
      console.warn('Annotator storage error', err);
      state.annotations = [];
    }
  }

  function saveAnnotations() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.annotations));
    } catch (err) {
      console.warn('Annotator storage save error', err);
    }
  }

  function onToolbarClick(evt) {
    const btn = evt.target.closest('button');
    if (!btn || !btn.classList.contains('wn-annotator')) return;
    const action = btn.getAttribute('data-action');
    if (!action) return;
    if (action === 'mode') {
      const mode = btn.getAttribute('data-mode');
      setMode(mode);
      return;
    }
    if (action === 'export') {
      exportAnnotations();
      return;
    }
    if (action === 'import') {
      if (state.importInput) state.importInput.click();
      return;
    }
    if (action === 'email') {
      emailAnnotations();
      return;
    }
    if (action === 'toggle-panel') {
      togglePanel();
      return;
    }
    if (action === 'toggle-pos') {
      setPosition(position === 'bottom' ? 'top' : 'bottom');
      updatePositionIcon();
      return;
    }
  }

  function togglePanel() {
    const isHidden = state.panel.style.display === 'none';
    // Restore default flex layout when re-opening so the footer stays pinned
    state.panel.style.display = isHidden ? '' : 'none';
    updateToggleActive();
  }

  function toggleAnnotatorVisibility() {
    setAnnotatorVisibility(!state.hidden);
  }

  function setAnnotatorVisibility(hidden) {
    state.hidden = hidden;
    document.body.classList.toggle('wn-annot-hidden', hidden);
    if (hidden) {
      setMode(null);
      hideTip();
      hideOutline();
    }
    syncVisibilityButton();
    applyPageOffset();
    if (!hidden) {
      refreshMarkers();
      positionPanel();
      positionTip();
      // BMC widget intentionally left independent of visibility toggle
    }
  }

  function syncVisibilityButton() {
    if (!state.visibilityToggle) return;
    const label = state.hidden ? 'Show Uxnote' : 'Hide Uxnote';
    state.visibilityToggle.classList.toggle('is-muted', state.hidden);
    state.visibilityToggle.innerHTML = state.hidden ? iconEyeClosed() : iconEyeOpen();
    state.visibilityToggle.setAttribute('aria-label', label);
    state.visibilityToggle.setAttribute('aria-pressed', state.hidden ? 'true' : 'false');
    state.visibilityToggle.setAttribute('data-tip', label);
  }

  function positionVisibilityToggle() {
    const btn = state.visibilityToggle;
    if (!btn) return;
    const inset = 18;
    if (position === 'top') {
      btn.style.top = `${inset}px`;
      btn.style.bottom = '';
    } else {
      btn.style.bottom = `${inset}px`;
      btn.style.top = '';
    }
  }

  function updateToggleActive() {
    if (!state.panel || !state.toolbar) return;
    const btn = state.toolbar.querySelector('button[data-action="toggle-panel"]');
    if (!btn) return;
    const hidden = state.panel.style.display === 'none';
    btn.classList.toggle('active', !hidden);
  }

  function positionPanel() {
    if (!state.panel || !state.toolbar) return;
    const p = state.panel;
    const inset = 18;
    const barRect = state.toolbar.getBoundingClientRect();

    p.style.width = `min(360px, calc(100vw - ${inset * 2}px))`;
    p.style.maxHeight = `calc(100vh - ${inset * 2}px)`;
    p.style.left = 'auto';
    p.style.right = `${inset}px`;
    p.style.top = `${inset}px`;
    p.style.bottom = `${inset}px`;
    p.style.height = '';

    if (position === 'left') {
      p.style.left = `${barRect.width + inset}px`;
      p.style.right = `${inset}px`;
    } else if (position === 'right') {
      p.style.right = `${barRect.width + inset}px`;
      p.style.left = `${inset}px`;
    }
  }

  function setPosition(next) {
    position = next === 'top' ? 'top' : 'bottom';
    const t = state.toolbar;
    if (t) {
      t.classList.remove('wn-pos-top', 'wn-pos-bottom', 'wn-pos-left', 'wn-pos-right');
      t.classList.add(`wn-pos-${position}`);
    }
    try {
      localStorage.setItem(positionStorageKey, position);
    } catch (err) {
      // ignore storage errors
    }
    updatePositionIcon();
    positionVisibilityToggle();
    positionTip();
    positionPanel();
    applyPageOffset();
  }

  function updatePositionIcon() {
    if (!state.toolbar) return;
    const btn = state.toolbar.querySelector('button[data-action="toggle-pos"]');
    if (!btn) return;
    const img = btn.querySelector('img.wn-annot-img');
    if (!img) return;
    if (position === 'top') {
      img.src = iconPath('uxnote-icon-top.svg');
      img.alt = 'Toolbar top';
    } else {
      img.src = iconPath('uxnote-icon-bottom.svg');
      img.alt = 'Toolbar bottom';
    }
  }

  function applyPageOffset() {
    // Pad the body so the fixed toolbar does not cover content
    if (
      !state.toolbar ||
      state.customPosition ||
      !(dockMode === 'push' || dockMode === 'dock' || dockMode === 'pad' || dockMode === 'true')
    ) {
      return;
    }
    const body = document.body;
    if (!state.basePadding) captureBasePadding();
    const base = state.basePadding;
    if (state.hidden) {
      body.style.paddingTop = `${base.top}px`;
      body.style.paddingRight = `${base.right}px`;
      body.style.paddingBottom = `${base.bottom}px`;
      body.style.paddingLeft = `${base.left}px`;
      return;
    }
    const barRect = state.toolbar.getBoundingClientRect();
    const next = { ...base };
    if (position === 'top') {
      next.top = base.top + barRect.height;
    } else if (position === 'bottom') {
      next.bottom = base.bottom + barRect.height;
    } else if (position === 'left') {
      next.left = base.left + barRect.width;
    } else if (position === 'right') {
      next.right = base.right + barRect.width;
    }
    body.style.paddingTop = `${next.top}px`;
    body.style.paddingRight = `${next.right}px`;
    body.style.paddingBottom = `${next.bottom}px`;
    body.style.paddingLeft = `${next.left}px`;
  }

  // Capture a text selection and convert to annotation (text mode)
  async function handleTextSelection() {
    if (state.mode !== 'text') return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!range || isWithinAnnotator(range.commonAncestorContainer)) return;
    const snippet = selection.toString().trim();
    if (!snippet) return;
    const res = await awaitComment('Comment for this highlight?');
    if (!res) return;
    const { comment, priority } = res;
    const id = generateId();
    const payload = serializeRange(range);
    wrapRange(range, id);
    selection.removeAllRanges();
    const annotation = {
      id,
      type: 'text',
      target: payload,
      comment: comment.trim(),
      priority: priority || 'medium',
      snippet: snippet.slice(0, 180),
      pageUrl: window.location.href,
      pageKey: normalizePageKey(window.location.href),
      createdAt: Date.now()
    };
    state.annotations.push(annotation);
    saveAnnotations();
    addMarkerForAnnotation(annotation);
    renderList();
    setMode(null, { keepOutline: true });
  }

  function handleElementHover(evt) {
    if (state.mode !== 'element') return;
    const el = evt.target;
    if (!el || isWithinAnnotator(el)) {
      hideOutline();
      return;
    }
    const rect = el.getBoundingClientRect();
    showOutline(rect);
  }

  // Click on a DOM element to mark it and add a comment (element mode)
  async function handleElementClick(evt) {
    if (state.mode !== 'element') return;
    const el = evt.target;
    if (!el || isWithinAnnotator(el)) return;
    evt.preventDefault();
    evt.stopPropagation();
    const res = await awaitComment('Comment for this element?');
    if (!res) return;
    const { comment, priority } = res;
    const id = generateId();
    const targetXPath = getXPath(el);
    const rect = el.getBoundingClientRect();
    const annotation = {
      id,
      type: 'element',
      target: { xpath: targetXPath, tag: el.tagName.toLowerCase() },
      comment: comment.trim(),
      priority: priority || 'medium',
      snippet: el.innerText ? el.innerText.trim().slice(0, 120) : el.tagName,
      pageUrl: window.location.href,
      pageKey: normalizePageKey(window.location.href),
      rect: { x: rect.x + window.scrollX, y: rect.y + window.scrollY, w: rect.width, h: rect.height },
      createdAt: Date.now()
    };
    state.annotations.push(annotation);
    saveAnnotations();
    addMarkerForAnnotation(annotation);
    ensureElementOutline(annotation);
    renderList();
    setMode(null, { keepOutline: true });
  }

  // Region tool removed

  function unwrapHighlightSpan(span) {
    const parent = span && span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  }

  function clearRenderedAnnotations() {
    // Clean highlights/rectangles/markers on page before reload
    Object.values(state.highlightSpans || {}).forEach((span) => {
      if (span && span.parentNode) {
        unwrapHighlightSpan(span);
      }
    });
    state.highlightSpans = {};
    if (state.markerLayer) {
      state.markerLayer.innerHTML = '';
    }
    state.markers = {};
    Object.values(state.elementOutlines || {}).forEach((outline) => {
      if (outline && outline.parentNode) outline.parentNode.removeChild(outline);
    });
    state.elementOutlines = {};
  }

  function removeRenderedAnnotation(id) {
    const markerEntry = state.markers[id];
    if (markerEntry && markerEntry.el && markerEntry.el.parentNode) {
      markerEntry.el.parentNode.removeChild(markerEntry.el);
    }
    delete state.markers[id];

    if (state.elementOutlines[id] && state.elementOutlines[id].parentNode) {
      state.elementOutlines[id].parentNode.removeChild(state.elementOutlines[id]);
    }
    delete state.elementOutlines[id];

    const highlight =
      state.highlightSpans[id] || document.querySelector(`.wn-annot-highlight[data-wn-annot-id="${id}"]`);
    if (highlight) {
      unwrapHighlightSpan(highlight);
      delete state.highlightSpans[id];
    }
  }

  function renumberMarkers() {
    Object.entries(state.markers).forEach(([id, entry]) => {
      const idx = state.annotations.findIndex((a) => a.id === id);
      if (idx !== -1) {
        entry.el.textContent = idx + 1;
      }
    });
  }

  function showOutline(rect) {
    const o = state.outlineBox;
    o.style.display = 'block';
    o.style.left = `${rect.x + window.scrollX}px`;
    o.style.top = `${rect.y + window.scrollY}px`;
    o.style.width = `${rect.width}px`;
    o.style.height = `${rect.height}px`;
  }

  function hideOutline() {
    state.outlineBox.style.display = 'none';
  }

  function isWithinAnnotator(node) {
    if (!node) return false;
    return (
      (node.classList && node.classList.contains('wn-annotator')) ||
      (node.parentElement && isWithinAnnotator(node.parentElement))
    );
  }

  function serializeRange(range) {
    return {
      startXPath: getXPath(range.startContainer),
      startOffset: range.startOffset,
      endXPath: getXPath(range.endContainer),
      endOffset: range.endOffset
    };
  }

  function wrapRange(range, id) {
    const span = document.createElement('span');
    span.className = 'wn-annot-highlight';
    span.dataset.wnAnnotId = id;
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    state.highlightSpans[id] = span;
    return span;
  }

  function getXPath(node) {
    if (node === document.body) return '/html/body';
    const parts = [];
    while (node && node !== document) {
      let index = 1;
      let sibling = node.previousSibling;
      while (sibling) {
        if (sibling.nodeType === node.nodeType && sibling.nodeName === node.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      const name = node.nodeType === 3 ? 'text()' : node.nodeName.toLowerCase();
      parts.unshift(`${name}[${index}]`);
      node = node.parentNode;
      if (!node || node.nodeType !== 1) break;
    }
    return '/' + parts.join('/');
  }

  function findNodeByXPath(xpath) {
    try {
      const doc = document;
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch (err) {
      return null;
    }
  }

  function restoreAnnotations() {
    state.annotations.forEach((ann) => {
      if (ann.pageKey === normalizePageKey(window.location.href)) {
        renderAnnotation(ann);
      }
    });
    renderList();
  }

  function renderAnnotation(annotation) {
    if (annotation.type === 'text') {
      const range = deserializeRange(annotation.target);
      if (!range) return;
      const span = wrapRange(range, annotation.id);
      addMarkerForAnnotation(annotation, span);
    } else if (annotation.type === 'element') {
      addMarkerForAnnotation(annotation);
    }
  }

  function deserializeRange(payload) {
    const startNode = findNodeByXPath(payload.startXPath);
    const endNode = findNodeByXPath(payload.endXPath);
    if (!startNode || !endNode) return null;
    try {
      const range = document.createRange();
      range.setStart(startNode, payload.startOffset);
      range.setEnd(endNode, payload.endOffset);
      return range;
    } catch (err) {
      return null;
    }
  }

  function addMarkerForAnnotation(annotation, targetNode) {
    if (annotation.pageKey !== normalizePageKey(window.location.href)) return;
    const rect = getViewportRect(annotation, targetNode);
    if (!rect) return;
    const existingMarker = state.markers[annotation.id];
    if (existingMarker && existingMarker.el && existingMarker.el.parentNode) {
      existingMarker.el.parentNode.removeChild(existingMarker.el);
    }
    const marker = document.createElement('div');
    marker.className = 'wn-annot-marker wn-annotator';
    marker.textContent = state.annotations.findIndex((a) => a.id === annotation.id) + 1;
    marker.dataset.wnAnnotId = annotation.id;
    marker.style.left = `${rect.x + rect.w - 6}px`;
    marker.style.top = `${rect.y + 6}px`;
    marker.addEventListener('click', () => focusAnnotation(annotation.id));
    state.markerLayer.appendChild(marker);
    state.markers[annotation.id] = { el: marker, rect };

    if (annotation.type === 'element') {
      ensureElementOutline(annotation);
    }
  }

  function getViewportRect(annotation, targetNode) {
    if (annotation.type === 'text') {
      const span =
        targetNode ||
        state.highlightSpans[annotation.id] ||
        document.querySelector(`[data-wn-annot-id="${annotation.id}"]`);
      if (!span) return null;
      const r = span.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }
    if (annotation.type === 'element') {
      const el = annotation.target?.xpath ? findNodeByXPath(annotation.target.xpath) : null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }
    return null;
  }

  function ensureElementOutline(annotation) {
    try {
      const el = annotation.target?.xpath ? findNodeByXPath(annotation.target.xpath) : null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let outline = state.elementOutlines[annotation.id];
      if (outline && outline.parentNode) {
        // reuse existing
      } else {
        outline = document.createElement('div');
        outline.className = 'wn-annot-element-outline wn-annotator';
        outline.dataset.wnAnnotId = annotation.id;
        document.body.appendChild(outline);
        state.elementOutlines[annotation.id] = outline;
      }
      outline.style.left = `${rect.x + window.scrollX}px`;
      outline.style.top = `${rect.y + window.scrollY}px`;
      outline.style.width = `${rect.width}px`;
      outline.style.height = `${rect.height}px`;
    } catch (err) {
      // ignore
    }
  }

  function refreshMarkers() {
    Object.entries(state.markers).forEach(([id, entry]) => {
      const ann = state.annotations.find((a) => a.id === id);
      if (!ann) return;
      const rect = getViewportRect(ann);
      if (!rect) return;
      entry.rect = rect;
      entry.el.style.left = `${rect.x + rect.w - 6}px`;
      entry.el.style.top = `${rect.y + 6}px`;

      if (ann.type === 'element') {
        ensureElementOutline(ann);
      }
    });
  }

  // Scroll/flash the target when selecting from the list or marker
  function focusAnnotation(id, allowNavigate = false, targetUrl, targetPageKey) {
    const ann = state.annotations.find((a) => a.id === id);
    if (!ann) return;
    const samePage = (targetPageKey || ann.pageKey) === normalizePageKey(window.location.href);
    if (!samePage && allowNavigate) {
      try {
        localStorage.setItem(pendingFocusKey, JSON.stringify({ id: ann.id, pageKey: ann.pageKey, pageUrl: targetUrl || ann.pageUrl }));
      } catch (err) {
        // ignore
      }
      window.location.href = targetUrl || ann.pageUrl || window.location.href;
      return;
    }
    if (ann.type === 'text') {
      const span =
        state.highlightSpans[id] ||
        document.querySelector(`[data-wn-annot-id="${id}"]`);
      if (span) {
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(span);
      }
    } else if (ann.type === 'element') {
      const el = ann.target?.xpath ? findNodeByXPath(ann.target.xpath) : null;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(el);
      }
    }
  }

  function flash(el) {
    el.style.transition = 'box-shadow 0.2s ease';
    const prev = el.style.boxShadow;
    el.style.boxShadow = '0 0 0 3px rgba(78,156,246,0.6)';
    setTimeout(() => {
      el.style.boxShadow = prev;
    }, 800);
  }

  function ensureFooter() {
    if (!state.panel) return null;
    let footer = state.panel.querySelector('.wn-annot-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'wn-annot-footer wn-annotator';
      const link = document.createElement('a');
      link.href = 'https://ninefortyone.studio';
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      link.textContent = '© UxNote – by NineFortyOne.Studio';
      footer.appendChild(link);
      state.panel.appendChild(footer);
    }
    return footer;
  }


  // Rebuild the side panel list with filtering and numbering
  function renderList() {
    const list = state.panel.querySelector('.wn-annot-list');
      const title = state.panel.querySelector('h3');
      list.innerHTML = '';
      if (!state.annotations.length) {
        const empty = document.createElement('div');
        empty.className = 'wn-annot-empty';
      empty.textContent = 'No annotations yet.';
      list.appendChild(empty);
      if (title) title.textContent = 'Page annotations (0)';
      const footer = ensureFooter();
      return;
    }
    const filtered = state.annotations
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .filter((ann) => {
        const prioOk = state.filters.priority === 'all' || (ann.priority || 'medium') === state.filters.priority;
        const q = state.filters.query;
        const haystack = `${ann.comment || ''} ${ann.snippet || ''}`.toLowerCase();
        const searchOk = !q || haystack.includes(q);
        return prioOk && searchOk;
      });
    if (title) title.textContent = `Page annotations (${filtered.length})`;
    filtered.forEach((ann, idx) => {
      const item = document.createElement('div');
      item.className = 'wn-annot-item';
      item.dataset.id = ann.id;

      const priority = ann.priority || 'medium';
      const priorityLabel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium';

      const top = document.createElement('div');
      top.className = 'wn-annot-card-top';
      const topLeft = document.createElement('div');
      topLeft.className = 'wn-annot-card-top-left';
      const number = document.createElement('div');
      number.className = 'wn-annot-number';
      number.textContent = `#${idx + 1}`;
      const prioChip = document.createElement('div');
      prioChip.className = `wn-annot-priority ${priority}`;
      prioChip.innerHTML = `<span class="dot"></span><span>${priorityLabel}</span>`;
      topLeft.appendChild(number);
      topLeft.appendChild(prioChip);
      const meta = document.createElement('div');
      meta.className = 'wn-annot-meta wn-annot-meta-bottom';
      const typeLabel = ann.type.toUpperCase();
      meta.textContent = `${typeLabel} • ${new Date(ann.createdAt).toLocaleString()}`;
      const topRight = document.createElement('div');
      topRight.className = 'wn-annot-card-top-right';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'wn-annot-edit wn-annotator';
      editBtn.setAttribute('aria-label', 'Edit this annotation');
      editBtn.innerHTML = iconEdit();
      editBtn.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        await editAnnotation(ann.id);
      });
      topRight.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'wn-annot-delete wn-annotator';
      deleteBtn.setAttribute('aria-label', 'Delete this annotation');
      deleteBtn.innerHTML = iconTrash();
      deleteBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        deleteAnnotation(ann.id);
      });
      topRight.appendChild(deleteBtn);
      top.appendChild(topLeft);
      top.appendChild(topRight);
      const comment = document.createElement('div');
      comment.className = 'wn-annot-comment';
      comment.textContent = ann.comment || '—';

      const snippetWrap = document.createElement('div');
      snippetWrap.className = 'wn-annot-snippet';
      snippetWrap.textContent = ann.snippet || '(no text)';

      const showMore = document.createElement('button');
      showMore.type = 'button';
      showMore.className = 'wn-annot-showmore wn-annotator';
      showMore.textContent = 'See more';
      showMore.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const expanded = snippetWrap.classList.toggle('expanded');
        showMore.textContent = expanded ? 'See less' : 'See more';
      });
      if (!ann.snippet || ann.snippet.length < 80) {
        showMore.style.display = 'none';
      }

      item.appendChild(top);
      item.appendChild(comment);
      item.appendChild(snippetWrap);
      item.appendChild(showMore);
      item.appendChild(meta);
      item.addEventListener('click', () => focusAnnotation(ann.id, true, ann.pageUrl, ann.pageKey));
      list.appendChild(item);
    });

    ensureFooter();
  }

  function deleteAnnotation(id) {
    const idx = state.annotations.findIndex((a) => a.id === id);
    if (idx === -1) return;
    state.annotations.splice(idx, 1);
    saveAnnotations();
    removeRenderedAnnotation(id);
    renderList();
    renumberMarkers();
  }

  async function editAnnotation(id) {
    const ann = state.annotations.find((a) => a.id === id);
    if (!ann) return;
    const res = await askForComment('Edit this annotation', ann.comment || '', ann.priority || 'medium');
    if (!res) return;
    const { comment, priority } = res;
    ann.comment = comment.trim();
    ann.priority = priority || 'medium';
    saveAnnotations();
    renderList();
  }

  async function deleteAllAnnotations() {
    if (!state.annotations.length) return;
    const confirmDelete = await confirmDialog('Delete all annotations?', 'Delete');
    if (!confirmDelete) return;
    state.annotations = [];
    saveAnnotations();
    clearRenderedAnnotations();
    renderList();
    renumberMarkers();
  }

  function exportAnnotations() {
    // Export local annotations to a JSON file named with site and time
    const payload = buildAnnotationsPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename();
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildAnnotationsPayload() {
    return {
      pageUrl: window.location.href,
      createdAt: Date.now(),
      annotations: state.annotations
    };
  }

  async function emailAnnotations() {
    const payload = buildAnnotationsPayload();
    const data = JSON.stringify(payload, null, 2);
    const subject = encodeURIComponent(buildFilename());
    const body = encodeURIComponent(data);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function generateId() {
    return 'wn-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  }

  function handleImportFile(evt) {
    // Read an imported JSON file and re-render annotations
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = Array.isArray(parsed) ? parsed : parsed.annotations;
        if (!Array.isArray(imported)) throw new Error('Invalid JSON format');
        clearRenderedAnnotations();
        state.annotations = imported.map((ann) => ({
          ...ann,
          id: ann.id || generateId(),
          createdAt: ann.createdAt || Date.now(),
          priority: ann.priority || 'medium'
        }));
        saveAnnotations();
        restoreAnnotations();
      } catch (err) {
        await alertDialog('Import failed: ' + err.message, 'Import error');
      } finally {
        evt.target.value = '';
      }
    };
    reader.onerror = async () => {
      await alertDialog('Unable to read file.', 'Import error');
      evt.target.value = '';
    };
    reader.readAsText(file);
  }

  function buildFilename() {
    // Construit un nom de fichier lisible : titre/host + date + heure (sans secondes)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const rawTitle = (document.title || '').trim();
    const slugify = (str) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'annotations';
    let base;
    if (rawTitle) {
      base = `${slugify(rawTitle)}-annotations`;
    } else if (window.location && window.location.hostname) {
      base = `${slugify(window.location.hostname)}-annotations`;
    } else {
      base = 'annotations';
    }
    return `${base}_${date}_${time}.json`;
  }

  // Icons: placeholders to external SVGs; base configurable via data-icons on the script
  const iconPath = (file) => `${iconBase}/${file}`;
  function iconWordmark() {
    return `<img class="wn-annot-logo-img" src="${iconPath('uxnote-logo.svg')}" alt="Uxnote logo" />`;
  }
  function iconPen() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-pen.svg')}" alt="Highlight" />`;
  }
  function iconTarget() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-target.svg')}" alt="Element" />`;
  }
  function iconDownload() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-download.svg')}" alt="Export" />`;
  }
  function iconUpload() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-upload.svg')}" alt="Import" />`;
  }
  function iconMail() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-mail.svg')}" alt="Mail" />`;
  }
  function iconEdit() {
    return `
      <svg class="wn-annot-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 15.5V19h3.5l9.9-9.9-3.5-3.5L4 15.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M14.3 5.4 17.8 8.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `;
  }
  function iconTrash() {
    return `
      <svg class="wn-annot-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 7h16M10 11v6M14 11v6M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }
  function iconPanel() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-panel.svg')}" alt="Panel" />`;
  }
  function iconSwap() {
    return `<img class="wn-annot-img" src="${iconPath('uxnote-icon-bottom.svg')}" alt="Toolbar bottom" />`;
  }
  function iconEyeOpen() {
    return `
      <svg class="wn-annot-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2.5 12c1.8-3.6 5.3-6 9.5-6s7.7 2.4 9.5 6c-1.8 3.6-5.3 6-9.5 6s-7.7-2.4-9.5-6Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6" />
      </svg>
    `;
  }
  function iconEyeClosed() {
    return `
      <svg class="wn-annot-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5.2 7.1C3.7 8.1 2.5 9.7 1.8 12c1.8 3.6 5.3 6 9.5 6 1.7 0 3.3-.4 4.7-1.1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M9.5 9.5a3.5 3.5 0 0 0 5 5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M22.2 12c-.9-1.8-2.3-3.3-4-4.4-1-.7-2.1-1.3-3.3-1.7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M4 4l16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  function normalizePageKey(url) {
    try {
      const u = new URL(url, window.location.href);
      return `${u.origin}${u.pathname}`;
    } catch (err) {
      return `${window.location.origin}${window.location.pathname}`;
    }
  }

  function focusPendingAnnotation() {
    try {
      const raw = localStorage.getItem(pendingFocusKey);
      if (!raw) return;
      const pending = JSON.parse(raw);
      if (pending.pageKey === normalizePageKey(window.location.href)) {
        focusAnnotation(pending.id, false);
      }
      localStorage.removeItem(pendingFocusKey);
    } catch (err) {
      // ignore
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

  window.Uxnote = {
    refresh: refreshMarkers
  };
})();
