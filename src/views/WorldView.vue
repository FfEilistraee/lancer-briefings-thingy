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
							Tip: type <span class="world-filter-hash">#tag</span> to jump straight to dossiers
							with that tag.
						</p>
					</div>
				</div>

				<div
					class="events-list-container"
					:class="{ 'show-placeholder': !visibleEntries.length }"
					style="overflow: auto"
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
							<header class="world-grid-card__header">
								<img
									v-if="entry.cardThumbnail"
									class="world-grid-card__thumbnail"
									:src="entry.cardThumbnail"
									:alt="`${entry.name} thumbnail`"
									loading="lazy"
								/>
								<div class="world-grid-card__text">
									<p class="world-grid-card__type">{{ entry.type }}</p>
									<h3 class="world-grid-card__title">{{ entry.name }}</h3>
								</div>
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
				<button type="button" class="atlas-back-button" @click="expandAtlas">
					← Back to Atlas
				</button>
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
								<span v-if="selectedEntry.tags && selectedEntry.tags.length">
									// {{ selectedEntry.tags.join(", ") }}</span
								>
							</h1>
							<h2 class="entry-title">{{ selectedEntry.name }}</h2>
						</header>

						<!-- Main body -->
						<section class="wiki-body" @click="handleMarkdownClick">
							<VueMarkdownIt :source="selectedEntry.content" class="markdown" />
							<div v-if="selectedEntry.tags && selectedEntry.tags.length" class="tag-chips">
								<span
									class="tag-chip"
									v-for="t in selectedEntry.tags"
									:key="t"
									@click="appendTagToQuery(t)"
									>{{ t }}</span
								>
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
								:src="
									selectedEntry.thumbnail || selectedEntry.cardThumbnail || '/icons/portrait.svg'
								"
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
															:class="[
																'wiki-link',
																token.resolved ? 'wiki-link-resolved' : 'wiki-link-unresolved',
															]"
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

		<transition name="tooltip-fade">
			<div v-if="tooltip.visible && tooltip.entry" class="wiki-tooltip" :style="tooltipStyle">
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
				<p v-if="tooltip.entry.summary" class="wiki-tooltip__summary">
					{{ tooltip.entry.summary }}
				</p>
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { VueMarkdownIt } from "@f3ve/vue-markdown-it";
import Timeline from "@/components/Timeline.vue";
import {
	slugify,
	transformWikiLinks,
	transformWikiImages,
	isWikiHref,
	extractWikiSlug,
} from "@/utils/wiki";
import { parseFrontMatter } from "@/utils/frontMatter";
import { setAtlasIndex } from "@/utils/atlasIndex";

const props = defineProps({ animate: { type: Boolean, required: true } });

const route = useRoute();
const router = useRouter();

const ADMIN_STORAGE_KEY = "atlas-admin-entries";

// Data
const TAB_CONFIG = [
	{
		label: "Personnel Dossiers",
		value: "people",
		placeholder: "Search pilots, fixers, civilian contacts…",
		directory: "src/assets/world/npcs",
		emptyNoun: "dossier",
	},
	{
		label: "Power Index",
		value: "power",
		placeholder: "Search corps, houses, resistance cells…",
		directory: "src/assets/world/factions",
		emptyNoun: "faction file",
	},
	{
		label: "World Log",
		value: "world",
		placeholder: "Search planets, moons, and sectors…",
		directory: "src/assets/world/planets",
		emptyNoun: "world log",
	},
	{
		label: "Gate Registry",
		value: "gate",
		placeholder: "Search stations, rings, and waypoints…",
		directory: "src/assets/world/stations",
		emptyNoun: "gate record",
	},
];

const entries = ref([]);
const codexEntries = ref([]);
const selectedEntry = ref(null);
const query = ref("");
const activeTab = ref(TAB_CONFIG[0].value);
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const atlasCollapsed = ref(false);

const rootClasses = computed(() => ({
	animate: props.animate,
	"has-selection": !!selectedEntry.value,
	"no-selection": !selectedEntry.value,
	"atlas-collapsed": atlasCollapsed.value,
}));

const atlasPanelClasses = computed(() => ({
	"atlas-panel--expanded": !selectedEntry.value,
	"atlas-panel--compact": !!selectedEntry.value,
}));

// Infobox fields (others still searchable)
const INFOBOX_ORDER = [
	"aliases",
	"gender",
	"race",
	"age",
	"height",
	"origin",
	"ethnicity",
	"occupation",
	"title",
	"languages",
	"status",
	"affiliations",
	"location",
];
const BASE_KEYS = new Set([
	"slug",
	"name",
	"type",
	"tags",
	"thumbnail",
	"cardThumbnail",
	"hasThumbnail",
	"content",
	"sourcePath",
	"summary",
	"quickFacts",
	"category",
]);

const slugIndex = computed(() => {
	const index = {};
	entries.value.forEach(entry => {
		index[entry.slug] = entry;
	});
	codexEntries.value.forEach(entry => {
		index[entry.slug] = entry;
	});
	return index;
});

const allEntries = computed(() => [...entries.value, ...codexEntries.value]);

const TAG_TOKEN_PATTERN = /#[^\s#]+/g;

const filteredEntries = computed(() => {
	const raw = query.value.trim();
	const lower = raw.toLowerCase();
	const tagTokens = lower.match(TAG_TOKEN_PATTERN) || [];
	const tagFilters = tagTokens.map(token => token.slice(1)).filter(Boolean);
	const plainQuery = lower.replace(TAG_TOKEN_PATTERN, " ").trim();

	return entries.value
		.filter(e => e.category === activeTab.value)
		.filter(e => {
			if (!matchesTagFilters(e, tagFilters)) return false;
			if (!plainQuery) return true;
			const searchable = [e.name, e.type, ...(e.tags || []), e.content];
			Object.entries(e).forEach(([k, v]) => {
				if (!BASE_KEYS.has(k) && v) searchable.push(Array.isArray(v) ? v.join(" ") : String(v));
			});
			return searchable.join(" ").toLowerCase().includes(plainQuery);
		});
});

