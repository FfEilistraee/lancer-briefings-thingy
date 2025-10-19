<template>
  <div id="worldView" :class="rootClasses" class="content-container">
    <!-- LIST / GLOSSARY -->
    <section
      v-if="!atlasCollapsed"
      id="world"
      class="section-container atlas-panel"
      :class="atlasPanelClasses"
    >
      <div class="section-header clipped-medium-backward">
        <img src="/icons/npc.svg" />
        <h1>ATLAS</h1>
      </div>

      <div class="section-content-container">
        <div class="world-tabs-row">
          <nav class="world-tabs" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              :class="['world-tab', { active: activeTab === tab.value }]"
              role="tab"
              @click="setActiveTab(tab.value, { skipAutoSelect: true, clearSelection: true })"
            >
              {{ tab.label }}
              <span class="world-tab-count">{{ tab.count }}</span>
            </button>
          </nav>
          <button
            v-if="selectedEntry"
            type="button"
            class="atlas-collapse-button"
            @click="collapseAtlas"
          >
            Minimize Atlas
          </button>
        </div>

        <!-- Filters -->
        <div class="world-filters">
          <div class="world-filter-bar" role="group" aria-label="Atlas search controls">
            <input
              v-model="query"
              type="text"
              :placeholder="searchPlaceholder"
              class="world-input"
            />
          </div>

          <div class="world-filter-meta">
            <p class="world-filter-hint">
              Tip: type <span class="world-filter-hash">#tag</span> to jump straight to dossiers with that tag.
            </p>
          </div>
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
          <div class="world-grid" role="list">
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
              <header
                class="world-grid-card__header"
                :class="{ 'world-grid-card__header--with-thumb': !!entry.cardThumbnail }"
              >
                <div
                  v-if="entry.cardThumbnail"
                  class="world-grid-card__backdrop"
                  :style="getCardHeaderStyle(entry.cardThumbnail)"
                  aria-hidden="true"
                ></div>
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
    <Transition name="world-detail">
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

            <!-- Right infobox -->
            <aside class="infobox">
              <img
                class="infobox-image"
                :src="selectedEntry.thumbnail || selectedEntry.cardThumbnail || '/icons/portrait.svg'"
                alt="thumbnail"
              />
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
        </div>
      </section>
    </Transition>

    <button
      v-if="atlasCollapsed"
      type="button"
      class="atlas-flyout-handle clipped-medium-backward"
      @click="expandAtlas"
    >
      <img src="/icons/npc.svg" alt="" aria-hidden="true" />
      <div class="atlas-flyout-copy">
        <span class="atlas-flyout-label">Atlas</span>
        <span class="atlas-flyout-detail">{{ collapsedAtlasDetail }}</span>
      </div>
    </button>

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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import Timeline from '@/components/Timeline.vue'
import { slugify, transformWikiLinks, transformWikiImages, isWikiHref, extractWikiSlug } from '@/utils/wiki'
import { parseFrontMatter } from '@/utils/frontMatter'

const props = defineProps({ animate: { type: Boolean, required: true } })

const route = useRoute()
const router = useRouter()

const ADMIN_STORAGE_KEY = 'atlas-admin-entries'

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
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const atlasCollapsed = ref(false)

const rootClasses = computed(() => ({
  animate: props.animate,
  'has-selection': !!selectedEntry.value,
  'no-selection': !selectedEntry.value,
  'atlas-collapsed': atlasCollapsed.value,
}))

const atlasPanelClasses = computed(() => ({
  'atlas-panel--expanded': !selectedEntry.value,
  'atlas-panel--compact': !!selectedEntry.value,
}))

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

const TAG_TOKEN_PATTERN = /#[^\s#]+/g

