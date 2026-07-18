import { n as __exportAll, t as createComponent } from "./compiler_UcH9HwAN.mjs";
import { S as createAstro } from "./server_cx2YDM1l.mjs";
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
createAstro("https://astro.build");
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	return Astro.redirect("/jukette/");
}, "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/index.astro", void 0);
var $$file = "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
