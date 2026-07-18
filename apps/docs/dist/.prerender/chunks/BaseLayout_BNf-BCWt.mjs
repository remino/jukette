import { t as createComponent } from "./compiler_UcH9HwAN.mjs";
import { S as createAstro, _ as createRenderInstruction, b as unescapeHTML, g as addAttribute, h as renderHead, i as Fragment, m as maybeRenderHead, r as renderComponent, s as renderSlot, u as renderTemplate } from "./server_cx2YDM1l.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
//#region ../../node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region ../../node_modules/@remino/astro-site-nav/src/includeFileUtils.ts
var STACK_PATH_PATTERN = /(file:\/\/\/.*?|\/.*?|[A-Za-z]:\\.*?):\d+:\d+/;
var isSelfReference = (filePath) => filePath.includes("IncludeFile.astro");
var extractPathFromStackLine = (line) => {
	const match = line.match(STACK_PATH_PATTERN);
	if (!match) return void 0;
	const rawPath = match[1];
	if (rawPath.startsWith("node:")) return void 0;
	if (rawPath.startsWith("file://")) return fileURLToPath(rawPath);
	return rawPath;
};
var resolveCallerDir = (stack) => {
	const lines = (stack ?? (/* @__PURE__ */ new Error()).stack ?? "").split("\n").slice(1);
	for (const line of lines) {
		const filePath = extractPathFromStackLine(line);
		if (!filePath) continue;
		if (isSelfReference(filePath)) continue;
		return path.dirname(filePath);
	}
};
var resolveIncludeFilePath = (src, { stack, cwd = process.cwd(), componentDir } = {}) => {
	const candidates = [];
	if (path.isAbsolute(src)) candidates.push(src);
	else {
		const callerDir = resolveCallerDir(stack);
		if (callerDir) candidates.push(path.resolve(callerDir, src));
		candidates.push(path.resolve(cwd, src));
		candidates.push(path.resolve(cwd, "src", src));
		if (componentDir) candidates.push(path.resolve(componentDir, "../", src));
	}
	for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
	throw new Error(`IncludeFile: could not resolve include at "${src}"`);
};
//#endregion
//#region ../../node_modules/@remino/astro-site-nav/src/IncludeFile.astro
createAstro("https://astro.build");
var $$IncludeFile = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$IncludeFile;
	const { src } = Astro.props;
	if (!src) throw new Error("IncludeFile: missing `src` prop");
	const filePath = resolveIncludeFilePath(src, { componentDir: path.dirname(new URL(import.meta.url).pathname) });
	const html = fs.readFileSync(filePath, "utf8");
	return renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${unescapeHTML(html)}` })}`;
}, "/Users/remi/Sites/remino/jukette/node_modules/@remino/astro-site-nav/src/IncludeFile.astro", void 0);
//#endregion
//#region ../../node_modules/@remino/astro-site-nav/src/SiteNavPiece.astro
createAstro("https://astro.build");
var $$SiteNavPiece = createComponent(($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$SiteNavPiece;
	const { src } = Astro2.props;
	if (!src) throw new Error("SiteNavPiece: missing `src` prop");
	throw new Error("SiteNavPiece: SITE_NAV_INCLUDE_ROOT env var is not set. Set it to the directory containing your nav partials.");
}, "/Users/remi/Sites/remino/jukette/node_modules/@remino/astro-site-nav/src/SiteNavPiece.astro", void 0);
//#endregion
//#region ../../node_modules/@remino/astro-site-nav/src/SiteNavFooter.astro
var $$SiteNavFooter = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "SiteNavPiece", $$SiteNavPiece, { "src": "footer.html" })}`;
}, "/Users/remi/Sites/remino/jukette/node_modules/@remino/astro-site-nav/src/SiteNavFooter.astro", void 0);
//#endregion
//#region ../../node_modules/@remino/astro-site-nav/src/SiteNavHeader.astro
var $$SiteNavHeader = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "SiteNavPiece", $$SiteNavPiece, { "src": "header.html" })}`;
}, "/Users/remi/Sites/remino/jukette/node_modules/@remino/astro-site-nav/src/SiteNavHeader.astro", void 0);
//#endregion
//#region ../../node_modules/@remino/astro-site-nav/src/SiteNavHtmlHead.astro
var $$SiteNavHtmlHead = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "SiteNavPiece", $$SiteNavPiece, { "src": "htmlhead.html" })}`;
}, "/Users/remi/Sites/remino/jukette/node_modules/@remino/astro-site-nav/src/SiteNavHtmlHead.astro", void 0);
//#endregion
//#region src/components/HeaderNav.astro
createAstro("https://astro.build");
var $$HeaderNav = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HeaderNav;
	const { items } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<nav aria-label="Main navigation"><ul>${items.map((item) => renderTemplate`<li><a${addAttribute(item.href, "href")}${addAttribute(item.external ? "_blank" : void 0, "target")}${addAttribute(item.external ? "noreferrer" : void 0, "rel")}>${item.label}</a></li>`)}</ul></nav>`;
}, "/Users/remi/Sites/remino/jukette/apps/docs/src/components/HeaderNav.astro", void 0);
//#endregion
//#region src/data/site.ts
var site = {
	description: "White-label jukebox custom element for audio and MIDI playlists.",
	image: "/jukette/share.svg",
	imageAlt: "Jukette player controls",
	readableTitle: "Jukette",
	title: "jukette",
	twitterHandle: "@rem",
	url: "https://remino.net/jukette/"
};
//#endregion
//#region src/components/BaseLayout.astro
createAstro("https://astro.build");
var $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BaseLayout;
	const { title = site.title, description = site.description, path = "/jukette/", htmlClass = "", bodyClass = "", mainClass = "", showHeader = true, breadcrumbs } = Astro.props;
	const siteUrl = Astro.site ? new URL(path, Astro.site).toString() : site.url;
	const imageUrl = Astro.site ? new URL(site.image, Astro.site).toString() : site.image;
	const documentTitle = title === site.title ? title : `${title} // ${site.title}`;
	const readableDocumentTitle = title === site.title ? site.readableTitle : `${title} // ${site.readableTitle}`;
	const breadcrumbItems = breadcrumbs ?? (title === site.title ? [{
		label: site.readableTitle,
		href: "/jukette/"
	}] : [{
		label: site.readableTitle,
		href: "/jukette/"
	}, {
		label: title,
		href: path
	}]);
	return renderTemplate`<html lang="en-CA"${addAttribute([
		"no-js",
		"rmn-nav-ribbon-bg-blur",
		htmlClass
	].filter(Boolean).join(" "), "class")}><head><meta charset="utf-8"><meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0"><meta name="format-detection" content="telephone=no"><title>${readableDocumentTitle}</title><meta name="description"${addAttribute(description, "content")}><meta property="og:title"${addAttribute(documentTitle, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:image"${addAttribute(imageUrl, "content")}><meta property="og:image:alt"${addAttribute(site.imageAlt, "content")}><meta property="og:url"${addAttribute(siteUrl, "content")}><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(documentTitle, "content")}><meta name="twitter:description"${addAttribute(description, "content")}><meta name="twitter:image"${addAttribute(imageUrl, "content")}><meta name="twitter:image:alt"${addAttribute(site.imageAlt, "content")}><meta name="twitter:site"${addAttribute(site.twitterHandle, "content")}><meta name="twitter:creator"${addAttribute(site.twitterHandle, "content")}><meta name="twitter:url"${addAttribute(siteUrl, "content")}>${renderComponent($$result, "SiteNavHtmlHead", $$SiteNavHtmlHead, {})}${renderSlot($$result, $$slots["head"])}${renderScript($$result, "/Users/remi/Sites/remino/jukette/apps/docs/src/components/BaseLayout.astro?astro&type=script&index=0&lang.ts")}${renderHead($$result)}</head><body${addAttribute(bodyClass, "class")}>${renderComponent($$result, "SiteNavHeader", $$SiteNavHeader, {})}${showHeader && renderTemplate`<header><h1><a href="/jukette/">${site.title}</a></h1>${renderComponent($$result, "HeaderNav", $$HeaderNav, { "items": [
		{
			label: "Home",
			href: "/jukette/"
		},
		{
			label: "Demo",
			href: "/jukette/demo/"
		},
		{
			label: "Updates",
			href: "/jukette/updates/"
		},
		{
			label: "Licence",
			href: "/jukette/license/"
		},
		{
			label: "GitHub",
			href: "https://github.com/remino/jukette",
			external: true
		},
		{
			label: "npm",
			href: "https://www.npmjs.com/package/jukette",
			external: true
		}
	] })}</header>`}<main${addAttribute(mainClass || void 0, "class")}>${renderSlot($$result, $$slots["default"])}</main><div class="rmn-nav__content"><ul class="rmn-breadcrumbs">${breadcrumbItems.map((item) => renderTemplate`<li>${item.href ? renderTemplate`<a${addAttribute(item.href, "href")}>${item.label}</a>` : item.label}</li>`)}</ul></div>${renderComponent($$result, "SiteNavFooter", $$SiteNavFooter, {})}${renderScript($$result, "/Users/remi/Sites/remino/jukette/apps/docs/src/components/BaseLayout.astro?astro&type=script&index=1&lang.ts")}${renderSlot($$result, $$slots["scripts"])}</body></html>`;
}, "/Users/remi/Sites/remino/jukette/apps/docs/src/components/BaseLayout.astro", void 0);
//#endregion
export { site as n, renderScript as r, $$BaseLayout as t };