const filteredEntries = computed(() => {
  const raw = query.value.trim()
  const lower = raw.toLowerCase()
  const tagTokens = lower.match(TAG_TOKEN_PATTERN) || []
  const tagFilters = tagTokens.map(token => token.slice(1)).filter(Boolean)
  const plainQuery = lower.replace(TAG_TOKEN_PATTERN, ' ').trim()

  return entries.value
    .filter(e => e.category === activeTab.value)
    .filter(e => {
      if (!matchesTagFilters(e, tagFilters)) return false
      if (!plainQuery) return true
      const searchable = [e.name, e.type, ...(e.tags || []), e.content]
      Object.entries(e).forEach(([k, v]) => {
        if (!BASE_KEYS.has(k) && v) searchable.push(Array.isArray(v) ? v.join(' ') : String(v))
      })
      return searchable.join(' ').toLowerCase().includes(plainQuery)
    })
})

const visibleEntries = computed(() => {
  return [...filteredEntries.value].sort((a, b) => collator.compare(a.name || '', b.name || ''))
})

function matchesTagFilters(entry, tagFilters) {
  if (!tagFilters.length) return true
  const variants = new Set()
  ;(entry.tags || []).forEach(tag => {
    const base = String(tag || '').trim().toLowerCase()
    if (!base) return
    variants.add(base)
    const slug = slugify(base)
    if (slug) {
      variants.add(slug)
      const slugCompact = slug.replace(/-/g, '')
      if (slugCompact) variants.add(slugCompact)
    }
    const compact = base.replace(/[^a-z0-9]/g, '')
    if (compact) variants.add(compact)
  })
  if (!variants.size) return false
  return tagFilters.every(filter => variants.has(filter))
}

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

function getCardHeaderStyle(thumbnail) {
  const source = typeof thumbnail === 'string' ? thumbnail.trim() : ''
  if (!source) return null
  const escaped = source.replace(/"/g, '\\"')
  const background = `linear-gradient(158deg, rgba(9, 11, 17, 0.36) 0%, rgba(9, 11, 17, 0.82) 100%), url("${escaped}")`
  return {
    background,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

const timelineEvents = computed(() => {
  if (!selectedEntry.value) return []
  return buildTimelineFromFacts(selectedEntry.value.quickFacts)
})

const activeTabConfig = computed(() => TAB_CONFIG.find(t => t.value === activeTab.value) || TAB_CONFIG[0])

const searchPlaceholder = computed(() => {
  const base = activeTabConfig.value?.placeholder || 'Search the archive…'
  return `${base} (type #tag to filter)`
})

const collapsedAtlasDetail = computed(() => {
  if (selectedEntry.value) return selectedEntry.value.name
  const active = activeTabConfig.value
  return active ? `Browse ${active.label}` : 'Browse dossiers'
})

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
  if (options.skipAutoSelect) {
    if (options.clearSelection !== false) {
      selectEntry(null)
    }
    if (!first) {
      hideTooltip()
      selectedEntry.value = null
    }
    return
  }
  if (first) {
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
      thumbnail: entry.thumbnail || entry.cardThumbnail,
      summary: entry.summary,
      quickFacts: entry.quickFacts || []
    }
  }
}

function appendTagToQuery(tag) {
  const cleaned = (tag || '').trim()
  if (!cleaned) return
  const token = `#${slugify(cleaned)}`
  const current = query.value.trim()
  const tokens = current ? current.split(/\s+/) : []
  const normalized = tokens.map(t => t.toLowerCase())
  if (normalized.includes(token.toLowerCase())) return
  const nextTokens = [...tokens, token].filter(Boolean)
  query.value = nextTokens.join(' ').trim()
}

function openRelatedEntry(entry) {
  if (!entry) return
  if (entry.category && entry.category !== activeTab.value) {
    setActiveTab(entry.category, {
      skipAutoSelect: true,
      preserveQuery: true,
      clearSelection: false,
    })
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
    setActiveTab(entry.category, {
      skipAutoSelect: true,
      preserveQuery: true,
      clearSelection: false,
    })
    selectEntry(entry)
  }
)

watch(selectedEntry, async () => {
  hideTooltip()
  await nextTick()
  attachWikiLinkEvents()
})

// ---------- Front-matter + Obsidian helpers (no deps) ----------
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
    atlasCollapsed.value = false
    if (route.name === 'World' && route.query.slug) {
      const nextQuery = { ...route.query }
      delete nextQuery.slug
      router.replace({ path: route.path, query: nextQuery })
    }
    return
  }
  atlasCollapsed.value = true
  if (route.name === 'World') {
    const slug = entry.slug
    if (slug && route.query.slug !== slug) {
      router.replace({ path: route.path, query: { ...route.query, slug } })
    }
  }
}

