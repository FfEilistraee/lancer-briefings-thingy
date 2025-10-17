<template>
	<div id="eventsView" :class="{ animate: animateView }" :style="{ 'animation-delay': animationDelay }" class="content-container">
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
						@select-event="selectEvent(item)" />
				</div>
			</div>
		</section>
		<section id="events-logs" :class="{ animate: animate }" class="section-container">
			<div style="height: 52px; overflow: hidden">
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
                                        <vue-markdown-it :source="selectedEvent.content" class="markdown" />
				</div>
			</div>
		</section>
	</div>
</template>

<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import Event from "@/components/Event.vue";
import { isWikiHref, extractWikiSlug } from '@/utils/wiki';

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
			selectedEvent:{
				type: Object,
			}
		};
	},
        methods: {
                selectEvent(event) {
                        this.selectedEvent = event;
                },
                handleWikiClick(event) {
                        const anchor = event.target.closest('a');
                        if (!anchor) return;
                        const href = anchor.getAttribute('href') || '';
                        if (!isWikiHref(href)) return;
                        event.preventDefault();
                        const slug = extractWikiSlug(href);
                        if (!slug) return;
                        this.$router.push({ path: '/world', query: { slug } });
                }
        }
};
</script>
