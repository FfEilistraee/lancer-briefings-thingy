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

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import WorldEntry from '@/components/WorldEntry.vue'
import { slugify, isWikiHref, extractWikiSlug } from '@/utils/wiki'
import { ensureWikiData, labelize } from '@/utils/wikiDataStore'
import { bindWikiTooltip, hideWikiTooltip, showWikiTooltipForSlug } from '@/utils/wikiTooltip'

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
    hideWikiTooltip()
    selectedEntry.value = null
  }
}

async function attachWikiLinkEvents() {
  if (!selectedEntry.value) return
  const containers = Array.from(document.querySelectorAll('#world-detail .wiki-body, #world-detail .infobox'))
  if (!containers.length) return

  await Promise.all(
    containers.map(container =>
      bindWikiTooltip(container, {
        hideOnScroll: container.classList.contains('wiki-body'),
      })
    )
  )
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
  hideWikiTooltip()
  await nextTick()
  await attachWikiLinkEvents()
})

// ---------- Front-matter + Obsidian helpers (no deps) ----------
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
    showWikiTooltipForSlug(slug, { x, y })
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
  hideWikiTooltip()
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

async function loadEntries() {
  const { entries: loadedEntries, codexEntries: loadedCodex } = await ensureWikiData()
  entries.value = [...loadedEntries]
  codexEntries.value = [...loadedCodex]

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
  await attachWikiLinkEvents()
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
#world-detail .wiki-body .markdown {
  height: auto;
  max-height: none;
  overflow: visible;
}
.infobox { grid-column: 2; width: 100%; max-width: 340px; border: 1px solid var(--primary-color); background: var(--secondary-color); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.infobox-image { display:block; width:100%; height:auto; }
.infobox-table { width:100%; border-collapse: collapse; font-size: .95rem; }
.infobox-label { text-align:left; vertical-align: top; padding: 6px 8px; font-weight: 600; width: 34%; border-bottom: 1px solid rgba(255,255,255,.08); }
.infobox-value { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.08); }

/* Chips */
.tag-chips { margin-top: 8px; }
.tag-chip { display:inline-block; padding:2px 8px; border:1px solid var(--primary-color); border-radius:999px; font-size:.85rem; margin-right:6px; cursor:pointer; }


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
}
</style>