function collapseAtlas() {
  atlasCollapsed.value = true
}

function expandAtlas() {
  if (selectedEntry.value) {
    selectEntry(null)
    return
  }
  atlasCollapsed.value = false
}

function resolveThumbnailPath(rawPath) {
  const raw = (rawPath || '').toString().trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('world/')) return `/${raw}`
  if (raw.startsWith('./world/')) return `/${raw.slice(2)}`
  return `/world/${raw.replace(/^\.\//, '')}`
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
  const thumbnail = resolveThumbnailPath(entry.thumbnail || '')
  const hasThumbnail = !!thumbnail
  const cardThumbnail = thumbnail || '/world/placeholder.png'
  const quickFacts = buildQuickFacts(entry)
  return {
    ...entry,
    category,
    summary,
    thumbnail,
    cardThumbnail,
    hasThumbnail,
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

const CATEGORY_SOURCE_PREFIX = {
  npcs: 'src/assets/world/npcs/',
  factions: 'src/assets/world/factions/',
  planets: 'src/assets/world/planets/',
  stations: 'src/assets/world/stations/',
  terms: 'src/assets/world/terms/',
  custom: 'src/assets/world/custom/',
}

function loadAdminEntriesFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(convertAdminEntry).filter(Boolean)
  } catch (error) {
    console.warn('Failed to load stored admin entries', error)
    return []
  }
}

function convertAdminEntry(item) {
  if (!item || typeof item !== 'object') return null
  const slug = (item.slug && String(item.slug).trim()) || (item.name ? slugify(item.name) : '')
  if (!slug) return null
  const categoryKey = typeof item.category === 'string' && CATEGORY_SOURCE_PREFIX[item.category]
    ? item.category
    : 'custom'

  const tags = Array.isArray(item.tags)
    ? item.tags.map(tag => String(tag).trim()).filter(Boolean)
    : typeof item.tags === 'string'
      ? item.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : []

  const additionalFields = {}
  if (Array.isArray(item.additionalFields)) {
    item.additionalFields.forEach(field => {
      if (!field || typeof field !== 'object' || !field.key) return
      const key = String(field.key).trim()
      if (!key) return
      const values = Array.isArray(field.values)
        ? field.values.map(val => (typeof val === 'string' ? val.trim() : val)).filter(val => val !== '' && val !== null && val !== undefined)
        : field.value !== undefined
          ? [field.value]
          : []
      if (!values.length) return
      additionalFields[key] = values.length === 1 ? values[0] : values
    })
  }

  const quickFacts = Array.isArray(item.quickFacts)
    ? item.quickFacts
        .map(fact => normalizeAdminQuickFact(fact))
        .filter(Boolean)
    : []

  const baseEntry = {
    slug,
    name: item.name || 'Untitled Entry',
    type: item.type || defaultTypeForCategory(categoryKey),
    tags,
    thumbnail: item.thumbnail || '',
    summary: item.summary || '',
    quickFacts,
    draft: item.draft ? true : undefined,
    content: item.body || '',
    sourcePath: `${CATEGORY_SOURCE_PREFIX[categoryKey]}${slug}.md`,
    ...additionalFields,
  }

  const processed = postProcessEntry(baseEntry)
  processed.sourcePath = baseEntry.sourcePath
  return processed
}

