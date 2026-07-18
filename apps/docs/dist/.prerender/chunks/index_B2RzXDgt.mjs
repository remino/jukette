import { n as __exportAll, t as createComponent } from "./compiler_UcH9HwAN.mjs";
import { m as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./server_cx2YDM1l.mjs";
import { r as renderScript, t as $$BaseLayout } from "./BaseLayout_BNf-BCWt.mjs";
//#region src/pages/jukette/demo/index.astro
var demo_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"title": "Demo",
		"path": "/jukette/demo/"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<h2>Demo</h2>${renderComponent($$result, "jukette-player", "jukette-player", {
		"preload-metadata": true,
		"prefer-media-metadata": true
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "jukette-track", "jukette-track", {
		"title": "C-sharp arpeggiator",
		"artist": "Jukette",
		"src": "/jukette/demo-tone.mp3",
		"preload": true
	})}${renderComponent($$result, "jukette-track", "jukette-track", {
		"title": "MIDI scale",
		"artist": "Jukette",
		"src": "/jukette/demo-scale.mid",
		"type": "midi"
	})}` })}${renderScript($$result, "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/demo/index.astro?astro&type=script&index=0&lang.ts")}` })}`;
}, "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/demo/index.astro", void 0);
var $$file = "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/demo/index.astro";
var $$url = "/jukette/demo";
//#endregion
//#region \0virtual:astro:page:src/pages/jukette/demo/index@_@astro
var page = () => demo_exports;
//#endregion
export { page };
