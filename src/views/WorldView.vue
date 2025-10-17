<template>
  <div id="worldView" :class="{ animate: props.animate }" class="content-container">
    <!-- LIST / GLOSSARY -->
    <section id="world" class="section-container">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/npc.svg" />
        <h1>ATLAS</h1>
      </div>

      <div class="section-content-container">
        <nav class="world-tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['world-tab', { active: activeTab === tab.value }]"
            role="tab"
            @click="setActiveTab(tab.value)"
          >
            {{ tab.label }}
            <span class="world-tab-count">{{ tab.count }}</span>
          </button>
        </nav>

        <!-- Filters -->
        <div class="world-filters">
          <input
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder"
            class="world-input"
          />
        </div>

        <div
          class="events-list-container"
          :class="{ 'show-placeholder': !visibleEntries.length }"
          style="overflow:auto"
        >
          <p v-if="!visibleEntries.length" class="empty-placeholder">
            No {{ emptyNoun }} logged yet. Drop a new markdown file inside
            <code>{{ tabDirectoryHint }}</code> and reload.
          </p>
          <WorldEntry
            v-for="entry in visibleEntries"
            :key="entry.slug"
            :entry="entry"
            :animate="props.animate"
            @select-entry="selectEntry"
          />
        </div>
      </div>
    </section>

    <!-- DETAILS / ARTICLE -->
    <section v-if="selectedEntry" id="world-detail" class="section-container">
      <div class="section-header clipped-medium-backward-events-logs">
        <img src="/icons/conversation.svg" />
        <h1>FILE</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <!-- Make the reading area WIDE with `world-wide` -->
      <div class="section-content-container extra-margins world-wide">
        <!-- WIDE ARTICLE + INFOBOX (Wikipedia style) -->
        <article class="wiki-article">
          <header class="wiki-header">
            <h1 class="entry-type">
              {{ selectedEntry.type }}
              <span v-if="selectedEntry.tags && selectedEntry.tags.length"> // {{ selectedEntry.tags.join(', ') }}</span>
            </h1>
            <h2 class="entry-title">{{ selectedEntry.name }}</h2>
          </header>

          <!-- Main body -->
          <section class="wiki-body" @click="handleMarkdownClick">
            <VueMarkdownIt :source="selectedEntry.content" class="markdown" />
            <div v-if="selectedEntry.tags && selectedEntry.tags.length" class="tag-chips">
              <span class="tag-chip" v-for="t in selectedEntry.tags" :key="t" @click="query = t">{{ t }}</span>
            </div>
          </section>

          <!-- Right infobox -->
          <aside class="infobox">
            <img class="infobox-image" :src="selectedEntry.thumbnail || '/icons/portrait.svg'" alt="thumbnail" />
            <table class="infobox-table">
              <tbody>
                <tr v-for="row in infoboxRows" :key="row.label">
                  <th class="infobox-label">{{ row.label }}</th>
                  <td class="infobox-value">
                    <template v-if="Array.isArray(row.value)">
                      <span v-for="(v,i) in row.value" :key="i">
                        <a href="#" @click.prevent="query = String(v)">{{ v }}</a><span v-if="i < row.value.length - 1">, </span>
                      </span>
                    </template>
                    <template v-else>{{ row.value }}</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </aside>
        </article>
      </div>
    </section>

    <transition name="tooltip-fade">
      <div
        v-if="tooltip.visible && tooltip.entry"
        class="wiki-tooltip"
        :style="tooltipStyle"
      >
        <div class="wiki-tooltip__header">
          <img
            v-if="tooltip.entry.thumbnail"
            class="wiki-tooltip__image"
            :src="tooltip.entry.thumbnail"
            :alt="tooltip.entry.name"
          />
          <div>
            <p class="wiki-tooltip__type">{{ tooltip.entry.type }}</p>
            <h3 class="wiki-tooltip__title">{{ tooltip.entry.name }}</h3>
          </div>
        </div>
        <p v-if="tooltip.entry.summary" class="wiki-tooltip__summary">{{ tooltip.entry.summary }}</p>
        <ul v-if="tooltip.entry.quickFacts.length" class="wiki-tooltip__facts">
          <li v-for="fact in tooltip.entry.quickFacts" :key="fact.label">
            <span class="wiki-tooltip__fact-label">{{ fact.label }}:</span>
            <span class="wiki-tooltip__fact-value">{{ fact.value }}</span>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import WorldEntry from '@/components/WorldEntry.vue'

