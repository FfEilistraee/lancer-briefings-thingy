import { parseFrontMatter } from "./frontMatter";
import { slugify } from "./wiki";

const STORAGE_KEY = "atlas-slug-index";

let atlasIndexCache = null;
let loadPromise = null;

function normalizeEntries(entries) {
	const index = {};
	entries.forEach(entry => {
		if (!entry) return;
		const slug = (entry.slug || "").trim();
		if (!slug) return;
		index[slug] = {
			slug,
			name: entry.name || slug,
			type: entry.type || "Atlas Entry",
			summary: entry.summary || "",
			thumbnail: entry.thumbnail || entry.cardThumbnail || "",
		};
	});
	return index;
}

export function setAtlasIndex(entries) {
	atlasIndexCache = normalizeEntries(entries);
	if (typeof window !== "undefined") {
		window.atlasSlugIndex = atlasIndexCache;
		try {
			window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(atlasIndexCache));
		} catch (error) {
			console.warn("Failed to persist atlas index", error);
		}
	}
}

function getStoredAtlasIndex() {
	if (atlasIndexCache) return atlasIndexCache;
	if (typeof window === "undefined") return null;
	if (window.atlasSlugIndex) {
		atlasIndexCache = window.atlasSlugIndex;
		return atlasIndexCache;
	}
	try {
		const raw = window.localStorage?.getItem(STORAGE_KEY);
		if (raw) {
			atlasIndexCache = JSON.parse(raw);
			window.atlasSlugIndex = atlasIndexCache;
			return atlasIndexCache;
		}
	} catch (error) {
		console.warn("Failed to read atlas index cache", error);
	}
	return null;
}

export function getAtlasIndexSync() {
	return getStoredAtlasIndex();
}

export async function ensureAtlasIndexLoaded() {
	if (getStoredAtlasIndex()) {
		return atlasIndexCache;
	}
	if (loadPromise) {
		return loadPromise;
	}
	loadPromise = (async () => {
		const modules = import.meta.glob("@/assets/world/**/*.md", {
			query: "?raw",
			import: "default",
		});
		const files = await Promise.all(
			Object.values(modules).map(loader => loader())
		);
		const entries = files.map(raw => parseRawEntry(typeof raw === "string" ? raw : raw.default));
		const index = normalizeEntries(entries);
		atlasIndexCache = index;
		if (typeof window !== "undefined") {
			window.atlasSlugIndex = index;
			try {
				window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(index));
			} catch (error) {
				console.warn("Failed to persist atlas index", error);
			}
		}
		return index;
	})().finally(() => {
		loadPromise = null;
	});
	return loadPromise;
}

function parseRawEntry(raw) {
	if (!raw) return {};
	let body = raw;
	let data = {};
	if (raw.startsWith("---")) {
		try {
			const parsed = parseFrontMatter(raw);
			data = parsed.data || {};
			body = parsed.content || "";
		} catch (error) {
			body = raw;
		}
	} else {
		const lines = raw.split("\n");
		data.slug = (lines[0] || "").trim();
		data.name = (lines[1] || "").trim();
		data.type = (lines[2] || "").trim();
		data.thumbnail = (lines[4] || "").trim();
		body = lines.slice(5).join("\n");
	}
	if (!data.slug && data.name) {
		data.slug = slugify(data.name);
	}
	return {
		slug: data.slug || "",
		name: data.name || data.slug || "",
		type: data.type || "Atlas Entry",
		thumbnail: data.thumbnail || data.cardThumbnail || "",
		summary: extractSummary(body),
	};
}

function extractSummary(body) {
	if (!body) return "";
	const stripped = body
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[>#*_`]/g, "");
	const sentence = stripped
		.split(/\n+/)
		.map(line => line.trim())
		.filter(Boolean)[0];
	if (!sentence) return "";
	return sentence.length > 220 ? sentence.slice(0, 220) + "…" : sentence;
}

export function lookupAtlasEntry(slug) {
	if (!slug) return null;
	const index = getStoredAtlasIndex();
	if (!index) return null;
	if (index[slug]) return index[slug];
	const lower = slug.toLowerCase();
	const direct = Object.keys(index).find(key => key.toLowerCase() === lower);
	if (direct) return index[direct];
	const normalized = slugify(slug);
	if (normalized) {
		if (index[normalized]) return index[normalized];
		const normalizedKey = Object.keys(index).find(key => key.toLowerCase() === normalized.toLowerCase());
		if (normalizedKey) return index[normalizedKey];
	}
	return null;
}
