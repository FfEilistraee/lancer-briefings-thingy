<template>
	<div id="adminView" class="content-container admin-view" :class="adminViewClasses">
		<section
			v-if="!isAuthenticated"
			id="adminAccess"
			class="section-container admin-section admin-section--access"
		>
			<div class="section-header clipped-medium-backward">
				<img src="/icons/protocol.svg" alt="Atlas access" />
				<h1>Atlas Control Access</h1>
			</div>
			<div class="section-content-container admin-access__content">
				<p class="admin-access__lead">
					Log in with your field passport to open the dossier forge and operations console.
				</p>

				<form class="admin-form-block" @submit.prevent="handleLogin">
					<label class="admin-field">
						<span>Agent ID</span>
						<input v-model.trim="credentials.id" type="text" autocomplete="username" required />
					</label>
					<label class="admin-field">
						<span>Passport</span>
						<input
							v-model.trim="credentials.passport"
							type="password"
							autocomplete="current-password"
							required
						/>
					</label>
					<button type="submit" class="admin-button primary">Enter console</button>
					<p v-if="loginError" class="admin-error">{{ loginError }}</p>
				</form>

				<p class="admin-hint">
					Hint: use ID <code>{{ ADMIN_ID }}</code> and passport <code>{{ ADMIN_PASSPORT }}</code
					>.
				</p>
				<RouterLink to="/status" class="admin-return-link">← Back to briefings</RouterLink>
			</div>
		</section>

		<section
			v-else
			id="adminConsole"
			class="section-container admin-section admin-section--console"
		>
			<div class="section-header-wrapper">
				<div class="section-header clipped-medium-backward">
					<img src="/icons/protocol.svg" alt="Atlas console" />
					<h1>Atlas Mission Control</h1>
				</div>
				<div class="rhombus-back">&nbsp;</div>
			</div>

			<div class="admin-console__toolbar">
				<nav class="admin-console__tabs">
					<button
						type="button"
						class="admin-console__tab"
						:class="{ active: consoleMode === 'atlas' }"
						@click="consoleMode = 'atlas'"
					>
						Atlas dossiers
					</button>
					<button
						type="button"
						class="admin-console__tab"
						:class="{ active: consoleMode === 'operations' }"
						@click="consoleMode = 'operations'"
					>
						Mission &amp; log builder
					</button>
				</nav>
				<div class="admin-console__links">
					<RouterLink to="/world" class="admin-return-link">← View the atlas</RouterLink>
					<button type="button" class="admin-button" @click="logout">Sign out</button>
				</div>
			</div>

			<div class="section-content-container admin-console__body">
				<p v-if="!storageAvailable" class="admin-warning">
					Local storage is unavailable. The console needs it to keep drafts and publish entries to
					the atlas.
				</p>

				<template v-else>
					<div
						v-if="consoleMode === 'atlas'"
						class="admin-console__grid admin-console__grid--atlas"
					>
						<section class="admin-panel-shell admin-panel-shell--sidebar">
							<header class="admin-panel-shell__header clipped-small-forward">
								<img src="/icons/npc.svg" alt="Atlas dossiers" />
								<div>
									<p class="admin-panel-shell__eyebrow">Library</p>
									<h2>Dossier drafts</h2>
									<p>Prep entries for the Atlas, manage saved work, and export markdown.</p>
								</div>
							</header>
							<div class="admin-panel-shell__body">
								<div class="admin-new-entry">
									<label class="admin-field admin-field--stacked admin-field--full">
										<span>Start a new draft</span>
										<select v-model="newEntryCategory">
											<option
												v-for="option in newEntryOptions"
												:key="option.value"
												:value="option.value"
											>
												{{ option.label }}
											</option>
										</select>
									</label>
									<button
										type="button"
										class="admin-button primary admin-new-entry__button"
										@click="startNewEntry()"
									>
										New {{ newEntryLabel }}
									</button>
								</div>

								<section class="admin-sidebar__section">
									<h2>Saved drafts</h2>
									<p v-if="!sortedSavedEntries.length" class="admin-empty">
										No drafts yet. Start a new entry to begin.
									</p>
									<ul v-else class="admin-entry-list">
										<li
											v-for="entry in sortedSavedEntries"
											:key="entry.id"
											:class="['admin-entry', { active: entryForm.id === entry.id }]"
										>
											<button type="button" class="admin-entry__button" @click="editEntry(entry)">
												<span class="admin-entry__name">{{ entry.name }}</span>
												<span class="admin-entry__meta">{{ categoryLabel(entry.category) }}</span>
												<span class="admin-entry__meta admin-entry__meta--muted">
													{{ formatTimestamp(entry.updatedAt) }}
												</span>
											</button>
											<div class="admin-entry__actions">
												<button
													type="button"
													class="icon"
													@click="downloadSavedEntry(entry)"
													title="Download markdown"
												>
													⬇
												</button>
												<button type="button" class="icon" @click="deleteEntry(entry)">✕</button>
											</div>
										</li>
									</ul>
								</section>

								<section class="admin-sidebar__section">
									<h2>Data management</h2>
									<button
										type="button"
										class="admin-button"
										:disabled="!savedEntries.length"
										@click="exportEntries"
									>
										Export JSON
									</button>
									<label class="admin-button file">
										Import JSON
										<input type="file" accept="application/json" @change="handleImport" />
									</label>
								</section>

								<section class="admin-sidebar__section">
									<h2>How it works</h2>
									<ul class="admin-steps">
										<li>
											Draft the left column first for category, slug, summary, and body content. The
											right column mirrors the atlas infobox with portrait, name, tags, extra
											fields, and timeline entries.
										</li>
										<li>
											Add quick facts with years or dates to build the timeline, and comma separated
											tags so the atlas can surface <code>#hashtag</code> searches.
										</li>
										<li>
											Write the body in markdown. Use <code>[[Double Brackets]]</code> to link to
											other dossiers and regular markdown for headings, lists, and emphasis.
										</li>
										<li>
											Save the entry to publish it instantly on this device, then download or copy
											the markdown.
										</li>
									</ul>
								</section>
							</div>
						</section>

						<section class="admin-panel-shell admin-panel-shell--main">
							<header class="admin-panel-shell__header clipped-small-forward">
								<img src="/icons/conversation.svg" alt="Entry editor" />
								<div>
									<p class="admin-panel-shell__eyebrow">Editor</p>
									<h2>Dossier builder</h2>
									<p>Author biographies, drop in art, and assemble infobox data in one place.</p>
								</div>
							</header>
							<div class="admin-panel-shell__body">
								<div v-if="statusMessage" :class="['admin-status', statusType]">
									{{ statusMessage }}
								</div>
								<ul v-if="formErrors.length" class="admin-errors">
									<li v-for="(err, index) in formErrors" :key="index">{{ err }}</li>
								</ul>

								<form class="admin-editor" @submit.prevent="saveEntry">
									<div class="admin-editor__columns">
										<div class="admin-column admin-column--main">
											<section class="admin-panel admin-panel--meta">
												<header>
													<h2>Atlas setup</h2>
													<p class="admin-panel__hint">
														Pick a category and slug before writing the entry.
													</p>
												</header>
												<div class="admin-grid admin-grid--meta">
													<label class="admin-field admin-field--full admin-field--stacked">
														<span>Category</span>
														<select v-model="entryForm.category">
															<option
																v-for="option in categoryOptions"
																:key="option.value"
																:value="option.value"
															>
																{{ option.label }}
															</option>
														</select>
														<span class="admin-field__hint">
															Files for this category live in
															<code>{{ categoryDirectoryHint }}</code> when you export them.
														</span>
													</label>
													<label class="admin-field">
														<span>Type</span>
														<input
															v-model.trim="entryForm.type"
															type="text"
															placeholder="Personnel File"
														/>
													</label>
													<label class="admin-field">
														<span>Slug</span>
														<input
															v-model.trim="entryForm.slug"
															type="text"
															@input="onSlugInput"
															placeholder="director-vex"
															required
														/>
													</label>
													<label class="admin-field admin-field--checkbox">
														<input v-model="entryForm.draft" type="checkbox" />
														<span>Mark as draft (hidden from atlas)</span>
													</label>
												</div>
											</section>

											<section class="admin-panel">
												<header>
													<h2>Summary &amp; body</h2>
													<p class="admin-panel__hint">
														Summary powers hover cards. The body accepts markdown and wiki links.
													</p>
												</header>
												<label class="admin-field admin-field--full">
													<span>Summary</span>
													<textarea
														v-model="entryForm.summary"
														rows="3"
														placeholder="One or two punchy sentences."
													></textarea>
												</label>
												<label class="admin-field admin-field--full">
													<span>Article body</span>
													<textarea
														v-model="entryForm.body"
														rows="12"
														placeholder="Write the dossier using markdown. Use [[Double Brackets]] for atlas links."
													></textarea>
												</label>
											</section>
										</div>

										<div class="admin-column admin-column--aside">
											<section class="admin-panel admin-panel--media">
												<header>
													<h2>Portrait</h2>
													<p class="admin-panel__hint">
														Drop in art for the dossier’s sidebar frame.
													</p>
												</header>
												<div class="admin-image-preview" v-if="entryForm.thumbnail">
													<img
														:src="entryForm.thumbnail"
														:alt="`${entryForm.name || 'Dossier'} portrait`"
													/>
												</div>
												<label class="admin-field admin-field--full">
													<span>Portrait / image URL</span>
													<input
														v-model.trim="entryForm.thumbnail"
														type="text"
														placeholder="/world/Vex.png"
													/>
												</label>
											</section>

											<section class="admin-panel">
												<header>
													<h2>Display &amp; tags</h2>
													<p class="admin-panel__hint">
														Name the dossier and add comma separated tags for atlas search.
													</p>
												</header>
												<div class="admin-grid">
													<label class="admin-field admin-field--full">
														<span>Display name</span>
														<input
															v-model.trim="entryForm.name"
															type="text"
															placeholder="Director Vex"
															required
														/>
													</label>
													<label class="admin-field admin-field--full">
														<span>Tags (comma separated)</span>
														<input
															v-model="entryForm.tagsInput"
															type="text"
															placeholder="Rustwatch-37, Orpheus Extraction"
														/>
													</label>
												</div>
											</section>

											<section class="admin-panel">
												<header>
													<h2>Infobox fields</h2>
													<p class="admin-panel__hint">
														Add additional metadata (aliases, pronouns, affiliations). Use one line
														per value for lists.
													</p>
												</header>
												<div class="admin-panel__toolbar">
													<button type="button" class="admin-button" @click="addMetaField">
														Add field
													</button>
												</div>
												<div v-if="!entryForm.additionalFields.length" class="admin-empty">
													No extra fields defined.
												</div>
												<div
													v-for="(field, index) in entryForm.additionalFields"
													:key="field.id"
													class="admin-metafield"
												>
													<div class="admin-grid">
														<label class="admin-field">
															<span>Field key</span>
															<input v-model.trim="field.key" type="text" placeholder="aliases" />
														</label>
														<label class="admin-field admin-field--full">
															<span>Values</span>
															<textarea
																v-model="field.valuesText"
																rows="2"
																placeholder="Use one value per line"
															></textarea>
														</label>
													</div>
													<button
														type="button"
														class="admin-button link"
														@click="removeMetaField(index)"
													>
														Remove field
													</button>
												</div>
											</section>

											<section class="admin-panel">
												<header>
													<h2>Quick facts &amp; timeline</h2>
													<p class="admin-panel__hint">
														Add bite-sized facts. Include a year or date to feed the timeline.
													</p>
												</header>
												<div class="admin-panel__toolbar">
													<button type="button" class="admin-button" @click="addQuickFact">
														Add quick fact
													</button>
												</div>
												<div v-if="!entryForm.quickFacts.length" class="admin-empty">
													No quick facts yet.
												</div>
												<div
													v-for="(fact, index) in entryForm.quickFacts"
													:key="fact.id"
													class="admin-quickfact"
												>
													<div class="admin-grid">
														<label class="admin-field">
															<span>Label</span>
															<input
																v-model.trim="fact.label"
																type="text"
																placeholder="Known for"
															/>
														</label>
														<label class="admin-field">
															<span>Value</span>
															<input
																v-model.trim="fact.value"
																type="text"
																placeholder="Keeping the rigs profitable"
															/>
														</label>
														<label class="admin-field">
															<span>Date / Year</span>
															<input v-model.trim="fact.date" type="text" placeholder="4981" />
														</label>
														<label class="admin-field">
															<span>Timeline title (optional)</span>
															<input
																v-model.trim="fact.title"
																type="text"
																placeholder="Charter Renewed"
															/>
														</label>
														<label class="admin-field admin-field--full">
															<span>Timeline description</span>
															<textarea
																v-model="fact.description"
																rows="2"
																placeholder="Short detail shown on the timeline."
															></textarea>
														</label>
													</div>
													<button
														type="button"
														class="admin-button link"
														@click="removeQuickFact(index)"
													>
														Remove fact
													</button>
												</div>
											</section>
										</div>
									</div>

									<footer class="admin-actions">
										<button type="submit" class="admin-button primary">Save entry</button>
										<button
											type="button"
											class="admin-button"
											@click="downloadCurrent"
											:disabled="!canGenerateMarkdown"
										>
											Download markdown
										</button>
										<button
											type="button"
											class="admin-button"
											@click="copyMarkdown"
											:disabled="!canGenerateMarkdown"
										>
											Copy markdown
										</button>
									</footer>
								</form>

								<section v-if="generatedMarkdown" class="admin-preview">
									<header>
										<h2>Markdown preview</h2>
									</header>
									<textarea readonly rows="12" :value="generatedMarkdown"></textarea>
								</section>
							</div>
						</section>
					</div>

					<div v-else class="admin-console__grid admin-console__grid--ops">
						<section class="admin-panel-shell admin-panel-shell--sidebar">
							<header class="admin-panel-shell__header clipped-small-forward">
								<img src="/icons/campaign.svg" alt="Operations console" />
								<div>
									<p class="admin-panel-shell__eyebrow">Operations</p>
									<h2>Mission &amp; log queue</h2>
									<p>Author deployments and field reports to sync with the Status and Log tabs.</p>
								</div>
							</header>
							<div class="admin-panel-shell__body">
								<div class="admin-ops-toggle" role="tablist" aria-label="Operations tool">
									<button
										type="button"
										:class="['admin-console__tab', { active: operationsTab === 'missions' }]"
										role="tab"
										@click="operationsTab = 'missions'"
									>
										Missions
									</button>
									<button
										type="button"
										:class="['admin-console__tab', { active: operationsTab === 'logs' }]"
										role="tab"
										@click="operationsTab = 'logs'"
									>
										Logs
									</button>
								</div>

								<div class="admin-new-entry">
									<button
										v-if="operationsTab === 'missions'"
										type="button"
										class="admin-button primary admin-new-entry__button"
										@click="startNewMission()"
									>
										New mission
									</button>
									<button
										v-else
										type="button"
										class="admin-button primary admin-new-entry__button"
										@click="startNewLog()"
									>
										New log entry
									</button>
								</div>

								<section class="admin-sidebar__section">
									<h2>{{ operationsTab === "missions" ? "Saved missions" : "Saved logs" }}</h2>
									<p
										v-if="operationsTab === 'missions' && !sortedSavedMissions.length"
										class="admin-empty"
									>
										No missions yet. Save one to populate the mission log.
									</p>
									<p
										v-else-if="operationsTab === 'logs' && !sortedSavedLogs.length"
										class="admin-empty"
									>
										No logs yet. Draft one to feed the event timeline.
									</p>
									<ul v-else class="admin-entry-list">
										<li
											v-for="entry in operationsTab === 'missions'
												? sortedSavedMissions
												: sortedSavedLogs"
											:key="entry.id"
											:class="[
												'admin-entry',
												{
													active:
														(operationsTab === 'missions' && missionForm.id === entry.id) ||
														(operationsTab === 'logs' && logForm.id === entry.id),
												},
											]"
										>
											<button
												type="button"
												class="admin-entry__button"
												@click="operationsTab === 'missions' ? editMission(entry) : editLog(entry)"
											>
												<span class="admin-entry__name">{{ entry.name || entry.title }}</span>
												<span class="admin-entry__meta">
													{{
														operationsTab === "missions"
															? missionStatusLabel(entry.status)
															: entry.location
													}}
												</span>
												<span class="admin-entry__meta admin-entry__meta--muted">
													{{ formatTimestamp(entry.updatedAt) }}
												</span>
											</button>
											<div class="admin-entry__actions">
												<button
													type="button"
													class="icon"
													@click="
														operationsTab === 'missions'
															? downloadMission(entry)
															: downloadLog(entry)
													"
													:title="
														operationsTab === 'missions' ? 'Download mission' : 'Download log'
													"
												>
													⬇
												</button>
												<button
													type="button"
													class="icon"
													@click="
														operationsTab === 'missions' ? deleteMission(entry) : deleteLog(entry)
													"
												>
													✕
												</button>
											</div>
										</li>
									</ul>
								</section>

								<section class="admin-sidebar__section">
									<h2>Utilities</h2>
									<button
										v-if="operationsTab === 'missions'"
										type="button"
										class="admin-button"
										:disabled="!savedMissions.length"
										@click="exportMissions"
									>
										Export missions JSON
									</button>
									<button
										v-else
										type="button"
										class="admin-button"
										:disabled="!savedLogs.length"
										@click="exportLogs"
									>
										Export logs JSON
									</button>
									<label class="admin-button file">
										Import JSON
										<input
											type="file"
											accept="application/json"
											@change="event => handleOperationsImport(event, operationsTab)"
										/>
									</label>
								</section>

								<section class="admin-sidebar__section">
									<h2>How it works</h2>
									<ul class="admin-steps">
										<li>
											Missions expect a numeric slug (e.g., <code>002</code>) so they slot beside
											existing files in <code>src/assets/missions</code>.
										</li>
										<li>
											Logs mirror the BEATS format: title, location, timestamp, thumbnail URL, then
											the markdown body. Saved drafts live locally until you export them.
										</li>
										<li>
											Use wiki links like <code>[[Atlas Entry]]</code> in either form. They resolve
											the same way once imported into the site.
										</li>
									</ul>
								</section>
							</div>
						</section>

						<section class="admin-panel-shell admin-panel-shell--main">
							<header class="admin-panel-shell__header clipped-small-forward">
								<img src="/icons/events.svg" alt="Builder" />
								<div>
									<p class="admin-panel-shell__eyebrow">Builder</p>
									<h2>
										{{ operationsTab === "missions" ? "Mission planner" : "Log composer" }}
									</h2>
									<p>Craft BEATS-ready markdown, then copy or export with a single click.</p>
								</div>
							</header>
							<div class="admin-panel-shell__body">
								<div v-if="statusMessage" :class="['admin-status', statusType]">
									{{ statusMessage }}
								</div>

								<template v-if="operationsTab === 'missions'">
									<ul v-if="missionErrors.length" class="admin-errors">
										<li v-for="(err, index) in missionErrors" :key="`mission-${index}`">
											{{ err }}
										</li>
									</ul>

									<form class="admin-editor admin-editor--split" @submit.prevent="saveMission">
										<div class="admin-editor__columns admin-editor__columns--operations">
											<div class="admin-column">
												<section class="admin-panel">
													<header>
														<h2>Mission details</h2>
														<p class="admin-panel__hint">
															Slug, title, and status drive the mission list and iconography.
														</p>
													</header>
													<div class="admin-grid admin-grid--meta">
														<label class="admin-field">
															<span>Slug</span>
															<input
																v-model.trim="missionForm.slug"
																type="text"
																placeholder="002"
																required
																@input="onMissionSlugInput"
															/>
														</label>
														<label class="admin-field admin-field--full">
															<span>Mission name</span>
															<input
																v-model.trim="missionForm.name"
																type="text"
																placeholder="Securing the Foothold"
																required
															/>
														</label>
														<label class="admin-field">
															<span>Status</span>
															<select v-model="missionForm.status">
																<option
																	v-for="option in missionStatusOptions"
																	:key="option.value"
																	:value="option.value"
																>
																	{{ option.label }}
																</option>
															</select>
														</label>
													</div>
												</section>
											</div>
											<div class="admin-column">
												<section class="admin-panel">
													<header>
														<h2>Briefing body</h2>
														<p class="admin-panel__hint">
															Use markdown and <code>[[Double Brackets]]</code> for atlas links.
														</p>
													</header>
													<label class="admin-field admin-field--full">
														<span>Briefing content</span>
														<textarea
															v-model="missionForm.body"
															rows="16"
															placeholder="Write the mission briefing in markdown."
														></textarea>
													</label>
												</section>
											</div>
										</div>

										<footer class="admin-actions">
											<button type="submit" class="admin-button primary">Save mission</button>
											<button
												type="button"
												class="admin-button"
												@click="downloadMissionDraft"
												:disabled="!canGenerateMissionMarkdown"
											>
												Download markdown
											</button>
											<button
												type="button"
												class="admin-button"
												@click="copyMissionMarkdown"
												:disabled="!canGenerateMissionMarkdown"
											>
												Copy markdown
											</button>
										</footer>
									</form>
								</template>

								<template v-else>
									<ul v-if="logErrors.length" class="admin-errors">
										<li v-for="(err, index) in logErrors" :key="`log-${index}`">{{ err }}</li>
									</ul>

									<form class="admin-editor" @submit.prevent="saveLog">
										<section class="admin-panel">
											<header>
												<h2>Log metadata</h2>
												<p class="admin-panel__hint">
													Title, location, and timestamp surface in the BEATS column.
												</p>
											</header>
											<div class="admin-grid admin-grid--meta">
												<label class="admin-field admin-field--full">
													<span>Log title</span>
													<input
														v-model.trim="logForm.title"
														type="text"
														placeholder="Internal Memorandum"
														required
													/>
												</label>
												<label class="admin-field admin-field--full">
													<span>Location</span>
													<input
														v-model.trim="logForm.location"
														type="text"
														placeholder="Macbeth Orbital"
														required
													/>
												</label>
												<label class="admin-field">
													<span>Timestamp</span>
													<input
														v-model.trim="logForm.time"
														type="text"
														placeholder="x.yy.50zzU"
														required
													/>
												</label>
												<label class="admin-field admin-field--full">
													<span>Thumbnail URL</span>
													<input
														v-model.trim="logForm.thumbnail"
														type="text"
														placeholder="https://.../image.png"
													/>
												</label>
											</div>
										</section>

										<section class="admin-panel">
											<header>
												<h2>Log body</h2>
												<p class="admin-panel__hint">
													Markdown is supported. Wiki links resolve once published.
												</p>
											</header>
											<label class="admin-field admin-field--full">
												<span>Log content</span>
												<textarea
													v-model="logForm.body"
													rows="14"
													placeholder="Write the event log in markdown."
												></textarea>
											</label>
										</section>

										<footer class="admin-actions">
											<button type="submit" class="admin-button primary">Save log</button>
											<button
												type="button"
												class="admin-button"
												@click="downloadLogDraft"
												:disabled="!canGenerateLogMarkdown"
											>
												Download markdown
											</button>
											<button
												type="button"
												class="admin-button"
												@click="copyLogMarkdown"
												:disabled="!canGenerateLogMarkdown"
											>
												Copy markdown
											</button>
										</footer>
									</form>
								</template>
							</div>
						</section>
					</div>
				</template>
			</div>
		</section>
	</div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from "vue";