const visibleEntries = computed(() => {
	return [...filteredEntries.value].sort((a, b) => collator.compare(a.name || "", b.name || ""));
});

function matchesTagFilters(entry, tagFilters) {
	if (!tagFilters.length) return true;
	const variants = new Set();
	(entry.tags || []).forEach(tag => {
		const base = String(tag || "")
			.trim()
			.toLowerCase();
		if (!base) return;
		variants.add(base);
		const slug = slugify(base);
		if (slug) {
			variants.add(slug);
			const slugCompact = slug.replace(/-/g, "");
			if (slugCompact) variants.add(slugCompact);
		}
		const compact = base.replace(/[^a-z0-9]/g, "");
		if (compact) variants.add(compact);
	});
	if (!variants.size) return false;
	return tagFilters.every(filter => variants.has(filter));
}

const relatedEntries = computed(() => {
	if (!selectedEntry.value) return [];
	const current = selectedEntry.value;
	const tags = new Set((current.tags || []).map(tag => tag.toLowerCase()));
	if (!tags.size) return [];

	const scored = [];
	allEntries.value.forEach(entry => {
		if (!entry || entry.slug === current.slug) return;
		if (entry.category === "codex") return;
		const entryTags = (entry.tags || []).map(tag => tag.toLowerCase());
		let overlap = 0;
		entryTags.forEach(tag => {
			if (tags.has(tag)) overlap++;
		});
		if (!overlap) return;
		const sameCategory = entry.category === current.category ? 1 : 0;
		scored.push({ entry, overlap, sameCategory });
	});

	return scored
		.sort((a, b) => {
			if (b.sameCategory !== a.sameCategory) return b.sameCategory - a.sameCategory;
			if (b.overlap !== a.overlap) return b.overlap - a.overlap;
			return a.entry.name.localeCompare(b.entry.name);
		})
		.slice(0, 8)
		.map(item => item.entry);
});

function getCardHeaderStyle(thumbnail) {
	return null;
}

const timelineEvents = computed(() => {
	if (!selectedEntry.value) return [];
	return buildTimelineFromFacts(selectedEntry.value.quickFacts);
});

const activeTabConfig = computed(
	() => TAB_CONFIG.find(t => t.value === activeTab.value) || TAB_CONFIG[0]
);

const searchPlaceholder = computed(() => {
	const base = activeTabConfig.value?.placeholder || "Search the archive…";
	return `${base} (type #tag to filter)`;
});

const collapsedAtlasDetail = computed(() => {
	if (selectedEntry.value) return selectedEntry.value.name;
	const active = activeTabConfig.value;
	return active ? `Browse ${active.label}` : "Browse dossiers";
});

const tabDirectoryHint = computed(() => activeTabConfig.value?.directory || "src/assets/world");

const emptyNoun = computed(() => activeTabConfig.value?.emptyNoun || "entry");

const tabs = computed(() =>
	TAB_CONFIG.map(tab => ({
		...tab,
		count: entries.value.filter(entry => entry.category === tab.value).length,
	}))
);

const infoboxRows = computed(() => {
	if (!selectedEntry.value) return [];
	const s = selectedEntry.value;
	const index = slugIndex.value;
	const rows = [];
	const used = new Set();
	for (const k of INFOBOX_ORDER) {
		const v = s[k];
		const ok = v !== undefined && v !== null && (Array.isArray(v) ? v.length : String(v).trim());
		if (ok) {
			rows.push({ label: labelize(k), tokens: buildInfoboxTokens(v, index), separator: ", " });
			used.add(k);
		}
	}
	Object.entries(s).forEach(([k, v]) => {
		if (BASE_KEYS.has(k) || used.has(k)) return;
		if (v === undefined || v === null) return;
		const text = Array.isArray(v) ? v.join("").trim() : String(v).trim();
		if (!text) return;
		rows.push({ label: labelize(k), tokens: buildInfoboxTokens(v, index), separator: ", " });
	});
	return rows;
});

function labelize(key) {
	return key
		.replace(/[_-]+/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/^\w|\s\w/g, c => c.toUpperCase());
}

const tooltip = ref({ visible: false, x: 0, y: 0, entry: null });

const tooltipStyle = computed(() => ({
	top: `${tooltip.value.y}px`,
	left: `${tooltip.value.x}px`,
}));

function findEntryBySlug(slug) {
	if (!slug) return null;
	const direct = slugIndex.value[slug];
	if (direct) return direct;
	const lower = slug.toLowerCase();
	const keyInsensitive = Object.keys(slugIndex.value).find(k => k.toLowerCase() === lower);
	if (keyInsensitive) return slugIndex.value[keyInsensitive];
	const normalized = slugify(slug);
	if (normalized && slugIndex.value[normalized]) return slugIndex.value[normalized];
	const normalizedKey = Object.keys(slugIndex.value).find(
		k => k.toLowerCase() === normalized.toLowerCase()
	);
	return normalizedKey ? slugIndex.value[normalizedKey] : null;
}

function setActiveTab(tab, options = {}) {
	activeTab.value = tab;
	if (!options.preserveQuery) {
		query.value = "";
	}
	const first = entries.value.find(e => e.category === tab);
	if (options.skipAutoSelect) {
		if (options.clearSelection !== false) {
			selectEntry(null);
		}
		if (!first) {
			hideTooltip();
			selectedEntry.value = null;
		}
		return;
	}
	if (first) {
		selectEntry(first);
		return;
	}
	if (!first) {
		hideTooltip();
		selectedEntry.value = null;
	}
}

function hideTooltip() {
	tooltip.value = { visible: false, x: 0, y: 0, entry: null };
}

function showTooltipForSlug(slug, position) {
	const entry = findEntryBySlug(slug);
	if (!entry) {
		hideTooltip();
		return;
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
			quickFacts: entry.quickFacts || [],
		},
	};
}

