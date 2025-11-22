<template>
	<div
		id="eventsView"
		:class="{ animate: animateView }"
		:style="{ 'animation-delay': animationDelay }"
		class="content-container"
	>
		<section id="events" :class="{ animate: animate }" class="section-container">
			<div class="section-header clipped-medium-backward">
				<img src="/icons/clockwork.svg" />
				<h1>BEATS</h1>
			</div>
			<div class="section-content-container">
				<div class="events-list-container">
					<Event
						v-for="item in events"
						:key="item.title"
						:event="item"
						:animate="animate"
						@select-event="selectEvent(item)"
					/>
				</div>
			</div>
		</section>

		<section id="events-logs" :class="{ animate: animate }" class="section-container">
			<div class="section-header-wrapper">
				<div class="section-header clipped-medium-backward-events-logs">
					<img src="/icons/conversation.svg" />
					<h1>EVENT LOG</h1>
				</div>
				<div class="rhombus-back">&nbsp;</div>
			</div>
			<div class="section-content-container extra-margins" @click="handleWikiClick">
				<div class="event" v-if="selectedEvent.title">
					<div class="name">
						<h1>{{ selectedEvent.location }} // {{ selectedEvent.time }}</h1>
						<h2>{{ selectedEvent.title }}</h2>
					</div>
					<div
						class="event-markdown"
						ref="eventMarkdown"
						@mouseenter="bindWikiHover"
						@mouseover="bindWikiHover"
					>
						<vue-markdown-it :source="selectedEvent.content" class="markdown" />
					</div>
				</div>
				<transition name="tooltip-fade">
					<div v-if="tooltip.visible" class="wiki-tooltip" :style="tooltipStyle">
						<div class="wiki-tooltip__header">
							<img
								v-if="tooltip.thumbnail"
								class="wiki-tooltip__image"
								:src="tooltip.thumbnail"
								:alt="tooltip.title"
							/>
							<div>
								<p class="wiki-tooltip__type">Atlas Link</p>
								<h3 class="wiki-tooltip__title">{{ tooltip.title }}</h3>
							</div>
						</div>
						<p v-if="tooltip.summary" class="wiki-tooltip__summary">{{ tooltip.summary }}</p>
					</div>
				</transition>
			</div>
		</section>
	</div>
</template>

<script>
import { VueMarkdownIt } from "@f3ve/vue-markdown-it";
import Event from "@/components/Event.vue";
import { isWikiHref, extractWikiSlug } from "@/utils/wiki";
import { ensureAtlasIndexLoaded, lookupAtlasEntry } from "@/utils/atlasIndex";

export default {
	components: {
		VueMarkdownIt,
		Event,
	},
	props: {
		animate: {
			type: Boolean,
			required: true,
		},
		events: {
			type: Array,
			required: true,
		},
	},
	data() {
		return {
			selectedEvent: {
				title: "",
			},
			animateView: this.animate,
			animationDelay: "1.75s",
			tooltip: { visible: false, x: 0, y: 0, title: "", summary: "", thumbnail: "" },
		};
	},
	mounted() {
		if (this.events.length) {
			this.selectEvent(this.events[0]);
		}
		ensureAtlasIndexLoaded();
	},
	methods: {
		selectEvent(event) {
			this.selectedEvent = event;
			this.$nextTick(() => this.bindWikiHover());
		},
		handleWikiClick(event) {
			const anchor = event.target.closest("a");
			if (!anchor) return;
			const href = anchor.getAttribute("href") || "";
			if (!isWikiHref(href)) return;
			event.preventDefault();
			const slug = extractWikiSlug(href);
			if (!slug) return;
			this.$router.push({ path: "/world", query: { slug } });
		},
		bindWikiHover() {
			this.$nextTick(() => {
				const container = this.$refs.eventMarkdown;
				if (!container) return;
				const links = Array.from(container.querySelectorAll('a[href^="wiki:"]'));
				links.forEach(link => {
					if (link.dataset.tooltipBound === "true") return;
					link.dataset.tooltipBound = "true";
					link.addEventListener("mouseenter", this.showTooltip);
					link.addEventListener("mousemove", this.moveTooltip);
					link.addEventListener("mouseleave", this.hideTooltip);
				});
			});
		},
		showTooltip(event) {
			const href = event.target.getAttribute("href") || "";
			const slug = extractWikiSlug(href);
			const match = slug ? lookupAtlasEntry(slug) : null;
			if (!match) ensureAtlasIndexLoaded();
			const title = (event.target.textContent || "").trim();
			this.tooltip = {
				visible: true,
				x: event.clientX + 16,
				y: event.clientY + 24,
				title: (match && match.name) || title || "Atlas Entry",
				summary: match?.summary || "",
				thumbnail: match?.thumbnail || "",
			};
		},
		moveTooltip(event) {
			if (!this.tooltip.visible) return;
			this.tooltip = { ...this.tooltip, x: event.clientX + 16, y: event.clientY + 24 };
		},
		hideTooltip() {
			this.tooltip = { visible: false, x: 0, y: 0, title: "", summary: "", thumbnail: "" };
		},
	},
	computed: {
		tooltipStyle() {
			return { top: `${this.tooltip.y}px`, left: `${this.tooltip.x}px` };
		},
	},
};
</script>

<style scoped>
.event-markdown .markdown a {
	color: #a7f0ff;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.event-markdown .markdown a:hover {
	color: #c8fbff;
}

.wiki-tooltip {
	position: fixed;
	max-width: 320px;
	padding: 10px 12px;
	background: rgba(12, 14, 22, 0.92);
	border: 1px solid rgba(167, 240, 255, 0.5);
	color: var(--text-markdown-p);
	box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
	pointer-events: none;
	z-index: 10;
}
.wiki-tooltip__header {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-bottom: 4px;
}
.wiki-tooltip__image {
	width: 52px;
	height: 52px;
	object-fit: cover;
	border: 1px solid var(--primary-color);
}
.wiki-tooltip__type {
	margin: 0;
	font-size: 0.72rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}
.wiki-tooltip__title {
	margin: 0;
	font-size: 1rem;
	color: var(--text-markdown-h2);
}
.wiki-tooltip__summary {
	margin: 0;
	font-size: 0.85rem;
	line-height: 1.4;
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
