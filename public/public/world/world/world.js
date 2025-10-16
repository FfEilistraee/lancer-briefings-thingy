const WorldUtil = (() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const qs = new URLSearchParams(location.search);

  async function getIndex() {
    const res = await fetch('/world/world-index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('world-index.json missing');
    return res.json();
  }

  function mdLite(text = '') {
    // extremely small markdown: **bold**, *italics*, lists, newlines
    return text
      .replace(/\n\* /g, '\n- ') // normalize bullets
      .split('\n')
      .map((line) => {
        if (line.startsWith('- ')) return `<li>${inline(line.slice(2))}</li>`;
        return `<p>${inline(line)}</p>`;
      })
      .join('\n')
      .replace(/(<li>.*<\/li>)(?!\s*<li>)/gs, '<ul>$1</ul>');

    function inline(s) {
      return s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
    }
  }

  function h(tag, attrs = {}, children = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (typeof children === 'string') el.innerHTML = children;
    else if (Array.isArray(children)) children.forEach((c) => el.appendChild(c));
    return el;
  }

  function toCard(type, item) {
    const url = `/world/detail.html?type=${type}&slug=${encodeURIComponent(item.slug)}`;
    const img = item.image ? `<img src="${item.image}" alt="${item.name}">` : '';
    const badges = [];
    if (type === 'characters' && item.roleType) badges.push(`<span class="badge">${item.roleType}</span>`);
    if (type === 'factions' && item.category) badges.push(`<span class="badge">${item.category}</span>`);
    const tags = (item.tags || []).map((t) => `<span class="badge tag">${t}</span>`).join('');
    return h('a', { class: 'card', href: url }, `${img}<h3>${item.name}</h3><p>${item.summary || ''}</p>${badges.join('')}${tags}`);
  }

  function kvTable(obj, keys) {
    const wrap = h('div', { class: 'kv' });
    keys.forEach(([label, path]) => {
      const value = path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
      if (value === undefined || value === null || value === '') return;
      const v = Array.isArray(value) ? value.join(', ') : String(value);
      wrap.appendChild(h('div', { class: 'k' }, label));
      wrap.appendChild(h('div', { class: 'v' }, v));
    });
    return wrap.outerHTML;
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Missing JSON: ${path}`);
    return res.json();
  }

  return { $, $$, qs, getIndex, mdLite, toCard, kvTable, fetchJSON };
})();

const WorldIndexPage = (() => {
  async function init() {
    const data = await WorldUtil.getIndex();
    const search = WorldUtil.$('#search');
    const typeSel = WorldUtil.$('#filterType');
    const sortBy = WorldUtil.$('#sortBy');
    const grid = WorldUtil.$('#grid');

    async function render() {
      const type = typeSel.value;
      const q = (search.value || '').toLowerCase();
      const items = (data[type] || [])
        .filter((i) => !q || `${i.name} ${i.roleType || ''} ${(i.tags || []).join(' ')}`.toLowerCase().includes(q))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      grid.innerHTML = '';
      items.forEach((i) => grid.appendChild(WorldUtil.toCard(type, i)));
    }

    ['input', 'change'].forEach((ev) => {
      search.addEventListener(ev, render);
      typeSel.addEventListener(ev, render);
      sortBy.addEventListener(ev, render);
    });

    // hash navigation shortcut
    if (location.hash === '#factions') typeSel.value = 'factions';

    render();
  }

  return { init };
})();

const WorldDetailPage = (() => {
  async function init() {
    const type = WorldUtil.qs.get('type');
    const slug = WorldUtil.qs.get('slug');
    const title = WorldUtil.$('#title');
    const el = WorldUtil.$('#detail');

    if (!type || !slug) {
      el.innerHTML = '<p>Missing type or slug.</p>';
      return;
    }

    const data = await WorldUtil.fetchJSON(`/world/entries/${type}/${slug}.json`);
    title.textContent = data.name;

    const img = data.image ? `<img src="${data.image}" alt="${data.name}">` : '';

    const charKeys = [
      ['Title', 'title'],
      ['Occupation', 'occupation'],
      ['Role', 'roleType'],
      ['Age', 'age'],
      ['Race', 'race'],
      ['Origin', 'origin'],
      ['Ethnicity', 'ethnicity'],
      ['Languages', 'languages'],
      ['Status', 'status'],
      ['Affiliations', 'affiliations']
    ];

    const factionKeys = [
      ['Category', 'category'],
      ['Status', 'status'],
      ['HQ', 'headquarters'],
      ['Territory', 'territory'],
      ['Affiliations', 'affiliations'],
      ['Rivals', 'rivals']
    ];

    const keys = type === 'characters' ? charKeys : factionKeys;

    const relations = (data.relations || [])
      .map((r) => `<li><strong>${r.type}</strong> — ${r.with}${r.note ? `: ${r.note}` : ''}</li>`)
      .join('');

    el.innerHTML = `
      <div class="hero">
        ${img}
        <div>
          <h2>${data.name}</h2>
          <div>${WorldUtil.kvTable(data, keys)}</div>
          ${(data.tags || []).map((t) => `<span class="badge tag">${t}</span>`).join('')}
        </div>
      </div>
      ${relations ? `<h3>Relations</h3><ul>${relations}</ul>` : ''}
      <h3>Description</h3>
      <div class="markdown">${WorldUtil.mdLite(data.description)}</div>
    `;
  }

  return { init };
})();