function appendTagToQuery(tag) {
	const cleaned = (tag || "").trim();
	if (!cleaned) return;
	const token = `#${slugify(cleaned)}`;
	const current = query.value.trim();
	const tokens = current ? current.split(/\s+/) : [];
	const normalized = tokens.map(t => t.toLowerCase());
	if (normalized.includes(token.toLowerCase())) return;
	const nextTokens = [...tokens, token].filter(Boolean);
	query.value = nextTokens.join(" ").trim();
}

function openRelatedEntry(entry) {
	if (!entry) return;
	if (entry.category && entry.category !== activeTab.value) {
		setActiveTab(entry.category, {
			skipAutoSelect: true,
			preserveQuery: true,
			clearSelection: false,
		});
	}
	selectEntry(entry);
}

function attachWikiLinkEvents() {
	if (!selectedEntry.value) return;
	const containers = Array.from(
		document.querySelectorAll("#world-detail .wiki-body, #world-detail .infobox")
	);
	if (!containers.length) return;

	containers.forEach(container => {
		if (!container.dataset.tooltipBound) {
			if (container.classList.contains("wiki-body")) {
				container.addEventListener("scroll", hideTooltip, { passive: true });
			}
			container.addEventListener("mouseleave", hideTooltip);
			container.dataset.tooltipBound = "true";
		}

		const links = Array.from(container.querySelectorAll('a[href^="wiki:"]'));
		links.forEach(link => {
			const href = link.getAttribute("href") || "";
			const slug = extractWikiSlug(href);
			if (!slug) return;
			const resolved = !!findEntryBySlug(slug);
			link.classList.toggle("wiki-link-resolved", resolved);
			link.classList.toggle("wiki-link-unresolved", !resolved);
			link.dataset.wikiResolved = resolved ? "true" : "false";

			if (!resolved) {
				link.dataset.wikiBound = "false";
				return;
			}

			if (link.dataset.wikiBound === "true") return;

			link.dataset.wikiBound = "true";
			link.addEventListener("mouseenter", event => {
				const pos = {
					x: event.clientX + 16,
					y: event.clientY + 24,
				};
				showTooltipForSlug(slug, pos);
			});
			link.addEventListener("mousemove", event => {
				if (!tooltip.value.visible) return;
				tooltip.value = {
					...tooltip.value,
					x: event.clientX + 16,
					y: event.clientY + 24,
				};
			});
			link.addEventListener("mouseleave", hideTooltip);
		});
	});
}

watch(
	() => route.query.slug,
	slug => {
		if (!slug) return;
		const entry = findEntryBySlug(slug);
		if (!entry) return;
		if (selectedEntry.value && selectedEntry.value.slug === slug) return;
		setActiveTab(entry.category, {
			skipAutoSelect: true,
			preserveQuery: true,
			clearSelection: false,
		});
		selectEntry(entry);
	}
);

watch(selectedEntry, async () => {
	hideTooltip();
	await nextTick();
	attachWikiLinkEvents();
});

// ---------- Front-matter + Obsidian helpers (no deps) ----------
function normalizeArray(val) {
	return !val
		? []
		: Array.isArray(val)
		? val
		: String(val)
				.split(",")
				.map(s => s.trim())
				.filter(Boolean);
}

function extractInfobox(md, meta) {
	// Remove an Obsidian infobox block and capture rows
	const lines = md.split("\n");
	const out = [];
	let i = 0;
	const collected = [];
	while (i < lines.length) {
		const line = lines[i];
		if (line.trim().startsWith("> [!infobox]")) {
			i++;
			while (i < lines.length && lines[i].trim().startsWith(">")) {
				collected.push(lines[i]);
				i++;
			}
			continue;
		}
		out.push(line);
		i++;
	}
	const kv = {};
	collected.forEach(l => {
		const t = l.replace(/^>\s?/, "");
		if (/^!\[\[/.test(t)) {
			const m = t.match(/^!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/);
			if (m) kv.__thumbnail = `/world/${m[1]}`;
			return;
		}
		if (t.includes("|")) {
			const parts = t
				.split("|")
				.map(s => s.trim())
				.filter(Boolean);
			if (parts.length === 2 && !/^[-]+$/.test(parts[0])) {
				const key = slugify(parts[0]).replace(/-/g, " ");
				const label = key.replace(/\b\w/g, c => c.toUpperCase());
				kv[label.toLowerCase()] = parts[1];
			}
		}
	});
	const merged = { ...meta };
	const map = {
		"other names": "aliases",
		gender: "gender",
		race: "race",
		age: "age",
		height: "height",
		origin: "origin",
		ethnicity: "ethnicity",
		occupation: "occupation",
		title: "title",
		languages: "languages",
		status: "status",
		affiliations: "affiliations",
		location: "location",
	};
	Object.entries(map).forEach(([from, to]) => {
		if (kv[from] !== undefined)
			merged[to] = /,/.test(kv[from])
				? kv[from]
						.split(",")
						.map(s => s.trim())
						.filter(Boolean)
				: kv[from];
	});
	if (kv.__thumbnail && !merged.thumbnail) merged.thumbnail = kv.__thumbnail;
	return { content: out.join("\n"), meta: merged };
}

function buildInfoboxTokens(value, index) {
	const rawValues = Array.isArray(value) ? value : [value];
	const tokens = [];
	rawValues.forEach(raw => {
		if (raw === null || raw === undefined) return;
		const text = typeof raw === "string" ? raw.trim() : String(raw);
		if (!text) return;

		const markdownMatch = text.match(/^\[([^\]]+)\]\(wiki:([^)]+)\)$/);
		if (markdownMatch) {
			const slug = markdownMatch[2];
			tokens.push({ text: markdownMatch[1], slug, resolved: !!index[slug] });
			return;
		}

		const obsidianMatch = text.match(/^\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]$/);
		if (obsidianMatch) {
			const slug = slugify(obsidianMatch[1]);
			const label = obsidianMatch[2] ? obsidianMatch[2] : obsidianMatch[1];
			const target = findEntryBySlug(slug);
			tokens.push({ text: label, slug, resolved: !!target });
			return;
		}

		const slug = slugify(text);
		const resolved = !!index[slug];
		tokens.push({ text, slug: resolved ? slug : null, resolved });
	});
	return tokens;
}