const props = defineProps({ animate: { type: Boolean, required: true } })

// Data
const TAB_CONFIG = [
  {
    label: 'Personnel Dossiers',
    value: 'people',
    placeholder: 'Search pilots, fixers, civilian contacts…',
    directory: 'src/assets/world/npcs',
    emptyNoun: 'dossier',
  },
  {
    label: 'Power Index',
    value: 'power',
    placeholder: 'Search corps, houses, resistance cells…',
    directory: 'src/assets/world/factions',
    emptyNoun: 'faction file',
  },
  {
    label: 'World Log',
    value: 'world',
    placeholder: 'Search planets, moons, and sectors…',
    directory: 'src/assets/world/planets',
    emptyNoun: 'world log',
  },
  {
    label: 'Gate Registry',
    value: 'gate',
    placeholder: 'Search stations, rings, and waypoints…',
    directory: 'src/assets/world/stations',
    emptyNoun: 'gate record',
  },
]

const entries = ref([])
const codexEntries = ref([])
const selectedEntry = ref(null)
const query = ref('')
const activeTab = ref(TAB_CONFIG[0].value)

// Infobox fields (others still searchable)
const INFOBOX_ORDER = ['aliases','gender','race','age','height','origin','ethnicity','occupation','title','languages','status','affiliations','location']
const BASE_KEYS = new Set(['slug','name','type','tags','thumbnail','content','sourcePath','summary','quickFacts','category'])

const slugIndex = computed(() => {
  const index = {}
  entries.value.forEach(entry => { index[entry.slug] = entry })
  codexEntries.value.forEach(entry => { index[entry.slug] = entry })
  return index
})

const filteredEntries = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter(e => e.category === activeTab.value)
    .filter(e => {
      if (!q) return true
      const searchable = [e.name, e.type, ...(e.tags || []), e.content]
      Object.entries(e).forEach(([k, v]) => {
        if (!BASE_KEYS.has(k) && v) searchable.push(Array.isArray(v) ? v.join(' ') : String(v))
      })
      return searchable.join(' ').toLowerCase().includes(q)
    })
})

const visibleEntries = computed(() => filteredEntries.value)

const activeTabConfig = computed(() => TAB_CONFIG.find(t => t.value === activeTab.value) || TAB_CONFIG[0])

const searchPlaceholder = computed(() => activeTabConfig.value?.placeholder || 'Search the archive…')

const tabDirectoryHint = computed(() => activeTabConfig.value?.directory || 'src/assets/world')

const emptyNoun = computed(() => activeTabConfig.value?.emptyNoun || 'entry')

const tabs = computed(() =>
  TAB_CONFIG.map(tab => ({
    ...tab,
    count: entries.value.filter(entry => entry.category === tab.value).length,
  }))
)

const infoboxRows = computed(() => {
  if (!selectedEntry.value) return []
  const s = selectedEntry.value
  const rows = []
  const used = new Set()
  for (const k of INFOBOX_ORDER) {
    const v = s[k]
    const ok = v !== undefined && v !== null && (Array.isArray(v) ? v.length : String(v).trim())
    if (ok) { rows.push({ label: labelize(k), value: v }); used.add(k) }
  }
  Object.entries(s).forEach(([k, v]) => {
    if (BASE_KEYS.has(k) || used.has(k)) return
    if (v === undefined || v === null) return
    const text = Array.isArray(v) ? v.join('').trim() : String(v).trim()
    if (!text) return
    rows.push({ label: labelize(k), value: v })
  })
  return rows
})

function labelize(key) {
  return key.replace(/[_-]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^\w|\s\w/g, c => c.toUpperCase())
}

const tooltip = ref({ visible: false, x: 0, y: 0, entry: null })

const tooltipStyle = computed(() => ({
  top: `${tooltip.value.y}px`,
  left: `${tooltip.value.x}px`
}))

function setActiveTab(tab) {
  activeTab.value = tab
  query.value = ''
  const first = entries.value.find(e => e.category === tab)
  if (first) {
    selectEntry(first)
  } else {
    hideTooltip()
    selectedEntry.value = null
  }
}

function hideTooltip() {
  tooltip.value = { visible: false, x: 0, y: 0, entry: null }
}

function showTooltipForSlug(slug, position) {
  const entry = slugIndex.value[slug]
  if (!entry) {
    hideTooltip()
    return
  }
  tooltip.value = {
    visible: true,
    x: position.x,
    y: position.y,
    entry: {
      name: entry.name,
      type: entry.type,
      thumbnail: entry.thumbnail,
      summary: entry.summary,
      quickFacts: entry.quickFacts || []
    }
  }
}

