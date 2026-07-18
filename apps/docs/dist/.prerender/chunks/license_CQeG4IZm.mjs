import { n as __exportAll, t as createComponent } from "./compiler_UcH9HwAN.mjs";
import { b as unescapeHTML, m as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./server_cx2YDM1l.mjs";
import { t as $$BaseLayout } from "./BaseLayout_BNf-BCWt.mjs";
//#region ../../LICENSE.md
var html = () => "<p>ISC License</p>\n<p>Copyright (c) 2026, Rémino Rem</p>\n<p>Permission to use, copy, modify, and/or distribute this software for any purpose\nwith or without fee is hereby granted, provided that the above copyright notice\nand this permission notice appear in all copies.</p>\n<p>THE SOFTWARE IS PROVIDED “AS IS” AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH\nREGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND\nFITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,\nINDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS\nOF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER\nTORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF\nTHIS SOFTWARE.</p>\n";
var frontmatter = {};
var file = "/Users/remi/Sites/remino/jukette/LICENSE.md";
var Content = createComponent((result, _props, slots) => {
	const { layout, ...content } = frontmatter;
	content.file = file;
	content.url = void 0;
	return renderTemplate`${maybeRenderHead()}${unescapeHTML(html())}`;
});
//#endregion
//#region src/pages/jukette/license.astro
var license_exports = /* @__PURE__ */ __exportAll({
	default: () => $$License,
	file: () => $$file,
	url: () => $$url
});
var $$License = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"title": "Licence",
		"path": "/jukette/license/"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "LicenceContent", Content, {})}` })}`;
}, "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/license.astro", void 0);
var $$file = "/Users/remi/Sites/remino/jukette/apps/docs/src/pages/jukette/license.astro";
var $$url = "/jukette/license";
//#endregion
//#region \0virtual:astro:page:src/pages/jukette/license@_@astro
var page = () => license_exports;
//#endregion
export { page };