function navigateToWikiSlug(slug, event) {
	const match = findEntryBySlug(slug);
	if (!match) return;
	if (match.category === "codex") {
		const x = (event?.clientX || 0) + 16;
		const y = (event?.clientY || 0) + 24;
		showTooltipForSlug(match.slug || slug, { x, y });
		return;
	}
	selectEntry(match);
}

function handleMarkdownClick(e) {
	const a = e.target.closest("a");
	if (!a) return;
	const href = a.getAttribute("href") || "";
	if (!isWikiHref(href)) return;

	e.preventDefault();
	const slug = extractWikiSlug(href);
	if (!slug) return;
	navigateToWikiSlug(slug, e);
}

function selectEntry(entry) {
	hideTooltip();
	selectedEntry.value = entry;
	if (!entry) {
		atlasCollapsed.value = false;
		if (route.name === "World" && route.query.slug) {
			const nextQuery = { ...route.query };
			delete nextQuery.slug;
			router.replace({ path: route.path, query: nextQuery });
		}
		return;
	}
	atlasCollapsed.value = true;
	if (route.name === "World") {
		const slug = entry.slug;
		if (slug && route.query.slug !== slug) {
			router.replace({ path: route.path, query: { ...route.query, slug } });
		}
	}
}

function collapseAtlas() {
	atlasCollapsed.value = true;
}

function expandAtlas() {
	if (selectedEntry.value) {
		selectEntry(null);
		return;
	}
	atlasCollapsed.value = false;
}

function resolveThumbnailPath(rawPath) {
	const raw = (rawPath || "").toString().trim();
	if (!raw) return "";
	if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
	if (raw.startsWith("/")) return raw;
	if (raw.startsWith("world/")) return `/${raw}`;
	if (raw.startsWith("./world/")) return `/${raw.slice(2)}`;
	return `/world/${raw.replace(/^\.\//, "")}`;
}

