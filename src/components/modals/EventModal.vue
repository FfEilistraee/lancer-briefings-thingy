<template>
	<div class="event-modal">
		<div class="event-header-container">
			<div class="section-header clipped-medium-backward-bio">
				<img src="/icons/events.svg" />
				<h1>EVENT LOG</h1>
			</div>
			<div class="rhombus-back">&nbsp;</div>
		</div>
                <div class="event" @click="handleWikiClick">
                        <div class="name">
                                <h1>{{ event.location }} // {{ event.time }}</h1>
                                <h2>{{ event.title }}</h2>
                        </div>
                        <vue-markdown-it :source="event.content" class="markdown" />
		</div>
	</div>
</template>

<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import { isWikiHref, extractWikiSlug } from '@/utils/wiki';

export default {
        name: "EventModal",
        components: {
                VueMarkdownIt,
        },
        props: {
                event: {
                        type: Object,
                        required: true,
                },
        },
        methods: {
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
