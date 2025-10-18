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
          <div v-if="activeTopTags.length" class="world-filter-tags">
            <span class="world-filter-tags__label">Top tags</span>
            <button
              v-for="tag in activeTopTags"
              :key="tag"
              type="button"
              class="world-tag-chip"
              @click="appendTagToQuery(tag)"
            >
              {{ tag }}
            </button>
          </div>

          <div class="world-filter-controls">
            <div class="world-toggle-group">
              <label class="world-toggle">
                <input v-model="filters.hasSummary" type="checkbox" />
                <span>Has summary</span>
              </label>
              <label class="world-toggle">
                <input v-model="filters.hasQuickFacts" type="checkbox" />
                <span>Has quick facts</span>
              </label>
            </div>

            <div class="world-control-bar" role="group" aria-label="Atlas layout controls">
              <label class="world-sort">
                <span class="world-sort__label">Sort</span>
                <select v-model="sortMode" class="world-select">
                  <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <div class="world-layout-toggle" role="group" aria-label="Switch entry layout">
                <button
                  type="button"
                  class="world-layout-toggle__button"
                  :class="{ active: layoutMode === 'list' }"
                  :aria-pressed="layoutMode === 'list'"
                  @click="layoutMode = 'list'"
                >
                  List
                </button>
                <button
                  type="button"
                  class="world-layout-toggle__button"
                  :class="{ active: layoutMode === 'grid' }"
                  :aria-pressed="layoutMode === 'grid'"
                  @click="layoutMode = 'grid'"
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

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
          <template v-if="layoutMode === 'list'">
            <WorldEntry
              v-for="entry in visibleEntries"
              :key="entry.slug"
              :entry="entry"
              :animate="props.animate"
              @select-entry="selectEntry"
            />
          </template>
          <div v-else class="world-grid" role="list">
            <article
              v-for="entry in visibleEntries"
              :key="entry.slug"
              class="world-grid-card"
              role="button"
              tabindex="0"
              @click="selectEntry(entry)"
              @keydown.enter.prevent="selectEntry(entry)"
              @keydown.space.prevent="selectEntry(entry)"
            >
              <header class="world-grid-card__header">
                <p class="world-grid-card__type">{{ entry.type }}</p>
                <h3 class="world-grid-card__title">{{ entry.name }}</h3>
              </header>
              <p v-if="entry.summary" class="world-grid-card__summary">{{ entry.summary }}</p>
              <ul v-if="entry.tags && entry.tags.length" class="world-grid-card__tags">
                <li v-for="tag in entry.tags" :key="tag" class="world-grid-card__tag">{{ tag }}</li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- DETAILS / ARTICLE -->
    <section v-if="selectedEntry" id="world-detail" class="section-container">
      <div class="section-header-wrapper">
        <div class="section-header clipped-medium-backward-events-logs">
          <img src="/icons/conversation.svg" />
          <h1>FILE</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

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
              <span class="tag-chip" v-for="t in selectedEntry.tags" :key="t" @click="appendTagToQuery(t)">{{ t }}</span>
            </div>
          </section>

          <section v-if="timelineEvents.length" class="wiki-timeline">
            <h3 class="wiki-section-heading">Timeline</h3>
            <Timeline :events="timelineEvents" />
          </section>

          <section v-if="relatedEntries.length" class="related-entries">
            <h3 class="wiki-section-heading">Related Entries</h3>
            <div class="related-grid">
              <article
                v-for="entry in relatedEntries"
                :key="entry.slug"
                class="related-card"
                role="button"
                tabindex="0"
                @click="openRelatedEntry(entry)"
                @keydown.enter.prevent="openRelatedEntry(entry)"
                @keydown.space.prevent="openRelatedEntry(entry)"
              >
                <header class="related-card__header">
                  <p class="related-card__type">{{ entry.type }}</p>
                  <h4 class="related-card__title">{{ entry.name }}</h4>
                </header>
                <p v-if="entry.summary" class="related-card__summary">{{ entry.summary }}</p>
                <ul v-if="entry.tags && entry.tags.length" class="related-card__tags">
                  <li v-for="tag in entry.tags" :key="tag" class="related-card__tag">{{ tag }}</li>
                </ul>
              </article>
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
                    <template v-if="row.tokens.length">
                      <template v-for="(token, index) in row.tokens" :key="index">
                        <template v-if="token.slug">
                          <a
                            :href="`wiki:${token.slug}`"
                            :class="['wiki-link', token.resolved ? 'wiki-link-resolved' : 'wiki-link-unresolved']"
                            @click.prevent="navigateToWikiSlug(token.slug, $event)"
                          >
                            {{ token.text }}
                          </a>
                        </template>
                        <template v-else>{{ token.text }}</template>
                        <span v-if="index < row.tokens.length - 1">{{ row.separator }}</span>
                      </template>
                    </template>
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
import { ref, computed, watch, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import WorldEntry from '@/components/WorldEntry.vue'
import Timeline from '@/components/Timeline.vue'
import { slugify, transformWikiLinks, transformWikiImages, isWikiHref, extractWikiSlug } from '@/utils/wiki'

const props = defineProps({ animate: { type: Boolean, required: true } })

const route = useRoute()
const router = useRouter()

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
const filters = reactive({ hasSummary: false, hasQuickFacts: false })
const sortMode = ref('name-asc')
const layoutMode = ref('list')

const sortOptions = [
  { value: 'name-asc', label: 'Name (A → Z)' },
  { value: 'name-desc', label: 'Name (Z → A)' },
  { value: 'type', label: 'Type' },
  { value: 'tag-count', label: 'Tag density' },
]

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

const sortComparators = {
  'name-asc': (a, b) => collator.compare(a.name || '', b.name || ''),
  'name-desc': (a, b) => collator.compare(b.name || '', a.name || ''),
  type: (a, b) => {
    const typeCompare = collator.compare(a.type || '', b.type || '')
    if (typeCompare !== 0) return typeCompare
    return collator.compare(a.name || '', b.name || '')
  },
  'tag-count': (a, b) => {
    const countDiff = (Array.isArray(b.tags) ? b.tags.length : 0) - (Array.isArray(a.tags) ? a.tags.length : 0)
    if (countDiff !== 0) return countDiff
    return collator.compare(a.name || '', b.name || '')
  },
}

// Infobox fields (others still searchable)
const INFOBOX_ORDER = ['aliases','gender','race','age','height','origin','ethnicity','occupation','title','languages','status','affiliations','location']
const BASE_KEYS = new Set(['slug','name','type','tags','thumbnail','content','sourcePath','summary','quickFacts','category'])

const slugIndex = computed(() => {
  const index = {}
  entries.value.forEach(entry => { index[entry.slug] = entry })
  codexEntries.value.forEach(entry => { index[entry.slug] = entry })
  return index
})

const allEntries = computed(() => [...entries.value, ...codexEntries.value])

const filteredEntries = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter(e => e.category === activeTab.value)
    .filter(e => {
      if (filters.hasSummary) {
        const summaryText = typeof e.summary === 'string' ? e.summary.trim() : ''
        if (!summaryText) return false
      }
      if (filters.hasQuickFacts) {
        if (!Array.isArray(e.quickFacts) || !e.quickFacts.length) return false
      }
      if (!q) return true
      const searchable = [e.name, e.type, ...(e.tags || []), e.content]
      Object.entries(e).forEach(([k, v]) => {
        if (!BASE_KEYS.has(k) && v) searchable.push(Array.isArray(v) ? v.join(' ') : String(v))
      })
      return searchable.join(' ').toLowerCase().includes(q)
    })
})