function attachWikiLinkEvents() {
  if (!selectedEntry.value) return
  const container = document.querySelector('#world-detail .wiki-body')
  if (!container) return
  if (!container.dataset.tooltipBound) {
    container.addEventListener('scroll', hideTooltip, { passive: true })
    container.addEventListener('mouseleave', hideTooltip)
    container.dataset.tooltipBound = 'true'
  }
  const links = Array.from(container.querySelectorAll('a[href^="wiki:"]'))
  links.forEach(link => {
    const slug = link.getAttribute('href').slice(5)
    const resolved = !!slugIndex.value[slug]
    link.classList.toggle('wiki-link-resolved', resolved)
    link.classList.toggle('wiki-link-unresolved', !resolved)
    link.dataset.wikiResolved = resolved ? 'true' : 'false'

    if (!resolved) {
      link.dataset.wikiBound = 'false'
      return
    }

    if (link.dataset.wikiBound === 'true') return

    link.dataset.wikiBound = 'true'
    link.addEventListener('mouseenter', event => {
      const pos = {
        x: event.clientX + 16,
        y: event.clientY + 24
      }
      showTooltipForSlug(slug, pos)
    })
    link.addEventListener('mousemove', event => {
      if (!tooltip.value.visible) return
      tooltip.value = {
        ...tooltip.value,
        x: event.clientX + 16,
        y: event.clientY + 24
      }
    })
    link.addEventListener('mouseleave', hideTooltip)
  })
}

watch(selectedEntry, async () => {
  hideTooltip()
  await nextTick()
  attachWikiLinkEvents()
})

// ---------- Front-matter + Obsidian helpers (no deps) ----------
function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) return { data: null, content: raw }
  const end = raw.indexOf('\n---')
  if (end === -1) return { data: null, content: raw }
  const fm = raw.slice(3, end).trim()
  const content = raw.slice(end + 4).replace(/^\s*\n/, '')

  const data = {}
  const lines = fm.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!m) { i++; continue }
    const key = m[1]; let val = m[2].trim()

    // block list
    if (val === '') {
      const arr = []; let j = i + 1
      while (j < lines.length) {
        const li = lines[j]; const t = li.trim()
        if (t.startsWith('- ')) { arr.push(t.slice(2).trim()); j++; continue }
        if (li.startsWith('  ') || li.startsWith('\t')) { j++; continue }
        break
      }
      if (arr.length) { data[key] = arr; i = j; continue }
    }
    // inline array
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim()
      data[key] = inner ? inner.split(',').map(s => s.trim()).filter(Boolean) : []
      i++; continue
    }
    // comma list (unless quoted)
    if (val.includes(',') && !(val.startsWith('"') || val.startsWith("'"))) {
      data[key] = val.split(',').map(s => s.trim()).filter(Boolean)
      i++; continue
    }
    // strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    data[key] = val; i++
  }
  return { data, content }
}

function slugify(s) {
  return String(s || '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
function normalizeArray(val) { return !val ? [] : (Array.isArray(val) ? val : String(val).split(',').map(s=>s.trim()).filter(Boolean)) }

function transformWikiLinks(md) {
  // [[Target|Label]] or [[Target]] → markdown link with custom scheme: wiki:slug
  return md.replace(/\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const t = String(target).trim()
    const text = label ? String(label).trim() : t
    const slug = slugify(t)
    return `[${text}](wiki:${slug})`
  })
}
function transformWikiImages(md) {
  // ![[File.png|anything]] → ![File](/world/File.png)
  return md.replace(/!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g, (_, file) => {
    const name = String(file).trim(); const alt = name.replace(/\.[^/.]+$/, '')
    return `![${alt}](/world/${name})`
  })
}
function extractInfobox(md, meta) {
  // Remove an Obsidian infobox block and capture rows
  const lines = md.split('\n'); const out = []; let i = 0; const collected = []
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('> [!infobox]')) {
      i++
      while (i < lines.length && lines[i].trim().startsWith('>')) { collected.push(lines[i]); i++ }
      continue
    }
    out.push(line); i++
  }
  const kv = {}
  collected.forEach(l => {
    const t = l.replace(/^>\s?/, '')
    if (/^!\[\[/.test(t)) { const m = t.match(/^!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/); if (m) kv.__thumbnail = `/world/${m[1]}`; return }
    if (t.includes('|')) {
      const parts = t.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length === 2 && !/^[-]+$/.test(parts[0])) {
        const key = slugify(parts[0]).replace(/-/g,' '); const label = key.replace(/\b\w/g, c=>c.toUpperCase())
        kv[label.toLowerCase()] = parts[1]
      }
    }
  })
  const merged = { ...meta }
  const map = { 'other names':'aliases','gender':'gender','race':'race','age':'age','height':'height','origin':'origin','ethnicity':'ethnicity','occupation':'occupation','title':'title','languages':'languages','status':'status','affiliations':'affiliations','location':'location' }
  Object.entries(map).forEach(([from,to]) => { if (kv[from] !== undefined) merged[to] = /,/.test(kv[from]) ? kv[from].split(',').map(s=>s.trim()).filter(Boolean) : kv[from] })
  if (kv.__thumbnail && !merged.thumbnail) merged.thumbnail = kv.__thumbnail
  return { content: out.join('\n'), meta: merged }
}

