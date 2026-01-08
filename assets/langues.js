(() => {
  const translations = {
    en: {
      title: 'Uxnote – Annotate and track your pages',
      hero_title: 'The annotation layer for your mockups and live sites.',
      hero_sub: 'Add one script to annotate directly on your web pages. Comments are exportable and re-importable — no plugin, no backend.',
      hero_cta: 'Install UxNote',
      demo_status_off: 'Demo off',
      demo_status_active: 'Demo active',
      demo_status_loading: 'Loading...',
      demo_status_fail: 'Demo unavailable',
      demo_button_live: 'Live preview',
      demo_button_close: 'Close preview',
      who_title: 'Made for fast reviews',
      who_card1_title: 'Agencies & freelancers',
      who_card1_body: 'Skip vague emails and messy screenshots. Clients comment directly on the page and you export everything in one clean file.',
      who_card2_title: 'Product & UX teams',
      who_card2_body: 'Review where the interface lives: in the browser. Uxnote adds notes and highlights without touching your code.',
      features_title: 'Key features',
      features_card1_title: 'Capture',
      features_card1_body: 'Highlight text or pin any element in context; numbered markers stay anchored to what you chose.',
      features_card2_title: 'Editing & sorting',
      features_card2_body: 'Add comments, priorities, and filters to keep feedback clear and actionable.',
      features_card3_title: 'Import / Export',
      features_card3_body: 'Export to JSON, then re-import to replay or merge feedback.',
      install_title: 'Install (copy / paste)',
      how_title: 'How it works',
      install_default_title: 'Default install',
      install_lead1: 'Default installation: insert the script right before <code>&lt;/body&gt;</code> on every page you want to annotate:',
      install_custom_title: 'Custom install',
      install_lead_custom_full: 'Custom installation: generate the script tag with options and place it right before <code>&lt;/body&gt;</code> on every page you want to annotate:',
      builder_title: 'Script tag builder',
      builder_sub: 'Select options, then copy the tag.',
      builder_color_desc: 'Unified highlight color (hex).',
      builder_text_color_desc: 'Text-only highlight color.',
      builder_element_color_desc: 'Element-only highlight color.',
      builder_advanced_desc: 'Switch to text/element colors.',
      builder_advanced_toggle: 'Use different colors for text and elements',
      builder_backdrop_desc: 'Adds a soft dim behind annotations to keep focus.',
      builder_visible_desc: 'Show the toolbar on first load.',
      builder_top_desc: 'Start the toolbar at the top (or bottom).',
      builder_mailto_desc: 'Email address used for the export.',
      builder_include: 'Include',
      builder_advanced: 'Advanced colors',
      builder_output_title: 'Generated script tag',
      builder_copy: 'Copy',
      builder_copied: 'Copied to clipboard.',
      builder_copy_fail: 'Copy failed. Please copy manually.',
      install_options_toggle: 'See all options & definitions',
      install_opt_color_body: 'Single hex color applied to both text and element highlights so the UI stays consistent.<br> Example:<br> colorForHighlight="#4e9cf6". Use this OR the per-type colors, not both.',
      install_opt_text_color_body: 'Hex color used only for text highlights while keeping element highlights unchanged.<br> Example:<br> colorForTextHighlight="#4e9cf6".',
      install_opt_element_color_body: 'Hex color used only for element highlights while keeping text highlights unchanged.<br> Example:<br> colorForElementHighlight="#4e9cf6".',
      install_opt_backdrop_body: 'Adds a soft dim behind annotations to bring focus to the feedback layer.<br> Example:<br> isBackdropVisible="true".',
      install_opt_visible_body: 'Controls whether the toolbar is shown on the first visit, before any user choice is saved.<br> Example:<br> isToolVisibleAtFirstLaunch="true".',
      install_opt_top_body: 'Controls whether the toolbar starts at the top on the first visit (otherwise it starts at the bottom).<br> Example:<br> isToolOnTopAtLaunch="true".',
      install_opt_mailto_body: 'Sets the default recipient used when exporting annotations by email.<br> Example:<br> data-mailto="team@example.com".',
      install_toggle_custom: 'Custom install',
      install_toggle_default: 'Default install',
      install_step1_title: 'Inject',
      install_step1_body: 'Paste the snippet on each page right before <code>&lt;/body&gt;</code>.',
      install_step2_title: 'Share',
      install_step2_body: 'Share the URL with your team or client.',
      install_step3_title: 'Annotate',
      install_step3_body: 'Highlight and comment on text or elements; everything appears in the Uxnote panel.',
      install_step4_title: 'Export / Import',
      install_step4_body: 'Export annotations to JSON, then re-import or merge multiple exported JSON files to consolidate feedback.',
      nav_github: 'GitHub Repo',
      github_chip: 'Open source',
      github_title: 'UxNote on GitHub',
      github_body: 'Uxnote is open source under the MIT License. Browse the code, follow updates, and share ideas or issues.',
      github_cta: 'View the repo',
      faq_title: 'FAQ',
      faq_q1: 'Where should the script tag be placed?',
      faq_a1: 'Place it right before <code>&lt;/body&gt;</code> so the DOM is ready. If you must place it in <code>&lt;head&gt;</code>, add <code>defer</code>.',
      faq_q2: 'How are annotations stored and scoped?',
      faq_a2: 'Annotations are stored in <code>localStorage</code> for the current origin. Each page URL keeps its own set, and clearing storage removes them.',
      faq_q3: 'Can we export, import, and merge reviews?',
      faq_a3: 'Yes. Export generates a JSON file. Import appends annotations so you can consolidate feedback from multiple reviewers.',
      faq_q4: 'Does it work on staging, previews, or localhost?',
      faq_a4: 'Yes, as long as the script loads and the browser allows <code>localStorage</code> in that environment.',
      faq_q5: 'How do we customize colors, dim, and toolbar position?',
      faq_a5: 'Use script tag options like <code>colorForHighlight</code> (or <code>colorForTextHighlight</code> + <code>colorForElementHighlight</code>), <code>isBackdropVisible</code>, <code>isToolOnTopAtLaunch</code>, and <code>isToolVisibleAtFirstLaunch</code>.',
      faq_q6: 'Is any data sent to a server?',
      faq_a6: 'No. Everything stays in the browser unless you export a JSON file or send annotations by email.',
      faq_q6b: 'Is Uxnote open source?',
      faq_a6b: 'Yes. Uxnote is open source under the MIT License, which allows commercial use, modification, and redistribution.',
      faq_q7: 'Can we use it on single-page apps (React, Vue, etc.)?',
      faq_a7: 'Yes. Annotations are stored per URL. In SPAs, route changes and re-renders do not always trigger a full reload, so you may need to reload or re-initialize to render annotations for the new URL.',
      faq_q8: 'Will a strict CSP block Uxnote?',
      faq_a8: 'CSP (Content Security Policy) is a browser security header that restricts script and style sources. If it is strict, allow the Uxnote script origin and inline styles (or use a nonce/hash) so the toolbar and highlights can render.',
      faq_q9: 'How do we block specific areas from annotations?',
      faq_a9: 'Add <code>data-uxnote-ignore</code> to any element to disable annotation inside it. You can re-enable a child with <code>data-uxnote-allow</code>.',
      faq_q10: 'Does it work inside iframes?',
      faq_a10: 'Cross-origin iframes are blocked by the browser. For same-origin iframes, you must inject Uxnote inside the iframe document.'
    },
    fr: {
      title: 'Uxnote – Annoter et suivre vos pages',
      hero_title: 'L\'outil d\'annotation pour vos maquettes et sites web.',
      hero_sub: 'Ajoutez un seul script pour annoter vos pages web. Les commentaires sont exportables et réimportables — sans plugin, sans backend.',
      hero_cta: 'Installer UxNote',
      demo_status_off: 'Démo désactivée',
      demo_status_active: 'Démo active',
      demo_status_loading: 'Chargement...',
      demo_status_fail: 'Démo indisponible',
      demo_button_live: 'Aperçu',
      demo_button_close: 'Fermer l\'aperçu',
      who_title: 'Pensé pour des validations rapides',
      who_card1_title: 'Agences & freelances',
      who_card1_body: 'Fini les emails flous et les captures bricolées. Les clients commentent directement sur la page et vous exportez tout dans un seul fichier.',
      who_card2_title: 'Équipes produit & UX',
      who_card2_body: 'La revue se fait là où l\'interface vit : dans le navigateur. Uxnote ajoute notes et surlignages sans toucher au code.',
      features_title: 'Fonctionnalités clés',
      features_card1_title: 'Capture',
      features_card1_body: 'Surlignez du texte ou épinglez un élément in situ ; les pastilles numérotées restent ancrées.',
      features_card2_title: 'Édition & tri',
      features_card2_body: 'Ajoutez commentaires, priorités et filtres pour organiser les retours d\'un coup d\'œil.',
      features_card3_title: 'Import / Export',
      features_card3_body: 'Exportez en JSON, puis réimportez pour rejouer ou fusionner les retours.',
      install_title: 'Installation (copier / coller)',
      how_title: 'Comment ça fonctionne',
      install_default_title: 'Installation par défaut',
      install_lead1: 'Installation par défaut : insérez le script juste avant <code>&lt;/body&gt;</code> sur chaque page à annoter :',
      install_custom_title: 'Installation personnalisée',
      install_lead_custom_full: 'Installation personnalisée : générez la balise avec options et placez-la juste avant <code>&lt;/body&gt;</code> sur chaque page à annoter :',
      builder_title: 'Générateur de balise script',
      builder_sub: 'Sélectionnez vos options, puis copiez la balise.',
      builder_color_desc: 'Couleur des surlignages.',
      builder_text_color_desc: 'Couleur des textes.',
      builder_element_color_desc: 'Couleur des éléments.',
      builder_advanced_desc: 'Passez sur deux couleurs (texte/élément).',
      builder_advanced_toggle: 'Utiliser des couleurs différentes pour les textes et les éléments',
      builder_backdrop_desc: 'Ajoute un léger voile sur la page pour améliorer le focus sur l\'outil.',
      builder_visible_desc: 'Affiche la barre lors de la première visite de l\'utilisateur.',
      builder_top_desc: 'Affiche la barre en position haute lors de la première visite de l\'utilisateur.',
      builder_mailto_desc: 'Entrez l\'adresse utilisée pour l\'envoi par email des commentaires.',
      builder_include: 'Inclure',
      builder_advanced: 'Couleurs avancées',
      builder_output_title: 'Balise générée',
      builder_copy: 'Copier',
      builder_copied: 'Copié dans le presse-papiers.',
      builder_copy_fail: 'Copie impossible. Copiez manuellement.',
      install_options_toggle: 'Voir toutes les options et définitions',
      install_opt_color_body: 'Couleur hex unique appliquée aux surlignages texte + éléments pour garder une interface cohérente.<br> Exemple :<br> colorForHighlight="#4e9cf6". Utilisez ceci OU les couleurs par type.',
      install_opt_text_color_body: 'Couleur hex appliquée uniquement aux surlignages de texte, sans toucher aux éléments.<br> Exemple :<br> colorForTextHighlight="#4e9cf6".',
      install_opt_element_color_body: 'Couleur hex appliquée uniquement aux surlignages d’éléments, sans toucher aux textes.<br> Exemple :<br> colorForElementHighlight="#4e9cf6".',
      install_opt_backdrop_body: 'Ajoute un voile léger derrière les annotations pour mieux concentrer l’attention.<br> Exemple :<br> isBackdropVisible="true".',
      install_opt_visible_body: 'Indique si la barre s’affiche lors de la première visite, avant toute préférence enregistrée.<br> Exemple :<br> isToolVisibleAtFirstLaunch="true".',
      install_opt_top_body: 'Indique si la barre démarre en haut lors de la première visite (sinon elle démarre en bas).<br> Exemple :<br> isToolOnTopAtLaunch="true".',
      install_opt_mailto_body: 'Définit le destinataire par défaut lors d’un export des annotations par email.<br> Exemple :<br> data-mailto="team@example.com".',
      install_toggle_custom: 'Installation personnalisée',
      install_toggle_default: 'Installation par défaut',
      install_step1_title: 'Injecter',
      install_step1_body: 'Collez le snippet sur chaque page avant la balise <code>&lt;/body&gt;</code>.',
      install_step2_title: 'Partager',
      install_step2_body: 'Partagez l\'URL avec votre équipe ou votre client.',
      install_step3_title: 'Annoter',
      install_step3_body: 'Surlignez et commentez texte ou éléments ; tout apparaît dans le panneau Uxnote.',
      install_step4_title: 'Exporter / Importer',
      install_step4_body: 'Exportez les annotations en JSON, puis réimportez ou fusionnez plusieurs fichiers JSON exportés pour consolider les retours.',
      nav_github: 'Repo GitHub',
      github_chip: 'Open source',
      github_title: 'UxNote sur GitHub',
      github_body: 'Uxnote est open source sous licence MIT. Parcourez le code, suivez les mises à jour et partagez vos idées ou problèmes.',
      github_cta: 'Voir le dépôt',
      faq_title: 'FAQ',
      faq_q1: 'Où placer la balise script ?',
      faq_a1: 'Placez-la juste avant <code>&lt;/body&gt;</code> pour garantir que le DOM est prêt. Si vous devez la mettre dans <code>&lt;head&gt;</code>, ajoutez <code>defer</code>.',
      faq_q2: 'Comment sont stockées et isolées les annotations ?',
      faq_a2: 'Les annotations sont stockées dans <code>localStorage</code> pour l\'origine courante. Chaque URL conserve ses propres annotations, et vider le stockage les supprime.',
      faq_q3: 'Peut-on exporter, importer et fusionner des retours ?',
      faq_a3: 'Oui. L\'export génère un fichier JSON. L\'import ajoute les annotations afin de consolider les retours de plusieurs personnes.',
      faq_q4: 'Est-ce compatible avec staging, previews ou localhost ?',
      faq_a4: 'Oui, tant que le script se charge et que le navigateur autorise <code>localStorage</code> dans cet environnement.',
      faq_q5: 'Comment personnaliser les couleurs, le voile et la position de la barre ?',
      faq_a5: 'Utilisez les options de la balise script comme <code>colorForHighlight</code> (ou <code>colorForTextHighlight</code> + <code>colorForElementHighlight</code>), <code>isBackdropVisible</code>, <code>isToolOnTopAtLaunch</code> et <code>isToolVisibleAtFirstLaunch</code>.',
      faq_q6: 'Des données sont-elles envoyées à un serveur ?',
      faq_a6: 'Non. Tout reste dans le navigateur, sauf si vous exportez un JSON ou envoyez les annotations par email.',
      faq_q6b: 'Uxnote est-il open source ?',
      faq_a6b: 'Oui. Uxnote est open source sous licence MIT, ce qui autorise l’usage commercial, la modification et la redistribution.',
      faq_q7: 'Est-ce compatible avec les single-page apps (React, Vue, etc.) ?',
      faq_a7: 'Oui. Les annotations sont stockées par URL. Dans une SPA, les changements de route et les re-renders ne déclenchent pas toujours un rechargement complet : il peut donc être nécessaire de recharger ou de réinitialiser pour afficher les annotations de la nouvelle URL.',
      faq_q8: 'Une CSP stricte peut-elle bloquer Uxnote ?',
      faq_a8: 'La CSP (Content Security Policy) est un en-tête de sécurité qui limite les sources autorisées pour scripts et styles. Si elle est stricte, autorisez l\'origine du script Uxnote et les styles inline (ou utilisez un nonce/hash) pour afficher la barre et les surlignages.',
      faq_q9: 'Comment bloquer certaines zones aux annotations ?',
      faq_a9: 'Ajoutez <code>data-uxnote-ignore</code> sur un élément pour désactiver l\'annotation à l\'intérieur. Vous pouvez réactiver un enfant avec <code>data-uxnote-allow</code>.',
      faq_q10: 'Est-ce que cela fonctionne dans des iframes ?',
      faq_a10: 'Les iframes cross-origin sont bloquées par le navigateur. Pour les iframes same-origin, il faut injecter Uxnote dans le document de l\'iframe.'
    }
  };

  const langStorageKey = 'uxnote:lang';
  const langButtons = Array.from(document.querySelectorAll('.lang-btn[data-lang]'));
  const listeners = new Set();
  let currentLang = 'en';

  const t = (key) => {
    const table = translations[currentLang] || translations.en;
    return (table && table[key]) || translations.en[key] || key;
  };

  const applyTranslations = () => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (!key) return;
      el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle;
      if (!key) return;
      const raw = t(key);
      const tip = String(raw).replace(/<br\s*\/?>/gi, '\n');
      el.setAttribute('title', tip);
      el.setAttribute('data-tip', tip);
    });
  };

  const updateLangButtons = () => {
    langButtons.forEach((btn) => {
      const isActive = btn.dataset.lang === currentLang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const getBrowserLang = () => {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    const normalized = (langs || []).map((l) => (l || '').toLowerCase());
    if (normalized.some((l) => l.startsWith('fr'))) return 'fr';
    return 'en';
  };

  const notify = () => {
    listeners.forEach((fn) => {
      try {
        fn(currentLang);
      } catch (err) {
        // ignore listener errors
      }
    });
  };

  const applyLang = (lang) => {
    currentLang = translations[lang] ? lang : 'en';
    document.documentElement.setAttribute('lang', currentLang);
    document.title = t('title');
    applyTranslations();
    updateLangButtons();
    notify();
  };

  const setLang = (lang) => {
    applyLang(lang);
    try {
      localStorage.setItem(langStorageKey, currentLang);
    } catch (err) {
      // ignore storage errors
    }
  };

  const storedLang = (() => {
    try {
      return localStorage.getItem(langStorageKey);
    } catch (err) {
      return null;
    }
  })();
  applyLang(storedLang || getBrowserLang());

  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  window.UxnoteI18n = {
    t,
    setLang,
    getLang: () => currentLang,
    onChange: (fn) => {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      fn(currentLang);
      return () => listeners.delete(fn);
    }
  };
})();