import { slugify } from "@/utils/wiki";
import { stringifyFrontMatter } from "@/utils/frontMatter";

const ADMIN_ID = "admin";
const ADMIN_PASSPORT = "1234";
const STORAGE_KEY = "atlas-admin-entries";
const SESSION_KEY = "atlas-admin-session";
const MISSION_STORAGE_KEY = "atlas-admin-missions";
const LOG_STORAGE_KEY = "atlas-admin-logs";
const VALID_MISSION_STATUSES = ["start", "partial-success", "success", "failure"];

const credentials = reactive({ id: "", passport: "" });
const isAuthenticated = ref(false);
const loginError = ref("");

const adminViewClasses = computed(() => ({
	"admin-view--locked": !isAuthenticated.value,
}));

const storageAvailable =
	typeof window !== "undefined" &&
	(() => {
		try {
			const testKey = "__atlas-test__";
			window.localStorage.setItem(testKey, "1");
			window.localStorage.removeItem(testKey);
			return true;
		} catch (error) {
			return false;
		}
	})();

const savedEntries = ref(storageAvailable ? loadStoredEntries() : []);
const savedMissions = ref(storageAvailable ? loadStoredMissions() : []);
const savedLogs = ref(storageAvailable ? loadStoredLogs() : []);
const statusMessage = ref("");
const statusType = ref("success");
const formErrors = ref([]);
const missionErrors = ref([]);
const logErrors = ref([]);