const visibleEntries = computed(() => {
  const entries = [...filteredEntries.value]
  const comparator = sortComparators[sortMode.value] || sortComparators['name-asc']
  return entries.sort((a, b) => comparator(a, b))
})

const relatedEntries = computed(() => {
  if (!selectedEntry.value) return []
  const current = selectedEntry.value
  const tags = new Set((current.tags || []).map(tag => tag.toLowerCase()))
  if (!tags.size) return []

  const scored = []
  allEntries.value.forEach(entry => {
    if (!entry || entry.slug === current.slug) return
    if (entry.category === 'codex') return
    const entryTags = (entry.tags || []).map(tag => tag.toLowerCase())
    let overlap = 0
    entryTags.forEach(tag => { if (tags.has(tag)) overlap++ })
    if (!overlap) return
    const sameCategory = entry.category === current.category ? 1 : 0
    scored.push({ entry, overlap, sameCategory })
  })

  return scored
    .sort((a, b) => {
      if (b.sameCategory !== a.sameCategory) return b.sameCategory - a.sameCategory
      if (b.overlap !== a.overlap) return b.overlap - a.overlap
      return a.entry.name.localeCompare(b.entry.name)
    })
    .slice(0, 8)
    .map(item => item.entry)
})

const timelineEvents = computed(() => {
  if (!selectedEntry.value) return []
  return buildTimelineFromFacts(selectedEntry.value.quickFacts)
})

