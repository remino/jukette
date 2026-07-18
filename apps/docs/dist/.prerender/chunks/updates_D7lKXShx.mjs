import { n as __exportAll, t as createComponent } from "./compiler_UcH9HwAN.mjs";
import { b as unescapeHTML, m as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./server_cx2YDM1l.mjs";
import { n as site, t as $$BaseLayout } from "./BaseLayout_BNf-BCWt.mjs";
//#region ../../CHANGELOG.md
var html = () => "<h1 id=\"changelog\">CHANGELOG</h1>\n<!-- mtoc-start -->\n<ul>\n<li><a href=\"#head\">HEAD</a></li>\n<li><a href=\"#v030\">v0.3.0</a></li>\n<li><a href=\"#v020\">v0.2.0</a></li>\n<li><a href=\"#v010\">v0.1.0</a></li>\n</ul>\n<!-- mtoc-end -->\n<h2 id=\"head\">HEAD</h2>\n<ul>\n<li>Repo\n<ul>\n<li>Migrate the repository to an npm workspaces monorepo with\n<code>packages/jukette</code>, <code>packages/core</code>, <code>packages/audio</code>,\n<code>packages/midi</code>, and <code>apps/docs</code>.</li>\n<li>Publish modular packages as <code>@remino/jukette-core</code>,\n<code>@remino/jukette-audio</code>, and <code>@remino/jukette-midi</code> while keeping\nunscoped <code>jukette</code> as the convenience bundle.</li>\n<li>Move the Astro docs and demo site into the <code>apps/docs</code> workspace and\nupdate shared build, typecheck, release, and publish tooling to run\nacross the workspace layout in lockstep.</li>\n<li>Keep the docs site on the shared <code>@remino/astro-site-nav</code> components and\nleave <code>SITE_NAV_INCLUDE_ROOT</code> as the environment-provided source of HTML\npartials instead of checking partials into this repository.</li>\n<li>Load docs-site env variables from the monorepo root and resolve\n<code>SITE_NAV_INCLUDE_ROOT</code> relative to that root so the workspace-local\nAstro app can still use the repo-root <code>.env</code>.</li>\n<li>Rename the private workspace root package and add explicit <code>dev:docs</code>,\n<code>build:packages</code>, <code>build:docs</code>, <code>preview:docs</code>, and targeted typecheck\nscripts so the monorepo entrypoints read more clearly.</li>\n</ul>\n</li>\n<li>Library\n<ul>\n<li>Remove SoundCloud playback from the core library so <code>jukette-player</code>\nfocuses on browser-native audio and local MIDI tracks.</li>\n<li>Simplify <code>jukette-player</code> into a track selector with a single\nplay/pause control row, native track <code>&lt;select&gt;</code>, clickable elapsed or\nremaining time readout, and no previous/next or playlist panel UI.</li>\n<li>Remove playlist navigation and toggle APIs from the player public\nsurface, keeping track selection and playback state focused on the\ncurrent track.</li>\n<li>Fold transient status messaging into the track meta line so the player\nfalls back to the artist display when no status is active.</li>\n<li>Remove the built-in volume control from the simplified player UI and\ninternal playback plumbing.</li>\n<li>Split track parsing, metadata parsing, MIDI parsing, shared types, and\nconstants into focused <code>src/lib</code> modules.</li>\n<li>Move player shadow styles into <code>src/lib/jukette-player.css</code> and generate\na minified inline style module for builds and tests.</li>\n<li>Move <code>JukettePlayerElement</code> and custom-element registration out of the\npublic <code>jukette.ts</code> entrypoint.</li>\n<li>Split native audio and MIDI playback behavior into internal playable\ntrack classes so the player element can focus on UI and playlist\norchestration.</li>\n<li>Move player DOM setup, playlist rendering, metadata preloading,\nand progress/status display into focused internal controller and helper\nmodules.</li>\n<li>Import player shadow CSS through Vite’s inline CSS pipeline instead of a\ncustom generated TypeScript style module.</li>\n<li>Add a per-track <code>preload</code> flag for future playback preparation policies.</li>\n<li>Add per-track <code>prefer-media-metadata</code> and <code>preload</code> overrides so authored\nplaylists can control metadata display and playback preparation on a\ntrack-by-track basis.</li>\n<li>Replace the handwritten MIDI parser and oscillator scheduler with\n<code>@tonejs/midi</code> plus a Tone.js synth-backed playback path.</li>\n<li>Move MIDI playback to a Tone transport and part lifecycle so pause,\nreplay, and rapid resume behavior work predictably for local MIDI files.</li>\n<li>Expose the time readout as <code>button &gt; time</code> in the player shadow DOM and\nsimplify the control styling surface around the new compact layout.</li>\n</ul>\n</li>\n</ul>\n<h2 id=\"v030\">v0.3.0</h2>\n<ul>\n<li>Library\n<ul>\n<li>Add stable <code>::part()</code> hooks for styling the shadow UI.</li>\n</ul>\n</li>\n<li>Site\n<ul>\n<li>Document the supported Jukette styling surface.</li>\n</ul>\n</li>\n</ul>\n<h2 id=\"v020\">v0.2.0</h2>\n<ul>\n<li>Repo\n<ul>\n<li>Add Husky, lint-staged, release-it, and changelog release tooling.</li>\n</ul>\n</li>\n<li>Library\n<ul>\n<li>Add <code>jukette:*</code> custom events for playback, navigation, progress, volume,\nplaylist toggling, and track changes.</li>\n<li>Add a public <code>currentTime</code> getter/setter for reading and seeking the\nplayback position.</li>\n<li>Add <code>currentTrackIndex</code>, <code>totalTracks</code>, and <code>playlistOpen</code> public\nproperties.</li>\n</ul>\n</li>\n<li>Site\n<ul>\n<li>Add an updates page rendered from this changelog.</li>\n</ul>\n</li>\n</ul>\n<h2 id=\"v010\">v0.1.0</h2>\n<ul>\n<li>Library\n<ul>\n<li>Add the initial <code>jukette-player</code> custom element for audio and MIDI\nplaylists.</li>\n</ul>\n</li>\n<li>Site\n<ul>\n<li>Add the initial Astro documentation site and demo.</li>\n</ul>\n</li>\n</ul>\n";
var frontmatter = {};
var file = "/Users/remi/Sites/remino/jukette/CHANGELOG.md";
var Content = createComponent((result, _props, slots) => {
	const { layout, ...content } = frontmatter;
	content.file = file;
	content.url = void 0;
	return renderTemplate`${maybeRenderHead()}${unescapeHTML(html())}`;
});
//#endregion
//#region src/pages/jukette/updates.astro
var updates_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Updates,
	file: () => $$file,
	url: () => $$url
});
var $$Updates = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"title": "Updates",
		"description": `Release notes for ${site.title}.`,
		"path": "/jukette/updates/"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "ChangelogContent", Content, {})}` })}`;
}, "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/updates.astro", void 0);
var $$file = "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/updates.astro";
var $$url = "/jukette/updates";
//#endregion
//#region \0virtual:astro:page:src/pages/jukette/updates@_@astro
var page = () => updates_exports;
//#endregion
export { page };
