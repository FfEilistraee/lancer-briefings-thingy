<template>
	<div
		id="statusView"
		:class="{ animate: animateView }"
		:style="{ 'animation-delay': animationDelay }"
		class="content-container"
	>
		<section id="missions" class="section-container" :style="{ 'animation-delay': animationDelay }">
			<div class="section-header clipped-medium-backward">
				<img src="/icons/campaign.svg" />
				<h1>Mission Log</h1>
			</div>
			<div class="section-content-container">
				<div class="mission-list-container">
					<Mission
						v-for="item in missions"
						:key="item.slug"
						:mission="item"
						:selected="missionSlug"
						@click="selectMission(item.slug)"
					/>
				</div>
			</div>
		</section>
		<section
			id="assignment"
			class="section-container"
			:style="{ 'animation-delay': animationDelay }"
		>
			<div class="section-header clipped-medium-backward">
				<img src="/icons/deployable.svg" />
				<h1>Current Assignment</h1>
			</div>
			<div class="section-content-container" @click="handleWikiClick">
				<div
					class="assignment-markdown"
					ref="assignmentMarkdown"
					@mouseenter="bindWikiHover"
					@mouseover="bindWikiHover"
				>
					<vue-markdown-it :source="missionMarkdown" class="markdown" />
				</div>
			</div>
		</section>
		<div class="lower-panels">
			<section
				id="reserves"
				class="section-container"
				:style="{ 'animation-delay': animationDelay }"
			>
				<div class="section-header clipped-medium-backward">
					<img src="/icons/squad.svg" />
					<h1>Reserves</h1>
				</div>
				<div class="section-content-container">
					<div class="reserves-list-container">
						<Reserve v-for="item in reserves" :key="item.name" :reserve="item" :pilots="pilots" />
					</div>
				</div>
			</section>
			<section id="clocks" class="section-container" :style="{ 'animation-delay': animationDelay }">
				<div class="section-header clipped-medium-backward">
					<img src="/icons/protocol.svg" />
					<h1>Clocks</h1>
				</div>
				<div class="section-content-container">
					<div class="clocks-list-container">
						<Clock
							v-for="item in clocks"
							:key="item.name"
							:clock="item"
							:animate="animate"
							:animation-delay="clockAnimationDelay"
						/>
					</div>
				</div>
			</section>
		</div>
		<transition name="tooltip-fade">
			<div
				v-if="tooltip.visible"
				class="wiki-tooltip"
				:style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
			>
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
</template>

<script>
import { VueMarkdownIt } from "@f3ve/vue-markdown-it";
import Mission from "@/components/Mission.vue";
import Event from "@/components/Event.vue";
import Clock from "@/components/Clock.vue";
import Reserve from "@/components/Reserve.vue";
import { isWikiHref, extractWikiSlug } from "@/utils/wiki";
import { ensureAtlasIndexLoaded, lookupAtlasEntry } from "@/utils/atlasIndex";

export default {
	components: {
		VueMarkdownIt,
		Mission,
		Event,
		Clock,
		Reserve,
	},
	props: {
		animate: {
			type: Boolean,
			required: true,
		},
		initialSlug: {
			type: String,
			required: true,
		},
		missions: {
			type: Array,
			required: true,
		},
		events: {
			type: Array,
			required: true,
		},
		pilots: {
			type: Array,
			required: true,
		},
		clocks: {
			type: Array,
			required: true,
		},
		reserves: {
			type: Array,
			required: true,
		},
	},
	data() {
		return {
			missionSlug: this.initialSlug,
			animateView: this.animate,
			animationDelay: "1.75s",
			clockAnimationDelay: "2500",
			missionMarkdown: "",
			tooltip: { visible: false, x: 0, y: 0, title: "", summary: "", thumbnail: "" },
		};
	},
	computed: {},
	created() {
		this.setAnimate();
		this.setClockAnimateDelay();
	},
	beforeUpdate() {
		// initial set
		this.selectMission(this.missionSlug);
	},
	mounted() {
		// need to set on re-mount
		if (this.missions.length > 0) {
			this.selectMission(this.missions[0].slug);
		}
	},
	methods: {
		selectMission(slug) {
			this.missionSlug = slug;
			let m = this.missions.find(x => x.slug === this.missionSlug);
			if (!m) {
				this.missionMarkdown = "";
				return;
			}
			this.missionMarkdown = m.content;
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
				const container = this.$refs.assignmentMarkdown;
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
		setAnimate() {
			if (this.animate) {
				this.animateView = true;
			}
			let statusAnimated = window.sessionStorage.getItem("statusAnimated");
			if (statusAnimated) {
				this.animationDelay = "0s";
			}
			if (statusAnimated === null) {
				window.sessionStorage.setItem("statusAnimated", true);
			}
		},
		setClockAnimateDelay() {
			let delayToFloat = parseFloat(this.animationDelay.replace("s", ""));
			let finalClockDelay = delayToFloat * 600 + 600;
			this.clockAnimationDelay = finalClockDelay.toString();
		},
	},
};
</script>

<style scoped>
.assignment-markdown .markdown a {
	color: #a7f0ff;
	text-decoration-color: rgba(167, 240, 255, 0.5);
}
.assignment-markdown .markdown a:hover {
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
	z-index: 8;
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