const topTagsByCategory = computed(() => {
  const map = {}
  entries.value.forEach(entry => {
    if (!entry.category) return
    if (!map[entry.category]) map[entry.category] = {}
    ;(entry.tags || []).forEach(tag => {
      const cleaned = (tag || '').trim()
      if (!cleaned) return
      map[entry.category][cleaned] = (map[entry.category][cleaned] || 0) + 1
    })
  })
  const result = {}
  Object.entries(map).forEach(([category, tagCounts]) => {
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0])
      })
      .slice(0, 8)
      .map(([tag]) => tag)
    result[category] = sorted
  })
  return result
})

const activeTopTags = computed(() => topTagsByCategory.value[activeTab.value] || [])

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
  const index = slugIndex.value
  const rows = []
  const used = new Set()
  for (const k of INFOBOX_ORDER) {
    const v = s[k]
    const ok = v !== undefined && v !== null && (Array.isArray(v) ? v.length : String(v).trim())
    if (ok) {
      rows.push({ label: labelize(k), tokens: buildInfoboxTokens(v, index), separator: ', ' })
      used.add(k)
    }
  }
  Object.entries(s).forEach(([k, v]) => {
    if (BASE_KEYS.has(k) || used.has(k)) return
    if (v === undefined || v === null) return
    const text = Array.isArray(v) ? v.join('').trim() : String(v).trim()
    if (!text) return
    rows.push({ label: labelize(k), tokens: buildInfoboxTokens(v, index), separator: ', ' })
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

function setActiveTab(tab, options = {}) {
  activeTab.value = tab
  if (!options.preserveQuery) {
    query.value = ''
  }
  const first = entries.value.find(e => e.category === tab)
  if (first && !options.skipAutoSelect) {
    selectEntry(first)
    return
  }
  if (!first) {
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

function appendTagToQuery(tag) {
  const cleaned = (tag || '').trim()
  if (!cleaned) return
  const current = query.value.trim()
  const tokens = current ? current.split(/\s+/).map(t => t.toLowerCase()) : []
  if (tokens.includes(cleaned.toLowerCase())) return
  query.value = current ? `${current} ${cleaned}` : cleaned
}

function openRelatedEntry(entry) {
  if (!entry) return
  if (entry.category && entry.category !== activeTab.value) {
    setActiveTab(entry.category, { skipAutoSelect: true, preserveQuery: true })
  }
  selectEntry(entry)
}

function attachWikiLinkEvents() {
  if (!selectedEntry.value) return
  const containers = Array.from(document.querySelectorAll('#world-detail .wiki-body, #world-detail .infobox'))
  if (!containers.length) return

  containers.forEach(container => {
    if (!container.dataset.tooltipBound) {
      if (container.classList.contains('wiki-body')) {
        container.addEventListener('scroll', hideTooltip, { passive: true })
      }
      container.addEventListener('mouseleave', hideTooltip)
      container.dataset.tooltipBound = 'true'
    }

    const links = Array.from(container.querySelectorAll('a[href^="wiki:"]'))
    links.forEach(link => {
      const href = link.getAttribute('href') || ''
      const slug = extractWikiSlug(href)
      if (!slug) return
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
  })
}

watch(
  () => route.query.slug,
  slug => {
    if (!slug) return
    const entry = slugIndex.value[slug]
    if (!entry) return
    if (selectedEntry.value && selectedEntry.value.slug === slug) return
    setActiveTab(entry.category, { skipAutoSelect: true, preserveQuery: true })
    selectEntry(entry)
  }
)

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

function normalizeArray(val) { return !val ? [] : (Array.isArray(val) ? val : String(val).split(',').map(s=>s.trim()).filter(Boolean)) }

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

function buildInfoboxTokens(value, index) {
  const rawValues = Array.isArray(value) ? value : [value]
  const tokens = []
  rawValues.forEach(raw => {
    if (raw === null || raw === undefined) return
    const text = typeof raw === 'string' ? raw.trim() : String(raw)
    if (!text) return

    const markdownMatch = text.match(/^\[([^\]]+)\]\(wiki:([^)]+)\)$/)
    if (markdownMatch) {
      const slug = markdownMatch[2]
      tokens.push({ text: markdownMatch[1], slug, resolved: !!index[slug] })
      return
    }

    const obsidianMatch = text.match(/^\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]$/)
    if (obsidianMatch) {
      const slug = slugify(obsidianMatch[1])
      const label = obsidianMatch[2] ? obsidianMatch[2] : obsidianMatch[1]
      tokens.push({ text: label, slug, resolved: !!index[slug] })
      return
    }

    const slug = slugify(text)
    const resolved = !!index[slug]
    tokens.push({ text, slug: resolved ? slug : null, resolved })
  })
  return tokens
}

function navigateToWikiSlug(slug, event) {
  const match = slugIndex.value[slug]
  if (!match) return
  if (match.category === 'codex') {
    const x = (event?.clientX || 0) + 16
    const y = (event?.clientY || 0) + 24
    showTooltipForSlug(slug, { x, y })
    return
  }
  selectEntry(match)
}

function handleMarkdownClick(e) {
  const a = e.target.closest('a')
  if (!a) return
  const href = a.getAttribute('href') || ''
  if (!isWikiHref(href)) return

  e.preventDefault()
  const slug = extractWikiSlug(href)
  if (!slug) return
  navigateToWikiSlug(slug, e)
}

function selectEntry(entry) {
  hideTooltip()
  selectedEntry.value = entry
  if (!entry) {
    if (route.name === 'World' && route.query.slug) {
      const nextQuery = { ...route.query }
      delete nextQuery.slug
      router.replace({ path: route.path, query: nextQuery })
    }
    return
  }
  if (route.name === 'World') {
    const slug = entry.slug
    if (slug && route.query.slug !== slug) {
      router.replace({ path: route.path, query: { ...route.query, slug } })
    }
  }
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

  if (Array.isArray(entry.quickFacts) && entry.quickFacts.length) {
    entry.quickFacts.forEach(fact => {
      const normalized = normalizeQuickFactItem(fact)
      if (normalized) quick.push(normalized)
    })
    if (quick.length) return quick
  }

  const fields = entry.tooltipFacts || entry.infobox || null
  if (Array.isArray(fields)) {
    fields.forEach(f => {
      const normalized = normalizeQuickFactItem(f)
      if (normalized) quick.push(normalized)
    })
    if (quick.length) return quick
  } else if (fields && typeof fields === 'string') {
    const parts = fields.split('|').map(s => s.trim()).filter(Boolean)
    parts.forEach(part => {
      const normalized = normalizeQuickFactItem(part)
      if (normalized) quick.push(normalized)
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

function normalizeQuickFactItem(fact) {
  if (!fact) return null
  if (typeof fact === 'string') {
    const [label, ...rest] = fact.split(':')
    if (!label || !rest.length) return null
    return { label: label.trim(), value: rest.join(':').trim() }
  }
  if (typeof fact === 'object') {
    const { label = '', value = '', ...rest } = fact
    if (!label && !value && !rest.date && !rest.year && !rest.description && !rest.title) return null
    return {
      label: typeof label === 'string' ? label.trim() : label,
      value: typeof value === 'string' ? value.trim() : value,
      ...rest,
    }
  }
  return null
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

function buildTimelineFromFacts(facts) {
  if (!Array.isArray(facts) || !facts.length) return []
  const events = facts
    .map((fact, index) => convertFactToTimelineEvent(fact, index))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.sortKey != null && b.sortKey != null) return a.sortKey - b.sortKey
      if (a.sortKey != null) return -1
      if (b.sortKey != null) return 1
      return a.date.localeCompare(b.date)
    })
    .map((event, index) => ({
      ...event,
      id: event.id || `timeline-${index}`,
    }))
  return events
}

function convertFactToTimelineEvent(fact, index) {
  if (!fact) return null

  if (typeof fact === 'string') {
    const match = fact.match(/^([^:–-]+)[:–-]\s*(.+)$/)
    if (!match) return null
    const dateCandidate = extractDateCandidate(match[1])
    if (!dateCandidate) return null
    return {
      id: `quickfact-${index}`,
      date: dateCandidate.text,
      sortKey: dateCandidate.sortKey,
      title: '',
      description: match[2].trim(),
    }
  }

  if (typeof fact === 'object') {
    const { label, value, description, title } = fact
    const dateSource = fact.date || fact.year || null
    let candidate = extractDateCandidate(dateSource)
    let factDescription = typeof description === 'string'
      ? description.trim()
      : Array.isArray(description)
        ? description.join(', ')
        : ''
    const valueText = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value.trim() : ''

    if (!candidate && typeof label === 'string' && isLikelyDateString(label)) {
      candidate = extractDateCandidate(label)
    }

    if (!candidate && valueText) {
      const match = valueText.match(/^([^:–-]+)[:–-]\s*(.+)$/)
      if (match) {
        const potentialDate = extractDateCandidate(match[1])
        if (potentialDate) {
          candidate = potentialDate
          if (!factDescription) factDescription = match[2].trim()
        }
      }
    }

    if (!candidate) return null

    if (!factDescription) factDescription = valueText

    let factTitle = typeof title === 'string' ? title.trim() : ''
    if (!factTitle && typeof label === 'string' && !isLikelyDateString(label)) {
      factTitle = label.trim()
    }

    return {
      id: fact.id || `quickfact-${index}`,
      date: candidate.text,
      sortKey: candidate.sortKey,
      title: factTitle,
      description: factDescription,
    }
  }

  return null
}

function isLikelyDateString(value) {
  if (!value) return false
  return !!extractDateCandidate(value)
}

function extractDateCandidate(value) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = raw.replace(/^(?:c\.|ca\.|circa)\s+/i, '')

  const isoMatch = normalized.match(/^(\d{4})[./-](\d{1,2})(?:[./-](\d{1,2}))?$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    const date = new Date(Number(year), Number(month) - 1, day ? Number(day) : 1)
    return { text: raw, sortKey: date.getTime() }
  }

  const yearOnly = normalized.match(/^-?\d{3,4}$/)
  if (yearOnly) {
    const year = Number(yearOnly[0])
    if (!Number.isNaN(year)) {
      return { text: raw, sortKey: year * 12 * 31 }
    }
  }

  const parsed = Date.parse(normalized)
  if (!Number.isNaN(parsed)) {
    return { text: raw, sortKey: parsed }
  }

  const firstYear = normalized.match(/(-?\d{3,4})/)
  if (firstYear) {
    const year = Number(firstYear[1])
    if (!Number.isNaN(year)) {
      return { text: raw, sortKey: year * 12 * 31 }
    }
  }

  return null
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

  const routeSlug = typeof route.query.slug === 'string' ? route.query.slug : null
  let initial = null
  if (routeSlug) {
    const target = slugIndex.value[routeSlug]
    if (target) {
      activeTab.value = target.category
      initial = target
    }
  }
  if (!initial) {
    initial = entries.value.find(e => e.category === activeTab.value) || entries.value[0] || null
  }

  if (initial) {
    selectEntry(initial)
  } else {
    selectEntry(null)
  }
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
.world-filter-tags {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
  margin-bottom:10px;
}
.world-filter-tags__label {
  font-size:0.72rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  opacity:0.7;
  margin-right:4px;
}
.world-filter-controls {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:12px;
  margin-bottom:10px;
}
.world-tag-chip {
  padding:4px 12px;
  border-radius:999px;
  border:1px solid var(--primary-color);
  background:rgba(255,255,255,0.06);
  color:var(--text-color);
  font-size:0.78rem;
  letter-spacing:0.04em;
  cursor:pointer;
  transition:background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.world-tag-chip:hover {
  background:var(--primary-color);
  color:#0b0d13;
  transform:translateY(-1px);
}
.world-toggle-group {
  display:flex;
  flex-wrap:wrap;
  gap:12px;
}
.world-toggle {
  display:flex;
  align-items:center;
  gap:6px;
  font-size:0.78rem;
  letter-spacing:0.08em;
  text-transform:uppercase;
  opacity:0.85;
}
.world-toggle input[type="checkbox"] {
  width:16px;
  height:16px;
  accent-color:var(--primary-color);
}
.world-control-bar {
  display:flex;
  align-items:center;
  gap:12px;
  margin-left:auto;
}
.world-sort {
  display:flex;
  align-items:center;
  gap:8px;
  font-size:0.72rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  opacity:0.8;
}
.world-sort__label {
  white-space:nowrap;
}
.world-select {
  min-width:160px;
  padding:6px 10px;
  border:1px solid rgba(255,255,255,0.2);
  border-radius:8px;
  background:var(--secondary-color);
  color:var(--text-color);
  font-size:0.85rem;
}
.world-select:focus-visible {
  outline:2px solid var(--primary-color);
  outline-offset:2px;
}
.world-layout-toggle {
  display:inline-flex;
  align-items:center;
  border:1px solid rgba(255,255,255,0.2);
  border-radius:999px;
  overflow:hidden;
  background:rgba(0,0,0,0.2);
}
.world-layout-toggle__button {
  padding:6px 12px;
  font-size:0.78rem;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:var(--text-color);
  background:transparent;
  border:none;
  cursor:pointer;
  transition:background 0.2s ease, color 0.2s ease;
}
.world-layout-toggle__button + .world-layout-toggle__button {
  border-left:1px solid rgba(255,255,255,0.2);
}
.world-layout-toggle__button.active,
.world-layout-toggle__button:hover {
  background:var(--primary-color);
  color:#0b0d13;
}
.world-layout-toggle__button:focus-visible {
  outline:2px solid var(--primary-color);
  outline-offset:2px;
}
.world-input {
  padding:6px 10px; background:var(--secondary-color);
  border:1px solid var(--primary-color); color:var(--text-color);
  width:100%;
}
.world-grid {
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));
  gap:16px;
  padding:12px 4px 16px;
}
.world-grid-card {
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:14px 16px;
  border:1px solid rgba(255,255,255,0.12);
  border-radius:14px;
  background:rgba(255,255,255,0.04);
  cursor:pointer;
  transition:border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}
.world-grid-card:hover,
.world-grid-card:focus-visible {
  border-color:var(--primary-color);
  background:rgba(255,255,255,0.08);
  transform:translateY(-2px);
  outline:none;
}
.world-grid-card__header {
  display:flex;
  flex-direction:column;
  gap:2px;
}
.world-grid-card__type {
  font-size:0.72rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  opacity:0.75;
}
.world-grid-card__title {
  font-size:1.05rem;
  margin:0;
}
.world-grid-card__summary {
  font-size:0.9rem;
  opacity:0.9;
}
.world-grid-card__tags {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin:0;
  padding:0;
  list-style:none;
}
.world-grid-card__tag {
  padding:2px 8px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.18);
  font-size:0.72rem;
  letter-spacing:0.08em;
  text-transform:uppercase;
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
#world-detail .wiki-body .markdown {
  height: auto;
  max-height: none;
  overflow: visible;
}
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

.wiki-section-heading {
  grid-column: 1 / -1;
  margin: 0 0 12px;
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.8;
}

.wiki-timeline {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 18px 20px;
  margin-top: 8px;
}

.related-entries {
  grid-column: 1 / -1;
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.related-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
  min-height: 160px;
}

.related-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.related-card:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.related-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.related-card__type {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
}

.related-card__title {
  margin: 0;
  font-size: 1.1rem;
}

.related-card__summary {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  opacity: 0.85;
  flex: 1;
}

.related-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.related-card__tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

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
  .wiki-timeline { margin-top: 16px; }
  .related-grid { grid-template-columns: 1fr; }
  .wiki-tooltip { display:none; }
}
</style>