const categoryOptions = [
	{ value: "npcs", label: "Characters", directory: "src/assets/world/npcs" },
	{ value: "factions", label: "Factions & powers", directory: "src/assets/world/factions" },
	{ value: "planets", label: "Worlds & sectors", directory: "src/assets/world/planets" },
	{ value: "stations", label: "Stations & gates", directory: "src/assets/world/stations" },
	{ value: "terms", label: "Codex & glossary", directory: "src/assets/world/terms" },
	{ value: "custom", label: "Local draft (custom)", directory: "Local drafts only" },
];

const newEntryCategory = ref("npcs");
const consoleMode = ref("atlas");
const operationsTab = ref("missions");
const newEntryOptions = computed(() => categoryOptions.filter(option => option.value !== "custom"));
const newEntryLabel = computed(() => labelForNewEntry(newEntryCategory.value));

const entryForm = reactive(createEmptyForm());
const slugTouched = ref(false);
const missionForm = reactive(createEmptyMissionForm());
const logForm = reactive(createEmptyLogForm());
const missionSlugTouched = ref(false);

const sortedSavedEntries = computed(() => {
	return [...savedEntries.value].sort((a, b) => {
		const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
		const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
		return right - left || a.name.localeCompare(b.name);
	});
});

const sortedSavedMissions = computed(() => {
	return [...savedMissions.value].sort((a, b) => {
		const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
		const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
		return right - left || a.slug.localeCompare(b.slug);
	});
});