function handleMarkdownClick(e) {
  const a = e.target.closest('a')
  if (!a) return
  const href = a.getAttribute('href') || ''
  if (!href.startsWith('wiki:')) return

  e.preventDefault()
  const slug = href.slice(5)
  const match = slugIndex.value[slug]
  if (!match) return
  if (match.category === 'codex') {
    showTooltipForSlug(slug, { x: e.clientX + 16, y: e.clientY + 24 })
    return
  }
  selectEntry(match)
}

function selectEntry(entry) {
  selectedEntry.value = entry
}

function detectCategory(sourcePath, type) {
  const lowerType = (type || '').toLowerCase()
  if (/world\/terms\//i.test(sourcePath) || lowerType === 'term' || lowerType.includes('codex')) return 'codex'
  if (/world\/factions\//i.test(sourcePath) || lowerType.includes('faction') || lowerType.includes('power')) return 'power'
  if (/world\/planets\//i.test(sourcePath) || lowerType.includes('world') || lowerType.includes('planet')) return 'world'
  if (/world\/stations\//i.test(sourcePath) || lowerType.includes('gate') || lowerType.includes('station')) return 'gate'
  return 'people'
}

function extractSummary(entry) {
  if (entry.summary) return Array.isArray(entry.summary) ? entry.summary.join(' ') : String(entry.summary)
  if (entry.tooltip) return Array.isArray(entry.tooltip) ? entry.tooltip.join(' ') : String(entry.tooltip)
  const raw = entry.content || ''
  const stripped = raw.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[#>*_`]/g, '')
  const sentence = stripped.split(/\n+/).map(line => line.trim()).filter(Boolean)[0] || ''
  return sentence.slice(0, 220) + (sentence.length > 220 ? '…' : '')
}

function buildQuickFacts(entry) {
  const quick = []
  const fields = entry.tooltipFacts || entry.infobox || null
  if (Array.isArray(fields)) {
    fields.forEach(f => {
      if (f && typeof f === 'string') {
        const [label, ...rest] = f.split(':')
        if (label && rest.length) quick.push({ label: label.trim(), value: rest.join(':').trim() })
      } else if (f && f.label && f.value) {
        quick.push({ label: f.label, value: f.value })
      }
    })
    if (quick.length) return quick
  } else if (fields && typeof fields === 'string') {
    const parts = fields.split('|').map(s => s.trim()).filter(Boolean)
    parts.forEach(part => {
      const [label, ...rest] = part.split(':')
      if (label && rest.length) quick.push({ label: label.trim(), value: rest.join(':').trim() })
    })
    if (quick.length) return quick
  }
  const candidates = ['role', 'rank', 'affiliations', 'location', 'status']
  candidates.forEach(key => {
    if (entry[key]) {
      const value = Array.isArray(entry[key]) ? entry[key].join(', ') : entry[key]
      quick.push({ label: labelize(key), value })
    }
  })
  return quick
}

function postProcessEntry(entry) {
  const category = detectCategory(entry.sourcePath || '', entry.type)
  const summary = extractSummary(entry)
  const quickFacts = buildQuickFacts(entry)
  return {
    ...entry,
    category,
    summary,
    quickFacts,
  }
}

async function loadEntries() {
  entries.value = []
  codexEntries.value = []
  const modules = {
    ...import.meta.glob('@/assets/world/**/*.md', { query: '?raw', import: 'default' }),
    ...import.meta.glob('/src/assets/world/**/*.md', { query: '?raw', import: 'default' }),
    ...import.meta.glob('/assets/world/**/*.md', { query: '?raw', import: 'default' }),
  }
  const fileEntries = Object.entries(modules)
  const loaded = await Promise.all(fileEntries.map(([path, loader]) => loader().then(mod => ({ path, mod }))))
  const seen = new Set()
  const slugSeen = new Set()
  loaded.forEach(({ path, mod }) => {
    if (seen.has(path)) return
    seen.add(path)
    const raw = typeof mod === 'string' ? mod : mod.default

    // 1) Front-matter (if any)
    let data = null, body = raw
    if (raw.startsWith('---')) { const fm = parseFrontMatter(raw); data = fm.data; body = fm.content }

    // 2) Obsidian transforms
    body = transformWikiImages(body)
    body = transformWikiLinks(body)
    const inf = extractInfobox(body, data || {})
    body = inf.content
    const meta = inf.meta || {}

    // 3) Build entry (fallback to simple 5-line header)
    let entry
    if (meta && (meta.name || meta.slug)) {
      entry = {
        slug: meta.slug || slugify(meta.name),
        name: meta.name || 'Untitled',
        type: meta.type || 'NPC',
        tags: normalizeArray(meta.tags),
        thumbnail: meta.thumbnail || '',
        content: body || '',
        sourcePath: path,
        ...Object.fromEntries(Object.entries(meta).filter(([k]) => !['slug','name','type','tags','thumbnail'].includes(k)))
      }
    } else {
      const lines = (raw || '').split('\n')
      entry = {
        slug: (lines[0] || '').trim(),
        name: (lines[1] || '').trim(),
        type: (lines[2] || 'NPC').trim(),
        tags: (lines[3] || '').split(',').map(s => s.trim()).filter(Boolean),
        thumbnail: (lines[4] || '').trim(),
        content: lines.slice(5).join('\n'),
        sourcePath: path,
      }
    }

    const processed = postProcessEntry(entry)
    const isDraft = typeof processed.draft === 'string' ? processed.draft.toLowerCase() === 'true' : !!processed.draft
    if (isDraft) return
    if (slugSeen.has(processed.slug)) return
    slugSeen.add(processed.slug)
    if (processed.category === 'codex') {
      codexEntries.value.push(processed)
      return
    }
    entries.value.push(processed)
  })
  entries.value.sort((a, b) => a.name.localeCompare(b.name))
  codexEntries.value.sort((a, b) => a.name.localeCompare(b.name))
  if (!entries.value.some(e => e.category === activeTab.value)) {
    const fallback = TAB_CONFIG.map(t => t.value).find(cat => entries.value.some(e => e.category === cat))
    if (fallback) activeTab.value = fallback
  }
  const initial = entries.value.find(e => e.category === activeTab.value) || entries.value[0] || null
  selectedEntry.value = initial
  if (!initial) hideTooltip()
  await nextTick()
  attachWikiLinkEvents()
}

loadEntries()

</script>

<style scoped>
/* Tabs */
.world-tabs {
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap:12px;
  width:100%;
  margin-bottom:16px;
}
.world-tab {
  position:relative;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  width:100%;
  padding:12px 18px;
  border:1px solid transparent;
  border-radius:16px;
  background:rgba(255,255,255,0.05);
  color:var(--text-color);
  letter-spacing:0.06em;
  text-transform:uppercase;
  font-size:0.78rem;
  cursor:pointer;
  transition:all 0.2s ease;
}
.world-tab:hover { border-color:var(--primary-color); background:rgba(255,255,255,0.08); }
.world-tab.active {
  border-color:var(--primary-color);
  background:var(--primary-color);
  color:#0b0d13;
  box-shadow:0 4px 12px rgba(0,0,0,0.3);
}
.world-tab-count {
  padding:4px 10px;
  border-radius:999px;
  background:rgba(0,0,0,0.35);
  font-weight:600;
  font-size:0.7rem;
  letter-spacing:0.08em;
}
.world-tab.active .world-tab-count {
  background:rgba(0,0,0,0.15);
}

/* Controls */
.world-filters {
  width:100%;
  margin-bottom:12px;
}
.world-input {
  padding:6px 10px; background:var(--secondary-color);
  border:1px solid var(--primary-color); color:var(--text-color);
  width:100%;
}
.events-list-container.show-placeholder { display:flex; align-items:center; justify-content:center; }
.empty-placeholder { opacity:0.7; font-style:italic; text-align:center; }
.empty-placeholder code { font-style:normal; background:rgba(0,0,0,0.2); padding:2px 6px; border-radius:4px; }

/* Make the ENTRY reading area wide */
#world.section-container {
  height: 714px;
  max-height: calc(100vh - 190px);
}

#world-detail.section-container {
  flex: 1 1 0;
  width: clamp(860px, 70vw, 1240px);
  margin: 50px 60px;
  min-width: 0;
  height: 714px;
  max-height: calc(100vh - 190px);
}
#world-detail .section-content-container {
  padding: 32px 36px;
  flex: 1;
  overflow-y: auto;
}
#world-detail .world-wide {
  width: 100%;
  max-width: none;
}
#world-detail .world-wide .event { width: 100%; max-width: none; }
#world-detail .world-wide .markdown { font-size: 1.05rem; line-height: 1.7; }

/* Two-column article layout */
.wiki-article {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 340px;
  gap: 16px 24px;
  align-items: start;
}
.wiki-header { grid-column: 1 / -1; }
.entry-type { font-size: 1rem; letter-spacing: .04em; opacity: .85; margin-bottom: .25rem; }
.entry-title { font-size: 2rem; line-height: 1.2; margin: 0 0 .75rem; }

.wiki-body { grid-column: 1; min-width: 560px; }
.markdown a.wiki-link-resolved {
  color: var(--primary-color);
  text-decoration-color: rgba(255, 255, 255, 0.55);
}
.markdown a.wiki-link-unresolved {
  color: rgba(255, 255, 255, 0.45);
  text-decoration-style: dashed;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  cursor: default;
}
.infobox { grid-column: 2; width: 100%; max-width: 340px; border: 1px solid var(--primary-color); background: var(--secondary-color); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.infobox-image { display:block; width:100%; height:auto; }
.infobox-table { width:100%; border-collapse: collapse; font-size: .95rem; }
.infobox-label { text-align:left; vertical-align: top; padding: 6px 8px; font-weight: 600; width: 34%; border-bottom: 1px solid rgba(255,255,255,.08); }
.infobox-value { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.08); }

/* Chips */
.tag-chips { margin-top: 8px; }
.tag-chip { display:inline-block; padding:2px 8px; border:1px solid var(--primary-color); border-radius:999px; font-size:.85rem; margin-right:6px; cursor:pointer; }

/* Tooltip */
.wiki-tooltip {
  position:fixed;
  max-width:320px;
  padding:14px 16px;
  background:rgba(12,14,22,0.95);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:12px;
  box-shadow:0 8px 18px rgba(0,0,0,0.45);
  pointer-events:none;
  z-index:6;
  backdrop-filter: blur(6px);
}
.wiki-tooltip__header { display:flex; gap:12px; align-items:center; margin-bottom:8px; }
.wiki-tooltip__image { width:64px; height:64px; object-fit:cover; border-radius:10px; border:1px solid rgba(255,255,255,0.12); }
.wiki-tooltip__type { font-size:0.7rem; letter-spacing:0.12em; text-transform:uppercase; opacity:0.75; margin:0 0 2px; }
.wiki-tooltip__title { margin:0; font-size:1.05rem; }
.wiki-tooltip__summary { margin:0 0 8px; font-size:0.85rem; line-height:1.4; opacity:0.88; }
.wiki-tooltip__facts { list-style:none; padding:0; margin:0; display:grid; gap:4px; }
.wiki-tooltip__fact-label { font-weight:600; margin-right:4px; }
.wiki-tooltip__fact-value { opacity:0.85; }
.tooltip-fade-enter-active, .tooltip-fade-leave-active { transition: opacity 0.18s ease; }
.tooltip-fade-enter-from, .tooltip-fade-leave-to { opacity:0; }

/* Mobile */
@media (max-width: 980px) {
  #worldView { flex-direction: column; }
  #world.section-container,
  #world-detail.section-container {
    height: auto;
    max-height: none;
  }
  #world-detail.section-container {
    width: auto;
    margin: 30px 20px;
  }
  #world-detail .section-content-container {
    padding: 20px;
  }
  .wiki-article { grid-template-columns: 1fr; }
  .wiki-body { grid-column: 1; min-width: 0; }
  .infobox { grid-column: 1; max-width: 100%; }
  .wiki-tooltip { display:none; }
}
</style>
