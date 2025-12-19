const state = {
  files: [],
  annotations: [],
  reviewerCounts: new Map(),
  usedIds: new Set(),
  pageUrls: new Set()
};

const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const fileList = document.getElementById('file-list');
const reviewerList = document.getElementById('reviewer-list');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');
const statFiles = document.getElementById('stat-files');
const statReviewers = document.getElementById('stat-reviewers');
const statComments = document.getElementById('stat-comments');

const revealEls = document.querySelectorAll('.reveal');
revealEls.forEach((el) => {
  const delay = Number(el.dataset.delay || 0);
  el.style.setProperty('--delay', `${delay}ms`);
});

fileInput.addEventListener('change', (event) => {
  const files = event.target.files;
  if (files && files.length) {
    handleFiles(Array.from(files));
  }
});

clearBtn.addEventListener('click', () => {
  resetState();
  render();
});

downloadBtn.addEventListener('click', () => {
  if (!state.annotations.length) return;
  const payload = buildMergedPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildFilename();
  a.click();
  URL.revokeObjectURL(url);
});

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
    handleFiles(Array.from(files));
  }
});

fileList.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('[data-file-remove]');
  if (!removeBtn) return;
  removeFile(removeBtn.dataset.fileRemove);
});

async function handleFiles(files) {
  for (const file of files) {
    await ingestFile(file);
  }
  render();
  fileInput.value = '';
}

async function ingestFile(file) {
  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch (err) {
    alert(`Invalid JSON in ${file.name}`);
    return;
  }

  const annotations = Array.isArray(parsed) ? parsed : parsed.annotations;
  if (!Array.isArray(annotations)) {
    alert(`Unsupported JSON format in ${file.name}`);
    return;
  }

  const fallbackAuthor = Array.isArray(parsed)
    ? ''
    : (parsed.exportedBy || parsed.annotator || parsed.author || '');
  const payloadCreatedAt = Array.isArray(parsed) ? file.lastModified : parsed.createdAt;
  const pageUrl = Array.isArray(parsed) ? '' : (parsed.pageUrl || '');

  const normalized = annotations.map((ann) => normalizeAnnotation(ann, {
    fallbackAuthor,
    createdAt: payloadCreatedAt
  }));

  const fileReviewerCounts = new Map();
  normalized.forEach((ann) => {
    const reviewer = ann.author || 'Unknown reviewer';
    fileReviewerCounts.set(reviewer, (fileReviewerCounts.get(reviewer) || 0) + 1);
    state.reviewerCounts.set(reviewer, (state.reviewerCounts.get(reviewer) || 0) + 1);
  });

  state.annotations.push(...normalized);
  state.files.push({
    id: generateFileId(),
    name: file.name,
    size: file.size,
    count: normalized.length,
    annotations: normalized,
    reviewers: fileReviewerCounts,
    pageUrl
  });
  if (pageUrl) {
    state.pageUrls.add(pageUrl);
  }
}

function normalizeAnnotation(value, meta) {
  const ann = value && typeof value === 'object' ? value : {};
  const author = (ann.author || meta.fallbackAuthor || '').trim();
  return {
    ...ann,
    id: ensureUniqueId(ann.id),
    createdAt: ann.createdAt || meta.createdAt || Date.now(),
    priority: ann.priority || 'medium',
    author
  };
}

function ensureUniqueId(id) {
  if (id && !state.usedIds.has(id)) {
    state.usedIds.add(id);
    return id;
  }
  let next;
  do {
    next = generateId();
  } while (state.usedIds.has(next));
  state.usedIds.add(next);
  return next;
}

function generateId() {
  return 'wn-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

function generateFileId() {
  return 'file-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

function buildMergedPayload() {
  const urls = Array.from(state.pageUrls);
  const pageUrl = urls.length === 1 ? urls[0] : 'multiple';
  return {
    pageUrl,
    createdAt: Date.now(),
    annotations: state.annotations
  };
}

function buildFilename() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `uxnote-merged-${stamp}.json`;
}

function render() {
  renderFiles();
  renderReviewers();
  statFiles.textContent = String(state.files.length);
  statReviewers.textContent = String(state.reviewerCounts.size);
  statComments.textContent = String(state.annotations.length);
  downloadBtn.disabled = state.annotations.length === 0;
}

function renderFiles() {
  fileList.innerHTML = '';
  if (!state.files.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No files loaded yet.';
    fileList.appendChild(empty);
    return;
  }

  state.files.forEach((file) => {
    const card = document.createElement('div');
    card.className = 'file-card';

    const meta = document.createElement('div');
    meta.className = 'file-meta';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;

    const sub = document.createElement('div');
    sub.className = 'file-sub';
    const urlLabel = file.pageUrl ? ` | ${truncate(file.pageUrl, 36)}` : '';
    sub.textContent = `${file.count} comments | ${formatBytes(file.size)}${urlLabel}`;

    meta.appendChild(name);
    meta.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `${file.count}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'file-remove';
    removeBtn.dataset.fileRemove = file.id;
    removeBtn.setAttribute('aria-label', 'Remove file');
    removeBtn.setAttribute('title', 'Remove file');
    removeBtn.textContent = 'x';

    actions.appendChild(badge);
    actions.appendChild(removeBtn);

    card.appendChild(meta);
    card.appendChild(actions);
    fileList.appendChild(card);
  });
}

function renderReviewers() {
  reviewerList.innerHTML = '';
  if (!state.reviewerCounts.size) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No reviewers yet.';
    reviewerList.appendChild(empty);
    return;
  }

  const reviewers = Array.from(state.reviewerCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  reviewers.forEach(([name, count]) => {
    const card = document.createElement('div');
    card.className = 'reviewer-card';

    const left = document.createElement('div');
    left.className = 'file-meta';

    const reviewerName = document.createElement('div');
    reviewerName.className = 'reviewer-name';
    reviewerName.textContent = name;

    const reviewerCount = document.createElement('div');
    reviewerCount.className = 'reviewer-count';
    reviewerCount.textContent = `${count} comments`;

    left.appendChild(reviewerName);
    left.appendChild(reviewerCount);

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = String(count);

    card.appendChild(left);
    card.appendChild(badge);
    reviewerList.appendChild(card);
  });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value < 10 && idx > 0 ? 1 : 0)} ${units[idx]}`;
}

function truncate(value, max) {
  if (value.length <= max) return value;
  return value.slice(0, max - 3) + '...';
}

function resetState() {
  state.files = [];
  state.annotations = [];
  state.reviewerCounts = new Map();
  state.usedIds = new Set();
  state.pageUrls = new Set();
}

function rebuildFromFiles() {
  state.annotations = [];
  state.reviewerCounts = new Map();
  state.usedIds = new Set();
  state.pageUrls = new Set();

  state.files.forEach((file) => {
    const fileReviewerCounts = new Map();
    file.annotations.forEach((ann) => {
      state.annotations.push(ann);
      if (ann.id) state.usedIds.add(ann.id);
      const reviewer = ann.author || 'Unknown reviewer';
      fileReviewerCounts.set(reviewer, (fileReviewerCounts.get(reviewer) || 0) + 1);
      state.reviewerCounts.set(reviewer, (state.reviewerCounts.get(reviewer) || 0) + 1);
    });
    file.count = file.annotations.length;
    file.reviewers = fileReviewerCounts;
    if (file.pageUrl) state.pageUrls.add(file.pageUrl);
  });
}

function removeFile(fileId) {
  const nextFiles = state.files.filter((file) => file.id !== fileId);
  if (nextFiles.length === state.files.length) return;
  state.files = nextFiles;
  rebuildFromFiles();
  render();
}

render();