const sortedSavedLogs = computed(() => {
	return [...savedLogs.value].sort((a, b) => {
		const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
		const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
		return right - left || a.title.localeCompare(b.title);
	});
});

const categoryDirectoryHint = computed(() => {
	const match = categoryOptions.find(option => option.value === entryForm.category);
	return match ? match.directory : "src/assets/world";
});

const canGenerateMarkdown = computed(() => !!buildEntryFromForm(false));
const generatedMarkdown = computed(() => {
	const entry = buildEntryFromForm(false);
	if (!entry) return "";
	return buildMarkdownFromEntry(entry);
});

const missionStatusOptions = [
	{ value: "start", label: "Current briefing" },
	{ value: "partial-success", label: "Partial success" },
	{ value: "success", label: "Mission success" },
	{ value: "failure", label: "Mission failure" },
];

const canGenerateMissionMarkdown = computed(() => !!buildMissionFromForm(false));
const canGenerateLogMarkdown = computed(() => !!buildLogFromForm(false));

watch(
	() => entryForm.name,
	value => {
		if (slugTouched.value) return;
		entryForm.slug = slugify(value || "");
	}
);

watch(
	() => entryForm.category,
	value => {
		if (!entryForm.type) {
			entryForm.type = defaultTypeForCategory(value);
		}
	}
);

onMounted(() => {
	if (typeof window !== "undefined" && window.sessionStorage?.getItem(SESSION_KEY) === "true") {
		isAuthenticated.value = true;
	}
});

function handleLogin() {
	if (credentials.id === ADMIN_ID && credentials.passport === ADMIN_PASSPORT) {
		isAuthenticated.value = true;
		loginError.value = "";
		if (typeof window !== "undefined") {
			window.sessionStorage?.setItem(SESSION_KEY, "true");
		}
		return;
	}
	loginError.value = "Invalid ID or passport. Double-check the hint below.";
}

function logout() {
	isAuthenticated.value = false;
	if (typeof window !== "undefined") {
		window.sessionStorage?.removeItem(SESSION_KEY);
	}
}

function startNewEntry(category = newEntryCategory.value) {
	const resolvedCategory = category || "npcs";
	Object.assign(entryForm, createEmptyForm(resolvedCategory));
	newEntryCategory.value = resolvedCategory;
	slugTouched.value = false;
	formErrors.value = [];
	statusMessage.value = "";
}

function startNewMission() {
	Object.assign(missionForm, createEmptyMissionForm());
	missionSlugTouched.value = false;
	missionErrors.value = [];
	statusMessage.value = "";
}

function startNewLog() {
	Object.assign(logForm, createEmptyLogForm());
	logErrors.value = [];
	statusMessage.value = "";
}

function onSlugInput() {
	slugTouched.value = true;
}

function onMissionSlugInput() {
	missionSlugTouched.value = true;
}

function addQuickFact() {
	entryForm.quickFacts.push(createQuickFact());
}

function removeQuickFact(index) {
	entryForm.quickFacts.splice(index, 1);
}

function addMetaField() {
	entryForm.additionalFields.push(createMetaField());
}

function removeMetaField(index) {
	entryForm.additionalFields.splice(index, 1);
}

function categoryLabel(value) {
	const match = categoryOptions.find(option => option.value === value);
	return match ? match.label : "Custom";
}

function formatTimestamp(timestamp) {
	if (!timestamp) return "unsaved";
	try {
		const date = new Date(timestamp);
		if (Number.isNaN(date.getTime())) return "unsaved";
		return date.toLocaleString();
	} catch (error) {
		return "unsaved";
	}
}

