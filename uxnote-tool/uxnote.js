/*
 * Uxnote
 * Author: ninefortyonestudio (https://github.com/ninefortyonestudio)
 * Repository: https://github.com/ninefortyonestudio/uxnote
 * License: MIT (see LICENSE)
 * Built with Codex 5.2
 */
(() => {
  if (window.Uxnote) {
    return;
  }

  const script =
    document.currentScript ||
    Array.from(document.querySelectorAll('script')).find((s) =>
      (s.getAttribute('src') || '').includes('annotator.js')
    );
  const getScriptAttr = (name) => (script ? script.getAttribute(name) : null);
  const siteKey = `${location.protocol}//${location.host}`;
  const mailToDefault = (script && (script.dataset.mailto || script.dataset.email || script.dataset.to)) || '';
  const startVisibleAttr =
    getScriptAttr('isToolVisibleAtFirstLaunch') ||
    getScriptAttr('istoolvisibleatfirstlaunch') ||
    (script && (script.dataset.isToolVisibleAtFirstLaunch || script.dataset.istoolvisibleatfirstlaunch));
  const startTopAttr =
    getScriptAttr('isToolOnTopAtLaunch') ||
    getScriptAttr('istoolontopatlaunch') ||
    (script && (script.dataset.isToolOnTopAtLaunch || script.dataset.istoolontopatlaunch));
  const startHiddenAttr =
    script &&
    (script.dataset.hiddentoolbydefault ||
      script.dataset.hidden ||
      script.dataset.collapsed ||
      script.dataset.startHidden ||
      '');
  const globalHighlightColorAttr =
    getScriptAttr('colorForHighlight') ||
    getScriptAttr('colorForHighligh') ||
    (script && (script.dataset.colorForHighlight || script.dataset.colorForHighligh));
  const textHighlightColorAttr =
    getScriptAttr('colorForTextHighligh') ||
    getScriptAttr('colorForTextHighlight') ||
    (script && (script.dataset.colorForTextHighligh || script.dataset.colorForTextHighlight));
  const elementHighlightColorAttr =
    getScriptAttr('colorForElementHighlight') ||
    getScriptAttr('colorForElementHighligh') ||
    (script && (script.dataset.colorForElementHighlight || script.dataset.colorForElementHighligh));
  const defaultHighlightColor = '#4e9cf6';
  const baseHighlightColor = normalizeHexColor(
    globalHighlightColorAttr ||
      elementHighlightColorAttr ||
      textHighlightColorAttr ||
      defaultHighlightColor,
    defaultHighlightColor
  );
  const textHighlightColor = normalizeHexColor(textHighlightColorAttr || baseHighlightColor, baseHighlightColor);
  const elementHighlightColor = normalizeHexColor(elementHighlightColorAttr || baseHighlightColor, baseHighlightColor);
  const colorPalette = {
    text: buildColorSet(textHighlightColor, { overlayAlpha: 0.7, softAlpha: 0.18, softerAlpha: 0.08 }),
    element: buildColorSet(elementHighlightColor, { overlayAlpha: 0.35, softAlpha: 0.12, softerAlpha: 0.04 })
  };
  const initialPosition = (() => {
    if (startTopAttr !== null && startTopAttr !== undefined) {
      return parseBoolAttr(startTopAttr, false) ? 'top' : 'bottom';
    }
    return (script && script.dataset.position) || 'bottom';
  })();
  let position = initialPosition;
  const positionStorageKey = 'wn-toolbar-pos';
  const dockMode = (script && (script.dataset.dock || script.dataset.layout)) || '';
  const storageKey = `uxnote:site:${siteKey}`;
  const annotatorNameStorageKey = `uxnote:annotator:${siteKey}`;
  const annotatorNamesStorageKey = `uxnote:annotators:${siteKey}`;
  const importFilesStorageKey = `uxnote:import-files:${siteKey}`;
  const visibilityStorageKey = `uxnote:hidden:${siteKey}`;
  const pendingFocusKey = `uxnote:pending:${siteKey}`;
  const analyticsSrc = 'https://cloud.umami.is/script.js';
  const analyticsWebsiteId = '9ba5fe24-9047-43b9-bdc6-c4113d1cf0a5';
  const dimConfigAttr =
    getScriptAttr('isBackdropVisible') ||
    getScriptAttr('isbackdropvisible') ||
    getScriptAttr('backdropVisible') ||
    getScriptAttr('backdropvisible') ||
    (script &&
      (script.dataset.isBackdropVisible ||
        script.dataset.isbackdropvisible ||
        script.dataset.backdropVisible ||
        script.dataset.backdropvisible ||
        script.dataset.dim ||
        script.dataset.dimpage ||
        script.dataset.dimmer ||
        script.dataset.overlay ||
        script.dataset.dimLevel ||
        script.dataset.dimlevel ||
        script.dataset.dimstrength));
  const defaultDimOpacity = 0.2;
  const dimEnabled = parseBoolAttr(dimConfigAttr, true);
  const dimOpacity = dimEnabled ? defaultDimOpacity : 0;

  // Central state (positions, annotations, DOM elements, filters...)
  const state = {
    mode: null,
    annotations: [],
    annotatorName: '',
    annotatorNames: [],
    importFiles: [],
    markers: {},
    highlightSpans: {},
    elementTargets: {},
    outlineBox: null,
    toolbar: null,
    panel: null,
    visibilityToggle: null,
    commentModal: null,
    dialogModal: null,
    importModal: null,
    exportModal: null,
    markerLayer: null,
    colors: colorPalette,
    customPosition: false,
    dimEnabled,
    dimOpacity,
    dimOverlay: null,
    filters: {
      priority: 'all',
      author: 'all',
      query: ''
    },
    hidden: false,
    missingObserver: null,
    missingRetryTimer: null,
    layoutObserver: null,
    layoutTimer: null,
    toast: null,
    toastTimer: null
  };
  const mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;

  function isMobileLayout() {
    if (mobileQuery) return mobileQuery.matches;
    return window.innerWidth <= 640;
  }

  // Entry point: load config, build UI, restore data
  function init() {
    const savedPos = loadSavedPosition();
    if (savedPos) position = savedPos;
    const savedHidden = loadHiddenState();
    const initialHiddenFromVisible =
      startVisibleAttr !== null && startVisibleAttr !== undefined
        ? !parseBoolAttr(startVisibleAttr, true)
        : null;
    state.hidden =
      savedHidden !== null
        ? savedHidden
        : initialHiddenFromVisible !== null
        ? initialHiddenFromVisible
        : parseBoolAttr(startHiddenAttr, false);
    state.annotatorName = loadAnnotatorName();
    state.annotatorNames = loadAnnotatorNames();
    state.importFiles = loadImportFiles();
    injectAnalytics();
    captureBasePadding();
    applyColorTheme();
    injectStyles();
    createShell();
    createDimmer();
    setAnnotatorVisibility(state.hidden);
    loadAnnotations();
    refreshKnownAnnotatorNames();
    restoreAnnotations();
    retryResolveMissingAnnotations();
    startMissingObserver();
    startLayoutObserver();
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
      :root {
        --wn-text-highlight: #4e9cf6;
        --wn-text-highlight-overlay: rgba(78, 156, 246, 0.2);
        --wn-text-highlight-soft: rgba(78, 156, 246, 0.12);
        --wn-element-highlight: #4e9cf6;
        --wn-element-highlight-soft: rgba(78, 156, 246, 0.12);
        --wn-element-highlight-soft-end: rgba(78, 156, 246, 0.04);
        --wn-element-highlight-strong: rgba(78, 156, 246, 0.9);
        --wn-element-highlight-shadow: rgba(78, 156, 246, 0.24);
        --wn-marker-text: #0b1622;
      }
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
          gap: 4px;
          padding: 6px 8px;
          flex-wrap: nowrap;
          left: 8px;
          right: 8px;
          transform: none;
          width: calc(100vw - 16px);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .wn-annot-toolbar button {
          --wn-btn-size: clamp(30px, 9vw, 36px);
        }
        .wn-annot-group {
          gap: 4px;
        }
        .wn-annot-spacer {
          display: block;
          flex: 1 1 auto;
          width: auto;
          min-width: clamp(8px, 4vw, 22px);
        }
        body:not(.wn-annot-hidden) .wn-annot-toolbar .wn-annot-visibility-btn {
          position: static;
          top: auto;
          bottom: auto;
          left: auto;
          right: auto;
          --wn-btn-size: clamp(30px, 9vw, 36px);
          width: var(--wn-btn-size);
          height: var(--wn-btn-size);
          min-width: var(--wn-btn-size);
          max-width: var(--wn-btn-size);
          min-height: var(--wn-btn-size);
          max-height: var(--wn-btn-size);
          flex: 0 0 var(--wn-btn-size);
          border: none;
          background: transparent;
          box-shadow: none;
        }
        body:not(.wn-annot-hidden) .wn-annot-toolbar .wn-annot-visibility-btn::after {
          display: none;
        }
        body.wn-annot-hidden .wn-annot-visibility-btn {
          opacity: 0.7;
          background: rgba(246, 242, 251, 0.35);
          border-color: rgba(109, 86, 199, 0.22);
          box-shadow: 0 6px 16px rgba(73, 64, 157, 0.16);
        }
        .wn-annot-logo {
          display: none;
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
      body.wn-annot-hidden .uxnote-textmark {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
        pointer-events: none !important;
      }
      body.wn-annot-hidden .uxnote-annotated {
        outline: none !important;
        box-shadow: none !important;
      }
      body.wn-annot-hidden .wn-annot-visibility-btn {
        opacity: 0.26;
      }
      .wn-annot-icon {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: currentColor;
        font-family: var(--wn-icon-font);
      }
      .wn-annot-img {
        width: 20px;
        height: 20px;
        object-fit: contain;
        display: block;
      }
      .wn-annot-logo-img {
        width: 86px;
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
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }
      .wn-annot-filter-row {
        display: flex;
        align-items: center;
        gap: 8px;
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
      .wn-annot-filter-row select {
        flex: 1 1 auto;
        min-width: 0;
      }
      .wn-annot-filter-row input[type="search"] {
        width: 100%;
      }
      .wn-annot-filter-clear {
        border: 1px solid rgba(109, 86, 199, 0.25);
        background: rgba(109, 86, 199, 0.08);
        color: #5a5266;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        padding: 0;
      }
      .wn-annot-filter-clear:hover {
        background: rgba(109, 86, 199, 0.16);
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
        padding-top: 8px;
        padding-bottom: 4px;
      }
      .wn-annot-item {
        background: #ffffff;
        border: 1px solid rgba(109, 86, 199, 0.14);
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 2px 8px rgba(73, 64, 157, 0.08);
      }
      .wn-annot-item:hover {
        border-color: rgba(109, 86, 199, 0.32);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(73, 64, 157, 0.12);
      }
      .wn-annot-item.is-focused {
        border-color: var(--wn-item-accent-strong, var(--wn-element-highlight-strong));
        box-shadow: 0 6px 16px var(--wn-item-accent-shadow, var(--wn-element-highlight-shadow));
        background: linear-gradient(
          180deg,
          var(--wn-item-accent-soft, var(--wn-element-highlight-soft)),
          var(--wn-item-accent-soft-end, var(--wn-element-highlight-soft-end))
        );
        transform: translateY(-1px);
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
        background: var(--wn-item-number-bg, rgba(109, 86, 199, 0.12));
        border: 1px solid var(--wn-item-number-border, rgba(109, 86, 199, 0.24));
        color: var(--wn-item-number-text, #000000);
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
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
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
      .wn-annot-missing {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #a03232;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(224, 91, 91, 0.35);
        background: rgba(224, 91, 91, 0.12);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .wn-annot-title {
        font-size: 13px;
        font-weight: 700;
        color: #352f46;
        margin-bottom: 8px;
      }
      .wn-annot-comment {
        font-size: 12px;
        color: #5a5266;
        background: rgba(109, 86, 199, 0.06);
        border: 1px dashed rgba(109, 86, 199, 0.3);
        border-radius: 12px;
        padding: 8px 10px;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.5;
        margin-bottom: 0;
        transition: max-height 0.2s ease;
      }
      .wn-annot-comment.expanded {
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
      .uxnote-textmark {
        display: inline;
        background: var(--wn-text-highlight-overlay, rgba(78,156,246,0.2));
        border: none;
        box-shadow: none;
        padding: 0;
        border-radius: 2px;
        cursor: pointer;
        position: relative;
      }
      .uxnote-annotated {
        outline: 2px solid var(--wn-element-highlight, #4e9cf6);
        outline-offset: 2px;
        box-shadow: 0 0 0 3px var(--wn-element-highlight-soft, rgba(78,156,246,0.08));
      }
      .wn-annot-marker-layer {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .wn-annot-marker {
        position: absolute;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background: var(--wn-marker-bg, var(--wn-element-highlight));
        color: var(--wn-marker-text, #0b1622);
        font-weight: 700;
        font-size: 11px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        box-shadow: 0 10px 25px var(--wn-marker-shadow, rgba(0,0,0,0.25));
        cursor: pointer;
        transform: translate(-50%, -50%);
      }
      .wn-annot-marker:hover { background: var(--wn-marker-bg, var(--wn-element-highlight)); filter: brightness(1.05); }
      .wn-annot-outline {
        position: absolute;
        border: 2px dashed var(--wn-element-highlight, #4e9cf6);
        background: var(--wn-element-highlight-soft, rgba(78,156,246,0.1));
        pointer-events: none;
        z-index: 2147482800;
      }
      .wn-annot-toast {
        position: fixed;
        left: 50%;
        bottom: 26px;
        transform: translateX(-50%);
        background: #f6f2fb;
        color: #3f3852;
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 12px;
        border: 1px solid rgba(109, 86, 199, 0.2);
        box-shadow: 0 12px 28px rgba(73, 64, 157, 0.18);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 2147483200;
      }
      .wn-annot-toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(-4px);
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
      .wn-annot-dimmer {
        position: fixed;
        inset: 0;
        background: rgba(18, 14, 32, var(--wn-dim-opacity, 0.2));
        z-index: 2147481200;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }
      .wn-annot-dimmer.is-visible { opacity: 1; }
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
      .wn-annot-name-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
      }
      .wn-annot-name-row label {
        font-size: 13px;
        color: #4b4557;
        font-weight: 600;
      }
      .wn-annot-name-inputs {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .wn-annot-name-select {
        min-width: 140px;
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
      .wn-annot-modal input[type="text"] {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(109, 86, 199, 0.22);
        background: #fff;
        padding: 10px 12px;
        font-size: 14px;
        color: #342d43;
        outline: none;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
      }
      .wn-annot-modal textarea:focus {
        border-color: rgba(109, 86, 199, 0.55);
        box-shadow: 0 0 0 3px rgba(109, 86, 199, 0.15);
      }
      .wn-annot-modal input[type="text"]:focus {
        border-color: rgba(109, 86, 199, 0.55);
        box-shadow: 0 0 0 3px rgba(109, 86, 199, 0.15);
      }
      @media (max-width: 640px) {
        .wn-annot-modal textarea,
        .wn-annot-modal input[type="text"],
        .wn-annot-modal select {
          font-size: 16px;
        }
      }
      .wn-annot-export-modal {
        min-width: min(640px, calc(100vw - 40px));
        max-width: 860px;
      }
      .wn-annot-export-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
      }
      .wn-annot-export-panel {
        border: 1px solid rgba(109, 86, 199, 0.12);
        border-radius: 14px;
        padding: 12px;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 220px;
      }
      .wn-annot-export-panel h5 {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        color: #3f3852;
      }
      .wn-annot-export-panel p {
        margin: 0;
        font-size: 12px;
        color: #5a5266;
      }
      .wn-annot-export-list {
        display: grid;
        gap: 8px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .wn-annot-export-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        color: #3f3852;
      }
      .wn-annot-export-item input {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 6px;
        border: 1.5px solid rgba(109, 86, 199, 0.5);
        background: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.2s ease;
      }
      .wn-annot-export-item input:checked {
        background: #6d56c7;
        border-color: #6d56c7;
        box-shadow: 0 0 0 3px rgba(109, 86, 199, 0.18);
      }
      .wn-annot-export-item input:checked::after {
        content: '';
        width: 8px;
        height: 5px;
        border-left: 2px solid #fff;
        border-bottom: 2px solid #fff;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -55%) rotate(-45deg);
      }
      .wn-annot-export-item span {
        font-size: 14px;
      }
      .wn-annot-import-modal {
        min-width: min(760px, calc(100vw - 40px));
        max-width: 960px;
      }
      .wn-annot-import-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .wn-annot-import-drop {
        position: relative;
        display: block;
        border: 1.5px dashed rgba(109, 86, 199, 0.32);
        border-radius: 14px;
        padding: 14px;
        background: linear-gradient(135deg, rgba(109, 86, 199, 0.08), rgba(246, 242, 251, 0.95));
        cursor: pointer;
        transition: border 0.2s ease, transform 0.2s ease;
      }
      .wn-annot-import-drop:hover {
        transform: translateY(-1px);
        border-color: rgba(109, 86, 199, 0.6);
      }
      .wn-annot-import-drop.dragover {
        border-color: rgba(109, 86, 199, 0.9);
        background: linear-gradient(135deg, rgba(109, 86, 199, 0.16), rgba(246, 242, 251, 0.95));
      }
      .wn-annot-import-drop input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
      .wn-annot-import-drop-title {
        font-size: 13px;
        font-weight: 700;
        color: #3f3852;
      }
      .wn-annot-import-drop-sub {
        font-size: 12px;
        color: #5a5266;
        margin-top: 4px;
      }
      .wn-annot-import-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
      }
      .wn-annot-import-panel {
        border: 1px solid rgba(109, 86, 199, 0.12);
        border-radius: 14px;
        padding: 12px;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 220px;
      }
      .wn-annot-import-panel h5 {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        color: #3f3852;
      }
      .wn-annot-import-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .wn-annot-import-count {
        background: rgba(109, 86, 199, 0.16);
        color: #4b4557;
        border-radius: 999px;
        padding: 4px 8px;
        font-weight: 600;
        font-size: 11px;
        border: 1px solid rgba(109, 86, 199, 0.2);
      }
      .wn-annot-import-panel p {
        margin: 0;
        font-size: 12px;
        color: #5a5266;
      }
      .wn-annot-import-list {
        display: grid;
        gap: 8px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 4px;
      }
      .wn-annot-import-card {
        border: 1px solid rgba(109, 86, 199, 0.14);
        background: #f8f6fd;
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-width: 0;
      }
      .wn-annot-import-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .wn-annot-import-name {
        font-size: 13px;
        font-weight: 600;
        color: #3f3852;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .wn-annot-import-sub {
        font-size: 11px;
        color: #5a5266;
        font-family: "SF Mono", "SFMono-Regular", ui-monospace, monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .wn-annot-import-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .wn-annot-import-badge {
        background: rgba(109, 86, 199, 0.16);
        color: #4b4557;
        border-radius: 999px;
        padding: 4px 8px;
        font-weight: 600;
        font-size: 11px;
        border: 1px solid rgba(109, 86, 199, 0.2);
      }
      .wn-annot-import-remove {
        border: 1px solid rgba(209, 59, 59, 0.35);
        background: rgba(209, 59, 59, 0.12);
        color: #b83232;
        width: 26px;
        height: 26px;
        padding: 0;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .wn-annot-import-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 8px;
      }
      .wn-annot-import-stat {
        background: rgba(109, 86, 199, 0.08);
        border: 1px solid rgba(109, 86, 199, 0.12);
        border-radius: 12px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .wn-annot-import-stat span:first-child {
        font-size: 11px;
        color: #5a5266;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .wn-annot-import-stat span:last-child {
        font-size: 16px;
        font-weight: 700;
        color: #3f3852;
      }
      .wn-annot-import-empty {
        font-size: 12px;
        color: #5a5266;
        border: 1px dashed rgba(109, 86, 199, 0.18);
        border-radius: 10px;
        padding: 10px;
        text-align: center;
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
      .wn-annot-modal .wn-annot-pill.secondary {
        background: rgba(109, 86, 199, 0.12);
        color: #4b4557;
        border: 1px solid rgba(109, 86, 199, 0.22);
      }
      .wn-annot-modal .wn-annot-pill.secondary:hover {
        background: rgba(109, 86, 199, 0.18);
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
      { action: 'import', tip: 'Import JSON', icon: iconUpload() },
      { action: 'export', tip: 'Export JSON', icon: iconDownload() }
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

    const panel = document.createElement('div');
    panel.className = 'wn-annot-panel wn-annotator';
    panel.innerHTML = `
      <div class="wn-annot-panel-head wn-annotator">
        <div class="wn-annot-panel-top wn-annotator">
          <h3>Annotations (0)</h3>
          <button class="wn-annot-delete-all wn-annotator" type="button">
            ${iconTrash()}<span>All</span>
          </button>
        </div>
        <div class="wn-annot-filters wn-annotator">
          <div class="wn-annot-filter-row wn-annotator">
            <input id="wn-filter-search" class="wn-annotator" type="search" placeholder="Keyword search" />
          </div>
          <div class="wn-annot-filter-row wn-annotator">
            <label class="wn-annot-filter-label wn-annotator" for="wn-filter-priority">Priority</label>
            <select id="wn-filter-priority" class="wn-annotator">
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button class="wn-annot-filter-clear wn-annotator" type="button" data-filter-clear="priority" aria-label="Clear priority filter">✕</button>
          </div>
          <div class="wn-annot-filter-row wn-annotator">
            <label class="wn-annot-filter-label wn-annotator" for="wn-filter-author">Reviewer</label>
            <select id="wn-filter-author" class="wn-annotator">
              <option value="all">All</option>
            </select>
            <button class="wn-annot-filter-clear wn-annotator" type="button" data-filter-clear="author" aria-label="Clear reviewer filter">✕</button>
          </div>
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
    if (isMobileLayout()) {
      panel.style.display = 'none';
    }
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

  function updateDimmer() {
    if (!state.dimOverlay) return;
    state.dimOverlay.classList.toggle('is-visible', !state.hidden);
  }

  function createDimmer() {
    if (!state.dimEnabled || state.dimOverlay) return;
    const dimmer = document.createElement('div');
    dimmer.className = 'wn-annot-dimmer';
    dimmer.setAttribute('aria-hidden', 'true');
    dimmer.style.setProperty('--wn-dim-opacity', String(state.dimOpacity));
    const first = document.body.firstChild;
    if (first) {
      document.body.insertBefore(dimmer, first);
    } else {
      document.body.appendChild(dimmer);
    }
    state.dimOverlay = dimmer;
    updateDimmer();
  }

  function mountVisibilityToggle() {
    if (!state.visibilityToggle) return;
    const btn = state.visibilityToggle;
    const inlineTarget = isMobileLayout() && state.toolbar && !state.hidden;
    const target = inlineTarget ? state.toolbar : document.body;
    if (btn.parentNode !== target) {
      if (btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
      if (target === state.toolbar) {
        state.toolbar.insertBefore(btn, state.toolbar.firstChild);
      } else {
        document.body.appendChild(btn);
      }
    }
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
    mountVisibilityToggle();
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

    const nameRow = document.createElement('div');
    nameRow.className = 'wn-annot-name-row wn-annotator';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Reviewer name';
    const nameInputs = document.createElement('div');
    nameInputs.className = 'wn-annot-name-inputs wn-annotator';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'wn-annotator';
    nameInput.placeholder = 'Reviewer name';
    nameInputs.appendChild(nameInput);
    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameInputs);

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
    modal.appendChild(nameRow);
    modal.appendChild(textarea);
    modal.appendChild(prioWrapper);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    state.commentModal = {
      backdrop,
      modal,
      textarea,
      title,
      okBtn,
      cancelBtn,
      prioButtons,
      nameInput
    };
    return state.commentModal;
  }

  function askForComment(label, defaultValue = '', defaultPriority = 'medium', defaultAuthor = '') {
    return new Promise((resolve) => {
      const modalState = ensureCommentModal();
      const { backdrop, textarea, title, okBtn, cancelBtn, prioButtons, nameInput } = modalState;
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

      const names = state.annotatorNames || [];
      const defaultName = defaultAuthor || state.annotatorName || names[0] || '';
      nameInput.value = defaultName || '';
      nameInput.disabled = false;
      nameInput.placeholder = 'Reviewer name';

      backdrop.classList.add('show');
      if (defaultName) {
        textarea.focus();
        textarea.select();
      } else {
        nameInput.focus();
        nameInput.select();
      }

      const close = (val) => {
        backdrop.classList.remove('show');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        prioButtons.forEach((b, idx) => b.removeEventListener('click', prioHandlers[idx]));
        resolve(val);
      };
      const onOk = async () => {
        const selected = prioButtons.find((b) => b.classList.contains('active'));
        const priority = selected ? selected.getAttribute('data-priority') : defaultPriority;
        const author = nameInput.value.trim();
        if (!author) {
          await alertDialog('Please enter a reviewer name.', 'Reviewer name required');
          return;
        }
        recordAnnotatorName(author);
        close({ comment: textarea.value.trim(), priority, author });
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

  function ensureExportModal() {
    if (state.exportModal) return state.exportModal;
    const backdrop = document.createElement('div');
    backdrop.className = 'wn-annot-modal-backdrop wn-annotator';
    const modal = document.createElement('div');
    modal.className = 'wn-annot-modal wn-annotator wn-annot-export-modal';

    const title = document.createElement('h4');
    title.textContent = 'Export annotations';

    const body = document.createElement('div');
    body.className = 'wn-annot-export-grid wn-annotator';

    const reviewerPanel = document.createElement('div');
    reviewerPanel.className = 'wn-annot-export-panel wn-annotator';
    const reviewerTitle = document.createElement('h5');
    reviewerTitle.textContent = 'Reviewers';
    const reviewerDesc = document.createElement('p');
    reviewerDesc.textContent = 'Choose reviewers to include.';
    const reviewerList = document.createElement('div');
    reviewerList.className = 'wn-annot-export-list wn-annotator';
    reviewerPanel.appendChild(reviewerTitle);
    reviewerPanel.appendChild(reviewerDesc);
    reviewerPanel.appendChild(reviewerList);

    const prioPanel = document.createElement('div');
    prioPanel.className = 'wn-annot-export-panel wn-annotator';
    const prioTitle = document.createElement('h5');
    prioTitle.textContent = 'Criticality';
    const prioDesc = document.createElement('p');
    prioDesc.textContent = 'Select priority levels.';
    const prioList = document.createElement('div');
    prioList.className = 'wn-annot-export-list wn-annotator';
    prioPanel.appendChild(prioTitle);
    prioPanel.appendChild(prioDesc);
    prioPanel.appendChild(prioList);

    body.appendChild(reviewerPanel);
    body.appendChild(prioPanel);

    const actions = document.createElement('div');
    actions.className = 'wn-annot-actions wn-annotator';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'wn-annot-pill cancel wn-annotator';
    cancelBtn.textContent = 'Cancel';
    const mailBtn = document.createElement('button');
    mailBtn.type = 'button';
    mailBtn.className = 'wn-annot-pill secondary wn-annotator';
    mailBtn.textContent = 'Send by mail';
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'wn-annot-pill primary wn-annotator';
    exportBtn.textContent = 'Export file';
    actions.appendChild(cancelBtn);
    actions.appendChild(mailBtn);
    actions.appendChild(exportBtn);

    modal.appendChild(title);
    modal.appendChild(body);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.classList.remove('show');
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (evt) => {
      if (evt.key === 'Escape') close();
    };
    const onBackdrop = (evt) => {
      if (evt.target === backdrop) close();
    };

    cancelBtn.addEventListener('click', close);
    backdrop.addEventListener('click', onBackdrop);

    exportBtn.addEventListener('click', () => {
      const reviewers = getCheckedValues(reviewerList);
      const priorities = getCheckedValues(prioList);
      exportAnnotationsFiltered({
        reviewers,
        priorities
      });
      close();
    });

    mailBtn.addEventListener('click', () => {
      const reviewers = getCheckedValues(reviewerList);
      const priorities = getCheckedValues(prioList);
      emailAnnotationsFiltered({
        reviewers,
        priorities
      });
      close();
    });

    state.exportModal = {
      backdrop,
      reviewerList,
      prioList,
      onKey
    };
    return state.exportModal;
  }

  function openExportModal() {
    const modalState = ensureExportModal();
    renderExportModal();
    modalState.backdrop.classList.add('show');
    document.addEventListener('keydown', modalState.onKey);
  }

  function renderExportModal() {
    if (!state.exportModal) return;
    const { reviewerList, prioList } = state.exportModal;

    reviewerList.innerHTML = '';
    getExportReviewers().forEach((reviewer) => {
      reviewerList.appendChild(makeExportCheckbox(reviewer.value, reviewer.label, true));
    });

    prioList.innerHTML = '';
    getExportPriorities().forEach((prio) => {
      prioList.appendChild(makeExportCheckbox(prio.value, prio.label, true));
    });
  }

  function getExportReviewers() {
    const reviewers = Array.from(
      new Set(
        state.annotations.map((ann) => {
          const name = (ann.author || '').trim();
          return name || '__unknown';
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => getAuthorLabel(a).localeCompare(getAuthorLabel(b)));

    return reviewers.map((value) => ({
      value,
      label: getAuthorLabel(value)
    }));
  }

  function getExportPriorities() {
    return [
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ];
  }

  function makeExportCheckbox(value, label, checked) {
    const row = document.createElement('label');
    row.className = 'wn-annot-export-item wn-annotator';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = checked;
    input.className = 'wn-annotator';
    const text = document.createElement('span');
    text.textContent = label;
    row.appendChild(input);
    row.appendChild(text);
    return row;
  }

  function getCheckedValues(container) {
    return Array.from(container.querySelectorAll('input[type="checkbox"]'))
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function ensureImportModal() {
    if (state.importModal) return state.importModal;
    const backdrop = document.createElement('div');
    backdrop.className = 'wn-annot-modal-backdrop wn-annotator';
    const modal = document.createElement('div');
    modal.className = 'wn-annot-modal wn-annotator wn-annot-import-modal';

    const title = document.createElement('h4');
    title.textContent = 'Import JSON files';

    const body = document.createElement('div');
    body.className = 'wn-annot-import-body wn-annotator';

    const dropzone = document.createElement('label');
    dropzone.className = 'wn-annot-import-drop wn-annotator';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.multiple = true;
    fileInput.className = 'wn-annotator';
    const dropContent = document.createElement('div');
    const dropTitle = document.createElement('div');
    dropTitle.className = 'wn-annot-import-drop-title wn-annotator';
    dropTitle.textContent = 'Drop JSON files here';
    const dropSub = document.createElement('div');
    dropSub.className = 'wn-annot-import-drop-sub wn-annotator';
    dropSub.textContent = 'or click to select files';
    dropContent.appendChild(dropTitle);
    dropContent.appendChild(dropSub);
    dropzone.appendChild(fileInput);
    dropzone.appendChild(dropContent);

    const grid = document.createElement('div');
    grid.className = 'wn-annot-import-grid wn-annotator';

    const filesPanel = document.createElement('div');
    filesPanel.className = 'wn-annot-import-panel wn-annotator';
    const filesTitleRow = document.createElement('div');
    filesTitleRow.className = 'wn-annot-import-title-row wn-annotator';
    const filesTitle = document.createElement('h5');
    filesTitle.textContent = 'Loaded files';
    const filesCount = document.createElement('span');
    filesCount.className = 'wn-annot-import-count wn-annotator';
    filesCount.textContent = '0';
    const filesDesc = document.createElement('p');
    filesDesc.textContent = 'Files are saved automatically.';
    const fileList = document.createElement('div');
    fileList.className = 'wn-annot-import-list wn-annotator';
    filesTitleRow.appendChild(filesTitle);
    filesTitleRow.appendChild(filesCount);
    filesPanel.appendChild(filesTitleRow);
    filesPanel.appendChild(filesDesc);
    filesPanel.appendChild(fileList);

    const reviewersPanel = document.createElement('div');
    reviewersPanel.className = 'wn-annot-import-panel wn-annotator';
    const reviewersTitle = document.createElement('h5');
    reviewersTitle.textContent = 'Reviewer summary';
    const reviewersDesc = document.createElement('p');
    reviewersDesc.textContent = 'Counts based on imported files.';
    const stats = document.createElement('div');
    stats.className = 'wn-annot-import-stats wn-annotator';
    const statReviewers = document.createElement('div');
    statReviewers.className = 'wn-annot-import-stat wn-annotator';
    const statReviewersLabel = document.createElement('span');
    statReviewersLabel.textContent = 'Reviewers';
    const statReviewersValue = document.createElement('span');
    statReviewersValue.textContent = '0';
    statReviewers.appendChild(statReviewersLabel);
    statReviewers.appendChild(statReviewersValue);
    const statComments = document.createElement('div');
    statComments.className = 'wn-annot-import-stat wn-annotator';
    const statCommentsLabel = document.createElement('span');
    statCommentsLabel.textContent = 'Comments';
    const statCommentsValue = document.createElement('span');
    statCommentsValue.textContent = '0';
    statComments.appendChild(statCommentsLabel);
    statComments.appendChild(statCommentsValue);
    stats.appendChild(statReviewers);
    stats.appendChild(statComments);
    const reviewerList = document.createElement('div');
    reviewerList.className = 'wn-annot-import-list wn-annotator';
    reviewersPanel.appendChild(reviewersTitle);
    reviewersPanel.appendChild(reviewersDesc);
    reviewersPanel.appendChild(stats);
    reviewersPanel.appendChild(reviewerList);

    grid.appendChild(filesPanel);
    grid.appendChild(reviewersPanel);

    const actions = document.createElement('div');
    actions.className = 'wn-annot-actions wn-annotator';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'wn-annot-pill cancel wn-annotator';
    closeBtn.textContent = 'Close';
    actions.appendChild(closeBtn);

    body.appendChild(dropzone);
    body.appendChild(grid);
    modal.appendChild(title);
    modal.appendChild(body);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.classList.remove('show');
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (evt) => {
      if (evt.key === 'Escape') close();
    };
    const onBackdrop = (evt) => {
      if (evt.target === backdrop) close();
    };

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', onBackdrop);

    ['dragenter', 'dragover'].forEach((evtName) => {
      dropzone.addEventListener(evtName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evtName) => {
      dropzone.addEventListener(evtName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (event) => {
      const files = event.dataTransfer?.files;
      if (files && files.length) {
        handleImportFiles(Array.from(files));
      }
    });

    fileInput.addEventListener('change', (event) => {
      const files = event.target.files;
      if (files && files.length) {
        handleImportFiles(Array.from(files));
      }
      fileInput.value = '';
    });

    fileList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-import-remove]');
      if (!btn) return;
      removeImportedFile(btn.dataset.importRemove);
    });

    state.importModal = {
      backdrop,
      modal,
      fileInput,
      fileList,
      reviewerList,
      filesCount,
      statReviewersValue,
      statCommentsValue,
      onKey,
      close
    };
    return state.importModal;
  }

  function openImportModal() {
    const modalState = ensureImportModal();
    renderImportModal();
    modalState.backdrop.classList.add('show');
    document.addEventListener('keydown', modalState.onKey);
  }

  function renderImportModal() {
    if (!state.importModal) return;
    const { fileList, reviewerList, filesCount, statReviewersValue, statCommentsValue } = state.importModal;
    const { fileCounts, reviewerCounts, totalComments } = buildImportSummary();

    fileList.innerHTML = '';
    if (!state.importFiles.length) {
      const empty = document.createElement('div');
      empty.className = 'wn-annot-import-empty wn-annotator';
      empty.textContent = 'No imported files yet.';
      fileList.appendChild(empty);
    } else {
      state.importFiles.forEach((file) => {
        const card = document.createElement('div');
        card.className = 'wn-annot-import-card wn-annotator';

        const meta = document.createElement('div');
        meta.className = 'wn-annot-import-meta wn-annotator';
        const name = document.createElement('div');
        name.className = 'wn-annot-import-name wn-annotator';
        name.textContent = file.name;
        const sub = document.createElement('div');
        sub.className = 'wn-annot-import-sub wn-annotator';
        const count = fileCounts.get(file.id) || 0;
        const urlLabel = file.pageUrl ? ` | ${truncateText(file.pageUrl, 36)}` : '';
        sub.textContent = `${count} comments | ${formatBytes(file.size)}${urlLabel}`;
        meta.appendChild(name);
        meta.appendChild(sub);

        const actions = document.createElement('div');
        actions.className = 'wn-annot-import-actions wn-annotator';
        const badge = document.createElement('div');
        badge.className = 'wn-annot-import-badge wn-annotator';
        badge.textContent = String(count);
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'wn-annot-import-remove wn-annotator';
        removeBtn.dataset.importRemove = file.id;
        removeBtn.textContent = 'x';
        actions.appendChild(badge);
        actions.appendChild(removeBtn);

        card.appendChild(meta);
        card.appendChild(actions);
        fileList.appendChild(card);
      });
    }

    reviewerList.innerHTML = '';
    if (!reviewerCounts.size) {
      const empty = document.createElement('div');
      empty.className = 'wn-annot-import-empty wn-annotator';
      empty.textContent = 'No reviewers yet.';
      reviewerList.appendChild(empty);
    } else {
      Array.from(reviewerCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .forEach(([name, count]) => {
          const card = document.createElement('div');
          card.className = 'wn-annot-import-card wn-annotator';

          const meta = document.createElement('div');
          meta.className = 'wn-annot-import-meta wn-annotator';
          const reviewerName = document.createElement('div');
          reviewerName.className = 'wn-annot-import-name wn-annotator';
          reviewerName.textContent = name;
          const reviewerCount = document.createElement('div');
          reviewerCount.className = 'wn-annot-import-sub wn-annotator';
          reviewerCount.textContent = `${count} comments`;
          meta.appendChild(reviewerName);
          meta.appendChild(reviewerCount);

          const badge = document.createElement('div');
          badge.className = 'wn-annot-import-badge wn-annotator';
          badge.textContent = String(count);

          card.appendChild(meta);
          card.appendChild(badge);
          reviewerList.appendChild(card);
        });
    }

    filesCount.textContent = String(state.importFiles.length);
    statReviewersValue.textContent = String(reviewerCounts.size);
    statCommentsValue.textContent = String(totalComments);
  }

  function buildImportSummary() {
    const fileCounts = new Map();
    const reviewerCounts = new Map();
    const imported = state.annotations.filter((ann) => ann.importFileId);
    imported.forEach((ann) => {
      if (ann.importFileId) {
        fileCounts.set(ann.importFileId, (fileCounts.get(ann.importFileId) || 0) + 1);
      }
      const reviewer = (ann.author || '').trim() || 'Unknown reviewer';
      reviewerCounts.set(reviewer, (reviewerCounts.get(reviewer) || 0) + 1);
    });
    return {
      fileCounts,
      reviewerCounts,
      totalComments: imported.length
    };
  }

  async function handleImportFiles(files) {
    if (!files || !files.length) return;
    const existingIds = new Set(state.annotations.map((ann) => ann.id));
    let importedCount = 0;
    for (const file of files) {
      const result = await parseImportFile(file, existingIds);
      if (!result) continue;
      const { fileMeta, annotations } = result;
      if (!annotations.length) continue;
      state.importFiles.push(fileMeta);
      state.annotations.push(...annotations);
      importedCount += annotations.length;
    }
    if (!importedCount) {
      renderImportModal();
      return;
    }
    saveAnnotations();
    saveImportFiles();
    refreshKnownAnnotatorNames();
    clearRenderedAnnotations();
    restoreAnnotations();
    renumberMarkers();
    renderImportModal();
  }

  async function parseImportFile(file, existingIds) {
    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (err) {
      await alertDialog(`Invalid JSON in ${file.name}.`, 'Import error');
      return null;
    }

    const annotations = Array.isArray(parsed) ? parsed : parsed.annotations;
    if (!Array.isArray(annotations)) {
      await alertDialog(`Unsupported JSON format in ${file.name}.`, 'Import error');
      return null;
    }

    const fallbackAuthor = Array.isArray(parsed)
      ? ''
      : parsed.exportedBy || parsed.annotator || parsed.author || '';
    const payloadCreatedAt = Array.isArray(parsed) ? file.lastModified : parsed.createdAt;
    const pageUrl = Array.isArray(parsed) ? '' : parsed.pageUrl || '';
    const fileId = generateImportFileId();

    const normalized = annotations
      .filter((ann) => ann && (ann.type === 'text' || ann.type === 'element'))
      .map((ann) =>
        normalizeImportedAnnotation(ann, {
          fallbackAuthor,
          createdAt: payloadCreatedAt,
          pageUrl,
          fileId,
          existingIds
        })
      );

    return {
      fileMeta: {
        id: fileId,
        name: file.name,
        size: file.size,
        pageUrl,
        importedAt: Date.now()
      },
      annotations: normalized
    };
  }

  function normalizeImportedAnnotation(annotation, options) {
    const ann = annotation && typeof annotation === 'object' ? annotation : {};
    const author = (ann.author || options.fallbackAuthor || '').trim();
    const pageUrl = ann.pageUrl || options.pageUrl || window.location.href;
    const id = ensureUniqueImportId(ann.id, options.existingIds);
    const normalized = {
      ...ann,
      id,
      createdAt: ann.createdAt || options.createdAt || Date.now(),
      priority: ann.priority || 'medium',
      author,
      pageUrl,
      importFileId: options.fileId
    };
    if (!normalized.pageKey) {
      normalized.pageKey = normalizePageKey(pageUrl);
    }
    return normalized;
  }

  function ensureUniqueImportId(id, existingIds) {
    if (id && !existingIds.has(id)) {
      existingIds.add(id);
      return id;
    }
    let next;
    do {
      next = generateId();
    } while (existingIds.has(next));
    existingIds.add(next);
    return next;
  }

  function removeImportedFile(fileId) {
    const nextFiles = state.importFiles.filter((file) => file.id !== fileId);
    if (nextFiles.length === state.importFiles.length) return;
    state.importFiles = nextFiles;
    state.annotations = state.annotations.filter((ann) => ann.importFileId !== fileId);
    saveAnnotations();
    saveImportFiles();
    refreshKnownAnnotatorNames();
    clearRenderedAnnotations();
    restoreAnnotations();
    renumberMarkers();
    renderImportModal();
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(value < 10 && idx > 0 ? 1 : 0)} ${units[idx]}`;
  }

  function truncateText(value, max) {
    if (typeof value !== 'string') return '';
    if (value.length <= max) return value;
    return value.slice(0, max - 3) + '...';
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
    window.addEventListener('resize', positionVisibilityToggle);
    window.addEventListener('scroll', refreshMarkers, { passive: true });
  }

  function getAuthorLabel(value) {
    return value === '__unknown' ? 'Unknown' : value;
  }

  function updateFilterClearButtons() {
    if (!state.panel) return;
    const prioritySelect = state.panel.querySelector('#wn-filter-priority');
    const authorSelect = state.panel.querySelector('#wn-filter-author');
    const priorityClear = state.panel.querySelector('[data-filter-clear="priority"]');
    const authorClear = state.panel.querySelector('[data-filter-clear="author"]');
    if (priorityClear && prioritySelect) {
      priorityClear.style.display = prioritySelect.value === 'all' ? 'none' : 'inline-flex';
    }
    if (authorClear && authorSelect) {
      authorClear.style.display = authorSelect.value === 'all' ? 'none' : 'inline-flex';
    }
  }

  function updateAuthorFilterOptions() {
    if (!state.panel) return;
    const select = state.panel.querySelector('#wn-filter-author');
    if (!select) return;
    const current = state.filters.author || 'all';
    const authors = Array.from(
      new Set(
        state.annotations.map((ann) => {
          const name = (ann.author || '').trim();
          return name || '__unknown';
        })
      )
    ).filter((v) => v);

    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All';
    select.appendChild(allOption);

    authors
      .sort((a, b) => getAuthorLabel(a).localeCompare(getAuthorLabel(b)))
      .forEach((value) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = getAuthorLabel(value);
        select.appendChild(opt);
      });

    const values = ['all', ...authors];
    select.value = values.includes(current) ? current : 'all';
    state.filters.author = select.value;
    updateFilterClearButtons();
  }

  function initFilters() {
    // Install filters (priority + author + search) and re-render on change
    if (!state.panel) return;
    const prioritySelect = state.panel.querySelector('#wn-filter-priority');
    const authorSelect = state.panel.querySelector('#wn-filter-author');
    const searchInput = state.panel.querySelector('#wn-filter-search');
    const priorityClear = state.panel.querySelector('[data-filter-clear="priority"]');
    const authorClear = state.panel.querySelector('[data-filter-clear="author"]');
    if (!prioritySelect || !authorSelect || !searchInput) return;

    prioritySelect.value = state.filters.priority;
    authorSelect.value = state.filters.author;
    searchInput.value = state.filters.query;

    const trigger = () => {
      state.filters.priority = prioritySelect.value;
      state.filters.author = authorSelect.value;
      state.filters.query = searchInput.value.trim().toLowerCase();
      renderList();
      updateFilterClearButtons();
    };

    prioritySelect.addEventListener('change', trigger);
    authorSelect.addEventListener('change', trigger);
    searchInput.addEventListener('input', trigger);
    if (priorityClear) {
      priorityClear.addEventListener('click', () => {
        prioritySelect.value = 'all';
        trigger();
      });
    }
    if (authorClear) {
      authorClear.addEventListener('click', () => {
        authorSelect.value = 'all';
        trigger();
      });
    }

    updateAuthorFilterOptions();
    updateFilterClearButtons();
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

  function ensureToast() {
    if (state.toast) return state.toast;
    const toast = document.createElement('div');
    toast.className = 'wn-annot-toast wn-annotator';
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    state.toast = toast;
    return toast;
  }

  function showToast(message) {
    if (!message) return;
    const toast = ensureToast();
    toast.textContent = message;
    toast.classList.add('show');
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
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

  function loadHiddenState() {
    try {
      const saved = localStorage.getItem(visibilityStorageKey);
      if (saved === null || saved === undefined) return null;
      return saved === 'true';
    } catch (err) {
      return null;
    }
  }

  function saveHiddenState(hidden) {
    try {
      localStorage.setItem(visibilityStorageKey, hidden ? 'true' : 'false');
    } catch (err) {
      // ignore
    }
  }

  function applyColorTheme() {
    if (!document || !document.documentElement) return;
    const root = document.documentElement;
    const palette = state.colors || colorPalette;
    const setVar = (key, val) => {
      if (!val) return;
      root.style.setProperty(key, val);
    };
    const text = palette.text;
    const elem = palette.element;
    setVar('--wn-text-highlight', text.base);
    setVar('--wn-text-highlight-overlay', text.overlay);
    setVar('--wn-text-highlight-soft', text.soft);
    setVar('--wn-element-highlight', elem.base);
    setVar('--wn-element-highlight-soft', elem.soft);
    setVar('--wn-element-highlight-soft-end', elem.softer);
    setVar('--wn-element-highlight-strong', elem.strong);
    setVar('--wn-element-highlight-shadow', elem.shadow);
    setVar('--wn-marker-text', elem.text);
  }

  function buildColorSet(hexColor, opts = {}) {
    const base = normalizeHexColor(hexColor, '#000000');
    const softAlpha = opts.softAlpha ?? 0.12;
    const softerAlpha = opts.softerAlpha ?? 0.04;
    const overlayAlpha = opts.overlayAlpha ?? 0.7;
    return {
      base,
      overlay: rgbaFromHex(base, overlayAlpha, rgbaFromHex('#000000', overlayAlpha)),
      soft: rgbaFromHex(base, softAlpha, rgbaFromHex('#000000', softAlpha)),
      softer: rgbaFromHex(base, softerAlpha, rgbaFromHex('#000000', softerAlpha)),
      strong: rgbaFromHex(base, 0.9, base),
      shadow: rgbaFromHex(base, 0.24, 'rgba(0,0,0,0.24)'),
      pill: rgbaFromHex(base, 0.16, 'rgba(0,0,0,0.16)'),
      pillBorder: rgbaFromHex(base, 0.28, 'rgba(0,0,0,0.28)'),
      text: getReadableTextColor(base)
    };
  }

  function normalizeHexColor(val, fallback) {
    const parsed = parseHexColor(val);
    if (parsed) return parsed;
    return parseHexColor(fallback) || '#000000';
  }

  function parseHexColor(val) {
    if (!val || typeof val !== 'string') return null;
    const v = val.trim();
    const match = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1];
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return `#${full.toLowerCase()}`;
  }

  function hexToRgb(hex) {
    const clean = parseHexColor(hex);
    if (!clean) return null;
    const int = parseInt(clean.slice(1), 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function rgbaFromHex(hex, alpha = 1, fallback = '') {
    const rgb = hexToRgb(hex);
    if (!rgb) return fallback || '';
    const a = typeof alpha === 'number' && alpha >= 0 && alpha <= 1 ? alpha : 1;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  function getReadableTextColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#0b1622';
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    return luminance > 160 ? '#0b1622' : '#ffffff';
  }

  function getAnnotationColors(annotation) {
    const palette = state.colors || colorPalette;
    return annotation && annotation.type === 'text' ? palette.text : palette.element;
  }

  function applyMarkerPalette(marker, palette) {
    if (!marker || !palette) return;
    marker.style.setProperty('--wn-marker-bg', palette.base);
    marker.style.setProperty('--wn-marker-text', palette.text);
    marker.style.setProperty('--wn-marker-shadow', palette.shadow);
  }

  function applyItemAccent(item, palette) {
    if (!item || !palette) return;
    item.style.setProperty('--wn-item-accent', palette.base);
    item.style.setProperty('--wn-item-accent-strong', palette.strong);
    item.style.setProperty('--wn-item-accent-shadow', palette.shadow);
    item.style.setProperty('--wn-item-accent-soft', palette.soft);
    item.style.setProperty('--wn-item-accent-soft-end', palette.softer);
    item.style.setProperty('--wn-item-number-bg', palette.pill);
    item.style.setProperty('--wn-item-number-border', palette.pillBorder);
    item.style.setProperty('--wn-item-number-text', '#000000');
  }

  function parseBoolAttr(val, fallback = false) {
    if (val === undefined || val === null || val === '') return fallback;
    const v = String(val).toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
    return fallback;
  }

  function loadAnnotatorName() {
    try {
      return localStorage.getItem(annotatorNameStorageKey) || '';
    } catch (err) {
      return '';
    }
  }

  function saveAnnotatorName(name) {
    try {
      localStorage.setItem(annotatorNameStorageKey, name);
    } catch (err) {
      // ignore storage errors
    }
  }

  function loadAnnotatorNames() {
    try {
      const stored = localStorage.getItem(annotatorNamesStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        return parsed.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim());
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  function saveAnnotatorNames(names) {
    try {
      localStorage.setItem(annotatorNamesStorageKey, JSON.stringify(names || []));
    } catch (err) {
      // ignore storage errors
    }
  }

  function loadImportFiles() {
    try {
      const stored = localStorage.getItem(importFilesStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((file) => file && typeof file === 'object')
        .map((file) => ({
          id: file.id || generateImportFileId(),
          name: String(file.name || 'Imported file'),
          size: Number(file.size || 0),
          pageUrl: typeof file.pageUrl === 'string' ? file.pageUrl : '',
          importedAt: Number(file.importedAt || 0)
        }));
    } catch (err) {
      return [];
    }
  }

  function saveImportFiles() {
    try {
      localStorage.setItem(importFilesStorageKey, JSON.stringify(state.importFiles || []));
    } catch (err) {
      // ignore storage errors
    }
  }

  function recordAnnotatorName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    state.annotatorName = trimmed;
    const next = [trimmed, ...state.annotatorNames.filter((n) => n !== trimmed)];
    state.annotatorNames = next;
    saveAnnotatorName(trimmed);
    saveAnnotatorNames(next);
  }

  function refreshKnownAnnotatorNames() {
    const existing = Array.from(
      new Set(
        (state.annotations || [])
          .map((a) => (a.author || '').trim())
          .filter(Boolean)
      )
    );
    const merged = Array.from(new Set([...(state.annotatorNames || []), ...existing]));
    state.annotatorNames = merged;
    if (!state.annotatorName) {
      state.annotatorName = loadAnnotatorName() || merged[0] || '';
    }
  }

  function applyAnnotatorNameToAnnotations(name, options = {}) {
    if (!name) return false;
    const force = options.force || false;
    let changed = false;
    state.annotations.forEach((ann) => {
      if (!force && ann.author) return;
      if (ann.author !== name) changed = true;
      ann.author = name;
    });
    if (changed) saveAnnotations();
    return changed;
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
      state.annotations = (parsed || []).filter((ann) => ann.type === 'text' || ann.type === 'element');
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

  async function onToolbarClick(evt) {
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
      openExportModal();
      return;
    }
    if (action === 'import') {
      openImportModal();
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
    saveHiddenState(hidden);
    document.body.classList.toggle('wn-annot-hidden', hidden);
    if (hidden) {
      setMode(null);
      hideTip();
      hideOutline();
    }
    syncVisibilityButton();
    updateDimmer();
    positionVisibilityToggle();
    applyPageOffset();
    if (!hidden) {
      refreshMarkers();
      positionPanel();
      positionTip();
      // BMC widget intentionally left independent of visibility toggle
    }
    document.dispatchEvent(new CustomEvent('uxnote:visibility', { detail: { hidden } }));
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
    mountVisibilityToggle();
    const inset = 18;
    if (isMobileLayout()) {
      if (state.hidden) {
        btn.style.bottom = `${inset}px`;
        btn.style.left = `${inset}px`;
        btn.style.top = '';
        btn.style.right = '';
      } else {
        btn.style.top = '';
        btn.style.right = '';
        btn.style.bottom = '';
        btn.style.left = '';
      }
      return;
    }
    btn.style.left = '';
    btn.style.right = '';
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

    if (isMobileLayout()) {
      p.style.width = '100vw';
      p.style.maxHeight = '100vh';
      p.style.height = '100vh';
      p.style.left = '0';
      p.style.right = '0';
      p.style.top = '0';
      p.style.bottom = '0';
      p.style.borderRadius = '0';
      return;
    }

    p.style.width = `min(360px, calc(100vw - ${inset * 2}px))`;
    p.style.maxHeight = `calc(100vh - ${inset * 2}px)`;
    p.style.left = 'auto';
    p.style.right = `${inset}px`;
    p.style.top = `${inset}px`;
    p.style.bottom = `${inset}px`;
    p.style.height = '';
    p.style.borderRadius = '';

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
    btn.innerHTML = position === 'top' ? iconToolbarTop() : iconToolbarBottom();
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
    if (!range) return;
    const isAllowed =
      isAnnotatableTarget(range.commonAncestorContainer) &&
      isAnnotatableTarget(range.startContainer) &&
      isAnnotatableTarget(range.endContainer);
    if (!isAllowed) {
      selection.removeAllRanges();
      showToast('Cette zone est une popup/overlay, annotation bloquée.');
      return;
    }
    const snippet = selection.toString().trim();
    if (!snippet) return;
    const res = await awaitComment('Comment for this highlight?');
    if (!res) return;
    const { comment, priority, author } = res;
    const id = generateId();
    const payload = serializeRange(range, snippet);
    const span = applyTextHighlight(range, id);
    selection.removeAllRanges();
    const annotation = {
      id,
      type: 'text',
      target: payload,
      comment: comment.trim(),
      author: author || state.annotatorName || '',
      priority: priority || 'medium',
      snippet: snippet.slice(0, 180),
      pageUrl: window.location.href,
      pageKey: normalizePageKey(window.location.href),
      createdAt: Date.now(),
      status: 'active'
    };
    state.annotations.push(annotation);
    saveAnnotations();
    addMarkerForAnnotation(annotation, span);
    renderList();
    setMode(null, { keepOutline: true });
  }

  function handleElementHover(evt) {
    if (state.mode !== 'element') return;
    const el = evt.target;
    if (!el || !isAnnotatableTarget(el)) {
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
    if (!el || !isAnnotatableTarget(el)) {
      showToast('Cette zone est une popup/overlay, annotation bloquée.');
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();
    const res = await awaitComment('Comment for this element?');
    if (!res) return;
    const { comment, priority, author } = res;
    const id = generateId();
    const targetXPath = getXPath(el);
    const targetCss = buildCssSelector(el);
    const rect = el.getBoundingClientRect();
    const annotation = {
      id,
      type: 'element',
      target: { xpath: targetXPath, css: targetCss, tag: el.tagName.toLowerCase() },
      comment: comment.trim(),
      author: author || state.annotatorName || '',
      priority: priority || 'medium',
      snippet: el.innerText ? el.innerText.trim().slice(0, 120) : el.tagName,
      pageUrl: window.location.href,
      pageKey: normalizePageKey(window.location.href),
      rect: { x: rect.x + window.scrollX, y: rect.y + window.scrollY, w: rect.width, h: rect.height },
      createdAt: Date.now(),
      status: 'active'
    };
    state.annotations.push(annotation);
    saveAnnotations();
    addMarkerForAnnotation(annotation, el);
    applyElementHighlight(el, id);
    renderList();
    setMode(null, { keepOutline: true });
  }

  function unwrapHighlightSpan(span) {
    const parent = span && span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  }

  function getHighlightSpans(id) {
    const entry = state.highlightSpans[id];
    if (!entry) {
      return Array.from(document.querySelectorAll(`.uxnote-textmark[data-uxnote-id="${id}"]`));
    }
    return Array.isArray(entry) ? entry : [entry];
  }

  function clearRenderedAnnotations() {
    // Clean highlights/rectangles/markers on page before reload
    Object.keys(state.highlightSpans || {}).forEach((id) => {
      getHighlightSpans(id).forEach((span) => {
        if (span && span.parentNode) {
          unwrapHighlightSpan(span);
        }
      });
    });
    state.highlightSpans = {};
    Array.from(document.querySelectorAll('.uxnote-textmark[data-uxnote-id], .wn-annot-highlight[data-wn-annot-id]')).forEach((span) => {
      if (span && span.parentNode) {
        unwrapHighlightSpan(span);
      }
    });
    Object.values(state.markers || {}).forEach((entry) => {
      if (entry && entry.el && entry.el.parentNode) {
        entry.el.parentNode.removeChild(entry.el);
      }
    });
    if (state.markerLayer) {
      state.markerLayer.innerHTML = '';
    }
    state.markers = {};
    Object.keys(state.elementTargets || {}).forEach((id) => {
      removeElementHighlight(id);
    });
    state.elementTargets = {};
    Array.from(document.querySelectorAll('.uxnote-annotated[data-uxnote-ids]')).forEach((el) => {
      delete el.dataset.uxnoteIds;
      el.classList.remove('uxnote-annotated');
    });
  }

  function removeRenderedAnnotation(id) {
    const markerEntry = state.markers[id];
    if (markerEntry && markerEntry.el && markerEntry.el.parentNode) {
      markerEntry.el.parentNode.removeChild(markerEntry.el);
    }
    delete state.markers[id];
    removeElementHighlight(id);

    let highlightSpans = getHighlightSpans(id);
    if (!highlightSpans.length) {
      highlightSpans = Array.from(document.querySelectorAll(`.uxnote-textmark[data-uxnote-id="${id}"]`));
      if (!highlightSpans.length) {
        highlightSpans = Array.from(document.querySelectorAll(`.wn-annot-highlight[data-wn-annot-id="${id}"]`));
      }
    }
    highlightSpans.forEach((span) => {
      if (span) unwrapHighlightSpan(span);
    });
    delete state.highlightSpans[id];
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

  function isAnnotatableTarget(node) {
    if (!node) return false;
    const el =
      node.nodeType === Node.ELEMENT_NODE
        ? node
        : node.nodeType === Node.DOCUMENT_NODE
        ? document.body
        : node.parentElement;
    if (!el) return false;
    if (isWithinAnnotator(el)) return false;
    if (el.closest) {
      if (el.closest('[data-uxnote-ignore]')) return false;
      if (el.closest('[data-uxnote-allow]')) return true;
      const blocked = el.closest(
        '#uxnote-root, .wn-annotator, dialog, [popover], [role="dialog"], [role="menu"], [role="tooltip"], [aria-modal="true"]'
      );
      if (blocked) return false;
    }
    return true;
  }

  function serializeRange(range, quote) {
    return {
      startXPath: getXPath(range.startContainer),
      startOffset: range.startOffset,
      endXPath: getXPath(range.endContainer),
      endOffset: range.endOffset,
      quote: quote ? String(quote).slice(0, 200) : ''
    };
  }

  function applyTextHighlight(range, id) {
    let spans = [];
    const workingRange = range.cloneRange();
    const textNodes = getTextNodesInRange(workingRange);
    textNodes.forEach((node) => {
      const span = wrapTextNodePortion(
        node,
        {
          start: node === workingRange.startContainer ? workingRange.startOffset : 0,
          end: node === workingRange.endContainer ? workingRange.endOffset : node.length
        },
        id
      );
      if (span) spans.push(span);
    });
    // Fallback: if no spans were created, wrap the whole range in one span
    if (!spans.length) {
      const span = document.createElement('span');
      span.className = 'uxnote-textmark';
      span.dataset.uxnoteId = id;
      span.addEventListener('click', (evt) => {
        evt.stopPropagation();
        focusAnnotation(id);
      });
      const contents = workingRange.extractContents();
      span.appendChild(contents);
      workingRange.insertNode(span);
      spans = [span];
    }
    state.highlightSpans[id] = spans;
    return spans[0];
  }

  function wrapRange(range, id) {
    return applyTextHighlight(range, id);
  }

  function rangeIntersectsNode(range, node) {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    return (
      range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0
    );
  }

  function getTextNodesInRange(range) {
    const nodes = [];
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      try {
        if (range.intersectsNode) {
          if (!range.intersectsNode(node)) continue;
        } else if (!rangeIntersectsNode(range, node)) {
          continue;
        }
      } catch (err) {
        if (!rangeIntersectsNode(range, node)) continue;
      }
      nodes.push(node);
    }
    return nodes;
  }

  function wrapTextNodePortion(node, offsets, id) {
    if (!node || !node.parentNode) return null;
    const { start, end } = offsets;
    let textNode = node;
    let localEnd = end;
    if (start > 0) {
      textNode = textNode.splitText(start);
      localEnd = end - start;
    }
    if (localEnd < textNode.length) {
      textNode.splitText(localEnd);
    }
    if (!textNode.parentNode) return null;
    const span = document.createElement('span');
    span.className = 'uxnote-textmark';
    span.dataset.uxnoteId = id;
    span.addEventListener('click', (evt) => {
      evt.stopPropagation();
      focusAnnotation(id);
    });
    textNode.parentNode.insertBefore(span, textNode);
    span.appendChild(textNode);
    return span;
  }

  function isNodeConnected(node) {
    if (!node) return false;
    if (typeof node.isConnected === 'boolean') return node.isConnected;
    return document.body && document.body.contains(node);
  }

  function intersectRect(a, b) {
    if (!a || !b) return null;
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return null;
    return { x: left, y: top, width, height };
  }

  function getVisibleRect(el) {
    if (!el || !isNodeConnected(el) || !el.getBoundingClientRect) return null;
    let rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    let node = el;
    while (node && node.nodeType === 1) {
      if (node.tagName === 'DETAILS' && !node.open) {
        const summary = node.querySelector('summary');
        if (summary && !summary.contains(el)) return null;
      }
      if (node.hasAttribute && node.hasAttribute('hidden')) return null;
      const ariaHidden = node.getAttribute && node.getAttribute('aria-hidden');
      if (ariaHidden === 'true') return null;
      const style = window.getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.opacity === '0'
      ) {
        return null;
      }
      const overflowX = style.overflowX || style.overflow;
      const overflowY = style.overflowY || style.overflow;
      const clipX = overflowX && overflowX !== 'visible';
      const clipY = overflowY && overflowY !== 'visible';
      if (clipX || clipY) {
        const clipRect = node.getBoundingClientRect();
        const next = intersectRect(rect, clipRect);
        if (!next) return null;
        rect = next;
      }
      node = node.parentElement;
    }
    return rect;
  }

  function getStackingContextAncestor(el) {
    let node = el && el.nodeType === 1 ? el : null;
    while (node && node.nodeType === 1 && node !== document.body) {
      const style = window.getComputedStyle(node);
      const z = style.zIndex;
      const hasPosition = style.position !== 'static';
      const createsStacking =
        (hasPosition && z !== 'auto') ||
        style.opacity !== '1' ||
        style.transform !== 'none' ||
        style.filter !== 'none' ||
        style.perspective !== 'none' ||
        style.mixBlendMode !== 'normal' ||
        style.isolation === 'isolate' ||
        (style.willChange && style.willChange !== 'auto') ||
        (style.contain && style.contain !== 'none');
      if (createsStacking) return node;
      node = node.parentElement;
    }
    return document.body;
  }

  function getMarkerHost(anchor) {
    if (!anchor || anchor.nodeType !== 1) return state.markerLayer || document.body;
    const offsetParent = anchor.offsetParent;
    if (offsetParent && offsetParent.nodeType === 1) return offsetParent;
    return getStackingContextAncestor(anchor) || state.markerLayer || document.body;
  }

  function isGlobalMarkerHost(host) {
    return host === document.body || host === state.markerLayer || host === document.documentElement;
  }

  function openContainersForTarget(targetEl) {
    if (!targetEl || targetEl.nodeType !== 1) return false;
    let opened = false;
    let node = targetEl;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.tagName === 'DETAILS' && !node.open) {
        node.open = true;
        opened = true;
      }
      if (node.tagName === 'DIALOG' && !node.open) {
        try {
          if (typeof node.showModal === 'function') {
            node.showModal();
          } else if (typeof node.show === 'function') {
            node.show();
          }
          opened = true;
        } catch (err) {
          // ignore
        }
      }
      if (node.hasAttribute && node.hasAttribute('popover')) {
        try {
          if (typeof node.showPopover === 'function') {
            node.showPopover();
            opened = true;
          }
        } catch (err) {
          // ignore
        }
      }
      if (node.hasAttribute && node.hasAttribute('data-uxnote-open')) {
        const selector = node.getAttribute('data-uxnote-open');
        if (selector) {
          const trigger = document.querySelector(selector);
          if (trigger && typeof trigger.click === 'function') {
            trigger.click();
            opened = true;
          }
        }
      }
      const ariaHidden = node.getAttribute && node.getAttribute('aria-hidden');
      if ((node.hasAttribute && node.hasAttribute('hidden')) || ariaHidden === 'true') {
        const id = node.id;
        if (id) {
          const control = document.querySelector(`[aria-controls="${escapeCssIdent(id)}"]`);
          if (control && typeof control.click === 'function') {
            control.click();
            opened = true;
          }
        }
      }
      node = node.parentElement;
    }
    return opened;
  }

  function applyElementHighlight(el, id) {
    if (!el || el.nodeType !== 1) return false;
    const current = el.dataset.uxnoteIds ? el.dataset.uxnoteIds.split(',').filter(Boolean) : [];
    const next = new Set(current);
    next.add(id);
    el.dataset.uxnoteIds = Array.from(next).join(',');
    el.classList.add('uxnote-annotated');
    state.elementTargets[id] = el;
    return true;
  }

  function removeElementHighlight(id) {
    const el = state.elementTargets[id];
    if (!el || el.nodeType !== 1) {
      delete state.elementTargets[id];
      const candidates = Array.from(document.querySelectorAll('[data-uxnote-ids]'));
      candidates.forEach((candidate) => {
        const current = candidate.dataset.uxnoteIds ? candidate.dataset.uxnoteIds.split(',').filter(Boolean) : [];
        if (!current.includes(id)) return;
        const next = current.filter((value) => value !== id);
        if (next.length) {
          candidate.dataset.uxnoteIds = next.join(',');
        } else {
          delete candidate.dataset.uxnoteIds;
          candidate.classList.remove('uxnote-annotated');
        }
      });
      return;
    }
    const current = el.dataset.uxnoteIds ? el.dataset.uxnoteIds.split(',').filter(Boolean) : [];
    const next = current.filter((value) => value !== id);
    if (next.length) {
      el.dataset.uxnoteIds = next.join(',');
    } else {
      delete el.dataset.uxnoteIds;
      el.classList.remove('uxnote-annotated');
    }
    delete state.elementTargets[id];
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

  function escapeCssIdent(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function buildCssSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `#${escapeCssIdent(el.id)}`;
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      const classes = Array.from(node.classList || []).filter(
        (name) => name && !name.startsWith('wn-') && !name.startsWith('uxnote-')
      );
      if (classes.length) {
        part += `.${classes.slice(0, 2).map(escapeCssIdent).join('.')}`;
      }
      parts.unshift(part);
      if (node.parentElement && node.parentElement.id) {
        parts.unshift(`#${escapeCssIdent(node.parentElement.id)}`);
        break;
      }
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(' > ');
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
    const resolved = resolveTarget(annotation);
    if (!resolved) {
      annotation.status = 'missing';
      startMissingObserver();
      return;
    }
    annotation.status = 'active';
    renderResolvedAnnotation(annotation, resolved);
  }

  function renderResolvedAnnotation(annotation, resolved) {
    if (!resolved) return;
    if (resolved.type === 'text' && resolved.range) {
      const span = applyTextHighlight(resolved.range, annotation.id);
      addMarkerForAnnotation(annotation, span);
      return;
    }
    if (resolved.type === 'element' && resolved.el) {
      applyElementHighlight(resolved.el, annotation.id);
      addMarkerForAnnotation(annotation, resolved.el);
    }
  }

  function deserializeRange(payload) {
    if (!payload) return null;
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

  function resolveTarget(annotation) {
    if (!annotation || !annotation.target) return null;
    if (annotation.type === 'text') {
      return resolveTextTarget(annotation);
    }
    if (annotation.type === 'element') {
      return resolveElementTarget(annotation);
    }
    return null;
  }

  function resolveTextTarget(annotation) {
    const payload = annotation.target || {};
    const range = deserializeRange(payload);
    if (range) return { type: 'text', range };
    const quote = payload.quote || annotation.snippet || '';
    if (!quote) return null;
    const fallback = findRangeByQuote(quote);
    if (!fallback) return null;
    return { type: 'text', range: fallback };
  }

  function findRangeByQuote(quote) {
    const text = String(quote || '').trim();
    if (!text || text.length < 4) return null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      if (!isAnnotatableTarget(node)) continue;
      const idx = node.nodeValue.indexOf(text);
      if (idx === -1) continue;
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      return range;
    }
    return null;
  }

  function resolveElementTarget(annotation) {
    const target = annotation.target || {};
    if (target.xpath) {
      const node = findNodeByXPath(target.xpath);
      if (node && node.nodeType === 1) return { type: 'element', el: node };
    }
    if (target.css) {
      try {
        const node = document.querySelector(target.css);
        if (node && node.nodeType === 1) return { type: 'element', el: node };
      } catch (err) {
        // ignore invalid selector
      }
    }
    const tag = target.tag;
    const snippet = (annotation.snippet || '').trim();
    if (tag && snippet) {
      const nodes = document.querySelectorAll(tag);
      for (const node of nodes) {
        if (!node || node.nodeType !== 1) continue;
        if ((node.textContent || '').includes(snippet)) {
          return { type: 'element', el: node };
        }
      }
    }
    return null;
  }

  function scheduleMissingRetry() {
    if (state.missingRetryTimer) {
      clearTimeout(state.missingRetryTimer);
    }
    state.missingRetryTimer = setTimeout(() => {
      retryResolveMissingAnnotations();
    }, 300);
  }

  function startMissingObserver() {
    if (state.missingObserver || !window.MutationObserver) return;
    state.missingObserver = new MutationObserver(() => {
      if (!state.annotations.some((ann) => ann.status === 'missing')) return;
      scheduleMissingRetry();
    });
    state.missingObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopMissingObserver() {
    if (!state.missingObserver) return;
    state.missingObserver.disconnect();
    state.missingObserver = null;
  }

  function retryResolveMissingAnnotations() {
    let changed = false;
    state.annotations.forEach((ann) => {
      if (ann.status !== 'missing') return;
      if (ann.pageKey !== normalizePageKey(window.location.href)) return;
      const resolved = resolveTarget(ann);
      if (!resolved) return;
      ann.status = 'active';
      renderResolvedAnnotation(ann, resolved);
      changed = true;
    });
    if (changed) {
      saveAnnotations();
      renderList();
      refreshMarkers();
    }
    if (!state.annotations.some((ann) => ann.status === 'missing')) {
      stopMissingObserver();
    }
  }

  function reconcileTextAnnotations() {
    let changed = false;
    state.annotations.forEach((ann) => {
      if (ann.type !== 'text') return;
      if (ann.pageKey !== normalizePageKey(window.location.href)) return;
      const spans = getHighlightSpans(ann.id).filter(isNodeConnected);
      if (spans.length) {
        state.highlightSpans[ann.id] = spans;
        if (ann.status === 'missing') {
          ann.status = 'active';
          changed = true;
        }
        return;
      }
      const resolved = resolveTarget(ann);
      if (resolved && resolved.range) {
        applyTextHighlight(resolved.range, ann.id);
        ann.status = 'active';
        changed = true;
        return;
      }
      if (ann.status !== 'missing') {
        ann.status = 'missing';
        changed = true;
      }
    });
    if (changed) {
      saveAnnotations();
      renderList();
      refreshMarkers();
    }
  }

  function scheduleLayoutRefresh() {
    if (state.layoutTimer) clearTimeout(state.layoutTimer);
    state.layoutTimer = setTimeout(() => {
      refreshMarkers();
      reconcileTextAnnotations();
      if (state.annotations.some((ann) => ann.status === 'missing')) {
        retryResolveMissingAnnotations();
      }
    }, 120);
  }

  function startLayoutObserver() {
    if (state.layoutObserver || !window.MutationObserver) return;
    state.layoutObserver = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        const target = mutation.target;
        if (!target) return false;
        if (target.classList && target.classList.contains('wn-annotator')) return false;
        if (target.closest && target.closest('.wn-annotator')) return false;
        return true;
      });
      if (!relevant) return;
      scheduleLayoutRefresh();
    });
    state.layoutObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'open', 'hidden', 'aria-hidden']
    });
  }

  function addMarkerForAnnotation(annotation, targetNode) {
    if (annotation.pageKey !== normalizePageKey(window.location.href)) return;
    if (!state.markerLayer) return;
    const existingMarker = state.markers[annotation.id];
    if (existingMarker && existingMarker.el && existingMarker.el.parentNode) {
      existingMarker.el.parentNode.removeChild(existingMarker.el);
    }
    const marker = document.createElement('div');
    marker.className = 'wn-annot-marker wn-annotator';
    marker.textContent = state.annotations.findIndex((a) => a.id === annotation.id) + 1;
    marker.dataset.wnAnnotId = annotation.id;
    const palette = getAnnotationColors(annotation);
    applyMarkerPalette(marker, palette);
    marker.addEventListener('click', () => focusAnnotation(annotation.id));
    const rect = getViewportRect(annotation, targetNode);
    const host = getMarkerHost(rect && rect.anchor ? rect.anchor : targetNode);
    if (marker.parentNode !== host) {
      host.appendChild(marker);
    }
    marker.style.zIndex = isGlobalMarkerHost(host) ? '' : '9999';
    if (!rect) {
      marker.style.display = 'none';
      state.markers[annotation.id] = { el: marker, rect: null };
      return;
    }
    marker.style.display = '';
    positionMarker(marker, rect, annotation);
    state.markers[annotation.id] = { el: marker, rect };
  }

  function getViewportRect(annotation, targetNode) {
    if (annotation.type === 'text') {
      const spans = targetNode ? [targetNode] : getHighlightSpans(annotation.id);
      const span = spans[0] || document.querySelector(`.uxnote-textmark[data-uxnote-id="${annotation.id}"]`);
      if (!span) return null;
      const r = getVisibleRect(span);
      if (!r) return null;
      return { x: r.x, y: r.y, w: r.width, h: r.height, anchor: span };
    }
    if (annotation.type === 'element') {
      const el =
        (targetNode && targetNode.nodeType === 1 ? targetNode : null) ||
        state.elementTargets[annotation.id] ||
        (annotation.target?.xpath ? findNodeByXPath(annotation.target.xpath) : null);
      if (!el) return null;
      const r = getVisibleRect(el);
      if (!r) return null;
      return { x: r.x, y: r.y, w: r.width, h: r.height, anchor: el };
    }
    return null;
  }

  function positionMarker(marker, rect, annotation) {
    const offset = getMarkerOffset(annotation);
    const offsetParent = marker.offsetParent || document.body;
    const parentRect = offsetParent.getBoundingClientRect();
    const parentDocX = parentRect.x + window.scrollX;
    const parentDocY = parentRect.y + window.scrollY;
    const targetDocX = rect.x + window.scrollX;
    const targetDocY = rect.y + window.scrollY;
    marker.style.left = `${targetDocX - parentDocX + rect.w + offset.x + 4}px`;
    marker.style.top = `${targetDocY - parentDocY + offset.y - 4}px`;
  }

  function getMarkerOffset(annotation) {
    if (annotation.type !== 'element') return { x: 0, y: 0 };
    const target = annotation.target && annotation.target.xpath;
    if (!target) return { x: 0, y: 0 };
    const group = state.annotations.filter(
      (ann) =>
        ann.type === 'element' &&
        ann.pageKey === annotation.pageKey &&
        ann.target &&
        ann.target.xpath === target
    );
    if (group.length <= 1) return { x: 0, y: 0 };
    const index = group.findIndex((ann) => ann.id === annotation.id);
    if (index <= 0) return { x: 0, y: 0 };
    const gap = 24;
    return { x: -index * gap, y: 0 };
  }


  function refreshMarkers() {
    Object.entries(state.markers).forEach(([id, entry]) => {
      const ann = state.annotations.find((a) => a.id === id);
      if (!ann) return;
      if (ann.status === 'missing') {
        entry.el.style.display = 'none';
        entry.rect = null;
        return;
      }
      const rect = getViewportRect(ann);
      if (!rect) {
        entry.el.style.display = 'none';
        entry.rect = null;
        return;
      }
      entry.el.style.display = '';
      entry.rect = rect;
      const host = getMarkerHost(rect.anchor);
      if (entry.el.parentNode !== host) {
        host.appendChild(entry.el);
      }
      entry.el.style.zIndex = isGlobalMarkerHost(host) ? '' : '9999';
      positionMarker(entry.el, rect, ann);
      applyMarkerPalette(entry.el, getAnnotationColors(ann));
    });
  }

  function ensurePanelVisible() {
    if (!state.panel) return;
    const isHidden = state.panel.style.display === 'none';
    if (isHidden) {
      state.panel.style.display = '';
      updateToggleActive();
    }
  }

  function focusListItem(id) {
    if (!state.panel) return;
    ensurePanelVisible();
    const list = state.panel.querySelector('.wn-annot-list');
    if (!list) return;
    const items = list.querySelectorAll('.wn-annot-item');
    items.forEach((el) => el.classList.remove('is-focused'));
    const target = list.querySelector(`.wn-annot-item[data-id="${id}"]`);
    if (!target) return;
    target.classList.add('is-focused');
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Scroll/flash the target when selecting from the list or marker
  function focusAnnotation(id, allowNavigate = false, targetUrl, targetPageKey) {
    const ann = state.annotations.find((a) => a.id === id);
    if (!ann) return;
    focusListItem(id);
    if (ann.status === 'missing') {
      const resolved = resolveTarget(ann);
      if (resolved) {
        ann.status = 'active';
        renderResolvedAnnotation(ann, resolved);
        renderList();
      } else {
        showToast('Annotation introuvable sur cette page.');
        return;
      }
    }
    const resolved = resolveTarget(ann);
    if (resolved) {
      const targetEl =
        resolved.type === 'element'
          ? resolved.el
          : resolved.range && resolved.range.commonAncestorContainer
          ? resolved.range.commonAncestorContainer.parentElement
          : null;
      if (targetEl && openContainersForTarget(targetEl)) {
        setTimeout(() => {
          refreshMarkers();
        }, 160);
      }
    }
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
      const spans =
        getHighlightSpans(id) ||
        Array.from(document.querySelectorAll(`.uxnote-textmark[data-uxnote-id="${id}"]`));
      const span = spans[0];
      if (span) {
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(span, getAnnotationColors(ann).base);
      }
    } else if (ann.type === 'element') {
      const el = resolved && resolved.el ? resolved.el : ann.target?.xpath ? findNodeByXPath(ann.target.xpath) : null;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(el, getAnnotationColors(ann).base);
      }
    }
  }

  function flash(el, accentColor) {
    el.style.transition = 'box-shadow 0.2s ease';
    const prev = el.style.boxShadow;
    const accent = accentColor || (state.colors?.element?.base || '#4e9cf6');
    const flashColor = rgbaFromHex(accent, 0.6, 'rgba(78,156,246,0.6)');
    el.style.boxShadow = `0 0 0 3px ${flashColor}`;
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
      link.href = 'https://uxnote.ninefortyone.studio';
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
      updateAuthorFilterOptions();
      if (!state.annotations.length) {
        const empty = document.createElement('div');
        empty.className = 'wn-annot-empty';
      empty.textContent = 'No annotations yet.';
      list.appendChild(empty);
      if (title) title.textContent = 'Annotations (0)';
      const footer = ensureFooter();
      return;
    }
    const filtered = state.annotations
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .filter((ann) => {
    const prioOk = state.filters.priority === 'all' || (ann.priority || 'medium') === state.filters.priority;
        const q = state.filters.query;
        const haystack = `${ann.comment || ''} ${ann.snippet || ''} ${ann.author || ''}`.toLowerCase();
        const searchOk = !q || haystack.includes(q);
        const authorFilter = state.filters.author || 'all';
        const authorValue = (ann.author || '').trim() || '__unknown';
        const authorOk = authorFilter === 'all' || authorValue === authorFilter;
    return prioOk && searchOk && authorOk;
  });
    if (title) title.textContent = `Annotations (${filtered.length})`;
    filtered.forEach((ann, idx) => {
      const item = document.createElement('div');
      item.className = 'wn-annot-item';
      item.dataset.id = ann.id;
      applyItemAccent(item, getAnnotationColors(ann));

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
      if (ann.status === 'missing') {
        const missing = document.createElement('div');
        missing.className = 'wn-annot-missing';
        missing.textContent = 'Missing';
        topLeft.appendChild(missing);
      }
      const metaWrap = document.createElement('div');
      metaWrap.className = 'wn-annot-meta-bottom';
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
      const commentText = ann.comment || '—';
      comment.textContent = commentText;

      const meta = document.createElement('div');
      meta.className = 'wn-annot-meta';
      const authorName = (ann.author || '').trim();
      const authorLabel = (authorName || 'Unknown reviewer').toUpperCase();
      const createdAt = new Date(ann.createdAt);
      const createdAtDate = createdAt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const createdAtTime = createdAt.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
      meta.textContent = `${authorLabel} • ${createdAtDate} • ${createdAtTime}`;
      metaWrap.appendChild(meta);

      const showMore = document.createElement('button');
      showMore.type = 'button';
      showMore.className = 'wn-annot-showmore wn-annotator';
      showMore.textContent = 'See more';
      showMore.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const expanded = comment.classList.toggle('expanded');
        showMore.textContent = expanded ? 'See less' : 'See more';
      });
      if (commentText.length < 160) {
        showMore.style.display = 'none';
      }

      item.appendChild(top);
      item.appendChild(comment);
      item.appendChild(showMore);
      item.appendChild(metaWrap);
      item.addEventListener('click', () => {
        focusAnnotation(ann.id, true, ann.pageUrl, ann.pageKey);
        if (isMobileLayout() && state.panel) {
          state.panel.style.display = 'none';
          updateToggleActive();
        }
      });
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
    refreshMarkers();
  }

  async function editAnnotation(id) {
    const ann = state.annotations.find((a) => a.id === id);
    if (!ann) return;
    const res = await askForComment('Edit this annotation', ann.comment || '', ann.priority || 'medium', ann.author || state.annotatorName || '');
    if (!res) return;
    const { comment, priority, author } = res;
    ann.comment = comment.trim();
    ann.priority = priority || 'medium';
    ann.author = author || ann.author || state.annotatorName || '';
    recordAnnotatorName(ann.author);
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

  function exportAnnotationsFiltered(filters) {
    const reviewers = new Set((filters && filters.reviewers) || []);
    const priorities = new Set((filters && filters.priorities) || []);
    const filtered = state.annotations.filter((ann) => {
      const reviewerValue = (ann.author || '').trim() || '__unknown';
      const priorityValue = ann.priority || 'medium';
      const reviewerOk = !reviewers.size || reviewers.has(reviewerValue);
      const priorityOk = !priorities.size || priorities.has(priorityValue);
      return reviewerOk && priorityOk;
    });
    const payload = buildAnnotationsPayload(filtered);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename();
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildAnnotationsPayload(annotations = state.annotations) {
    return {
      pageUrl: window.location.href,
      createdAt: Date.now(),
      annotations
    };
  }

  function emailAnnotationsFiltered(filters) {
    const reviewers = new Set((filters && filters.reviewers) || []);
    const priorities = new Set((filters && filters.priorities) || []);
    const filtered = state.annotations.filter((ann) => {
      const reviewerValue = (ann.author || '').trim() || '__unknown';
      const priorityValue = ann.priority || 'medium';
      const reviewerOk = !reviewers.size || reviewers.has(reviewerValue);
      const priorityOk = !priorities.size || priorities.has(priorityValue);
      return reviewerOk && priorityOk;
    });
    sendAnnotationsByMail(filtered);
  }

  async function emailAnnotations() {
    sendAnnotationsByMail(state.annotations);
  }

  function sendAnnotationsByMail(annotations) {
    const payload = buildAnnotationsPayload(annotations);
    const data = JSON.stringify(payload, null, 2);
    const subject = encodeURIComponent(buildFilename());
    const body = encodeURIComponent(data);
    const to = (mailToDefault || '').trim();
    const toPart = to ? encodeURIComponent(to) : '';
    const sep = toPart ? '?' : '?';
    window.location.href = `mailto:${toPart}${sep}subject=${subject}&body=${body}`;
  }

  function generateId() {
    return 'wn-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  }

  function generateImportFileId() {
    return 'imp-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
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

  // Icons: inline Tabler icons (MIT) for UI and inline Uxnote logo.
  const iconSvg = (paths) => `
    <svg class="wn-annot-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      ${paths}
    </svg>
  `;
  function iconWordmark() {
    return `
      <svg class="wn-annot-logo-img" viewBox="0 0 69 20" role="img" aria-label="Uxnote logo">
        <path d="M15.5141351,15.6336045 C15.0749867,15.7571123 13.3484743,16.0588732 13.7282884,18.0055773 C13.9814979,19.3033801 15.5809176,19.5099042 18.5265475,18.6251498 C24.7057419,17.0554179 32.6579091,16.101702 42.3830492,15.7640022 C56.9707594,15.2574524 60.5270025,16.163136 67.0775991,16.9762338 C68.0521554,17.1558296 69.5219587,16.163136 68.0521554,15.0188646 C63.2928783,12.8874893 28.8776434,11.9999303 15.5141351,15.6336045 Z" fill="#9E81FF"></path>
        <g transform="translate(-5, -4)">
          <path d="M11.1386719,19.2441406 C14.8007813,19.2441406 17.203125,17.1640625 17.203125,14 L17.203125,6.55859375 C17.203125,5.3671875 16.5488281,4.69335938 15.40625,4.69335938 C14.2734375,4.69335938 13.6191406,5.3671875 13.6191406,6.55859375 L13.6191406,13.6191406 C13.6191406,15.2597656 12.7304688,16.2363281 11.1386719,16.2363281 C9.53710938,16.2363281 8.6484375,15.2597656 8.6484375,13.6191406 L8.6484375,6.55859375 C8.6484375,5.3671875 7.99414062,4.69335938 6.86132812,4.69335938 C5.72851562,4.69335938 5.06445312,5.3671875 5.06445312,6.55859375 L5.06445312,14 C5.06445312,17.1640625 7.46679688,19.2441406 11.1386719,19.2441406 Z" fill="#000000" fill-rule="nonzero"></path>
          <path d="M18.8613631,11.140625 C19.2434527,11.140625 19.4404676,11.0348981 19.7628556,10.5961316 L20.8494228,9.12124174 L20.8912139,9.12124174 L22.0195721,10.6384224 C22.2703183,10.9767483 22.455393,11.140625 22.8852437,11.140625 C23.458378,11.140625 23.8941989,10.8287307 23.8941989,10.3106691 C23.8941989,10.0992153 23.816587,9.91947963 23.655393,9.72917126 L22.3061392,8.11683645 L23.6076318,6.61022852 C23.8344974,6.35648403 23.9121094,6.171462 23.9121094,5.93357654 C23.9121094,5.45251927 23.5240497,5.140625 22.9330049,5.140625 C22.5330049,5.140625 22.3061392,5.29392896 22.0136019,5.71155011 L21.016587,7.10185848 L20.9747959,7.10185848 L19.9598706,5.70626377 C19.6613631,5.28335628 19.4344974,5.140625 18.9867362,5.140625 C18.4136019,5.140625 17.9837512,5.48952368 17.9837512,5.9652946 C17.9837512,6.18732104 18.055393,6.37234306 18.2106168,6.55207874 L19.5598706,8.1591272 L18.216587,9.72388491 C17.9956915,9.97762941 17.9121094,10.1520787 17.9121094,10.3846779 C17.9121094,10.8340171 18.3061392,11.140625 18.8613631,11.140625 Z" fill="#9E81FF" fill-rule="nonzero"></path>
          <path d="M28.203125,19.2148438 C29.2675781,19.2148438 29.9023437,18.5800781 29.9023437,17.4375 L29.9023437,10.7285156 L29.9804688,10.7285156 L35.4101562,18.21875 C35.9277344,18.9316406 36.40625,19.2148438 37.1289063,19.2148438 C38.2128906,19.2148438 38.8183594,18.6191406 38.8183594,17.5351563 L38.8183594,6.47070313 C38.8183594,5.328125 38.1933594,4.69335938 37.1191406,4.69335938 C36.0546875,4.69335938 35.4199219,5.328125 35.4199219,6.47070313 L35.4199219,13.1015625 L35.3417969,13.1015625 L29.9511719,5.68945313 C29.4140625,4.98632812 28.9257812,4.69335938 28.2421875,4.69335938 C27.1289062,4.69335938 26.5039062,5.2890625 26.5039062,6.39257812 L26.5039062,17.4375 C26.5039062,18.5800781 27.1289062,19.2148438 28.203125,19.2148438 Z" fill="#000000" fill-rule="nonzero"></path>
          <path d="M45.8300781,19.2539062 C49.1796875,19.2539062 51.2695312,17.2324219 51.2695312,13.6777344 C51.2695312,10.1914062 49.1503906,8.11132812 45.8300781,8.11132812 C42.5292969,8.11132812 40.390625,10.2011719 40.390625,13.6777344 C40.390625,17.2226562 42.4804688,19.2539062 45.8300781,19.2539062 Z M45.8300781,16.7148438 C44.6386719,16.7148438 43.90625,15.6308594 43.90625,13.6875 C43.90625,11.7734375 44.6582031,10.6503906 45.8300781,10.6503906 C47.0117188,10.6503906 47.7636719,11.7734375 47.7636719,13.6875 C47.7636719,15.6308594 47.0117188,16.7148438 45.8300781,16.7148438 Z" fill="#000000" fill-rule="nonzero"></path>
          <path d="M53.4765625,16.1484375 C53.4765625,18.1210938 54.5214844,19.1367188 56.5722656,19.1367188 L56.6601562,19.1367188 C57.9980469,19.1367188 59.0917969,18.6289062 59.0917969,17.6230469 C59.0917969,16.8222656 58.6425781,16.4804688 57.8710938,16.3925781 L57.65625,16.3632813 C57.1679688,16.3144531 56.9433594,16.0507812 56.9433594,15.3867188 L56.9433594,10.9238281 L57.7832031,10.9238281 C58.5546875,10.9238281 59.0625,10.4160156 59.0625,9.64453125 C59.0625,8.87304688 58.5546875,8.36523437 57.7832031,8.36523437 L56.9433594,8.36523437 L56.9433594,7.515625 C56.9433594,6.39257812 56.3085938,5.71875 55.2148438,5.71875 C54.1113281,5.71875 53.4765625,6.39257812 53.4765625,7.515625 L53.4765625,8.36523437 L53.0957031,8.36523437 C52.3242188,8.36523437 51.8164062,8.86328125 51.8164062,9.64453125 C51.8164062,10.4160156 52.3242188,10.9238281 53.0957031,10.9238281 L53.4765625,10.9238281 L53.4765625,16.1484375 Z" fill="#000000" fill-rule="nonzero"></path>
          <path d="M65.3222656,19.2539062 C67.4414062,19.2539062 69.1601562,18.5019531 69.8632812,17.2519531 C70.0195312,16.9980469 70.0976562,16.734375 70.0976562,16.4707031 C70.0976562,15.7089844 69.5019531,15.2597656 68.7988281,15.2597656 C68.3691406,15.2597656 68.0859375,15.3769531 67.7246094,15.71875 C66.953125,16.5 66.2988281,16.8027344 65.3515625,16.8027344 C64.1015625,16.8027344 63.2519531,15.9238281 63.2519531,14.6347656 L63.2519531,14.4394531 L69.0332031,14.4394531 C69.9316406,14.4394531 70.4296875,13.9511719 70.4296875,13.0722656 C70.4296875,10.2011719 68.3496094,8.11132812 65.1855469,8.11132812 C61.9433594,8.11132812 59.8925781,10.2890625 59.8925781,13.7363281 C59.8925781,17.1933594 61.9140625,19.2539062 65.3222656,19.2539062 Z M63.3007812,12.4667969 C63.3886719,11.3535156 64.1796875,10.5722656 65.2539062,10.5722656 C66.3378906,10.5722656 67.109375,11.3144531 67.1679688,12.4667969 L63.3007812,12.4667969 Z" fill="#000000" fill-rule="nonzero"></path>
        </g>
        <path d="M15.5141351,15.6336045 C15.0749867,15.7571123 13.3484743,16.0588732 13.7282884,18.0055773 C13.9814979,19.3033801 15.5809176,19.5099042 18.5265475,18.6251498 C24.7057419,17.0554179 32.6579091,16.101702 42.3830492,15.7640022 C56.9707594,15.2574524 60.5270025,16.163136 67.0775991,16.9762338 C68.0521554,17.1558296 69.5219587,16.163136 68.0521554,15.0188646 C63.2928783,12.8874893 28.8776434,11.9999303 15.5141351,15.6336045 Z" fill-opacity="0.3" fill="#9E81FF"></path>
      </svg>
    `;
  }
  function iconPen() {
    return iconSvg(`
      <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
      <path d="M13.5 6.5l4 4" />
      <circle cx="6.1" cy="17.9" r="1.1" fill="#000" stroke="none" />
    `);
  }
  function iconTarget() {
    return iconSvg(`
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
    `);
  }
  function iconDownload() {
    return iconSvg(`
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
      <path d="M7 11l5 5l5 -5" />
      <path d="M12 4l0 12" />
    `);
  }
  function iconUpload() {
    return iconSvg(`
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
      <path d="M7 9l5 -5l5 5" />
      <path d="M12 4l0 12" />
    `);
  }
  function iconMail() {
    return iconSvg(`
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" />
      <path d="M3 7l9 6l9 -6" />
    `);
  }
  function iconEdit() {
    return iconPen();
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
    return iconSvg(`
      <path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" />
      <path d="M15 4l0 16" />
    `);
  }
  function iconToolbarTop() {
    return iconSvg(`
      <rect x="0.5" y="3" width="23" height="4" rx="2" fill="currentColor" stroke="none" />
      <path d="M12 10l0 12" />
      <path d="M7 17l5 5l5 -5" />
    `);
  }
  function iconToolbarBottom() {
    return iconSvg(`
      <rect x="0.5" y="17" width="23" height="4" rx="2" fill="currentColor" stroke="none" />
      <path d="M12 14l0 -12" />
      <path d="M7 7l5 -5l5 5" />
    `);
  }
  function iconSwap() {
    return position === 'top' ? iconToolbarTop() : iconToolbarBottom();
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
    refresh: refreshMarkers,
    setHidden: (hidden) => setAnnotatorVisibility(!!hidden),
    toggleVisibility: () => setAnnotatorVisibility(!state.hidden),
    isHidden: () => !!state.hidden
  };
})();
