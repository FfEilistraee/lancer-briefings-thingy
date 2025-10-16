<template>
  <div id="worldView" :class="{ animate: props.animate }" class="content-container">
    <!-- LIST / GLOSSARY -->
    <section id="world" class="section-container">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/npc.svg" />
        <h1>WORLD</h1>
      </div>

      <div class="section-content-container">
        <!-- Simple filters -->
        <div style="display:flex; gap:12px; margin-bottom:12px; align-items:center">
          <input v-model="query" type="text" placeholder="Search NPCs, factions, places…" style="flex:1; padding:6px 10px; background:var(--secondary-color); border:1px solid var(--primary-color); color:var(--text-color)" />
          <select v-model="typeFilter" style="padding:6px 10px; background:var(--secondary-color); border:1px solid var(--primary-color); color:var(--text-color)">
            <option value="">All Types</option>
            <option>NPC</option>
            <option>Faction</option>
            <option>Location</option>
            <option>Term</option>
            <option>Item</option>
          </select>
        </div>

        <div class="events-list-container" style="overflow:auto">
          <WorldEntry
            v-for="entry in filteredEntries"
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
        <h1>ENTRY</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container extra-margins">
        <div class="event">
          <div class="name">
            <h1>{{ selectedEntry.type }} <span v-if="selectedEntry.tags && selectedEntry.tags.length">// {{ selectedEntry.tags.join(', ') }}</span></h1>
            <h2>{{ selectedEntry.name }}</h2>
          </div>

          <img class="thumbnail" :src="selectedEntry.thumbnail || '/icons/portrait.svg'" />

          <!-- Auto-render metadata grid -->
          <div v-if="displayMeta.length" class="meta-grid">
            <div v-for="m in displayMeta" :key="m.key" class="meta-row">
              <div class="meta-label">{{ m.label }}</div>
              <div class="meta-value">
                <template v-if="Array.isArray(m.value)">
                  <span v-for="(v,i) in m.value" :key="i">
                    <a href="#" @click.prevent="query = String(v)">{{ v }}</a><span v-if="i < m.value.length - 1">, </span>
                  </span>
                </template>
                <template v-else>{{ m.value }}</template>
              </div>
            </div>
          </div>

          <!-- Markdown body -->
          <VueMarkdownIt :source="selectedEntry.content" class="markdown" />

          <!-- Quick tag chips -->
          <div v-if="selectedEntry.tags && selectedEntry.tags.length" style="margin-top:8px">
            <span class="tag-chip" v-for="t in selectedEntry.tags" :key="t" @click="query = t">{{ t }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import matter from 'gray-matter'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import WorldEntry from '@/components/WorldEntry.vue'

const props = defineProps({
  animate: { type: Boolean, required: true }
})

const entries = ref([])
const selectedEntry = ref(null)
const query = ref('')
const typeFilter = ref('')

const baseKeys = new Set(['slug','name','type','tags','thumbnail','content'])

const filteredEntries = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter(e => !typeFilter.value || (e.type || '').toLowerCase() === typeFilter.value.toLowerCase())
    .filter(e => {
      if (!q) return true
      const searchable = [e.name, e.type, ...(e.tags||[]), e.content]
      // include all meta values too
      Object.entries(e).forEach(([k,v]) => {
        if (!baseKeys.has(k) && v) searchable.push(Array.isArray(v) ? v.join(' ') : String(v))
      })
      return searchable.join(' ').toLowerCase().includes(q)
    })
})

const displayMeta = computed(() => {
  if (!selectedEntry.value) return []
  const out = []
  for (const [k,v] of Object.entries(selectedEntry.value)) {
    if (baseKeys.has(k)) continue
    if (v === undefined || v === null) continue
    const s = Array.isArray(v) ? v.join('').trim() : String(v).trim()
    if (!s) continue
    out.push({ key: k, label: labelize(k), value: v })
  }
  return out
})

function labelize(key) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w|\s\w/g, c => c.toUpperCase())
}

function normalizeArray(val) {
  if (!val) return []
  return Array.isArray(val) ? val : String(val).split(',').map(s => s.trim()).filter(Boolean)
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function selectEntry(entry) {
  selectedEntry.value = entry
}

async function importEntries() {
  const modules = import.meta.glob('@/assets/world/*.md', { query: '?raw', import: 'default' })
  const loaded = await Promise.all(Object.values(modules).map(fn => fn()))
  loaded.forEach(mod => {
    const raw = typeof mod === 'string' ? mod : mod.default

    let entry
    if (/^---[\s\S]*?\n---\s*/.test(raw)) {
      // YAML front-matter present
      const { data, content } = matter(raw)
      entry = {
        slug: data.slug || slugify(data.name),
        name: data.name || 'Untitled',
        type: data.type || 'NPC',
        tags: normalizeArray(data.tags),
        thumbnail: data.thumbnail || '',
        content: content || '',
        // spread all additional fields (gender, age, etc.)
        ...Object.fromEntries(Object.entries(data).filter(([k]) => !['slug','name','type','tags','thumbnail'].includes(k)))
      }
    } else {
      // Fallback to old 5-line header
      const lines = (raw || '').split('\n')
      entry = {
        slug: (lines[0] || '').trim(),
        name: (lines[1] || '').trim(),
        type: (lines[2] || 'NPC').trim(),
        tags: (lines[3] || '').split(',').map(s => s.trim()).filter(Boolean),
        thumbnail: (lines[4] || '').trim(),
        content: lines.slice(5).join('\n')
      }
    }

    entries.value.push(entry)
  })
  entries.value.sort((a, b) => a.name.localeCompare(b.name))
  selectedEntry.value = entries.value[0] || null
}

onMounted(importEntries)
</script>

<style scoped>
.meta-grid { display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin: 8px 0 16px; }
.meta-label { font-weight: 600; opacity: .85; }
.meta-value { opacity: .95; }
.tag-chip { display:inline-block; padding:2px 8px; border:1px solid var(--primary-color); border-radius:999px; font-size:.85rem; margin-right:6px; cursor:pointer; }
</style>