function saveEntry() {
	formErrors.value = [];
	const entry = buildEntryFromForm(true);
	if (!entry) return;

	const index = savedEntries.value.findIndex(e => e.id === entry.id);
	if (index !== -1) {
		savedEntries.value.splice(index, 1, entry);
	} else {
		savedEntries.value.push(entry);
	}
	persistEntries();
	Object.assign(entryForm, {
		...entryForm,
		id: entry.id,
		updatedAt: entry.updatedAt,
	});
	slugTouched.value = true;
	setStatus("Entry saved. It now appears in the atlas on this device.", "success");
}

function saveMission() {
	const mission = buildMissionFromForm(true);
	if (!mission) return;

	const index = savedMissions.value.findIndex(item => item.id === mission.id);
	const withTimestamp = { ...mission, updatedAt: new Date().toISOString() };
	if (index !== -1) {
		savedMissions.value.splice(index, 1, withTimestamp);
	} else {
		savedMissions.value.push(withTimestamp);
	}
	persistMissions();
	Object.assign(missionForm, { ...withTimestamp });
	missionSlugTouched.value = true;
	setStatus("Mission saved. It now appears in the mission log on this device.", "success");
}

function saveLog() {
	const log = buildLogFromForm(true);
	if (!log) return;

	const index = savedLogs.value.findIndex(item => item.id === log.id);
	const withTimestamp = { ...log, updatedAt: new Date().toISOString() };
	if (index !== -1) {
		savedLogs.value.splice(index, 1, withTimestamp);
	} else {
		savedLogs.value.push(withTimestamp);
	}
	persistLogs();
	Object.assign(logForm, { ...withTimestamp });
	setStatus("Log saved. It now appears in the events view on this device.", "success");
}

function buildEntryFromForm(requireValidation) {
	const errors = [];
	const name = (entryForm.name || "").trim();
	const slugCandidate = (entryForm.slug || "").trim();
	const slug = slugCandidate || slugify(name);
	if (!name) {
		if (requireValidation) errors.push("Name is required.");
		else return null;
	}
	if (!slug) {
		if (requireValidation) errors.push("Slug is required.");
		else return null;
	}
	const category = entryForm.category || "npcs";

	const tags = (entryForm.tagsInput || "")
		.split(",")
		.map(tag => tag.trim())
		.filter(Boolean);

	const quickFacts = entryForm.quickFacts
		.map(fact => ({
			label: fact.label?.trim() || "",
			value: fact.value?.trim() || "",
			date: fact.date?.trim() || "",
			title: fact.title?.trim() || "",
			description: fact.description?.trim() || "",
		}))
		.filter(fact => fact.label || fact.value || fact.date || fact.title || fact.description);

	const additionalFields = entryForm.additionalFields
		.map(field => {
			const key = field.key?.trim() || "";
			if (!key) return null;
			const values = parseFieldValues(field.valuesText);
			if (!values.length) return null;
			return { key, values };
		})
		.filter(Boolean);

	if (requireValidation && errors.length) {
		formErrors.value = errors;
		return null;
	}

	let id = entryForm.id;
	if (!id && requireValidation) {
		id = generateId();
	}

	const entry = {
		id: id || generateId(),
		category,
		name,
		slug,
		type: entryForm.type?.trim() || defaultTypeForCategory(category),
		thumbnail: entryForm.thumbnail?.trim() || "",
		tags,
		summary: entryForm.summary?.trim() || "",
		quickFacts,
		additionalFields,
		body: entryForm.body || "",
		draft: !!entryForm.draft,
		updatedAt: new Date().toISOString(),
	};
	return entry;
}

function buildEntryFromFormWithoutValidation() {
	return buildEntryFromForm(false);
}

function buildMarkdownFromEntry(entry) {
	const frontMatter = {};
	if (entry.draft) frontMatter.draft = true;
	frontMatter.slug = entry.slug;
	frontMatter.name = entry.name;
	frontMatter.type = entry.type;
	if (entry.tags?.length) frontMatter.tags = entry.tags;
	if (entry.thumbnail) frontMatter.thumbnail = entry.thumbnail;
	if (entry.summary) frontMatter.summary = entry.summary;
	if (entry.quickFacts?.length) frontMatter.quickFacts = entry.quickFacts;
	if (entry.additionalFields?.length) {
		entry.additionalFields.forEach(field => {
			if (!field.key) return;
			frontMatter[field.key] = field.values.length === 1 ? field.values[0] : field.values;
		});
	}
	const fmString = stringifyFrontMatter(frontMatter);
	const body = entry.body ? `\n${entry.body.trim()}\n` : "\n";
	return `${fmString}${body}`;
}

function persistEntries() {
	if (!storageAvailable) return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEntries.value));
	broadcastUpdate();
}

function broadcastUpdate() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("atlas-admin-entries-updated"));
}

function setStatus(message, type) {
	statusMessage.value = message;
	statusType.value = type;
}

function downloadSavedEntry(entry) {
	const markdown = buildMarkdownFromEntry(entry);
	triggerDownload(markdown, `${entry.slug || "entry"}.md`);
	setStatus("Markdown downloaded.", "success");
}

function downloadCurrent() {
	const entry = buildEntryFromFormWithoutValidation();
	if (!entry) return;
	const markdown = buildMarkdownFromEntry(entry);
	triggerDownload(markdown, `${entry.slug || "entry"}.md`);
	setStatus("Draft downloaded without saving.", "success");
}

function copyMarkdown() {
	const entry = buildEntryFromFormWithoutValidation();
	if (!entry) return;
	const markdown = buildMarkdownFromEntry(entry);
	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(markdown).then(() => {
			setStatus("Markdown copied to clipboard.", "success");
		});
	} else {
		setStatus("Clipboard API unavailable in this browser.", "error");
	}
}

function downloadMission(entry) {
	const markdown = buildMissionMarkdown(entry);
	triggerDownload(markdown, `${entry.slug || "mission"}.md`);
	setStatus("Mission markdown downloaded.", "success");
}

function downloadMissionDraft() {
	const mission = buildMissionFromFormWithoutValidation();
	if (!mission) return;
	const markdown = buildMissionMarkdown(mission);
	triggerDownload(markdown, `${mission.slug || "mission"}.md`);
	setStatus("Mission draft downloaded.", "success");
}

function copyMissionMarkdown() {
	const mission = buildMissionFromFormWithoutValidation();
	if (!mission) return;
	const markdown = buildMissionMarkdown(mission);
	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(markdown).then(() => {
			setStatus("Mission markdown copied to clipboard.", "success");
		});
	} else {
		setStatus("Clipboard API unavailable in this browser.", "error");
	}
}

function downloadLog(entry) {
	const markdown = buildLogMarkdown(entry);
	triggerDownload(markdown, `${slugify(entry.title || "log")}.md`);
	setStatus("Log markdown downloaded.", "success");
}

function downloadLogDraft() {
	const log = buildLogFromFormWithoutValidation();
	if (!log) return;
	const markdown = buildLogMarkdown(log);
	triggerDownload(markdown, `${slugify(log.title || "log")}.md`);
	setStatus("Log draft downloaded.", "success");
}

function copyLogMarkdown() {
	const log = buildLogFromFormWithoutValidation();
	if (!log) return;
	const markdown = buildLogMarkdown(log);
	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(markdown).then(() => {
			setStatus("Log markdown copied to clipboard.", "success");
		});
	} else {
		setStatus("Clipboard API unavailable in this browser.", "error");
	}
}