function detectCategory(sourcePath, type) {
	const lowerType = (type || "").toLowerCase();
	if (/world\/terms\//i.test(sourcePath) || lowerType === "term" || lowerType.includes("codex"))
		return "codex";
	if (
		/world\/factions\//i.test(sourcePath) ||
		lowerType.includes("faction") ||
		lowerType.includes("power")
	)
		return "power";
	if (
		/world\/planets\//i.test(sourcePath) ||
		lowerType.includes("world") ||
		lowerType.includes("planet")
	)
		return "world";
	if (
		/world\/stations\//i.test(sourcePath) ||
		lowerType.includes("gate") ||
		lowerType.includes("station")
	)
		return "gate";
	return "people";
}

function extractSummary(entry) {
	if (entry.summary)
		return Array.isArray(entry.summary) ? entry.summary.join(" ") : String(entry.summary);
	if (entry.tooltip)
		return Array.isArray(entry.tooltip) ? entry.tooltip.join(" ") : String(entry.tooltip);
	const raw = entry.content || "";
	const stripped = raw.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#>*_`]/g, "");
	const sentence =
		stripped
			.split(/\n+/)
			.map(line => line.trim())
			.filter(Boolean)[0] || "";
	return sentence.slice(0, 220) + (sentence.length > 220 ? "…" : "");
}

function buildQuickFacts(entry) {
	const quick = [];

	if (Array.isArray(entry.quickFacts) && entry.quickFacts.length) {
		entry.quickFacts.forEach(fact => {
			const normalized = normalizeQuickFactItem(fact);
			if (normalized) quick.push(normalized);
		});
		if (quick.length) return quick;
	}

	const fields = entry.tooltipFacts || entry.infobox || null;
	if (Array.isArray(fields)) {
		fields.forEach(f => {
			const normalized = normalizeQuickFactItem(f);
			if (normalized) quick.push(normalized);
		});
		if (quick.length) return quick;
	} else if (fields && typeof fields === "string") {
		const parts = fields
			.split("|")
			.map(s => s.trim())
			.filter(Boolean);
		parts.forEach(part => {
			const normalized = normalizeQuickFactItem(part);
			if (normalized) quick.push(normalized);
		});
		if (quick.length) return quick;
	}

	const candidates = ["role", "rank", "affiliations", "location", "status"];
	candidates.forEach(key => {
		if (entry[key]) {
			const value = Array.isArray(entry[key]) ? entry[key].join(", ") : entry[key];
			quick.push({ label: labelize(key), value });
		}
	});
	return quick;
}

function normalizeQuickFactItem(fact) {
	if (!fact) return null;
	if (typeof fact === "string") {
		const [label, ...rest] = fact.split(":");
		if (!label || !rest.length) return null;
		return { label: label.trim(), value: rest.join(":").trim() };
	}
	if (typeof fact === "object") {
		const { label = "", value = "", ...rest } = fact;
		if (!label && !value && !rest.date && !rest.year && !rest.description && !rest.title)
			return null;
		return {
			label: typeof label === "string" ? label.trim() : label,
			value: typeof value === "string" ? value.trim() : value,
			...rest,
		};
	}
	return null;
}

function postProcessEntry(entry) {
	const category = detectCategory(entry.sourcePath || "", entry.type);
	const summary = extractSummary(entry);
	const thumbnail = resolveThumbnailPath(entry.thumbnail || "");
	const hasThumbnail = !!thumbnail;
	const cardThumbnail = thumbnail || "/world/placeholder.png";
	const quickFacts = buildQuickFacts(entry);
	return {
		...entry,
		category,
		summary,
		thumbnail,
		cardThumbnail,
		hasThumbnail,
		quickFacts,
	};
}

function buildTimelineFromFacts(facts) {
	if (!Array.isArray(facts) || !facts.length) return [];
	const events = facts
		.map((fact, index) => convertFactToTimelineEvent(fact, index))
		.filter(Boolean)
		.sort((a, b) => {
			if (a.sortKey != null && b.sortKey != null) return a.sortKey - b.sortKey;
			if (a.sortKey != null) return -1;
			if (b.sortKey != null) return 1;
			return a.date.localeCompare(b.date);
		})
		.map((event, index) => ({
			...event,
			id: event.id || `timeline-${index}`,
		}));
	return events;
}

function convertFactToTimelineEvent(fact, index) {
	if (!fact) return null;

	if (typeof fact === "string") {
		const match = fact.match(/^([^:–-]+)[:–-]\s*(.+)$/);
		if (!match) return null;
		const dateCandidate = extractDateCandidate(match[1]);
		if (!dateCandidate) return null;
		return {
			id: `quickfact-${index}`,
			date: dateCandidate.text,
			sortKey: dateCandidate.sortKey,
			title: "",
			description: match[2].trim(),
		};
	}

	if (typeof fact === "object") {
		const { label, value, description, title } = fact;
		const dateSource = fact.date || fact.year || null;
		let candidate = extractDateCandidate(dateSource);
		let factDescription =
			typeof description === "string"
				? description.trim()
				: Array.isArray(description)
				? description.join(", ")
				: "";
		const valueText = Array.isArray(value)
			? value.join(", ")
			: typeof value === "string"
			? value.trim()
			: "";

		if (!candidate && typeof label === "string" && isLikelyDateString(label)) {
			candidate = extractDateCandidate(label);
		}

		if (!candidate && valueText) {
			const match = valueText.match(/^([^:–-]+)[:–-]\s*(.+)$/);
			if (match) {
				const potentialDate = extractDateCandidate(match[1]);
				if (potentialDate) {
					candidate = potentialDate;
					if (!factDescription) factDescription = match[2].trim();
				}
			}
		}

		if (!candidate) return null;

		if (!factDescription) factDescription = valueText;

		let factTitle = typeof title === "string" ? title.trim() : "";
		if (!factTitle && typeof label === "string" && !isLikelyDateString(label)) {
			factTitle = label.trim();
		}

		return {
			id: fact.id || `quickfact-${index}`,
			date: candidate.text,
			sortKey: candidate.sortKey,
			title: factTitle,
			description: factDescription,
		};
	}

	return null;
}

function isLikelyDateString(value) {
	if (!value) return false;
	return !!extractDateCandidate(value);
}

function extractDateCandidate(value) {
	if (!value) return null;
	const raw = String(value).trim();
	if (!raw) return null;
	const normalized = raw.replace(/^(?:c\.|ca\.|circa)\s+/i, "");

	const isoMatch = normalized.match(/^(\d{4})[./-](\d{1,2})(?:[./-](\d{1,2}))?$/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		const date = new Date(Number(year), Number(month) - 1, day ? Number(day) : 1);
		return { text: raw, sortKey: date.getTime() };
	}

	const yearOnly = normalized.match(/^-?\d{3,4}$/);
	if (yearOnly) {
		const year = Number(yearOnly[0]);
		if (!Number.isNaN(year)) {
			return { text: raw, sortKey: year * 12 * 31 };
		}
	}

	const parsed = Date.parse(normalized);
	if (!Number.isNaN(parsed)) {
		return { text: raw, sortKey: parsed };
	}

	const firstYear = normalized.match(/(-?\d{3,4})/);
	if (firstYear) {
		const year = Number(firstYear[1]);
		if (!Number.isNaN(year)) {
			return { text: raw, sortKey: year * 12 * 31 };
		}
	}

	return null;
}

const CATEGORY_SOURCE_PREFIX = {
	npcs: "src/assets/world/npcs/",
	factions: "src/assets/world/factions/",
	planets: "src/assets/world/planets/",
	stations: "src/assets/world/stations/",
	terms: "src/assets/world/terms/",
	custom: "src/assets/world/custom/",
};

function loadAdminEntriesFromStorage() {
	if (typeof window === "undefined" || !window.localStorage) return [];
	try {
		const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(convertAdminEntry).filter(Boolean);
	} catch (error) {
		console.warn("Failed to load stored admin entries", error);
		return [];
	}
}

function convertAdminEntry(item) {
	if (!item || typeof item !== "object") return null;
	const slug = (item.slug && String(item.slug).trim()) || (item.name ? slugify(item.name) : "");
	if (!slug) return null;
	const categoryKey =
		typeof item.category === "string" && CATEGORY_SOURCE_PREFIX[item.category]
			? item.category
			: "custom";

	const tags = Array.isArray(item.tags)
		? item.tags.map(tag => String(tag).trim()).filter(Boolean)
		: typeof item.tags === "string"
		? item.tags
				.split(",")
				.map(tag => tag.trim())
				.filter(Boolean)
		: [];

	const additionalFields = {};
	if (Array.isArray(item.additionalFields)) {
		item.additionalFields.forEach(field => {
			if (!field || typeof field !== "object" || !field.key) return;
			const key = String(field.key).trim();
			if (!key) return;
			const values = Array.isArray(field.values)
				? field.values
						.map(val => (typeof val === "string" ? val.trim() : val))
						.filter(val => val !== "" && val !== null && val !== undefined)
				: field.value !== undefined
				? [field.value]
				: [];
			if (!values.length) return;
			additionalFields[key] = values.length === 1 ? values[0] : values;
		});
	}

	const quickFacts = Array.isArray(item.quickFacts)
		? item.quickFacts.map(fact => normalizeAdminQuickFact(fact)).filter(Boolean)
		: [];

	const baseEntry = {
		slug,
		name: item.name || "Untitled Entry",
		type: item.type || defaultTypeForCategory(categoryKey),
		tags,
		thumbnail: item.thumbnail || "",
		summary: item.summary || "",
		quickFacts,
		draft: item.draft ? true : undefined,
		content: item.body || "",
		sourcePath: `${CATEGORY_SOURCE_PREFIX[categoryKey]}${slug}.md`,
		...additionalFields,
	};

	const processed = postProcessEntry(baseEntry);
	processed.sourcePath = baseEntry.sourcePath;
	return processed;
}

function normalizeAdminQuickFact(fact) {
	if (!fact || typeof fact !== "object") return null;
	const normalized = {};
	["label", "value", "date", "year", "title", "description"].forEach(key => {
		if (fact[key] !== undefined && fact[key] !== null && String(fact[key]).trim() !== "") {
			normalized[key] = typeof fact[key] === "string" ? fact[key].trim() : fact[key];
		}
	});
	return Object.keys(normalized).length ? normalized : null;
}

function defaultTypeForCategory(categoryKey) {
	switch (categoryKey) {
		case "npcs":
			return "Personnel File";
		case "factions":
			return "Faction Brief";
		case "planets":
			return "World Log";
		case "stations":
			return "Transit Gate Record";
		case "terms":
			return "Codex Entry";
		default:
			return "Atlas File";
	}
}

async function loadEntries() {
	entries.value = [];
	codexEntries.value = [];
	const modules = {
		...import.meta.glob("@/assets/world/**/*.md", { query: "?raw", import: "default" }),
		...import.meta.glob("/src/assets/world/**/*.md", { query: "?raw", import: "default" }),
		...import.meta.glob("/assets/world/**/*.md", { query: "?raw", import: "default" }),
	};
	const fileEntries = Object.entries(modules);
	const loaded = await Promise.all(
		fileEntries.map(([path, loader]) => loader().then(mod => ({ path, mod })))
	);
	const seen = new Set();
	const slugSeen = new Set();
	loaded.forEach(({ path, mod }) => {
		if (seen.has(path)) return;
		seen.add(path);
		const raw = typeof mod === "string" ? mod : mod.default;

		// 1) Front-matter (if any)
		let data = null,
			body = raw;
		if (raw.startsWith("---")) {
			const fm = parseFrontMatter(raw);
			data = fm.data;
			body = fm.content;
		}

		// 2) Obsidian transforms
		body = transformWikiImages(body);
		body = transformWikiLinks(body);
		const inf = extractInfobox(body, data || {});
		body = inf.content;
		const meta = inf.meta || {};

		// 3) Build entry (fallback to simple 5-line header)
		let entry;
		if (meta && (meta.name || meta.slug)) {
			entry = {
				slug: meta.slug || slugify(meta.name),
				name: meta.name || "Untitled",
				type: meta.type || "NPC",
				tags: normalizeArray(meta.tags),
				thumbnail: meta.thumbnail || "",
				content: body || "",
				sourcePath: path,
				...Object.fromEntries(
					Object.entries(meta).filter(
						([k]) => !["slug", "name", "type", "tags", "thumbnail"].includes(k)
					)
				),
			};
		} else {
			const lines = (raw || "").split("\n");
			entry = {
				slug: (lines[0] || "").trim(),
				name: (lines[1] || "").trim(),
				type: (lines[2] || "NPC").trim(),
				tags: (lines[3] || "")
					.split(",")
					.map(s => s.trim())
					.filter(Boolean),
				thumbnail: (lines[4] || "").trim(),
				content: lines.slice(5).join("\n"),
				sourcePath: path,
			};
		}

		const processed = postProcessEntry(entry);
		const isDraft =
			typeof processed.draft === "string"
				? processed.draft.toLowerCase() === "true"
				: !!processed.draft;
		if (isDraft) return;
		if (slugSeen.has(processed.slug)) return;
		slugSeen.add(processed.slug);
		if (processed.category === "codex") {
			codexEntries.value.push(processed);
			return;
		}
		entries.value.push(processed);
	});

	const adminEntries = loadAdminEntriesFromStorage();
	adminEntries.forEach(entry => {
		if (!entry || !entry.slug) return;
		if (slugSeen.has(entry.slug)) return;
		const processed = postProcessEntry(entry);
		slugSeen.add(processed.slug);
		const isDraft =
			typeof processed.draft === "string"
				? processed.draft.toLowerCase() === "true"
				: !!processed.draft;
		if (isDraft) return;
		if (processed.category === "codex") {
			codexEntries.value.push(processed);
			return;
		}
		entries.value.push(processed);
	});

	entries.value.sort((a, b) => a.name.localeCompare(b.name));
	codexEntries.value.sort((a, b) => a.name.localeCompare(b.name));
	if (!entries.value.some(e => e.category === activeTab.value)) {
		const fallback = TAB_CONFIG.map(t => t.value).find(cat =>
			entries.value.some(e => e.category === cat)
		);
		if (fallback) activeTab.value = fallback;
	}

	const routeSlug = typeof route.query.slug === "string" ? route.query.slug : null;
	let initial = null;
	if (routeSlug) {
		const target = slugIndex.value[routeSlug];
		if (target) {
			activeTab.value = target.category;
			initial = target;
		}
	}

	if (initial) {
		selectEntry(initial);
	} else {
		selectEntry(null);
	}
	await nextTick();
	attachWikiLinkEvents();
	setAtlasIndex([...entries.value, ...codexEntries.value]);
}

const handleAdminEntriesUpdated = () => {
	loadEntries();
};

onMounted(() => {
	loadEntries();
	if (typeof window !== "undefined") {
		window.addEventListener("atlas-admin-entries-updated", handleAdminEntriesUpdated);
	}
});

onUnmounted(() => {
	if (typeof window !== "undefined") {
		window.removeEventListener("atlas-admin-entries-updated", handleAdminEntriesUpdated);
	}
});
</script>

<style scoped>
#worldView {
	position: relative;
	align-items: flex-start;
	gap: 18px;
	overflow: auto;
	min-height: calc(100vh - 110px);
}

