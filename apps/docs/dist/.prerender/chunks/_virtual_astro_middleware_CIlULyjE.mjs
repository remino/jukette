import { C as sequence, M as defineMiddleware } from "./fetch-state_DWtSXsZZ.mjs";
import { lookup } from "mrmime";
import { readFile } from "fs/promises";
import path from "path";
//#region ../../node_modules/@remino/astro-middleware/dist/chain.js
/**
* Chains middleware functions like Express-style next().
*/
function chain(...fns) {
	return async (ctx, next) => {
		let index = -1;
		const dispatch = async (i) => {
			if (i <= index) throw new Error("next() called multiple times");
			index = i;
			const fn = fns[i];
			return fn ? await fn(ctx, () => dispatch(i + 1)) : next();
		};
		return await dispatch(0);
	};
}
/**
* Helper to wrap a middleware chain and define it as `onRequest`.
* TS hack needed because Astro's type is overly strict.
*/
function defineChainedMiddleware(...fns) {
	const handler = chain(...fns, async (_, next) => next());
	return defineMiddleware(((ctx, next) => handler(ctx, next)));
}
//#endregion
//#region ../../node_modules/@remino/astro-middleware/dist/proxy-files.js
var proxyFiles = (config) => async ({ url }, next) => {
	const base = config.base ?? "/";
	let pathname = url.pathname;
	if (base !== "/" && pathname.startsWith(base)) {
		pathname = pathname.slice(base.length);
		if (!pathname.startsWith("/")) pathname = "/" + pathname;
	}
	const match = Object.entries(config.paths).find(([from]) => pathname.startsWith(from));
	if (!match) return next();
	const [src, dest] = match;
	const relPath = pathname.slice(src.length);
	const filePath = path.join(dest, relPath);
	try {
		const file = await readFile(filePath);
		const mime = lookup(path.extname(filePath).slice(1)) || "application/octet-stream";
		return new Response(new Uint8Array(file), {
			status: 200,
			headers: { "Content-Type": mime }
		});
	} catch {
		return new Response("Not Found", { status: 404 });
	}
};
//#endregion
//#region ../../node_modules/@remino/astro-middleware/dist/utf8.js
async function setUtf8(_, next) {
	const res = await next();
	if (res && res.headers && res.headers.get("content-type") === "text/html") res.headers.set("Content-Type", "text/html; charset=utf-8");
	return res;
}
//#endregion
//#region \0virtual:astro:middleware
var onRequest = sequence(defineChainedMiddleware(setUtf8, proxyFiles({
	base: "/",
	paths: {
		"/fonts/": "../../remino.net/fonts/dist/public/fonts/",
		"/nav/": "../../remino.net/nav/dist/public/nav/"
	}
})));
//#endregion
export { onRequest };