function editEntry(entry) {
	const quickFacts = entry.quickFacts?.length
		? entry.quickFacts.map(fact => createQuickFact(fact))
		: [];
	const additionalFields = entry.additionalFields?.length
		? entry.additionalFields.map(field => createMetaField({ key: field.key, values: field.values }))
		: [];
	Object.assign(entryForm, {
		id: entry.id,
		category: entry.category,
		name: entry.name,
		slug: entry.slug,
		type: entry.type,
		thumbnail: entry.thumbnail || "",
		tagsInput: entry.tags?.join(", ") || "",
		summary: entry.summary || "",
		body: entry.body || "",
		draft: !!entry.draft,
		quickFacts,
		additionalFields,
		updatedAt: entry.updatedAt,
	});
	slugTouched.value = true;
	formErrors.value = [];
	statusMessage.value = "";
}

function editMission(entry) {
	Object.assign(missionForm, {
		id: entry.id,
		slug: entry.slug,
		name: entry.name,
		status: entry.status,
		body: entry.content || "",
		updatedAt: entry.updatedAt,
	});
	missionSlugTouched.value = true;
	missionErrors.value = [];
	statusMessage.value = "";
}

function editLog(entry) {
	Object.assign(logForm, {
		id: entry.id,
		title: entry.title,
		location: entry.location,
		time: entry.time,
		thumbnail: entry.thumbnail || "",
		body: entry.content || "",
		updatedAt: entry.updatedAt,
	});
	logErrors.value = [];
	statusMessage.value = "";
}

function deleteEntry(entry) {
	const index = savedEntries.value.findIndex(item => item.id === entry.id);
	if (index === -1) return;
	savedEntries.value.splice(index, 1);
	persistEntries();
	if (entryForm.id === entry.id) {
		startNewEntry();
	}
	setStatus("Entry deleted.", "success");
}

function deleteMission(entry) {
	const index = savedMissions.value.findIndex(item => item.id === entry.id);
	if (index === -1) return;
	savedMissions.value.splice(index, 1);
	persistMissions();
	if (missionForm.id === entry.id) {
		startNewMission();
	}
	setStatus("Mission deleted.", "success");
}

function deleteLog(entry) {
	const index = savedLogs.value.findIndex(item => item.id === entry.id);
	if (index === -1) return;
	savedLogs.value.splice(index, 1);
	persistLogs();
	if (logForm.id === entry.id) {
		startNewLog();
	}
	setStatus("Log deleted.", "success");
}

function exportEntries() {
	if (!savedEntries.value.length) return;
	const blob = new Blob([JSON.stringify(savedEntries.value, null, 2)], {
		type: "application/json",
	});
	triggerDownload(blob, "atlas-entries.json");
	setStatus("All entries exported as JSON.", "success");
}

function exportMissions() {
	if (!savedMissions.value.length) return;
	const blob = new Blob([JSON.stringify(savedMissions.value, null, 2)], {
		type: "application/json",
	});
	triggerDownload(blob, "atlas-missions.json");
	setStatus("Missions exported as JSON.", "success");
}

function exportLogs() {
	if (!savedLogs.value.length) return;
	const blob = new Blob([JSON.stringify(savedLogs.value, null, 2)], { type: "application/json" });
	triggerDownload(blob, "atlas-logs.json");
	setStatus("Logs exported as JSON.", "success");
}

function handleImport(event) {
	const file = event.target.files?.[0];
	event.target.value = "";
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		try {
			const data = JSON.parse(reader.result);
			if (!Array.isArray(data)) throw new Error("JSON must be an array of entries");
			const normalized = data.map(normalizeImportedEntry).filter(Boolean);
			if (!normalized.length) {
				setStatus("No valid entries found in the import file.", "error");
				return;
			}
			normalized.forEach(entry => {
				const index = savedEntries.value.findIndex(item => item.id === entry.id);
				if (index !== -1) {
					savedEntries.value.splice(index, 1, entry);
				} else {
					savedEntries.value.push(entry);
				}
			});
			persistEntries();
			setStatus("Entries imported successfully.", "success");
		} catch (error) {
			console.error(error);
			setStatus("Import failed. Ensure the file came from this console.", "error");
		}
	};
	reader.readAsText(file);
}

function handleOperationsImport(event, tab) {
	const file = event.target.files?.[0];
	event.target.value = "";
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		try {
			const data = JSON.parse(reader.result);
			if (!Array.isArray(data)) throw new Error("JSON must be an array");
			if (tab === "missions") {
				const normalized = data.map(normalizeImportedMission).filter(Boolean);
				if (!normalized.length) {
					setStatus("No valid missions found in the import file.", "error");
					return;
				}
				normalized.forEach(entry => {
					const index = savedMissions.value.findIndex(item => item.id === entry.id);
					if (index !== -1) {
						savedMissions.value.splice(index, 1, entry);
					} else {
						savedMissions.value.push(entry);
					}
				});
				persistMissions();
				setStatus("Missions imported successfully.", "success");
			} else {
				const normalized = data.map(normalizeImportedLog).filter(Boolean);
				if (!normalized.length) {
					setStatus("No valid logs found in the import file.", "error");
					return;
				}
				normalized.forEach(entry => {
					const index = savedLogs.value.findIndex(item => item.id === entry.id);
					if (index !== -1) {
						savedLogs.value.splice(index, 1, entry);
					} else {
						savedLogs.value.push(entry);
					}
				});
				persistLogs();
				setStatus("Logs imported successfully.", "success");
			}
		} catch (error) {
			console.error(error);
			setStatus("Import failed. Ensure the file came from this console.", "error");
		}
	};
	reader.readAsText(file);
}

function normalizeImportedEntry(entry) {
	if (!entry || typeof entry !== "object") return null;
	const additionalFields = Array.isArray(entry.additionalFields)
		? entry.additionalFields
				.map(field => {
					if (!field || typeof field !== "object" || !field.key) return null;
					const values = Array.isArray(field.values)
						? field.values
						: parseFieldValues(typeof field.value === "string" ? field.value : "");
					return values.length ? { key: field.key, values } : null;
				})
				.filter(Boolean)
		: [];
	return {
		id: entry.id || generateId(),
		category: entry.category || "npcs",
		name: entry.name || "Untitled Entry",
		slug: entry.slug || slugify(entry.name || generateId()),
		type: entry.type || defaultTypeForCategory(entry.category || "npcs"),
		thumbnail: entry.thumbnail || "",
		tags: Array.isArray(entry.tags) ? entry.tags : [],
		summary: entry.summary || "",
		quickFacts: Array.isArray(entry.quickFacts) ? entry.quickFacts : [],
		additionalFields,
		body: entry.body || "",
		draft: !!entry.draft,
		updatedAt: entry.updatedAt || new Date().toISOString(),
	};
}

function loadStoredEntries() {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(entry => normalizeImportedEntry(entry)).filter(Boolean);
	} catch (error) {
		console.warn("Failed to load stored entries", error);
		return [];
	}
}