#worldView.has-selection {
	gap: 0;
}

#world.section-container {
	width: 435px;
	height: 840px;
	margin: 50px 30px;
}

.atlas-panel {
	flex-shrink: 0;
}
.atlas-panel--expanded {
	width: 520px;
}
.atlas-panel--compact {
	width: 420px;
}

#world .section-content-container {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 6px 0 0;
}

.world-tabs-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 14px 10px;
	border-bottom: 1px solid var(--primary-color);
}

.world-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	flex: 1;
}
.world-tab {
	border: 1px solid var(--primary-color);
	background: var(--secondary-color);
	color: var(--text-location);
	padding: 6px 12px;
	text-transform: uppercase;
	letter-spacing: 0.12em;
	font-size: 0.72rem;
	font-family: "Raleway", sans-serif;
	cursor: pointer;
	transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.world-tab:hover,
.world-tab:focus-visible {
	border-color: var(--highlight-hover);
	outline: none;
}
.world-tab.active {
	background: var(--primary-color);
	color: #0b0d13;
}
.world-tab-count {
	padding: 2px 8px;
	border: 1px solid currentColor;
	border-radius: 999px;
	font-size: 0.65rem;
	letter-spacing: 0.08em;
}

.atlas-collapse-button {
	border: 1px solid var(--primary-color);
	background: transparent;
	color: var(--text-location);
	padding: 6px 14px;
	text-transform: uppercase;
	letter-spacing: 0.12em;
	font-size: 0.72rem;
	font-family: "Raleway", sans-serif;
	cursor: pointer;
	transition: background-color 0.2s ease, color 0.2s ease;
}
.atlas-collapse-button:hover,
.atlas-collapse-button:focus-visible {
	background: var(--highlight-active);
	outline: none;
}

.world-filters {
	padding: 0 14px 10px;
	border-bottom: 1px solid var(--primary-color);
}
.world-filter-bar {
	display: flex;
	gap: 8px;
}
.world-input {
	width: 100%;
	padding: 8px 10px;
	background: var(--secondary-color);
	border: 1px solid var(--primary-color);
	color: var(--text-location);
	font-family: "Roboto", sans-serif;
	font-size: 0.95rem;
}
.world-filter-hint {
	margin: 6px 0 0;
	font-size: 0.72rem;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--text-location);
}
.world-filter-hash {
	color: var(--primary-color);
}

