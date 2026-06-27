document.addEventListener('DOMContentLoaded', () => {

  let activeTab   = 0;
  let results     = { 0: null, 1: null, 2: null, 3: null };
  let running     = false;
  let chatHistory = [];

  const $ = (id) => document.getElementById(id);

  const runBtn       = $('runBtn');
  const runLabel     = runBtn?.querySelector('.run-label');
  const runIcon      = runBtn?.querySelector('.run-icon');
  const spinIcon     = runBtn?.querySelector('.spin-icon');
  const progressWrap = $('progressWrap');
  const progressFill = $('progressFill');
  const progressLbl  = $('progressLabel');
  const copyBtn      = $('copyBtn');
  const saveBtn      = $('saveBtn');
  const charCount    = $('charCount');
  const reqDoc       = $('reqDoc');
  const apiKeyInput  = $('apiKey');
  const sidebar      = $('sidebar');
  const chatDrawer   = $('chatDrawer');
  const chatBackdrop = $('chatBackdrop');
  const chatFab      = $('chatFab');
  const chatClose    = $('chatClose');
  const chatMessages = $('chatMessages');
  const chatInput    = $('chatInput');
  const chatSendBtn  = $('chatSend');

  console.log('DOM ready | chatFab:', !!chatFab, '| chatDrawer:', !!chatDrawer, '| runBtn:', !!runBtn);

  /* ── Sidebar ──────────────────────────────────────────── */
  $('sidebarToggle')?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));

  $('toggleKey')?.addEventListener('click', () => {
    if (apiKeyInput) apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  reqDoc?.addEventListener('input', () => {
    const n = reqDoc.value.length;
    if (charCount) charCount.textContent = n.toLocaleString() + ' character' + (n === 1 ? '' : 's');
  });

  /* ── File upload ──────────────────────────────────────────── */
  let uploadedFileText = '';

  const uploadZone  = $('uploadZone');
  const reqFile     = $('reqFile');
  const uploadInfo  = $('uploadInfo');
  const uploadLabel = $('uploadLabel');
  const uploadClear = $('uploadClear');

  uploadZone?.addEventListener('click', () => reqFile?.click());

  uploadZone?.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  });

  reqFile?.addEventListener('change', () => {
    const file = reqFile.files?.[0];
    if (file) handleFileUpload(file);
  });

  uploadClear?.addEventListener('click', () => {
    uploadedFileText = '';
    if (uploadInfo)  uploadInfo.setAttribute('hidden', '');
    if (uploadZone)  uploadZone.removeAttribute('hidden');
    if (uploadLabel) uploadLabel.textContent = 'Click to upload or drag & drop';
    if (reqFile)     reqFile.value = '';
    updateCharCount();
  });

  async function handleFileUpload(file) {
    const allowed = ['text/plain','text/markdown','application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'];

    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['txt','md','pdf','docx','doc'];

    if (!allowedExts.includes(ext)) {
      showToast('Unsupported file type — use .txt .md .pdf .docx');
      return;
    }

    showToast('Reading file…');

    try {
      if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
        // For PDF/DOCX — send to Electron main process to extract text
        if (window.electronAPI?.extractFileText) {
          const arrayBuffer = await file.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          uploadedFileText = await window.electronAPI.extractFileText({
            name: file.name,
            ext,
            data: Array.from(uint8)
          });
        } else {
          // Browser fallback — read as text (works for txt/md)
          uploadedFileText = await file.text();
        }
      } else {
        // Plain text / markdown
        uploadedFileText = await file.text();
      }

      // Show file info bar
      const kb = (file.size / 1024).toFixed(1);
      if ($('uploadFileName')) $('uploadFileName').textContent = file.name;
      if ($('uploadFileSize')) $('uploadFileSize').textContent = `${kb} KB`;
      uploadInfo?.removeAttribute('hidden');
      uploadZone?.setAttribute('hidden', '');
      updateCharCount();
      showToast(`✓ ${file.name} loaded`);

    } catch (err) {
      showToast('Failed to read file: ' + err.message);
      console.error(err);
    }
  }

  function getRequirementsText() {
    // Prefer uploaded file; fall back to textarea
    return uploadedFileText || reqDoc?.value.trim() || '';
  }

  function updateCharCount() {
    const n = getRequirementsText().length;
    if (charCount) charCount.textContent = n.toLocaleString() + ' character' + (n === 1 ? '' : 's');
  }

  /* ── Tabs ─────────────────────────────────────────────── */
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(Number(btn.dataset.tab)));
  });

  function switchTab(n) {
    activeTab = n;
    document.querySelectorAll('.tab').forEach((t, i) => {
      t.classList.toggle('active', i === n);
      t.setAttribute('aria-selected', String(i === n));
    });
    document.querySelectorAll('.panel').forEach((p, i) => {
      i === n ? p.removeAttribute('hidden') : p.setAttribute('hidden', '');
    });
    updateActionButtons();
  }

  /* ── Copy / Save ──────────────────────────────────────── */
  copyBtn?.addEventListener('click', async () => {
    const text = results[activeTab];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  });

  saveBtn?.addEventListener('click', async () => {
    const text = results[activeTab];
    if (!text) return;
    const names = { 0:'test-cases.md', 1:'cypress-framework.md', 2:'test-scripts.js', 3:'self-heal-report.md' };
    if (window.electronAPI?.saveOutput) {
      const res = await window.electronAPI.saveOutput({ filename: names[activeTab], content: text });
      if (res?.success) showToast('Saved to ' + res.path);
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: names[activeTab] }).click();
    URL.revokeObjectURL(url);
    showToast('File downloaded');
  });

  $('extractBtn')?.addEventListener('click', saveFrameworkToDisk);

  function updateActionButtons() {
    const has = !!results[activeTab];
    if (copyBtn) copyBtn.disabled = !has;
    if (saveBtn) saveBtn.disabled = !has;
  }

  /* ── Toast ────────────────────────────────────────────── */
  let toastTimer;
  function showToast(msg) {
    const toast = $('toast');
    const span  = $('toastMsg');
    if (!toast || !span) return;
    span.textContent = msg;
    toast.removeAttribute('hidden');
    requestAnimationFrame(() => toast.classList.add('visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.setAttribute('hidden', ''), 250);
    }, 2500);
  }

  /* ── Step / Progress ──────────────────────────────────── */
  const STEP_LABELS = {
    running: ['Generating…','Building…','Converting…','Analyzing…'],
    done:    ['✓ Done','✓ Done','✓ Done','✓ Done']
  };

  function setStepState(step, state) {
    const el     = $('step-'   + step);
    const status = $('status-' + step);
    if (!el) return;
    el.dataset.state = state;
    if (status) status.textContent = STEP_LABELS[state]?.[step] ?? '';
  }

  function setProgress(pct, label) {
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressLbl)  progressLbl.textContent  = label;
  }

  /* ── Shimmer ──────────────────────────────────────────── */
  function showLoading(idx) {
    const content = $('content-' + idx);
    const empty   = $('empty-'   + idx);
    if (!content) return;
    empty?.setAttribute('hidden', '');
    content.removeAttribute('hidden');
    content.innerHTML = `
      <div class="loading-state">
        <div class="shimmer" style="height:40px;width:60%"></div>
        <div class="shimmer" style="height:28px;width:85%"></div>
        <div class="shimmer" style="height:28px;width:72%"></div>
        <div class="shimmer" style="height:28px;width:90%"></div>
        <div class="shimmer" style="height:120px;width:100%;margin-top:4px"></div>
      </div>`;
    if (activeTab === idx) switchTab(idx);
  }

  /* ── Render panels ────────────────────────────────────── */
  function renderPanel(idx, text) {
    results[idx] = text;
    const content = $('content-' + idx);
    const empty   = $('empty-'   + idx);
    const tab     = $('tab-'     + idx);
    empty?.setAttribute('hidden', '');
    content?.removeAttribute('hidden');
    tab?.classList.add('done');
    if (idx === 0)      renderTestCases(content, text);
    else if (idx === 3) renderHealLog(content, text);
    else                renderCodeBlock(content, text, idx);
    if (activeTab === idx) updateActionButtons();
    if (idx === 1) $('extractBtn') && ($('extractBtn').disabled = false);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderTestCases(container, text) {
    if (!container) return;
    const lines = text.split('\n');
    let cards = [], current = null;
    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) return;
      if (/^(TC[-\s]?\d+|#+ |Test Case \d+|\d+\.)/.test(line)) {
        if (current) cards.push(current);
        current = {
          title: line.replace(/^#+\s*/,'').replace(/^TC[-\s]?\d+:\s*/i,'').replace(/^\d+\.\s*/,''),
          badge: /\[api\]|endpoint|request|response|status code/i.test(line) ? 'api' : 'ui',
          body: []
        };
      } else if (current) current.body.push(line);
    });
    if (current) cards.push(current);
    const ui  = cards.filter(c => c.badge === 'ui').length;
    const api = cards.length - ui;
    container.innerHTML = `
      <div class="summary-bar">
        <div class="summary-chip accent"><b>${cards.length}</b> test cases</div>
        <div class="summary-chip"><b>${ui}</b> UI</div>
        <div class="summary-chip"><b>${api}</b> API</div>
      </div>
      <div class="tc-grid">
        ${cards.map((c,i) => `
          <div class="tc-card">
            <div class="tc-head" role="button" tabindex="0" aria-expanded="false">
              <span class="tc-number">TC-${String(i+1).padStart(2,'0')}</span>
              <span class="tc-title">${escHtml(c.title)}</span>
              <span class="tc-badge ${c.badge}">${c.badge.toUpperCase()}</span>
              <svg class="tc-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="tc-body">${c.body.map(l => escHtml(l)).join('<br>')}</div>
          </div>`).join('')}
      </div>`;
    container.querySelectorAll('.tc-head').forEach(head => {
      const toggle = () => {
        const open = head.parentElement.classList.toggle('open');
        head.setAttribute('aria-expanded', String(open));
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  function renderCodeBlock(container, text, idx) {
    if (!container) return;
    const langs  = { 1:'markdown / js', 2:'javascript' };
    const colors = { 1:'#a78bfa', 2:'#34d399' };
    container.innerHTML = `
      <div class="code-block">
        <div class="code-header">
          <span class="code-dot" style="background:${colors[idx]||'#8b93a7'}"></span>
          <span class="code-lang">${langs[idx]||'text'}</span>
        </div>
        <pre>${escHtml(text)}</pre>
      </div>`;
  }

  function renderHealLog(container, text) {
    if (!container) return;
    const lines  = text.split('\n');
    const healed = lines.filter(l => /✓|HEALED:/i.test(l)).length;
    const stale  = lines.filter(l => /STALE:/i.test(l)).length;
    const html   = lines.map(raw => {
      const l = escHtml(raw);
      if (/STALE:/i.test(raw))    return `<span class="heal-line heal-stale">${l}</span>`;
      if (/REASON:/i.test(raw))   return `<span class="heal-line heal-reason">${l}</span>`;
      if (/✓|HEALED:/i.test(raw)) return `<span class="heal-line heal-ok">${l}</span>`;
      if (/STRATEGY:/i.test(raw)) return `<span class="heal-line heal-strat">${l}</span>`;
      return `<span class="heal-line heal-plain">${l}</span>`;
    }).join('\n');
    container.innerHTML = `
      <div class="summary-bar">
        <div class="summary-chip"><b>${stale}</b> fragile selectors</div>
        <div class="summary-chip accent"><b>${healed}</b> healed</div>
      </div>
      <div class="code-block" style="flex:1">
        <div class="code-header">
          <span class="code-dot" style="background:#fbbf24"></span>
          <span class="code-lang">self-heal log</span>
        </div>
        <div class="heal-log">${html}</div>
      </div>`;
  }

  /* ── File parser ──────────────────────────────────────── */
  function parseFrameworkFiles(text) {
    const files = [], seen = new Set();
    const regex = /===FILE:\s*([\w./:-]+[^=\s]+)===\s*([\s\S]*?)===ENDFILE===/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const name = m[1].trim(), content = m[2].trim();
      if (name && content && !seen.has(name)) { seen.add(name); files.push({ name, content }); }
    }
    return files;
  }

  /* ── Save framework to disk ───────────────────────────── */
  async function saveFrameworkToDisk() {
    if (!results[1]) { showToast('Run the agent first'); return; }
    if (!window.electronAPI?.pickFolder) { showToast('Only works in the desktop app'); return; }
    const folderPath = await window.electronAPI.pickFolder();
    if (!folderPath) return;
    const allFiles = [], seen = new Set();
    const add = (parsed) => parsed.forEach(f => { if (!seen.has(f.name)) { seen.add(f.name); allFiles.push(f); } });
    if (results[1]) add(parseFrameworkFiles(results[1]));
    if (results[2]) add(parseFrameworkFiles(results[2]));
    if (results[3]) allFiles.push({ name: 'cypress/reports/self-heal-report.md', content: results[3] });
    if (results[0]) allFiles.push({ name: 'cypress/reports/test-cases.md',       content: results[0] });
    if (allFiles.length === 0) { showToast('No files parsed — check console'); return; }
    try {
      const r = await window.electronAPI.writeFiles({ folderPath, allFiles });
      showToast(`✓ ${r.count} files written`);
    } catch (err) { showToast('Write failed: ' + err.message); }
  }

  /* ── Download test cases as Excel ────────────────────────── */
  $('excelBtn')?.addEventListener('click', downloadTestCasesExcel);

  function downloadTestCasesExcel() {
    const text = results[0];
    if (!text) { showToast('No test cases yet — run the agent first'); return; }

    console.log('Raw test cases text (first 500 chars):', text.substring(0, 500));

    const rows = parseTestCasesToRows(text);
    console.log('Parsed rows:', rows.length, rows[0]);

    if (rows.length === 0) {
      showToast('Could not parse test cases — check DevTools console for format');
      return;
    }

    const headers = ['ID','Type','Title','Preconditions','Steps','Expected Result','Priority'];
    const csvLines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => csvCell(r[h] ?? '')).join(','))
    ];
    const csv = '\uFEFF' + csvLines.join('\r\n');

    showToast(`Building Excel file with ${rows.length} test cases…`);

    if (window.electronAPI?.saveOutput) {
      window.electronAPI.saveOutput({ filename: 'test-cases.csv', content: csv })
        .then(res => { if (res?.success) showToast(`✓ Saved ${rows.length} test cases to ${res.path}`); });
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'test-cases.csv' }).click();
    URL.revokeObjectURL(url);
    showToast(`✓ Downloaded ${rows.length} test cases as CSV`);
  }

 function parseTestCasesToRows(text) {
    const rows    = [];
    let idCounter = 1;

    // ── Strategy 1: split on TC header lines ──────────────
    // Handles: "TC-1:", "TC1:", "1.", "# TC-1", "Test Case 1"
    const tcSplitRegex = /(?=^(?:#{1,3}\s*)?(?:TC[-\s]?\d+|Test Case\s+\d+|\d+\.)\s*[:\-–]?\s*(?:\[(?:UI|API)\]\s*)?)/im;
    const blocks = text.split(tcSplitRegex).filter(b => b.trim());

    console.log('TC blocks found:', blocks.length);
    console.log('First block sample:', blocks[0]?.substring(0, 200));

    if (blocks.length > 1) {
      blocks.forEach(block => {
        const row = parseOneBlock(block.trim(), idCounter);
        if (row) { rows.push(row); idCounter++; }
      });
      if (rows.length > 0) return rows;
    }

    // ── Strategy 2: line-by-line scan ─────────────────────
    console.log('Strategy 1 failed — trying line-by-line scan');
    const lines   = text.split('\n');
    let current   = null;
    let lastField = null;

    const flush = () => {
      if (!current?.title) return;
      rows.push({
        'ID':              current.id || `TC-${String(idCounter++).padStart(3,'0')}`,
        'Type':            current.type || 'UI',
        'Title':           current.title.trim(),
        'Preconditions':   (current.preconditions || '').trim(),
        'Steps':           (current.steps || '').trim(),
        'Expected Result': (current.expected || '').trim(),
        'Priority':        (current.priority || 'Medium').trim()
      });
      current   = null;
      lastField = null;
    };

    lines.forEach(raw => {
      const line    = raw.trim();
      const lineLow = line.toLowerCase();
      if (!line || line === '---' || /^={3,}$/.test(line)) return;

      // Any line that looks like a TC header
      const hm = line.match(
        /^(?:#{1,3}\s*)?(?:(TC[-\s]?\d+|Test Case\s*\d+|\d+)[.:\-–]\s*)?(?:\[(UI|API)\]\s*)?(.+)/i
      );
      const isHeader =
        /^(?:#{1,3}\s*)?(?:TC[-\s]?\d+|Test Case\s*\d+|\d+\.)/i.test(line) &&
        line.length < 150;

      if (isHeader && hm) {
        flush();
        const rawId = hm[1] || '';
        current = {
          id:            rawId ? rawId.replace(/\s/,'-').toUpperCase() : '',
          type:          hm[2]?.toUpperCase() || (/api|endpoint|request|http/i.test(line) ? 'API' : 'UI'),
          title:         hm[3]?.replace(/\*\*/g,'').trim() || line,
          preconditions: '',
          steps:         '',
          expected:      '',
          priority:      'Medium'
        };
        lastField = 'title';
        return;
      }

      if (!current) return;

      // Detect labelled fields
      if (/^pre-?conditions?[:\s]/i.test(line)) {
        current.preconditions = line.replace(/^pre-?conditions?[:\s]*/i,'').trim();
        lastField = 'preconditions'; return;
      }
      if (/^steps?[:\s]/i.test(line)) {
        current.steps = line.replace(/^steps?[:\s]*/i,'').trim();
        lastField = 'steps'; return;
      }
      if (/^(?:expected\s*results?|expected)[:\s]/i.test(line)) {
        current.expected = line.replace(/^(?:expected\s*results?|expected)[:\s]*/i,'').trim();
        lastField = 'expected'; return;
      }
      if (/^priority[:\s]/i.test(line)) {
        current.priority = line.replace(/^priority[:\s]*/i,'').trim();
        lastField = 'priority'; return;
      }
      if (/^(?:type|test type)[:\s]/i.test(line)) {
        const t = line.replace(/^(?:type|test type)[:\s]*/i,'').trim().toUpperCase();
        if (t === 'API' || t === 'UI') current.type = t;
        return;
      }

      // Numbered step lines  "1. Do something"
      if (/^\d+[.)]\s/.test(line)) {
        current.steps += (current.steps ? ' | ' : '') + line;
        lastField = 'steps'; return;
      }

      // Bullet lines  "- Do something"
      if (/^[-*]\s/.test(line)) {
        if (lastField === 'steps') {
          current.steps += (current.steps ? ' | ' : '') + line.replace(/^[-*]\s/,'');
        } else if (lastField === 'expected') {
          current.expected += (current.expected ? ' | ' : '') + line.replace(/^[-*]\s/,'');
        } else {
          current.steps += (current.steps ? ' | ' : '') + line.replace(/^[-*]\s/,'');
        }
        return;
      }

      // Continuation of last field
      if (lastField && lastField !== 'title' && lastField !== 'priority') {
        current[lastField === 'preconditions' ? 'preconditions' :
                lastField === 'expected'      ? 'expected'      : 'steps'] +=
          ' ' + line;
      }
    });

    flush();
    return rows;
  }

  function parseOneBlock(block, idCounter) {
    const lines   = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;

    // First line is always the header
    const headerLine = lines[0];
    const hm = headerLine.match(
      /^(?:#{1,3}\s*)?(?:(TC[-\s]?\d+|Test Case\s*\d+|\d+)[.:\-–]\s*)?(?:\[(UI|API)\]\s*)?(.+)/i
    );

    const row = {
      'ID':              hm?.[1] ? hm[1].replace(/\s/,'-').toUpperCase() : `TC-${String(idCounter).padStart(3,'0')}`,
      'Type':            hm?.[2]?.toUpperCase() || (/api|endpoint|request|http/i.test(headerLine) ? 'API' : 'UI'),
      'Title':           (hm?.[3] || headerLine).replace(/\*\*/g,'').trim(),
      'Preconditions':   '',
      'Steps':           '',
      'Expected Result': '',
      'Priority':        'Medium'
    };

    let lastField = null;
    lines.slice(1).forEach(line => {
      if (/^pre-?conditions?[:\s]/i.test(line)) {
        row['Preconditions'] = line.replace(/^pre-?conditions?[:\s]*/i,'').trim();
        lastField = 'Preconditions';
      } else if (/^steps?[:\s]/i.test(line)) {
        row['Steps'] = line.replace(/^steps?[:\s]*/i,'').trim();
        lastField = 'Steps';
      } else if (/^(?:expected\s*results?|expected)[:\s]/i.test(line)) {
        row['Expected Result'] = line.replace(/^(?:expected\s*results?|expected)[:\s]*/i,'').trim();
        lastField = 'Expected Result';
      } else if (/^priority[:\s]/i.test(line)) {
        row['Priority'] = line.replace(/^priority[:\s]*/i,'').trim();
        lastField = null;
      } else if (/^\d+[.)]\s/.test(line)) {
        row['Steps'] += (row['Steps'] ? ' | ' : '') + line;
        lastField = 'Steps';
      } else if (/^[-*]\s/.test(line)) {
        const clean = line.replace(/^[-*]\s/,'');
        const target = lastField === 'Expected Result' ? 'Expected Result' : 'Steps';
        row[target] += (row[target] ? ' | ' : '') + clean;
      } else if (lastField && lastField !== 'Priority') {
        row[lastField] += ' ' + line;
      }
    });

    // Must have at least a title to be valid
    return row['Title'] ? row : null;
  }

  function csvCell(val) {
    const str = String(val).replace(/\r?\n/g,' ');
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g,'""') + '"';
    }
    return str;
  }

  /* ── Claude API ───────────────────────────────────────── */
  async function callClaude(apiKey, system, user, messages) {
    if (window.electronAPI?.callClaude) {
      const userContent = messages
        ? messages.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n---\n\n')
        : user;
      return window.electronAPI.callClaude({ apiKey, system, user: userContent });
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 8000,
        system,
        messages:   messages ?? [{ role: 'user', content: user }]
      })
    });
    if (!res.ok) {
      let msg = `API error ${res.status}`;
      try { msg = (await res.json())?.error?.message ?? msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.content?.length) throw new Error('Empty response from Claude');
    return data.content.map(b => b.text || '').join('');
  }

  /* ── Run Agent ────────────────────────────────────────── */
  runBtn?.addEventListener('click', startAgent);

  async function startAgent() {
    const apiKey  = apiKeyInput?.value.trim() ?? '';
    const baseUrl = $('baseUrl')?.value.trim() ?? '';
    const req = getRequirementsText();
    const moduleText = $('modules')?.value ?? '';
    const modules = moduleText.split('\n').map(m => m.trim()).filter(Boolean);

    if (!apiKey)        { showToast('Enter your Claude API key');        return; }
    if (!baseUrl)       { showToast('Enter the application base URL');   return; }
    if (!req) { showToast('Upload a requirements file or paste requirements'); return; }
    if (!modules.length){ showToast('Enter at least one module name');   return; }
    if (running)        return;

    running = true;
    results = { 0: null, 1: null, 2: null, 3: null };

    // Reset UI panels
    [0,1,2,3].forEach(i => {
      setStepState(i, 'idle');
      $('tab-'+i)?.classList.remove('done');
      $('empty-'+i)?.removeAttribute('hidden');
      const c = $('content-'+i);
      if (c) { c.setAttribute('hidden',''); c.innerHTML = ''; }
    });
    if (copyBtn)  copyBtn.disabled  = true;
    if (saveBtn)  saveBtn.disabled  = true;
    if (runBtn)   runBtn.disabled   = true;
    if (runLabel) runLabel.textContent   = 'Running…';
    if (runIcon)  runIcon.style.display  = 'none';
    if (spinIcon) spinIcon.style.display = '';
    progressWrap?.removeAttribute('hidden');
    setProgress(0, 'Starting…');

    // Accumulated results across all modules
    const allTestCases  = [];
    const allFramework  = [];
    const allScripts    = [];
    const allHealReport = [];

    // Ask user to pick the output folder once, upfront
    let folderPath = null;
    if (window.electronAPI?.pickFolder) {
      folderPath = await window.electronAPI.pickFolder();
      if (!folderPath) {
        running = false;
        if (runBtn)   runBtn.disabled        = false;
        if (runLabel) runLabel.textContent   = 'Run Agent';
        if (runIcon)  runIcon.style.display  = '';
        if (spinIcon) spinIcon.style.display = 'none';
        return;
      }
    }

    try {

      // ── Generate shared project files first ──────────────
      const sharedOutput = await generateSharedFiles(apiKey, baseUrl, folderPath);
      allFramework.push(sharedOutput);

      for (let m = 0; m < modules.length; m++) {
        const moduleName = modules[m];
        const pct = Math.round((m / modules.length) * 100);
        setProgress(pct, `Module ${m+1}/${modules.length}: ${moduleName}`);

        await runModulePipeline({
          moduleName,
          apiKey,
          baseUrl,
          req,
          folderPath,
          moduleIndex: m,
          totalModules: modules.length,
          allTestCases,
          allFramework,
          allScripts,
          allHealReport
        });
      }

      // Merge all module results into the four display panels
      results[0] = allTestCases.join('\n\n---\n\n');
      results[1] = allFramework.join('\n\n');
      results[2] = allScripts.join('\n\n');
      results[3] = allHealReport.join('\n\n---\n\n');

      [0,1,2,3].forEach(i => {
        if (results[i]) {
          setStepState(i, 'done');
          $('tab-'+i)?.classList.add('done');
          renderPanel(i, results[i]);
        }
      });

      setProgress(100, `All ${modules.length} module(s) complete ✓`);
      showToast(`✓ Done — ${modules.length} module(s) generated`);
      switchTab(0);

      // Show Excel download button now that test cases exist
      $('excelWrap')?.removeAttribute('hidden');

    } catch (err) {
      [0,1,2,3].forEach(i => setStepState(i, 'error'));
      showToast('Error: ' + err.message);
      console.error('Agent error:', err);
    }

    running = false;
    if (runBtn)   runBtn.disabled        = false;
    if (runLabel) runLabel.textContent   = 'Run Agent';
    if (runIcon)  runIcon.style.display  = '';
    if (spinIcon) spinIcon.style.display = 'none';
  }

  /* ── Per-module pipeline ────────────────────────────────── */
  async function runModulePipeline({
    moduleName, apiKey, baseUrl, req, folderPath,
    moduleIndex, totalModules,
    allTestCases, allFramework, allScripts, allHealReport
  }) {
    const base = Math.round((moduleIndex / totalModules) * 100);
    const step = Math.round((1   / totalModules) * 100);

    const log = (msg) => {
      setProgress(base, `[${moduleName}] ${msg}`);
      console.log(`[${moduleName}]`, msg);
    };

    // ── Phase 1: Test cases ────────────────────────────────
    setStepState(0, 'running');
    log('Generating test cases…');
    const testCases = await callClaude(apiKey,
      `You are a senior QA engineer. Generate structured test cases for ONE module only.
Format each as:
TC-N: [UI] or [API] Title
Preconditions: …
Steps: 1. … 2. …
Expected Result: …
Priority: High | Medium | Low
Generate maximum 50 test cases. Cover happy paths, edge cases, and error scenarios.`,
      `Module: ${moduleName}\n\nRequirements:\n${req}\n\nBase URL: ${baseUrl}\n\n` +
      `Generate test cases for the "${moduleName}" module ONLY.`
    );
    allTestCases.push(`# ${moduleName}\n\n${testCases}`);
    setStepState(0, 'done');

    // ── Phase 2: Framework config files ───────────────────
    setStepState(1, 'running');
    log('Generating config files…');
    const configFiles = await callClaude(apiKey,
      `You are a test automation architect. Output Cypress 13 files for ONE module.
CRITICAL: Use ONLY this exact format — no other text outside markers:
===FILE: path/filename===
file content here
===ENDFILE===`,
      `Module: ${moduleName}\nBase URL: ${baseUrl}\n\n` +
      `Output ONLY these files for the ${moduleName} module:\n` +
      `1. cypress/pages/${moduleName.replace(/\s+/g,'')}/index.js  (page object)\n` +
      `2. cypress/fixtures/${moduleName.toLowerCase().replace(/\s+/g,'-')}.json  (test data)\n` +
      `3. cypress/support/${moduleName.toLowerCase().replace(/\s+/g,'-')}-commands.js  (custom commands)`
    );
    allFramework.push(configFiles);

    // ── Phase 3: Test scripts ──────────────────────────────
    log('Generating test scripts…');
    const scripts = await callClaude(apiKey,
      `You are a Cypress automation engineer. Write runnable Cypress spec files for ONE module.
CRITICAL: Use ONLY this exact format — no other text outside markers:
===FILE: path/filename===
file content here
===ENDFILE===`,
      `Module: ${moduleName}\nBase URL: ${baseUrl}\n\n` +
      `Test Cases:\n${testCases.substring(0, 1200)}\n\n` +
      `Output ONLY these spec files for the ${moduleName} module:\n` +
      `1. cypress/e2e/${moduleName.toLowerCase().replace(/\s+/g,'-')}/happy-path.cy.js\n` +
      `2. cypress/e2e/${moduleName.toLowerCase().replace(/\s+/g,'-')}/edge-cases.cy.js`
    );
    allScripts.push(scripts);
    setStepState(1, 'done');

    // ── Phase 4: Self-heal ─────────────────────────────────
    setStepState(2, 'running');
    log('Healing locators…');
    const healReport = await callClaude(apiKey,
      `You are a test resilience engineer. Analyse Cypress specs and produce a self-healing report.
For every fragile selector output:
STALE: <original>
REASON: why fragile
✓ HEALED: <better selector>
STRATEGY: data-cy | aria | text | composite`,
      `Module: ${moduleName}\n\nSpecs:\n${scripts.substring(0, 1400)}\n\n` +
      `Flag fragile selectors. Propose healing chain: data-cy > aria > text > CSS.`
    );
    allHealReport.push(`# ${moduleName}\n\n${healReport}`);
    setStepState(2, 'done');
    setStepState(3, 'done');

    // ── Write files to disk immediately ───────────────────
    if (folderPath && window.electronAPI?.writeFiles) {
      const allFiles = [
        ...parseFrameworkFiles(configFiles),
        ...parseFrameworkFiles(scripts)
      ];

      // Also write test cases as markdown
      allFiles.push({
        name: `cypress/reports/test-cases-${moduleName.toLowerCase().replace(/\s+/g,'-')}.md`,
        content: `# ${moduleName} Test Cases\n\n${testCases}`
      });

      if (allFiles.length > 0) {
        const r = await window.electronAPI.writeFiles({ folderPath, allFiles });
        log(`✓ ${r.count} files written to disk`);
      }
    }

    setProgress(base + step, `✓ ${moduleName} complete`);
  }

  /* ── Generate shared project files (runs once) ──────────── */
  async function generateSharedFiles(apiKey, baseUrl, folderPath) {
    setProgress(0, 'Generating shared project files…');
    console.log('Generating shared project files…');

    const sharedConfig = await callClaude(apiKey,
      `You are a test automation architect. Output shared Cypress 13 project config files.
CRITICAL: Use ONLY this exact format — no other text outside markers:
===FILE: path/filename===
file content here
===ENDFILE===`,
      `Base URL: ${baseUrl}

Output ONLY these 6 shared project-level files:
1. package.json — include cypress@13, @faker-js/faker, cypress-axe, dotenv
2. cypress.config.js — baseUrl set to ${baseUrl}, retries:2, video:false, specPattern: cypress/e2e/**/*.cy.js
3. cypress/support/e2e.js — global hooks, import commands, axe setup
4. cypress/support/commands.js — cy.login(), cy.apiRequest(), cy.healLocator()
5. cypress/utils/selfHeal.js — healing chain: data-cy > aria-label > text > CSS > positional, logs which succeeded
6. .env.example — BASE_URL, USERNAME, PASSWORD, API_KEY vars
7. README.md — setup steps: npm install, npx cypress open, env setup, folder structure explanation`
    );

    const files = parseFrameworkFiles(sharedConfig);
    console.log('Shared files parsed:', files.map(f => f.name));

    if (folderPath && window.electronAPI?.writeFiles && files.length > 0) {
      const r = await window.electronAPI.writeFiles({ folderPath, allFiles: files });
      console.log(`✓ ${r.count} shared files written`);
      showToast(`✓ Shared config files written (${r.count} files)`);
    }

    return sharedConfig;
  }

  /* ══════════════════════════════════════════════════════════
     CHAT
     ══════════════════════════════════════════════════════════ */

  console.log('Wiring chat | chatFab:', !!chatFab, '| chatSendBtn:', !!chatSendBtn);

  function openChat() {
    chatDrawer?.classList.add('open');
    chatBackdrop?.classList.add('visible');
    chatFab?.classList.add('hidden');
    setTimeout(() => chatInput?.focus(), 300);
  }

  function closeChat() {
    chatDrawer?.classList.remove('open');
    chatBackdrop?.classList.remove('visible');
    chatFab?.classList.remove('hidden');
  }

  chatFab?.addEventListener('click',       openChat);
  chatClose?.addEventListener('click',     closeChat);
  chatBackdrop?.addEventListener('click',  closeChat);

  chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  chatSendBtn?.addEventListener('click', () => {
    console.log('Send clicked');
    sendChatMessage();
  });

  function sendSuggestion(btn) {
    if (!chatInput) return;
    chatInput.value = btn.textContent.trim();
    sendChatMessage();
  }
  window.sendSuggestion = sendSuggestion;

  function buildChatContext() {
    const parts = [];
    if (results[1]) parts.push('=== CYPRESS FRAMEWORK ===\n' + results[1]);
    if (results[2]) parts.push('=== TEST SCRIPTS ===\n'      + results[2]);
    if (results[0]) parts.push('=== TEST CASES ===\n'        + results[0].substring(0,600));
    return parts.length ? parts.join('\n\n') : 'No files generated yet — run the agent first.';
  }

  function formatChatText(raw) {
    let s = String(raw).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    s = s.replace(/===FILE:\s*([\w./:-]+)===\n?([\s\S]*?)===ENDFILE===/g,
      (_,fname,code) =>
        `<div style="margin:6px 0">` +
        `<div style="font-size:10.5px;font-weight:600;color:#00d4aa;font-family:monospace;margin-bottom:3px">${fname}</div>` +
        `<pre>${code.trim()}</pre></div>`);
    s = s.replace(/```[\w.-]*\n?([\s\S]*?)```/g, (_,c) => `<pre>${c.trim()}</pre>`);
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const parts = s.split(/(<pre>[\s\S]*?<\/pre>)/);
    return parts.map((p,i) => i % 2 === 0 ? p.replace(/\n/g,'<br>') : p).join('');
  }

  function appendChatMessage(role, text) {
    $('chatWelcome')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + role;
    const lbl = document.createElement('div');
    lbl.className = 'chat-msg-role';
    lbl.textContent = role === 'user' ? 'You' : 'AI Assistant';
    const body = document.createElement('div');
    body.className = 'chat-msg-body';
    body.innerHTML = formatChatText(text);
    wrap.appendChild(lbl);
    wrap.appendChild(body);
    if (role === 'assistant' && text.includes('===FILE:')) {
      const btn = document.createElement('button');
      btn.className = 'chat-apply-btn';
      btn.textContent = 'Save fixed files to disk';
      btn.addEventListener('click', () => applyFixedFiles(text));
      wrap.appendChild(btn);
    }
    chatMessages?.appendChild(wrap);
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showChatTyping() {
    if (!chatMessages) return;
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg assistant';
    wrap.id = 'chatTyping';
    const lbl = document.createElement('div');
    lbl.className = 'chat-msg-role';
    lbl.textContent = 'AI Assistant';
    const dots = document.createElement('div');
    dots.className = 'chat-typing';
    dots.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(lbl);
    wrap.appendChild(dots);
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeChatTyping() { $('chatTyping')?.remove(); }

  async function sendChatMessage() {
    const text   = chatInput?.value.trim();
    const apiKey = apiKeyInput?.value.trim() ?? '';
    console.log('sendChatMessage | text:', text?.substring(0,30), '| apiKey set:', !!apiKey);
    if (!text)   { showToast('Type a message first'); return; }
    if (!apiKey) { showToast('Enter your Claude API key in the sidebar'); return; }
    if (chatInput)   { chatInput.value = ''; chatInput.style.height = 'auto'; }
    if (chatSendBtn) chatSendBtn.disabled = true;
    appendChatMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    showChatTyping();
    const system =
      `You are an expert Cypress automation engineer fixing bugs in a generated test framework.\n\n` +
      `When fixing bugs:\n` +
      `1. Output fixed files using ===FILE: path=== ... ===ENDFILE=== format\n` +
      `2. Fix only files that need changes\n` +
      `3. Briefly explain what was wrong\n\n` +
      `GENERATED CODE CONTEXT:\n${buildChatContext()}`;
    try {
      const reply = await callClaude(apiKey, system, null, chatHistory);
      removeChatTyping();
      chatHistory.push({ role: 'assistant', content: reply });
      appendChatMessage('assistant', reply);
    } catch (err) {
      removeChatTyping();
      chatHistory.pop();
      appendChatMessage('assistant', `Error: ${err.message}`);
      console.error('Chat error:', err);
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput?.focus();
  }

  async function applyFixedFiles(text) {
    const fixed = parseFrameworkFiles(text);
    if (fixed.length === 0) {
      await navigator.clipboard.writeText(text).catch(() => {});
      showToast('No file markers found — copied to clipboard');
      return;
    }
    if (!window.electronAPI?.pickFolder) {
      await navigator.clipboard.writeText(text).catch(() => {});
      showToast(`${fixed.length} file(s) copied to clipboard`);
      return;
    }
    const folderPath = await window.electronAPI.pickFolder();
    if (!folderPath) return;
    try {
      const r = await window.electronAPI.writeFiles({ folderPath, allFiles: fixed });
      showToast(`✓ ${r.count} fixed file${r.count === 1 ? '' : 's'} saved`);
    } catch (err) { showToast('Save failed: ' + err.message); }
  }

  console.log('renderer.js fully initialised ✓');

}); // end DOMContentLoaded