function normalizeAdminQuickFact(fact) {
  if (!fact || typeof fact !== 'object') return null
  const normalized = {}
  ;['label', 'value', 'date', 'year', 'title', 'description'].forEach(key => {
    if (fact[key] !== undefined && fact[key] !== null && String(fact[key]).trim() !== '') {
      normalized[key] = typeof fact[key] === 'string' ? fact[key].trim() : fact[key]
    }
  })
  return Object.keys(normalized).length ? normalized : null
}

function defaultTypeForCategory(categoryKey) {
  switch (categoryKey) {
    case 'npcs':
      return 'Personnel File'
    case 'factions':
      return 'Faction Brief'
    case 'planets':
      return 'World Log'
    case 'stations':
      return 'Transit Gate Record'
    case 'terms':
      return 'Codex Entry'
    default:
      return 'Atlas File'
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

  const adminEntries = loadAdminEntriesFromStorage()
  adminEntries.forEach(entry => {
    if (!entry || !entry.slug) return
    if (slugSeen.has(entry.slug)) return
    const processed = postProcessEntry(entry)
    slugSeen.add(processed.slug)
    const isDraft = typeof processed.draft === 'string' ? processed.draft.toLowerCase() === 'true' : !!processed.draft
    if (isDraft) return
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

  if (initial) {
    selectEntry(initial)
  } else {
    selectEntry(null)
  }
  await nextTick()
  attachWikiLinkEvents()
}

const handleAdminEntriesUpdated = () => {
  loadEntries()
}

onMounted(() => {
  loadEntries()
  if (typeof window !== 'undefined') {
    window.addEventListener('atlas-admin-entries-updated', handleAdminEntriesUpdated)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('atlas-admin-entries-updated', handleAdminEntriesUpdated)
  }
})

</script>

<style scoped>
/* Layout adjustments */
#worldView {
  position: relative;
  align-items: stretch;
  gap: 24px;
}

#worldView.no-selection {
  justify-content: center;
}

#worldView.has-selection {
  justify-content: flex-start;
}

.atlas-panel {
  width: 440px;
  flex: 0 0 auto;
  transition: transform 0.35s ease, opacity 0.35s ease, width 0.35s ease;
}

#worldView.no-selection .atlas-panel {
  width: min(1180px, calc(100vw - 180px));
  flex: 1 1 auto;
}

#worldView.has-selection .atlas-panel--compact {
  width: 420px;
}

#worldView.no-selection .atlas-panel--expanded .world-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.world-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.atlas-collapse-button {
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.08);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-color);
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.atlas-collapse-button:hover,
.atlas-collapse-button:focus-visible {
  background: rgba(255,255,255,0.14);
  border-color: var(--primary-color);
  outline: none;
  transform: translateY(-1px);
}

.world-filter-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.atlas-flyout-handle {
  position: absolute;
  top: 108px;
  left: 66px;
  display: inline-flex;
  align-items: center;
  gap: 18px;
  height: 52px;
  padding: 0 26px 0 20px;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #05070d;
  cursor: pointer;
  box-shadow: 0 18px 42px rgba(0,0,0,0.45);
  z-index: 8;
  transition: transform 0.28s ease, box-shadow 0.28s ease, filter 0.28s ease;
}

.atlas-flyout-handle:hover,
.atlas-flyout-handle:focus-visible {
  transform: translateY(-3px);
  box-shadow: 0 24px 52px rgba(0,0,0,0.55);
  filter: brightness(1.05);
  outline: none;
}

.atlas-flyout-handle img {
  width: 34px;
  height: 34px;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.28));
}

.atlas-flyout-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.atlas-flyout-label {
  font-size: 0.78rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.7;
  color: rgba(5, 7, 13, 0.7);
}

.atlas-flyout-detail {
  font-size: 0.95rem;
  font-weight: 700;
  color: #05070d;
}