.events-list-container {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	overflow: auto;
}
.events-list-container.show-placeholder {
	align-items: center;
	justify-content: center;
	padding: 1em;
}
.empty-placeholder {
	text-align: center;
	opacity: 0.75;
	font-family: "Roboto", sans-serif;
}
.empty-placeholder code {
	background: rgba(0, 0, 0, 0.25);
	padding: 2px 6px;
	border-radius: 4px;
}

.world-grid {
	display: flex;
	flex-direction: column;
	padding: 0;
}
.world-grid-card {
	padding: 12px 14px;
	border-bottom: 1px solid var(--primary-color);
	background: transparent;
	cursor: pointer;
	transition: background-color 0.2s ease, padding-left 0.2s ease;
}
.world-grid-card:hover {
	background: var(--highlight-active);
	padding-left: 18px;
}
.world-grid-card:focus-visible {
	outline: 2px solid var(--primary-color);
	outline-offset: 2px;
}
.world-grid-card__header {
	display: flex;
	align-items: center;
	gap: 12px;
}
.world-grid-card__thumbnail {
	width: 72px;
	height: 72px;
	object-fit: cover;
	border: 1px solid var(--primary-color);
	background: #000;
}
.world-grid-card__text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.world-grid-card__type {
	margin: 0;
	font-size: 12px;
	letter-spacing: 3px;
	text-transform: uppercase;
	color: var(--text-location);
	font-family: "Raleway", sans-serif;
}
.world-grid-card__title {
	margin: 0;
	font-size: 18px;
	font-family: "Big Shoulders Display", cursive;
	letter-spacing: 0.5px;
	color: var(--primary-color);
	text-transform: uppercase;
}
.world-grid-card__summary {
	margin: 6px 0 0;
	line-height: 1.5;
	font-family: "Roboto", sans-serif;
	color: var(--text-markdown-p);
}
.world-grid-card__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 8px 0 0;
	padding: 0;
	list-style: none;
}
.world-grid-card__tag {
	padding: 2px 8px;
	border: 1px solid var(--primary-color);
	color: var(--primary-color);
	font-size: 0.72rem;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.atlas-back-button {
	position: absolute;
	top: 12px;
	left: 12px;
	padding: 8px 12px;
	background: var(--primary-color);
	color: #05070d;
	border: 1px solid var(--primary-color);
	text-transform: uppercase;
	letter-spacing: 0.12em;
	font-size: 0.72rem;
	cursor: pointer;
	z-index: 2;
}
.atlas-back-button:hover,
.atlas-back-button:focus-visible {
	filter: brightness(1.05);
	outline: none;
}

#world-detail.section-container {
	position: relative;
	width: 1764px;
	height: 840px;
	max-height: calc(100vh - 150px);
	margin: 50px 30px;
	overflow: hidden;
}
#world-detail .section-content-container {
	padding: 24px 28px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	overflow: auto;
	flex: 1 1 auto;
	min-height: 0;
}
.world-wide {
	width: 100%;
}

.wiki-article {
	display: grid;
	grid-template-columns: minmax(0, 2.6fr) minmax(240px, 320px);
	gap: 18px;
	align-items: start;
}
.wiki-header {
	grid-column: 1 / -1;
	border-bottom: 1px solid var(--primary-color);
	padding-bottom: 8px;
}
.entry-type {
	margin: 0 0 4px;
	font-size: 12px;
	letter-spacing: 3px;
	text-transform: uppercase;
	color: var(--text-location);
	font-family: "Raleway", sans-serif;
}
.entry-title {
	margin: 0;
	font-size: 28px;
	letter-spacing: 0.5px;
	font-family: "Big Shoulders Display", cursive;
	color: var(--text-markdown-h2);
	text-transform: uppercase;
}