function loadStoredMissions() {
	try {
		const raw = window.localStorage.getItem(MISSION_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(entry => normalizeImportedMission(entry)).filter(Boolean);
	} catch (error) {
		console.warn("Failed to load stored missions", error);
		return [];
	}
}

function loadStoredLogs() {
	try {
		const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(entry => normalizeImportedLog(entry)).filter(Boolean);
	} catch (error) {
		console.warn("Failed to load stored logs", error);
		return [];
	}
}

function parseFieldValues(text) {
	return (text || "")
		.split(/\r?\n|,\s*/)
		.map(value => value.trim())
		.filter(Boolean);
}

function createEmptyForm(category = "npcs") {
	return {
		id: null,
		category,
		name: "",
		slug: "",
		type: defaultTypeForCategory(category),
		thumbnail: "",
		tagsInput: "",
		summary: "",
		body: "",
		draft: false,
		quickFacts: [],
		additionalFields: [],
		updatedAt: null,
	};
}

function createEmptyMissionForm() {
	return {
		id: null,
		slug: "",
		name: "",
		status: "start",
		body: "",
		updatedAt: null,
	};
}

function createEmptyLogForm() {
	return {
		id: null,
		title: "",
		location: "",
		time: "",
		thumbnail: "",
		body: "",
		updatedAt: null,
	};
}

function createQuickFact(initial = {}) {
	return {
		id: generateId(),
		label: initial.label || "",
		value: initial.value || "",
		date: initial.date || initial.year || "",
		title: initial.title || "",
		description: initial.description || "",
	};
}

function createMetaField(initial = {}) {
	const values = Array.isArray(initial.values)
		? initial.values
		: typeof initial.valuesText === "string"
		? parseFieldValues(initial.valuesText)
		: [];
	return {
		id: generateId(),
		key: initial.key || "",
		valuesText: values.join("\n"),
	};
}

function labelForNewEntry(category) {
	switch (category) {
		case "npcs":
			return "Character";
		case "factions":
			return "Faction";
		case "planets":
			return "World";
		case "stations":
			return "Station";
		case "terms":
			return "Term";
		case "custom":
			return "Entry";
		default:
			return "Entry";
	}
}

function defaultTypeForCategory(category) {
	switch (category) {
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

function generateId() {
	return Math.random().toString(36).slice(2, 10);
}

function triggerDownload(content, filename) {
	const blob = content instanceof Blob ? content : new Blob([content], { type: "text/plain" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

watch(
	() => missionForm.name,
	value => {
		if (missionSlugTouched.value) return;
		missionForm.slug = slugify(value || "");
	}
);

function buildMissionFromForm(requireValidation) {
	const errors = [];
	const slugCandidate = (missionForm.slug || "").trim();
	const name = (missionForm.name || "").trim();
	const slug = slugCandidate || slugify(name);
	const status = VALID_MISSION_STATUSES.includes(missionForm.status) ? missionForm.status : "start";
	const body = missionForm.body || "";

	if (!name) errors.push("Mission name is required.");
	if (!slug) errors.push("Mission slug is required.");
	if (requireValidation && !body.trim()) errors.push("Mission briefing content is required.");

	if (errors.length && requireValidation) {
		missionErrors.value = errors;
		return null;
	}
	missionErrors.value = [];

	return {
		id: missionForm.id || generateId(),
		slug,
		name,
		status,
		content: body,
		updatedAt: missionForm.updatedAt || null,
	};
}

function buildMissionFromFormWithoutValidation() {
	return buildMissionFromForm(false);
}

function buildMissionMarkdown(entry) {
	const lines = [
		entry.slug || "",
		entry.name || "",
		entry.status || "start",
		"",
		(entry.content || "").trim(),
	];
	return `${lines.join("\n")}\n`;
}

function buildLogFromForm(requireValidation) {
	const errors = [];
	const title = (logForm.title || "").trim();
	const location = (logForm.location || "").trim();
	const time = (logForm.time || "").trim();
	const thumbnail = (logForm.thumbnail || "").trim();
	const body = logForm.body || "";

	if (!title) errors.push("Log title is required.");
	if (!location) errors.push("Log location is required.");
	if (!time) errors.push("Log timestamp is required.");
	if (requireValidation && !body.trim()) errors.push("Log content is required.");

	if (errors.length && requireValidation) {
		logErrors.value = errors;
		return null;
	}
	logErrors.value = [];

	return {
		id: logForm.id || generateId(),
		title,
		location,
		time,
		thumbnail,
		content: body,
		updatedAt: logForm.updatedAt || null,
	};
}

function buildLogFromFormWithoutValidation() {
	return buildLogFromForm(false);
}

function buildLogMarkdown(entry) {
	const lines = [
		entry.title || "",
		entry.location || "",
		entry.time || "",
		entry.thumbnail || "",
		"",
		(entry.content || "").trim(),
	];
	return `${lines.join("\n")}\n`;
}

function missionStatusLabel(status) {
	const match = missionStatusOptions.find(option => option.value === status);
	return match ? match.label : "Current briefing";
}

function persistMissions() {
	if (!storageAvailable) return;
	window.localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(savedMissions.value));
	broadcastMissionUpdate();
}

function persistLogs() {
	if (!storageAvailable) return;
	window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(savedLogs.value));
	broadcastLogUpdate();
}

function broadcastMissionUpdate() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("atlas-admin-missions-updated"));
}

function broadcastLogUpdate() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("atlas-admin-logs-updated"));
}

function normalizeImportedMission(entry) {
	if (!entry || typeof entry !== "object") return null;
	const normalizedStatus = VALID_MISSION_STATUSES.includes(entry.status) ? entry.status : "start";
	const name = entry.name || "Untitled Mission";
	const slug = entry.slug || slugify(name);
	return {
		id: entry.id || generateId(),
		slug,
		name,
		status: normalizedStatus,
		content: typeof entry.content === "string" ? entry.content : "",
		updatedAt: entry.updatedAt || new Date().toISOString(),
	};
}

function normalizeImportedLog(entry) {
	if (!entry || typeof entry !== "object") return null;
	return {
		id: entry.id || generateId(),
		title: entry.title || "Untitled Log",
		location: entry.location || "Unknown Location",
		time: entry.time || "",
		thumbnail: entry.thumbnail || "",
		content: typeof entry.content === "string" ? entry.content : "",
		updatedAt: entry.updatedAt || new Date().toISOString(),
	};
}
</script>

<style scoped>
#adminView.content-container {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 36px;
	padding: 0 30px 48px;
	width: 100%;
	box-sizing: border-box;
	color: var(--text-markdown-p);
	height: calc(100vh - 120px);
	overflow-y: auto;
}

.admin-view--locked {
	padding-bottom: 24px;
}

#adminView section.section-container {
	width: 100%;
	max-width: none;
	margin: 0;
	height: auto;
}

.admin-section--access {
	max-width: 600px;
}

#adminView .section-content-container {
	background: rgba(4, 8, 14, 0.92);
	border-color: rgba(255, 255, 255, 0.12);
	padding: 28px;
	min-height: 0;
	box-sizing: border-box;
	color: var(--text-markdown-p);
}

.admin-access__content {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.admin-access__lead {
	font-size: 1rem;
	color: var(--text-markdown-p);
	margin: 0;
}

.admin-form-block {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.admin-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	font-size: 0.95rem;
	color: var(--text-markdown-p);
}

.admin-field > span {
	color: var(--text-markdown-h2);
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	font-size: 0.78rem;
}

.admin-field--stacked {
	gap: 8px;
}

.admin-field__hint {
	font-size: 0.8rem;
	opacity: 0.65;
}

.admin-field input,
.admin-field textarea,
.admin-field select {
	padding: 10px 12px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 8px;
	background: rgba(9, 11, 18, 0.92);
	color: var(--text-location);
}

.admin-field--checkbox {
	flex-direction: row;
	align-items: center;
	gap: 12px;
}

.admin-field--full {
	grid-column: 1 / -1;
}

.admin-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 10px 16px;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	background: rgba(18, 24, 36, 0.85);
	color: var(--text-location);
	cursor: pointer;
	transition: background 0.2s ease, transform 0.2s ease;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	font-size: 0.82rem;
}

.admin-button.primary {
	background: var(--primary-color);
	color: #040609;
	border-color: transparent;
	font-weight: 700;
}

.admin-button:hover {
	transform: translateY(-1px);
	background: rgba(32, 38, 52, 0.9);
}