/* Tabs */
.world-tabs {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  width:100%;
  margin-bottom:16px;
}
.world-tab {
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:6px 14px;
  border:1px solid rgba(255,255,255,0.18);
  border-radius:999px;
  background:rgba(255,255,255,0.05);
  color:var(--text-color);
  letter-spacing:0.08em;
  text-transform:uppercase;
  font-size:0.72rem;
  cursor:pointer;
  transition:all 0.2s ease;
}
.world-tab:hover {
  border-color:var(--primary-color);
  background:rgba(255,255,255,0.12);
}
.world-tab.active {
  border-color:var(--primary-color);
  background:var(--primary-color);
  color:#0b0d13;
  box-shadow:0 4px 12px rgba(0,0,0,0.3);
}
.world-tab-count {
  padding:2px 8px;
  border-radius:999px;
  background:rgba(0,0,0,0.35);
  font-weight:600;
  font-size:0.65rem;
  letter-spacing:0.1em;
}
.world-tab.active .world-tab-count {
  background:rgba(0,0,0,0.15);
}

/* Controls */
.world-filters {
  width:100%;
  margin-bottom:12px;
}
.world-filter-bar {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:12px;
}
.world-filter-hint {
  margin-top:6px;
  font-size:0.72rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  opacity:0.6;
}
.world-filter-hash {
  color:var(--primary-color);
}
.world-input {
  flex:1 1 240px;
  min-width:0;
  padding:6px 10px;
  background:var(--secondary-color);
  border:1px solid var(--primary-color);
  color:var(--text-color);
  border-radius:8px;
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
  gap:12px;
  padding:16px;
  border:1px solid rgba(255,255,255,0.12);
  border-radius:16px;
  background:rgba(255,255,255,0.04);
  cursor:pointer;
  transition:border-color 0.25s ease, transform 0.25s ease, background 0.25s ease;
  position:relative;
  overflow:hidden;
}
.world-grid-card:hover,
.world-grid-card:focus-visible {
  border-color:var(--primary-color);
  background:rgba(255,255,255,0.08);
  transform:translateY(-2px);
  outline:none;
}
.world-grid-card__header {
  position: relative;
  display:flex;
  flex-direction:column;
  gap:4px;
  border-radius:12px;
  padding:14px 14px 12px;
  background-color:rgba(255,255,255,0.05);
  overflow: hidden;
  transition:background 0.35s ease, color 0.35s ease;
}
.world-grid-card__backdrop {
  position:absolute;
  inset:0;
  border-radius:inherit;
  background-color:rgba(9,11,17,0.72);
  pointer-events:none;
  opacity:1;
  transition:transform 0.35s ease, opacity 0.35s ease;
}
.world-grid-card__header--with-thumb {
  justify-content:flex-end;
  color:#fff;
  padding:16px 16px 14px;
  min-height:140px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08);
}
.world-grid-card__header--with-thumb .world-grid-card__type,
.world-grid-card__header--with-thumb .world-grid-card__title {
  position:relative;
  z-index:1;
}
.world-grid-card__type {
  font-size:0.72rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  opacity:0.75;
}
.world-grid-card__header--with-thumb .world-grid-card__type {
  opacity:0.8;
}
.world-grid-card__title {
  font-size:1.05rem;
  margin:0;
}
.world-grid-card__header--with-thumb .world-grid-card__title {
  text-shadow:0 2px 8px rgba(6,8,14,0.5);
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
  flex: 1 1 auto;
  width: clamp(900px, 74vw, 1320px);
  margin: 50px 60px;
  min-width: 0;
  height: 714px;
  max-height: calc(100vh - 190px);
  transition: opacity 0.35s ease, transform 0.35s ease;
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

.world-detail-enter-from,
.world-detail-leave-to {
  opacity: 0;
  transform: translateX(36px);
}

.world-detail-enter-active,
.world-detail-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
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

</style>
