<template>
	<div class="page-wrapper">
		<Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
		<Sidebar :animate="animate" :class="{ animate: animate }" />
	</div>
	<div id="router-view-container">
		<router-view :animate="animate" :initial-slug="initialSlug" :missions="missions" :events="events"
			:pilots="pilots" :clocks="clocks" :reserves="reserves" />
	</div>
	<svg style="visibility: hidden; position: absolute" width="0" height="0" xmlns="http://www.w3.org/2000/svg"
		version="1.1">
		<defs>
			<filter id="round">
				<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
				<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -5"
					result="goo" />
				<feComposite in="SourceGraphic" in2="goo" operator="atop" />
			</filter>
		</defs>
	</svg>
	<audio autoplay>
		<source src="/startup.ogg" type="audio/ogg" />
	</audio>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import Config from "@/assets/info/general-config.json";
import { applyWikiTransforms, slugify } from '@/utils/wiki';

export default {
	components: {
		Header,
		Sidebar,
	},

	data() {
                return {
                        animate: Config.animate,
                        initialSlug: Config.initialSlug,
                        planetPath: Config.planetPath,
                        header: Config.header,
                        pilotSpecialInfo: Config.pilotSpecialInfo,
                        clocks: [],
                        events: [],
                        eventsBase: [],
                        eventsAdmin: [],
                        missions: [],
                        missionsBase: [],
                        missionsAdmin: [],
                        pilots: [],
                        reserves: [],
                        bonds: [],
                };
        },
        created() {
                this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);
                this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: '?raw', import: 'default' }));
                this.importEvents(import.meta.glob("@/assets/events/*.md", { query: '?raw', import: 'default' }));
                this.importClocks(import.meta.glob("@/assets/clocks/*.json"));
                this.importReserves(import.meta.glob("@/assets/reserves/*.json"));
                this.importPilots(import.meta.glob("@/assets/pilots/*.json"));
                this.loadAdminMissions();
                this.loadAdminLogs();
                if (typeof window !== 'undefined') {
                        window.addEventListener('atlas-admin-missions-updated', this.loadAdminMissions);
                        window.addEventListener('atlas-admin-logs-updated', this.loadAdminLogs);
                }
        },
        mounted() {
                this.$router.push("/status");
        },
        beforeUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('atlas-admin-missions-updated', this.loadAdminMissions);
                        window.removeEventListener('atlas-admin-logs-updated', this.loadAdminLogs);
                }
        },
        methods: {
		setTitleFavicon(title, favicon) {
			document.title = title;
			let headEl = document.querySelector('head');
			let faviconEl = document.createElement('link');
			faviconEl.setAttribute('rel', 'shortcut icon');
			faviconEl.setAttribute('href', favicon);
			headEl.appendChild(faviconEl);
		},
                async importMissions(files) {
                        const filePromises = Object.keys(files).map(path => files[path]());
                        const fileContents = await Promise.all(filePromises);
                        const base = fileContents.map(content => {
                                const lines = content.split("\n");
                                return {
                                        slug: lines[0],
                                        name: lines[1],
                                        status: lines[2],
                                        content: applyWikiTransforms(lines.slice(3).join("\n")),
                                };
                        });
                        this.missionsBase = this.sortMissions(base);
                        this.updateMissions();
                },
                async importEvents(files) {
                        const filePromises = Object.keys(files).map(path => files[path]());
                        const fileContents = await Promise.all(filePromises);
                        const base = fileContents.map(content => {
                                const lines = content.split("\n");
                                return {
                                        title: lines[0],
                                        location: lines[1],
                                        time: lines[2],
                                        thumbnail: lines[3],
                                        content: applyWikiTransforms(lines.slice(4).join("\n")),
                                };
                        });
                        this.eventsBase = base.reverse();
                        this.updateEvents();
                },
		async importClocks(files) {
			let filePromises = Object.keys(files).map(path => files[path]());
			let fileContents = await Promise.all(filePromises);
			fileContents.forEach(content => {
				this.clocks = JSON.parse(JSON.stringify(content)).default;
			});
		},
		async importReserves(files) {
			let filePromises = Object.keys(files).map(path => files[path]());
			let fileContents = await Promise.all(filePromises);
			fileContents.forEach(content => {
				this.reserves = JSON.parse(JSON.stringify(content)).default;
			});
		},
                async importPilots(files) {
                        let filePromises = Object.keys(files).map(path => files[path]());
                        let fileContents = await Promise.all(filePromises);
                        fileContents.forEach(content => {
                                let pilotFromJson = JSON.parse(JSON.stringify(content));
				// In case the pilot was added from a copy on compcon via sharecode, remove the "reference mark" symbol
				pilotFromJson.name = pilotFromJson.name.replace("※", "");
				pilotFromJson.callsign = pilotFromJson.callsign.replace("※", "");
				let pilotFromVue = this.pilotSpecialInfo[pilotFromJson.callsign.toUpperCase()];
				let pilot = {
					...pilotFromJson,
					...pilotFromVue,
				};
				this.pilots = [...this.pilots, pilot];
				pilot.clocks.forEach(content => {
					let clock = {};
					clock["type"] = `Pilot Project // ${pilot.callsign}`;
					clock["result"] = "";
					clock["name"] = content.title;
					clock["description"] = content.description;
					clock["value"] = content.progress;
					clock["max"] = content.segments;
					clock["color"] = "#3CB043";
					this.clocks = [...this.clocks, clock];
				});

				pilot.reserves.forEach(content => {
					let reserve = {};
					reserve["type"] = content.type;
					reserve["name"] = content.name;
					reserve["description"] = content.description;
					reserve["label"] = content.label;
					reserve["cost"] = content.cost;
					reserve["notes"] = content.notes;
					reserve["callsign"] = pilot.callsign.toUpperCase();
					this.reserves = [...this.reserves, reserve];
				});
			});
                },
                loadAdminMissions() {
                        if (typeof window === 'undefined') return;
                        try {
                                const raw = window.localStorage.getItem('atlas-admin-missions');
                                if (!raw) {
                                        this.missionsAdmin = [];
                                        this.updateMissions();
                                        return;
                                }
                                const parsed = JSON.parse(raw);
                                if (!Array.isArray(parsed)) throw new Error('Missions store must be an array');
                                this.missionsAdmin = parsed.map(this.normalizeAdminMission).filter(Boolean);
                        } catch (error) {
                                console.warn('Failed to load admin missions', error);
                                this.missionsAdmin = [];
                        }
                        this.updateMissions();
                },
                loadAdminLogs() {
                        if (typeof window === 'undefined') return;
                        try {
                                const raw = window.localStorage.getItem('atlas-admin-logs');
                                if (!raw) {
                                        this.eventsAdmin = [];
                                        this.updateEvents();
                                        return;
                                }
                                const parsed = JSON.parse(raw);
                                if (!Array.isArray(parsed)) throw new Error('Logs store must be an array');
                                this.eventsAdmin = parsed.map(this.normalizeAdminLog).filter(Boolean);
                        } catch (error) {
                                console.warn('Failed to load admin logs', error);
                                this.eventsAdmin = [];
                        }
                        this.updateEvents();
                },
                updateMissions() {
                        const combined = [];
                        const map = new Map();
                        this.missionsBase.forEach(mission => {
                                if (!mission.slug) return;
                                map.set(mission.slug, mission);
                        });
                        this.missionsAdmin.forEach(mission => {
                                if (!mission.slug) return;
                                map.set(mission.slug, {
                                        ...mission,
                                        content: applyWikiTransforms(mission.content || ''),
                                });
                        });
                        map.forEach(value => combined.push(value));
                        this.missions = this.sortMissions(combined);
                },
                updateEvents() {
                        const adminProcessed = this.sortLogs(this.eventsAdmin).map(event => ({
                                ...event,
                                content: applyWikiTransforms(event.content || ''),
                        }));
                        this.events = [...adminProcessed, ...this.eventsBase];
                },
                sortMissions(list) {
                        return [...list].sort((a, b) => {
                                const left = Number(a.slug);
                                const right = Number(b.slug);
                                if (!Number.isNaN(left) && !Number.isNaN(right)) {
                                        return right - left;
                                }
                                return String(b.slug || '').localeCompare(String(a.slug || ''));
                        });
                },
                sortLogs(list) {
                        return [...list].sort((a, b) => {
                                const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                                const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                                return right - left;
                        });
                },
                normalizeAdminMission(record) {
                        if (!record || typeof record !== 'object') return null;
                        const name = record.name || 'Untitled Mission';
                        const slug = (record.slug || slugify(name)).trim();
                        if (!slug) return null;
                        const status = ['start', 'partial-success', 'success', 'failure'].includes(record.status)
                                ? record.status
                                : 'start';
                        return {
                                slug,
                                name,
                                status,
                                content: typeof record.content === 'string' ? record.content : '',
                                updatedAt: record.updatedAt || null,
                        };
                },
                normalizeAdminLog(record) {
                        if (!record || typeof record !== 'object') return null;
                        return {
                                title: record.title || 'Untitled Log',
                                location: record.location || 'Unknown Location',
                                time: record.time || '',
                                thumbnail: record.thumbnail || '',
                                content: typeof record.content === 'string' ? record.content : '',
                                updatedAt: record.updatedAt || null,
                        };
                },
        },
};
</script>

<style>
#app {
	min-height: 100vh;
	overflow: hidden !important;
	/* border-right: 1px solid #ff0;
	border-bottom: 1px solid #ff0; */
}
</style>