.admin-button.primary:hover {
	background: var(--primary-color);
	filter: brightness(1.1);
}

.admin-button.link {
	background: transparent;
	border: none;
	color: var(--primary-color);
	padding: 0;
	align-self: flex-start;
	text-transform: none;
	letter-spacing: normal;
}

.admin-button.file {
	position: relative;
	overflow: hidden;
}

.admin-button.file input[type="file"] {
	position: absolute;
	inset: 0;
	opacity: 0;
	cursor: pointer;
}

.admin-hint {
	font-size: 0.9rem;
	opacity: 0.7;
}

.admin-error {
	color: #ff6b6b;
	font-size: 0.9rem;
	margin: 0;
}

.admin-return-link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	text-transform: uppercase;
	letter-spacing: 0.12em;
	font-size: 0.78rem;
	text-decoration: none;
	color: var(--primary-color);
}

.admin-console__toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 20px;
	margin: 18px 0 12px;
	flex-wrap: wrap;
}

.admin-console__tabs {
	display: inline-flex;
	gap: 12px;
	flex-wrap: wrap;
}

.admin-console__tab {
	border: 1px solid rgba(255, 255, 255, 0.18);
	background: rgba(10, 16, 24, 0.8);
	color: var(--text-location);
	padding: 10px 18px;
	border-radius: 999px;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	font-size: 0.8rem;
}

.admin-console__tab.active {
	background: var(--primary-color);
	color: #040609;
	border-color: var(--primary-color);
}

.admin-console__links {
	display: inline-flex;
	gap: 12px;
	align-items: center;
}

.admin-console__body {
	display: flex;
	flex-direction: column;
	gap: 24px;
	color: var(--text-markdown-p);
}

.admin-warning {
	padding: 14px 16px;
	border: 1px solid rgba(255, 215, 64, 0.4);
	background: rgba(60, 38, 0, 0.5);
	border-radius: 12px;
	margin: 0;
}

.admin-console__grid {
	display: grid;
	grid-template-columns: minmax(340px, 480px) minmax(0, 1fr);
	gap: 24px;
	align-items: flex-start;
}

.admin-console__grid--ops {
	grid-template-columns: minmax(340px, 480px) minmax(0, 1fr);
}

.admin-panel-shell {
	display: flex;
	flex-direction: column;
	gap: 18px;
	background: rgba(8, 12, 20, 0.85);
	border: 1px solid rgba(255, 255, 255, 0.08);
	color: var(--text-markdown-p);
}

.admin-panel-shell--main {
	flex: 1 1 auto;
}

.admin-panel-shell__header {
	display: flex;
	gap: 16px;
	align-items: center;
	padding: 18px 22px;
	background: rgba(12, 16, 26, 0.95);
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.admin-panel-shell__header img {
	width: 40px;
	height: 40px;
}

.clipped-small-forward {
	clip-path: polygon(100% 0, 100% calc(100% - 32px), calc(100% - 32px) 100%, 0 100%, 0 0);
}

.admin-panel-shell__eyebrow {
	margin: 0;
	font-size: 0.75rem;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--text-location);
	opacity: 0.7;
}

.admin-panel-shell__header h2 {
	margin: 0;
	font-family: "Big Shoulders Display", cursive;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-markdown-h2);
}

.admin-panel-shell__header p {
	margin: 4px 0 0;
	font-size: 0.9rem;
	color: var(--text-markdown-p);
}

.admin-panel-shell__body {
	padding: 0 24px 24px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	color: var(--text-markdown-p);
}

.admin-panel-shell--main .admin-panel-shell__body {
	gap: 24px;
}

.admin-new-entry {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.admin-new-entry__button {
	width: 100%;
}

.admin-sidebar__section {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.admin-entry-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.admin-entry {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 12px;
	border-radius: 12px;
	background: rgba(18, 22, 32, 0.85);
	border: 1px solid transparent;
	color: var(--text-markdown-p);
}

.admin-entry.active {
	border-color: var(--primary-color);
}

.admin-entry__button {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
	background: none;
	border: none;
	color: inherit;
	cursor: pointer;
	text-align: left;
}

.admin-entry__name {
	font-weight: 600;
	color: var(--text-markdown-h2);
}

.admin-entry__meta {
	font-size: 0.8rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--text-markdown-p);
}

.admin-entry__meta--muted {
	opacity: 0.6;
}

.admin-entry__actions {
	display: flex;
	gap: 8px;
}

.admin-entry__actions .icon {
	background: none;
	border: none;
	color: var(--text-location);
	cursor: pointer;
	font-size: 1rem;
}

.admin-empty {
	font-size: 0.9rem;
	opacity: 0.7;
}

.admin-steps {
	display: flex;
	flex-direction: column;
	gap: 6px;
	font-size: 0.9rem;
	opacity: 0.8;
	list-style: disc;
	padding-left: 18px;
}

.admin-status {
	padding: 12px 16px;
	border-radius: 12px;
}

.admin-status.success {
	background: rgba(24, 60, 32, 0.6);
	border: 1px solid rgba(90, 200, 120, 0.4);
}

.admin-status.error {
	background: rgba(60, 24, 32, 0.6);
	border: 1px solid rgba(255, 96, 96, 0.4);
}

.admin-errors {
	padding: 12px 16px;
	border-radius: 12px;
	border: 1px solid rgba(255, 96, 96, 0.4);
	background: rgba(60, 24, 32, 0.6);
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0;
}

.admin-editor {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.admin-editor__columns {
	display: grid;
	grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.8fr);
	gap: 24px;
	align-items: flex-start;
}

.admin-editor__columns--operations {
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	align-items: stretch;
}

.admin-column {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.admin-panel {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px;
	border-radius: 16px;
	background: rgba(10, 13, 22, 0.85);
	border: 1px solid rgba(255, 255, 255, 0.08);
	color: var(--text-markdown-p);
}

.admin-panel header {
	display: flex;
	flex-direction: column;
	gap: 4px;
	color: var(--text-markdown-p);
}

.admin-panel header h2 {
	color: var(--text-markdown-h2);
	font-family: "Big Shoulders Display", cursive;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.admin-panel__hint {
	font-size: 0.85rem;
	opacity: 1;
	color: rgba(255, 255, 255, 0.72);
}

.admin-panel__toolbar {
	display: flex;
	justify-content: flex-start;
}

.admin-grid {
	display: grid;
	gap: 16px;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.admin-grid--meta {
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.admin-metafield,
.admin-quickfact {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px;
	border-radius: 12px;
	background: rgba(16, 20, 30, 0.65);
	border: 1px solid rgba(255, 255, 255, 0.05);
}

.admin-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.admin-preview {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.admin-preview textarea {
	width: 100%;
	padding: 12px;
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: rgba(7, 9, 14, 0.85);
	color: var(--text-location);
	font-family: "Inconsolata", monospace;
}

.admin-image-preview {
	position: relative;
	width: 100%;
	aspect-ratio: 3 / 4;
	border-radius: 16px;
	overflow: hidden;
	border: 1px solid rgba(255, 255, 255, 0.08);
	background: rgba(7, 9, 14, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
}

.admin-image-preview img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.admin-ops-toggle {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
}

@media (max-width: 1280px) {
	.admin-console__grid {
		grid-template-columns: 1fr;
	}

	.admin-editor__columns {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 640px) {
	#adminView.content-container {
		padding: 0 16px 32px;
	}

	#adminView .section-content-container {
		padding: 20px;
	}

	.admin-console__toolbar {
		flex-direction: column;
		align-items: flex-start;
	}

	.admin-actions {
		flex-direction: column;
	}
}
</style>
