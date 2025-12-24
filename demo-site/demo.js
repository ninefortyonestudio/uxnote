(() => {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  const menuToggle = qs('#menuToggle');
  const menuPanel = qs('#menuPanel');

  const modalBackdrop = qs('#modalBackdrop');
  const openModal = qs('#openModal');
  const closeModal = qs('#closeModal');

  const dialog = qs('#nativeDialog');
  const openDialog = qs('#openDialog');
  const closeDialog = qs('#closeDialog');

  const openPopover = qs('#openPopover');
  const openPopoverInline = qs('#openPopoverInline');
  const demoPopover = qs('#demoPopover');

  const accordionToggles = qsa('.accordion-toggle');
  const addDynamic = qs('#addDynamic');
  const dynamicSlot = qs('#dynamicSlot');

  const toggleMenu = (force) => {
    if (!menuPanel || !menuToggle) return;
    const isOpen = menuPanel.getAttribute('aria-hidden') === 'false';
    const next = typeof force === 'boolean' ? force : !isOpen;
    menuPanel.setAttribute('aria-hidden', next ? 'false' : 'true');
    menuToggle.setAttribute('aria-expanded', next ? 'true' : 'false');
  };

  if (menuToggle) {
    menuToggle.addEventListener('click', () => toggleMenu());
    document.addEventListener('click', (event) => {
      if (!menuPanel || !menuToggle) return;
      if (menuPanel.contains(event.target) || menuToggle.contains(event.target)) return;
      toggleMenu(false);
    });
  }

  const setModal = (open) => {
    if (!modalBackdrop) return;
    modalBackdrop.classList.toggle('show', open);
  };

  if (openModal) openModal.addEventListener('click', () => setModal(true));
  if (closeModal) closeModal.addEventListener('click', () => setModal(false));
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (event) => {
      if (event.target === modalBackdrop) setModal(false);
    });
  }

  if (openDialog && dialog && typeof dialog.showModal === 'function') {
    openDialog.addEventListener('click', () => dialog.showModal());
  }
  if (closeDialog && dialog && typeof dialog.close === 'function') {
    closeDialog.addEventListener('click', () => dialog.close());
  }

  const togglePopover = () => {
    if (!demoPopover) return;
    if (typeof demoPopover.togglePopover === 'function') {
      demoPopover.togglePopover();
    } else if (demoPopover.hasAttribute('data-open')) {
      demoPopover.removeAttribute('data-open');
      demoPopover.style.display = 'none';
    } else {
      demoPopover.setAttribute('data-open', 'true');
      demoPopover.style.display = 'block';
      demoPopover.style.position = 'absolute';
      demoPopover.style.right = '24px';
      demoPopover.style.top = '120px';
      demoPopover.style.zIndex = '30';
    }
  };

  if (openPopover) openPopover.addEventListener('click', togglePopover);
  if (openPopoverInline) openPopoverInline.addEventListener('click', togglePopover);

  accordionToggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.parentElement?.querySelector('.accordion-panel');
      if (!panel) return;
      const isOpen = !panel.hasAttribute('hidden');
      panel.toggleAttribute('hidden', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });

  if (addDynamic && dynamicSlot) {
    addDynamic.addEventListener('click', () => {
      addDynamic.disabled = true;
      addDynamic.textContent = 'Adding...';
      setTimeout(() => {
        const block = document.createElement('div');
        block.className = 'card';
        block.innerHTML = `
          <h3>Dynamic block</h3>
          <p>This block was added after load. Use it to test missing retries.</p>
        `;
        dynamicSlot.appendChild(block);
        addDynamic.textContent = 'Added';
      }, 700);
    });
  }
})();