.wiki-body {
	grid-column: 1;
	min-width: 0;
}
#world-detail .markdown {
	line-height: 1.6;
	color: var(--text-markdown-p);
	height: auto !important;
	max-height: none;
	overflow: visible;
	padding: 0;
	border: none;
}
.wiki-body .markdown p,
.wiki-body .markdown li,
.wiki-body .markdown strong {
	color: var(--text-markdown-p);
}
.wiki-body .markdown h1,
.wiki-body .markdown h2,
.wiki-body .markdown h3 {
	color: var(--text-markdown-h2);
}
.wiki-body .markdown a {
	color: #a7f0ff;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.wiki-body .markdown a:hover {
	color: #c8fbff;
}
.markdown .wiki-link {
	color: #a7f0ff;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.markdown .wiki-link:hover {
	color: #c8fbff;
}
.markdown .wiki-link-unresolved {
	color: rgba(255, 255, 255, 0.65);
	text-decoration-style: dashed;
}
.wiki-link,
.wiki-body .markdown a,
.infobox a {
	color: #a7f0ff !important;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.wiki-link:hover,
.wiki-body .markdown a:hover,
.infobox a:hover {
	color: #c8fbff !important;
}
.wiki-link-unresolved {
	color: rgba(255, 255, 255, 0.7) !important;
	text-decoration-style: dashed;
}
.infobox a {
	color: #a7f0ff !important;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.infobox a:hover {
	color: #c8fbff !important;
}
.wiki-link {
	color: #a7f0ff !important;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.wiki-link:hover {
	color: #c8fbff !important;
}
.wiki-link-unresolved {
	color: rgba(255, 255, 255, 0.7) !important;
	text-decoration-style: dashed;
}
.wiki-body .markdown code {
	color: var(--text-markdown-p);
	background: rgba(255, 255, 255, 0.08);
	padding: 2px 5px;
	border-radius: 4px;
}
.tag-chips {
	margin-top: 8px;
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}
.tag-chip {
	padding: 4px 8px;
	border: 1px solid var(--primary-color);
	color: var(--primary-color);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	cursor: pointer;
}

.infobox {
	grid-column: 2;
	background: rgba(0, 0, 0, 0.35);
	border: 1px solid var(--primary-color);
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	max-width: 320px;
}
.infobox-image {
	width: 100%;
	height: auto;
	object-fit: cover;
	border: 1px solid var(--primary-color);
}
.infobox-table {
	width: 100%;
	border-collapse: collapse;
	font-family: "Roboto", sans-serif;
	color: var(--text-markdown-p);
}
.infobox-label {
	text-align: left;
	vertical-align: top;
	padding: 6px 8px;
	width: 34%;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.infobox-value {
	padding: 6px 8px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.wiki-timeline {
	grid-column: 1 / -1;
	border: 1px solid var(--primary-color);
	padding: 12px;
	background: rgba(255, 255, 255, 0.02);
}
.wiki-section-heading {
	margin: 0 0 10px;
	font-size: 0.9rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.related-entries {
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.related-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
	gap: 10px;
}
.related-card {
	padding: 12px;
	border: 1px solid var(--primary-color);
	background: rgba(255, 255, 255, 0.02);
	cursor: pointer;
	transition: background-color 0.2s ease, border-color 0.2s ease;
}
.related-card:hover {
	background: var(--highlight-active);
	border-color: var(--highlight-hover);
}
.related-card:focus-visible {
	outline: 2px solid var(--primary-color);
	outline-offset: 2px;
}
.related-card__type {
	margin: 0;
	font-size: 0.72rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-location);
}
.related-card__title {
	margin: 2px 0 6px;
	font-size: 18px;
	font-family: "Big Shoulders Display", cursive;
	text-transform: uppercase;
}
.related-card__summary {
	margin: 0 0 8px;
	font-family: "Roboto", sans-serif;
	line-height: 1.4;
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
	border: 1px solid var(--primary-color);
	color: var(--primary-color);
	font-size: 0.72rem;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.world-detail-enter-from,
.world-detail-leave-to {
	opacity: 0;
	transform: translateX(20px);
}
.world-detail-enter-active,
.world-detail-leave-active {
	transition: opacity 0.3s ease, transform 0.3s ease;
}

.wiki-tooltip {
	position: fixed;
	max-width: 320px;
	padding: 12px;
	background: rgba(12, 14, 22, 0.92);
	border: 1px solid rgba(167, 240, 255, 0.5);
	color: var(--text-markdown-p);
	box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
	pointer-events: none;
	z-index: 6;
}
.wiki-tooltip__header {
	display: flex;
	gap: 10px;
	align-items: center;
	margin-bottom: 6px;
}
.wiki-tooltip__image {
	width: 60px;
	height: 60px;
	object-fit: cover;
	border: 1px solid var(--primary-color);
}
.wiki-tooltip__type {
	margin: 0 0 2px;
	font-size: 0.72rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}
.wiki-tooltip__title {
	margin: 0;
	font-size: 1.05rem;
	color: var(--text-markdown-h2);
}
.wiki-tooltip__summary {
	margin: 0 0 6px;
	font-size: 0.85rem;
	line-height: 1.4;
	color: var(--text-markdown-p);
}
.wiki-tooltip__facts {
	list-style: none;
	padding: 0;
	margin: 0;
	display: grid;
	gap: 4px;
}
.wiki-tooltip__fact-label {
	font-weight: 600;
	margin-right: 4px;
}
.wiki-tooltip__fact-value {
	color: var(--text-markdown-p);
}
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
	transition: opacity 0.18s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
	opacity: 0;
}
</style>
