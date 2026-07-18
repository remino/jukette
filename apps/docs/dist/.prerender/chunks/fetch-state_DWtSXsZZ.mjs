import { $ as NoMatchingStaticPathFound, A as appSymbol, B as CacheNotEnabled, C as isRoute404, D as DEFAULT_404_COMPONENT, E as ASTRO_GENERATOR, F as responseSentSymbol$1, G as GetStaticPathsRequired, H as ForbiddenRewrite, I as AstroError, J as InvalidGetStaticPathsReturn, L as ActionNotFoundError, M as fetchStateSymbol, N as originPathnameSymbol, O as REDIRECT_STATUS_CODES, P as pipelineSymbol, Q as MiddlewareNotAResponse, R as ActionsReturnedInvalidDataError, T as ASTRO_ERROR_HEADER, U as GetStaticPathsExpectedParams, V as ClientAddressNotAvailable, W as GetStaticPathsInvalidRouteParam, X as LocalsReassigned, Z as MiddlewareNoDataOrNextCalled, a as chunkToString, at as RewriteWithBodyUsed, c as renderSlotToString, ct as StaticClientAddressNotAvailable, et as PageNumberParamNotFound, f as decryptString, it as ResponseSentError, l as isRenderTemplateResult, lt as UnableToLoadLogger, n as renderJSX, nt as PrerenderDynamicEndpointPathCollide, o as createSlotValueFromString, p as generateCspDigest, q as InvalidGetStaticPathsEntry, r as renderComponent, rt as ReservedSlotName, t as renderPage, tt as PrerenderClientAddressNotAvailable, u as renderTemplate, ut as i18nNoLocaleFoundInPath, v as isRenderInstruction, w as isRoute500, x as renderEndpoint, y as isAstroComponentFactory, z as AstroResponseHeadersReassigned } from "./server_cx2YDM1l.mjs";
import colors from "piccolore";
import { escape } from "html-escaper";
import { parse, serialize } from "cookie";
import { parse as parse$1, stringify } from "devalue";
import "es-module-lexer";
//#region ../../node_modules/@astrojs/internal-helpers/dist/path.js
function appendForwardSlash(path) {
	return path.endsWith("/") ? path : path + "/";
}
function prependForwardSlash(path) {
	return path[0] === "/" ? path : "/" + path;
}
var MANY_LEADING_SLASHES = /^\/{2,}/;
function collapseDuplicateLeadingSlashes(path) {
	if (!path) return path;
	return path.replace(MANY_LEADING_SLASHES, "/");
}
var MANY_SLASHES = /\/{2,}/g;
function collapseDuplicateSlashes(path) {
	if (!path) return path;
	return path.replace(MANY_SLASHES, "/");
}
var MANY_TRAILING_SLASHES = /\/{2,}$/g;
function collapseDuplicateTrailingSlashes(path, trailingSlash) {
	if (!path) return path;
	return path.replace(MANY_TRAILING_SLASHES, trailingSlash ? "/" : "") || "/";
}
function removeTrailingForwardSlash(path) {
	return path.endsWith("/") ? path.slice(0, path.length - 1) : path;
}
function removeLeadingForwardSlash(path) {
	return path.startsWith("/") ? path.substring(1) : path;
}
function trimSlashes(path) {
	return path.replace(/^\/|\/$/g, "");
}
function isString(path) {
	return typeof path === "string" || path instanceof String;
}
var INTERNAL_PREFIXES = /* @__PURE__ */ new Set([
	"/_",
	"/@",
	"/.",
	"//"
]);
var JUST_SLASHES = /^\/{2,}$/;
function isInternalPath(path) {
	const prefix = path.slice(0, 2).replace(/\\/g, "/");
	return INTERNAL_PREFIXES.has(prefix) && !JUST_SLASHES.test(path);
}
function joinPaths(...paths) {
	return paths.filter(isString).map((path, i) => {
		if (i === 0) return removeTrailingForwardSlash(path);
		else if (i === paths.length - 1) return removeLeadingForwardSlash(path);
		else return trimSlashes(path);
	}).join("/");
}
function slash(path) {
	return path.replace(/\\/g, "/");
}
function fileExtension(path) {
	const ext = path.split(".").pop();
	return ext !== path ? `.${ext}` : "";
}
var WITH_FILE_EXT = /\/[^/]+\.\w+$/;
function hasFileExtension(path) {
	return WITH_FILE_EXT.test(path);
}
//#endregion
//#region ../../node_modules/@astrojs/internal-helpers/dist/remote.js
function matchPattern(url, remotePattern) {
	return matchProtocol(url, remotePattern.protocol) && matchHostname(url, remotePattern.hostname, true) && matchPort(url, remotePattern.port) && matchPathname(url, remotePattern.pathname, true);
}
function matchPort(url, port) {
	return !port || port === url.port;
}
function matchProtocol(url, protocol) {
	return !protocol || protocol === url.protocol.slice(0, -1);
}
function matchHostname(url, hostname, allowWildcard = false) {
	if (!hostname) return true;
	else if (!allowWildcard || !hostname.startsWith("*")) return hostname === url.hostname;
	else if (hostname.startsWith("**.")) {
		const slicedHostname = hostname.slice(2);
		return slicedHostname !== url.hostname && url.hostname.endsWith(slicedHostname);
	} else if (hostname.startsWith("*.")) {
		const slicedHostname = hostname.slice(1);
		if (!url.hostname.endsWith(slicedHostname)) return false;
		const subdomainWithDot = url.hostname.slice(0, -(slicedHostname.length - 1));
		return subdomainWithDot.endsWith(".") && !subdomainWithDot.slice(0, -1).includes(".");
	}
	return false;
}
function matchPathname(url, pathname, allowWildcard = false) {
	if (!pathname) return true;
	else if (!allowWildcard || !pathname.endsWith("*")) return pathname === url.pathname;
	else if (pathname.endsWith("/**")) {
		const slicedPathname = pathname.slice(0, -2);
		return slicedPathname !== url.pathname && url.pathname.startsWith(slicedPathname);
	} else if (pathname.endsWith("/*")) {
		const slicedPathname = pathname.slice(0, -1);
		if (!url.pathname.startsWith(slicedPathname)) return false;
		return url.pathname.slice(slicedPathname.length).split("/").filter(Boolean).length === 1;
	}
	return false;
}
//#endregion
//#region ../../node_modules/astro/dist/i18n/path.js
function pathHasLocale(path, locales) {
	const segments = path.split("/").map(normalizeThePath);
	for (const segment of segments) for (const locale of locales) if (typeof locale === "string") {
		if (normalizeTheLocale(segment) === normalizeTheLocale(locale)) return true;
	} else if (segment === locale.path) return true;
	return false;
}
function normalizeTheLocale(locale) {
	return locale.replaceAll("_", "-").toLowerCase();
}
function normalizeThePath(path) {
	return path.endsWith(".html") ? path.slice(0, -5) : path;
}
//#endregion
//#region ../../node_modules/astro/dist/core/i18n/domain.js
function computePathnameFromDomain(request, url, i18n, base, trailingSlash, logger) {
	let pathname = void 0;
	if (i18n && (i18n.strategy === "domains-prefix-always" || i18n.strategy === "domains-prefix-other-locales" || i18n.strategy === "domains-prefix-always-no-redirect")) {
		let host = request.headers.get("X-Forwarded-Host");
		let protocol = request.headers.get("X-Forwarded-Proto");
		if (protocol) protocol = protocol + ":";
		else protocol = url.protocol;
		if (!host) host = request.headers.get("Host");
		if (host && protocol) {
			host = host.split(":")[0];
			try {
				let locale;
				const hostAsUrl = new URL(`${protocol}//${host}`);
				for (const [domainKey, localeValue] of Object.entries(i18n.domainLookupTable)) {
					const domainKeyAsUrl = new URL(domainKey);
					if (hostAsUrl.host === domainKeyAsUrl.host && hostAsUrl.protocol === domainKeyAsUrl.protocol) {
						locale = localeValue;
						break;
					}
				}
				if (locale) {
					pathname = prependForwardSlash(joinPaths(normalizeTheLocale(locale), removeBase(url.pathname, base)));
					if (trailingSlash === "always") pathname = appendForwardSlash(pathname);
					else if (trailingSlash === "never") pathname = removeTrailingForwardSlash(pathname);
					else if (url.pathname.endsWith("/")) pathname = appendForwardSlash(pathname);
				}
			} catch (e) {
				logger.error("router", `Astro tried to parse ${protocol}//${host} as an URL, but it threw a parsing error. Check the X-Forwarded-Host and X-Forwarded-Proto headers.`);
				logger.error("router", `Error: ${e}`);
			}
		}
	}
	return pathname;
}
function removeBase(pathname, base) {
	pathname = collapseDuplicateLeadingSlashes(pathname);
	if (pathname.startsWith(base)) return pathname.slice(removeTrailingForwardSlash(base).length + 1);
	return pathname;
}
//#endregion
//#region ../../node_modules/astro/dist/actions/noop-actions.js
var NOOP_ACTIONS_MOD = { server: {} };
//#endregion
//#region ../../node_modules/astro/dist/core/middleware/defineMiddleware.js
function defineMiddleware(fn) {
	return fn;
}
//#endregion
//#region ../../node_modules/astro/dist/core/app/origin-check.js
var FORM_CONTENT_TYPES = [
	"application/x-www-form-urlencoded",
	"multipart/form-data",
	"text/plain"
];
var SAFE_METHODS = [
	"GET",
	"HEAD",
	"OPTIONS"
];
function isForbiddenCrossOriginRequest(request, url, isPrerendered) {
	if (isPrerendered) return false;
	if (SAFE_METHODS.includes(request.method)) return false;
	const isSameOrigin = request.headers.get("origin") === url.origin;
	if (request.headers.has("content-type")) return hasFormLikeHeader(request.headers.get("content-type")) && !isSameOrigin;
	return !isSameOrigin;
}
function createCrossOriginForbiddenResponse(request) {
	return new Response(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 });
}
function createOriginCheckMiddleware() {
	return defineMiddleware((context, next) => {
		const { request, url, isPrerendered } = context;
		if (isForbiddenCrossOriginRequest(request, url, isPrerendered)) return createCrossOriginForbiddenResponse(request);
		return next();
	});
}
function hasFormLikeHeader(contentType) {
	if (contentType) {
		for (const FORM_CONTENT_TYPE of FORM_CONTENT_TYPES) if (contentType.toLowerCase().includes(FORM_CONTENT_TYPE)) return true;
	}
	return false;
}
//#endregion
//#region ../../node_modules/astro/dist/core/middleware/noop-middleware.js
var NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
	return await next();
};
//#endregion
//#region ../../node_modules/astro/dist/core/routing/helpers.js
function routeIsRedirect(route) {
	return route?.type === "redirect";
}
function routeIsFallback(route) {
	return route?.type === "fallback";
}
function getFallbackRoute(route, routeList) {
	const fallbackRoute = routeList.find((r) => {
		if (route.route === "/" && r.routeData.route === "/") return true;
		return r.routeData.fallbackRoutes.find((f) => {
			return f.route === route.route;
		});
	});
	if (!fallbackRoute) throw new Error(`No fallback route found for route ${route.route}`);
	return fallbackRoute.routeData;
}
function getCustom404Route(manifestData) {
	return manifestData.routes.find((r) => isRoute404(r.route));
}
function routeHasHtmlExtension(route) {
	return route.segments.some((segment) => segment.some((part) => !part.dynamic && part.content.includes(".html")));
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/generator.js
function sanitizeParams(params) {
	return Object.fromEntries(Object.entries(params).map(([key, value]) => {
		if (typeof value === "string") return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
		return [key, value];
	}));
}
function getParameter(part, params) {
	if (part.spread) return params[part.content.slice(3)] ?? "";
	if (part.dynamic) {
		if (params[part.content] === void 0) throw new TypeError(`Missing parameter: ${part.content}`);
		return params[part.content];
	}
	return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
	const segmentPath = segment.map((part) => getParameter(part, params)).join("");
	return segmentPath ? collapseDuplicateLeadingSlashes("/" + segmentPath) : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
	return (params) => {
		const sanitizedParams = sanitizeParams(params);
		let trailing = "";
		if (addTrailingSlash === "always" && segments.length) trailing = "/";
		return segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing || "/";
	};
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/internal/validation.js
var VALID_PARAM_TYPES = ["string", "undefined"];
function validateGetStaticPathsParameter([key, value], route) {
	if (!VALID_PARAM_TYPES.includes(typeof value)) throw new AstroError({
		...GetStaticPathsInvalidRouteParam,
		message: GetStaticPathsInvalidRouteParam.message(key, value, typeof value),
		location: { file: route }
	});
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/params.js
function stringifyParams(params, route, trailingSlash) {
	const validatedParams = {};
	for (const [key, value] of Object.entries(params)) {
		validateGetStaticPathsParameter([key, value], route.component);
		if (value !== void 0) validatedParams[key] = trimSlashes(value);
	}
	return getRouteGenerator(route.segments, trailingSlash)(validatedParams);
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/validation.js
function validateDynamicRouteModule(mod, { ssr, route }) {
	if ((!ssr || route.prerender) && route.origin !== "internal" && !mod.getStaticPaths) throw new AstroError({
		...GetStaticPathsRequired,
		location: { file: route.component }
	});
}
function validateGetStaticPathsResult(result, route) {
	if (!Array.isArray(result)) throw new AstroError({
		...InvalidGetStaticPathsReturn,
		message: InvalidGetStaticPathsReturn.message(typeof result),
		location: { file: route.component }
	});
	result.forEach((pathObject) => {
		if (typeof pathObject === "object" && Array.isArray(pathObject) || pathObject === null) throw new AstroError({
			...InvalidGetStaticPathsEntry,
			message: InvalidGetStaticPathsEntry.message(Array.isArray(pathObject) ? "array" : typeof pathObject)
		});
		if (pathObject.params === void 0 || pathObject.params === null || pathObject.params && Object.keys(pathObject.params).length === 0) throw new AstroError({
			...GetStaticPathsExpectedParams,
			location: { file: route.component }
		});
	});
}
//#endregion
//#region ../../node_modules/astro/dist/core/render/paginate.js
function generatePaginateFunction(routeMatch, base, trailingSlash) {
	return function paginateUtility(data, args = {}) {
		const generate = getRouteGenerator(routeMatch.segments, trailingSlash);
		let { pageSize: _pageSize, params: _params, props: _props } = args;
		const pageSize = _pageSize || 10;
		const paramName = "page";
		const additionalParams = _params || {};
		const additionalProps = _props || {};
		let includesFirstPageNumber;
		if (routeMatch.params.includes(`...${paramName}`)) includesFirstPageNumber = false;
		else if (routeMatch.params.includes(`${paramName}`)) includesFirstPageNumber = true;
		else throw new AstroError({
			...PageNumberParamNotFound,
			message: PageNumberParamNotFound.message(paramName)
		});
		const lastPage = Math.max(1, Math.ceil(data.length / pageSize));
		return [...Array(lastPage).keys()].map((num) => {
			const pageNum = num + 1;
			const start = pageSize === Number.POSITIVE_INFINITY ? 0 : (pageNum - 1) * pageSize;
			const end = Math.min(start + pageSize, data.length);
			const params = {
				...additionalParams,
				[paramName]: includesFirstPageNumber || pageNum > 1 ? String(pageNum) : void 0
			};
			const current = addRouteBase(generate({ ...params }), base);
			const next = pageNum === lastPage ? void 0 : addRouteBase(generate({
				...params,
				page: String(pageNum + 1)
			}), base);
			const prev = pageNum === 1 ? void 0 : addRouteBase(generate({
				...params,
				page: !includesFirstPageNumber && pageNum - 1 === 1 ? void 0 : String(pageNum - 1)
			}), base);
			const first = pageNum === 1 ? void 0 : addRouteBase(generate({
				...params,
				page: includesFirstPageNumber ? "1" : void 0
			}), base);
			const last = pageNum === lastPage ? void 0 : addRouteBase(generate({
				...params,
				page: String(lastPage)
			}), base);
			return {
				params,
				props: {
					...additionalProps,
					page: {
						data: data.slice(start, end),
						start,
						end: end - 1,
						size: pageSize,
						total: data.length,
						currentPage: pageNum,
						lastPage,
						url: {
							current,
							next,
							prev,
							first,
							last
						}
					}
				}
			};
		});
	};
}
function addRouteBase(route, base) {
	let routeWithBase = joinPaths(base, route);
	if (routeWithBase === "") routeWithBase = "/";
	return routeWithBase;
}
//#endregion
//#region ../../node_modules/astro/dist/core/render/route-cache.js
async function callGetStaticPaths({ mod, route, routeCache, ssr, base, trailingSlash }) {
	const cached = routeCache.get(route);
	if (!mod) throw new Error("This is an error caused by Astro and not your code. Please file an issue.");
	if (cached?.staticPaths && cached.mod === mod) return cached.staticPaths;
	validateDynamicRouteModule(mod, {
		ssr,
		route
	});
	if (ssr && !route.prerender || route.origin === "internal") {
		const entry = Object.assign([], { keyed: /* @__PURE__ */ new Map() });
		routeCache.set(route, {
			...cached,
			mod,
			staticPaths: entry
		});
		return entry;
	}
	let staticPaths = [];
	if (!mod.getStaticPaths) throw new Error("Unexpected Error.");
	staticPaths = await mod.getStaticPaths({
		paginate: generatePaginateFunction(route, base, trailingSlash),
		routePattern: route.route
	});
	validateGetStaticPathsResult(staticPaths, route);
	const keyedStaticPaths = staticPaths;
	keyedStaticPaths.keyed = /* @__PURE__ */ new Map();
	for (const sp of keyedStaticPaths) {
		const paramsKey = stringifyParams(sp.params, route, trailingSlash);
		keyedStaticPaths.keyed.set(paramsKey, sp);
	}
	routeCache.set(route, {
		...cached,
		mod,
		staticPaths: keyedStaticPaths
	});
	return keyedStaticPaths;
}
var RouteCache = class {
	logger;
	cache = {};
	runtimeMode;
	constructor(logger, runtimeMode = "production") {
		this.logger = logger;
		this.runtimeMode = runtimeMode;
	}
	/** Clear the cache. */
	clearAll() {
		this.cache = {};
	}
	set(route, entry) {
		const key = this.key(route);
		if (this.runtimeMode === "production" && this.cache[key]?.staticPaths) this.logger.warn(null, `Internal Warning: route cache overwritten. (${key})`);
		this.cache[key] = entry;
	}
	get(route) {
		return this.cache[this.key(route)];
	}
	key(route) {
		return `${route.route}_${route.component}`;
	}
};
function findPathItemByKey(staticPaths, params, route, logger, trailingSlash) {
	const paramsKey = stringifyParams(params, route, trailingSlash);
	const matchedStaticPath = staticPaths.keyed.get(paramsKey);
	if (matchedStaticPath) return matchedStaticPath;
	logger.debug("router", `findPathItemByKey() - Unexpected cache miss looking for ${paramsKey}`);
}
//#endregion
//#region ../../node_modules/astro/dist/core/render/params-and-props.js
async function getProps(opts) {
	const { logger, mod, routeData: route, routeCache, pathname, serverLike, base, trailingSlash } = opts;
	if (!route || route.pathname) return {};
	if (routeIsRedirect(route) || routeIsFallback(route) || route.component === "astro-default-404.astro") return {};
	const staticPaths = await callGetStaticPaths({
		mod,
		route,
		routeCache,
		ssr: serverLike,
		base,
		trailingSlash
	});
	const params = getParams(route, pathname);
	const matchedStaticPath = findPathItemByKey(staticPaths, params, route, logger, trailingSlash);
	if (!matchedStaticPath && route.origin !== "internal" && (serverLike ? route.prerender : true)) throw new AstroError({
		...NoMatchingStaticPathFound,
		message: NoMatchingStaticPathFound.message(pathname),
		hint: NoMatchingStaticPathFound.hint([route.component])
	});
	if (mod) validatePrerenderEndpointCollision(route, mod, params);
	return matchedStaticPath?.props ? { ...matchedStaticPath.props } : {};
}
function getParams(route, pathname) {
	if (!route.params.length) return {};
	const hasHtmlSuffix = pathname.endsWith(".html") && !routeHasHtmlExtension(route);
	const path = hasHtmlSuffix && route.type === "page" ? pathname.slice(0, -5) : pathname;
	const allPatterns = [route, ...route.fallbackRoutes].map((r) => r.pattern);
	let paramsMatch = allPatterns.map((pattern) => pattern.exec(path)).find((x) => x);
	if (!paramsMatch && hasHtmlSuffix && route.type !== "page") {
		const strippedPath = pathname.endsWith("/index.html") ? pathname.slice(0, -11) || "/" : pathname.slice(0, -5);
		paramsMatch = allPatterns.map((pattern) => pattern.exec(strippedPath)).find((x) => x);
	}
	if (!paramsMatch) return {};
	const params = {};
	route.params.forEach((key, i) => {
		if (key.startsWith("...")) params[key.slice(3)] = paramsMatch[i + 1] ? paramsMatch[i + 1] : void 0;
		else params[key] = paramsMatch[i + 1];
	});
	return params;
}
function validatePrerenderEndpointCollision(route, mod, params) {
	if (route.type === "endpoint" && mod.getStaticPaths) {
		const lastSegment = route.segments[route.segments.length - 1];
		const paramValues = Object.values(params);
		const lastParam = paramValues[paramValues.length - 1];
		if (lastSegment.length === 1 && lastSegment[0].dynamic && lastParam === void 0) throw new AstroError({
			...PrerenderDynamicEndpointPathCollide,
			message: PrerenderDynamicEndpointPathCollide.message(route.route),
			hint: PrerenderDynamicEndpointPathCollide.hint(route.component),
			location: { file: route.component }
		});
	}
}
//#endregion
//#region ../../node_modules/astro/dist/core/render/slots.js
function getFunctionExpression(slot) {
	if (!slot) return;
	const expressions = slot?.expressions?.filter((e) => isRenderInstruction(e) === false || isRenderTemplateResult(e));
	if (expressions?.length !== 1) return;
	const expression = expressions[0];
	if (isRenderTemplateResult(expression)) return getFunctionExpression(expression);
	return expression;
}
var Slots = class {
	#result;
	#slots;
	#logger;
	constructor(result, slots, logger) {
		this.#result = result;
		this.#slots = slots;
		this.#logger = logger;
		if (slots) for (const key of Object.keys(slots)) {
			if (this[key] !== void 0) throw new AstroError({
				...ReservedSlotName,
				message: ReservedSlotName.message(key)
			});
			Object.defineProperty(this, key, {
				get() {
					return true;
				},
				enumerable: true
			});
		}
	}
	has(name) {
		if (!this.#slots) return false;
		return Boolean(this.#slots[name]);
	}
	async render(name, args = []) {
		if (!this.#slots || !this.has(name)) return;
		const result = this.#result;
		if (!Array.isArray(args)) this.#logger.warn(null, `Expected second parameter to be an array, received a ${typeof args}. If you're trying to pass an array as a single argument and getting unexpected results, make sure you're passing your array as an item of an array. Ex: Astro.slots.render('default', [["Hello", "World"]])`);
		else if (args.length > 0) {
			const slotValue = this.#slots[name];
			const component = typeof slotValue === "function" ? await slotValue(result) : await slotValue;
			const expression = getFunctionExpression(component);
			if (expression) {
				const slot = async () => typeof expression === "function" ? expression(...args) : expression;
				return await renderSlotToString(result, slot).then((res) => {
					return res;
				});
			}
			if (typeof component === "function") return await renderJSX(result, component(...args)).then((res) => res != null ? String(res) : res);
		}
		return chunkToString(result, await renderSlotToString(result, this.#slots[name]));
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/build/util.js
function shouldAppendForwardSlash(trailingSlash, buildFormat) {
	switch (trailingSlash) {
		case "always": return true;
		case "never": return false;
		case "ignore": switch (buildFormat) {
			case "directory": return true;
			case "preserve":
			case "file": return false;
		}
	}
}
//#endregion
//#region ../../node_modules/astro/dist/core/request.js
function createRequest({ url, headers, method = "GET", body = void 0, logger, isPrerendered = false, routePattern, init }) {
	const headersObj = isPrerendered ? void 0 : headers instanceof Headers ? headers : new Headers(Object.entries(headers).filter(([name]) => !name.startsWith(":")));
	if (typeof url === "string") url = new URL(url);
	if (isPrerendered) url.search = "";
	const request = new Request(url, {
		method,
		headers: headersObj,
		body: isPrerendered ? null : body,
		...init
	});
	if (isPrerendered) {
		let _headers = request.headers;
		const { value, writable, ...headersDesc } = Object.getOwnPropertyDescriptor(request, "headers") || {};
		Object.defineProperty(request, "headers", {
			...headersDesc,
			get() {
				logger.warn(null, `\`Astro.request.headers\` was used when rendering the route \`${routePattern}'\`. \`Astro.request.headers\` is not available on prerendered pages. If you need access to request headers, make sure that the page is server-rendered using \`export const prerender = false;\` or by setting \`output\` to \`"server"\` in your Astro config to make all your pages server-rendered by default.`);
				return _headers;
			},
			set(newHeaders) {
				_headers = newHeaders;
			}
		});
	}
	return request;
}
//#endregion
//#region ../../node_modules/astro/dist/core/util/pathname.js
var MultiLevelEncodingError = class extends Error {
	constructor() {
		super("URL encoding depth exceeded the maximum number of decode iterations");
		this.name = "MultiLevelEncodingError";
	}
};
var MAX_DECODE_ITERATIONS = 10;
function validateAndDecodePathname(pathname) {
	let decoded;
	try {
		decoded = decodeURI(pathname);
	} catch (_e) {
		throw new Error("Invalid URL encoding");
	}
	let iterations = 0;
	while (decoded !== pathname) {
		if (iterations >= MAX_DECODE_ITERATIONS) throw new MultiLevelEncodingError();
		pathname = decoded;
		try {
			decoded = decodeURI(pathname);
		} catch {
			break;
		}
		iterations++;
	}
	return decoded;
}
//#endregion
//#region ../../node_modules/astro/dist/template/4xx.js
function template({ title, pathname, statusCode = 404, tabTitle, body }) {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>${tabTitle}</title>
		<style>
			:root {
				--gray-10: hsl(258, 7%, 10%);
				--gray-20: hsl(258, 7%, 20%);
				--gray-30: hsl(258, 7%, 30%);
				--gray-40: hsl(258, 7%, 40%);
				--gray-50: hsl(258, 7%, 50%);
				--gray-60: hsl(258, 7%, 60%);
				--gray-70: hsl(258, 7%, 70%);
				--gray-80: hsl(258, 7%, 80%);
				--gray-90: hsl(258, 7%, 90%);
				--black: #13151A;
				--accent-light: #E0CCFA;
			}

			* {
				box-sizing: border-box;
			}

			html {
				background: var(--black);
				color-scheme: dark;
				accent-color: var(--accent-light);
			}

			body {
				background-color: var(--gray-10);
				color: var(--gray-80);
				font-family: ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace;
				line-height: 1.5;
				margin: 0;
			}

			a {
				color: var(--accent-light);
			}

			.center {
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				height: 100vh;
				width: 100vw;
			}

			h1 {
				margin-bottom: 8px;
				color: white;
				font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
				font-weight: 700;
				margin-top: 1rem;
				margin-bottom: 0;
			}

			.statusCode {
				color: var(--accent-light);
			}

			.astro-icon {
				height: 124px;
				width: 124px;
			}

			pre, code {
				padding: 2px 8px;
				background: rgba(0,0,0, 0.25);
				border: 1px solid rgba(255,255,255, 0.25);
				border-radius: 4px;
				font-size: 1.2em;
				margin-top: 0;
				max-width: 60em;
			}
		</style>
	</head>
	<body>
		<main class="center">
			<svg class="astro-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80" fill="none"> <path d="M20.5253 67.6322C16.9291 64.3531 15.8793 57.4632 17.3776 52.4717C19.9755 55.6188 23.575 56.6157 27.3035 57.1784C33.0594 58.0468 38.7122 57.722 44.0592 55.0977C44.6709 54.7972 45.2362 54.3978 45.9045 53.9931C46.4062 55.4451 46.5368 56.9109 46.3616 58.4028C45.9355 62.0362 44.1228 64.8429 41.2397 66.9705C40.0868 67.8215 38.8669 68.5822 37.6762 69.3846C34.0181 71.8508 33.0285 74.7426 34.403 78.9491C34.4357 79.0516 34.4649 79.1541 34.5388 79.4042C32.6711 78.5705 31.3069 77.3565 30.2674 75.7604C29.1694 74.0757 28.6471 72.2121 28.6196 70.1957C28.6059 69.2144 28.6059 68.2244 28.4736 67.257C28.1506 64.8985 27.0406 63.8425 24.9496 63.7817C22.8036 63.7192 21.106 65.0426 20.6559 67.1268C20.6215 67.2865 20.5717 67.4446 20.5218 67.6304L20.5253 67.6322Z" fill="white"/> <path d="M20.5253 67.6322C16.9291 64.3531 15.8793 57.4632 17.3776 52.4717C19.9755 55.6188 23.575 56.6157 27.3035 57.1784C33.0594 58.0468 38.7122 57.722 44.0592 55.0977C44.6709 54.7972 45.2362 54.3978 45.9045 53.9931C46.4062 55.4451 46.5368 56.9109 46.3616 58.4028C45.9355 62.0362 44.1228 64.8429 41.2397 66.9705C40.0868 67.8215 38.8669 68.5822 37.6762 69.3846C34.0181 71.8508 33.0285 74.7426 34.403 78.9491C34.4357 79.0516 34.4649 79.1541 34.5388 79.4042C32.6711 78.5705 31.3069 77.3565 30.2674 75.7604C29.1694 74.0757 28.6471 72.2121 28.6196 70.1957C28.6059 69.2144 28.6059 68.2244 28.4736 67.257C28.1506 64.8985 27.0406 63.8425 24.9496 63.7817C22.8036 63.7192 21.106 65.0426 20.6559 67.1268C20.6215 67.2865 20.5717 67.4446 20.5218 67.6304L20.5253 67.6322Z" fill="url(#paint0_linear_738_686)"/> <path d="M0 51.6401C0 51.6401 10.6488 46.4654 21.3274 46.4654L29.3786 21.6102C29.6801 20.4082 30.5602 19.5913 31.5538 19.5913C32.5474 19.5913 33.4275 20.4082 33.7289 21.6102L41.7802 46.4654C54.4274 46.4654 63.1076 51.6401 63.1076 51.6401C63.1076 51.6401 45.0197 2.48776 44.9843 2.38914C44.4652 0.935933 43.5888 0 42.4073 0H20.7022C19.5206 0 18.6796 0.935933 18.1251 2.38914C18.086 2.4859 0 51.6401 0 51.6401Z" fill="white"/> <defs> <linearGradient id="paint0_linear_738_686" x1="31.554" y1="75.4423" x2="39.7462" y2="48.376" gradientUnits="userSpaceOnUse"> <stop stop-color="#D83333"/> <stop offset="1" stop-color="#F041FF"/> </linearGradient> </defs> </svg>
			<h1>${statusCode ? `<span class="statusCode">${statusCode}: </span> ` : ""}<span class="statusMessage">${title}</span></h1>
			${body || `
				<pre>Path: ${escape(pathname)}</pre>
			`}
			</main>
	</body>
</html>`;
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/internal/astro-designed-error-pages.js
var DEFAULT_404_ROUTE = {
	component: DEFAULT_404_COMPONENT,
	params: [],
	pattern: /^\/404\/?$/,
	prerender: false,
	pathname: "/404",
	segments: [[{
		content: "404",
		dynamic: false,
		spread: false
	}]],
	type: "page",
	route: "/404",
	fallbackRoutes: [],
	isIndex: false,
	origin: "internal",
	distURL: []
};
async function default404Page({ pathname }) {
	return new Response(template({
		statusCode: 404,
		title: "Not found",
		tabTitle: "404: Not Found",
		pathname
	}), {
		status: 404,
		headers: { "Content-Type": "text/html" }
	});
}
default404Page.isAstroComponentFactory = true;
var default404Instance = { default: default404Page };
//#endregion
//#region ../../node_modules/astro/dist/core/routing/rewrite.js
function findRouteToRewrite({ payload, routes, request, trailingSlash, buildFormat, base, outDir }) {
	let newUrl = void 0;
	if (payload instanceof URL) newUrl = payload;
	else if (payload instanceof Request) newUrl = new URL(payload.url);
	else newUrl = new URL(collapseDuplicateSlashes(payload), new URL(request.url).origin);
	const { pathname, resolvedUrlPathname } = normalizeRewritePathname(newUrl.pathname, base, trailingSlash, buildFormat);
	newUrl.pathname = resolvedUrlPathname;
	const decodedPathname = validateAndDecodePathname(pathname);
	if (isRoute404(decodedPathname)) {
		const errorRoute = routes.find((route) => route.route === "/404");
		if (errorRoute) return {
			routeData: errorRoute,
			newUrl,
			pathname: decodedPathname
		};
	}
	if (isRoute500(decodedPathname)) {
		const errorRoute = routes.find((route) => route.route === "/500");
		if (errorRoute) return {
			routeData: errorRoute,
			newUrl,
			pathname: decodedPathname
		};
	}
	let foundRoute;
	for (const route of routes) if (route.pattern.test(decodedPathname)) {
		if (route.params && route.params.length !== 0 && route.distURL && route.distURL.length !== 0) {
			if (!route.distURL.find((url) => url.href.replace(outDir.toString(), "").replace(/(?:\/index\.html|\.html)$/, "") === trimSlashes(pathname))) continue;
		}
		foundRoute = route;
		break;
	}
	if (foundRoute) return {
		routeData: foundRoute,
		newUrl,
		pathname: decodedPathname
	};
	else {
		const custom404 = routes.find((route) => route.route === "/404");
		if (custom404) return {
			routeData: custom404,
			newUrl,
			pathname
		};
		else return {
			routeData: DEFAULT_404_ROUTE,
			newUrl,
			pathname
		};
	}
}
function copyRequest(newUrl, oldRequest, isPrerendered, logger, routePattern) {
	if (oldRequest.bodyUsed) throw new AstroError(RewriteWithBodyUsed);
	return createRequest({
		url: newUrl,
		method: oldRequest.method,
		body: oldRequest.body,
		isPrerendered,
		logger,
		headers: isPrerendered ? {} : oldRequest.headers,
		routePattern,
		init: {
			referrer: oldRequest.referrer,
			referrerPolicy: oldRequest.referrerPolicy,
			mode: oldRequest.mode,
			credentials: oldRequest.credentials,
			cache: oldRequest.cache,
			redirect: oldRequest.redirect,
			integrity: oldRequest.integrity,
			signal: oldRequest.signal,
			keepalive: oldRequest.keepalive,
			duplex: "half"
		}
	});
}
function setOriginPathname(request, pathname, trailingSlash, buildFormat) {
	if (!pathname) pathname = "/";
	const shouldAppendSlash = shouldAppendForwardSlash(trailingSlash, buildFormat);
	let finalPathname;
	if (pathname === "/") finalPathname = "/";
	else if (shouldAppendSlash) finalPathname = appendForwardSlash(pathname);
	else finalPathname = removeTrailingForwardSlash(pathname);
	Reflect.set(request, originPathnameSymbol, encodeURIComponent(finalPathname));
}
function getOriginPathname(request) {
	const origin = Reflect.get(request, originPathnameSymbol);
	if (origin) return decodeURIComponent(origin);
	return new URL(request.url).pathname;
}
function normalizeRewritePathname(urlPathname, base, trailingSlash, buildFormat) {
	let pathname = collapseDuplicateSlashes(urlPathname);
	const shouldAppendSlash = shouldAppendForwardSlash(trailingSlash, buildFormat);
	if (base !== "/") {
		if (urlPathname === base || urlPathname === removeTrailingForwardSlash(base)) pathname = "/";
		else if (urlPathname.startsWith(base)) {
			pathname = shouldAppendSlash ? appendForwardSlash(urlPathname) : removeTrailingForwardSlash(urlPathname);
			pathname = pathname.slice(base.length);
		}
	}
	if (!pathname.startsWith("/") && shouldAppendSlash && urlPathname.endsWith("/")) pathname = prependForwardSlash(pathname);
	if (buildFormat === "file") pathname = pathname.replace(/\.html$/, "");
	let resolvedUrlPathname;
	if (base !== "/" && (pathname === "" || pathname === "/") && !shouldAppendSlash) resolvedUrlPathname = removeTrailingForwardSlash(base);
	else resolvedUrlPathname = joinPaths(...[base, pathname].filter(Boolean));
	return {
		pathname,
		resolvedUrlPathname
	};
}
//#endregion
//#region ../../node_modules/astro/dist/core/middleware/sequence.js
function sequence(...handlers) {
	const filtered = handlers.filter((h) => !!h);
	const length = filtered.length;
	if (!length) return defineMiddleware((_context, next) => {
		return next();
	});
	return defineMiddleware((context, next) => {
		let carriedPayload = void 0;
		return applyHandle(0, context);
		function applyHandle(i, handleContext) {
			const handle = filtered[i];
			return handle(handleContext, async (payload) => {
				if (i < length - 1) {
					if (payload) {
						let newRequest;
						if (payload instanceof Request) newRequest = payload;
						else if (payload instanceof URL) newRequest = new Request(payload, handleContext.request.clone());
						else newRequest = new Request(new URL(payload, handleContext.url.origin), handleContext.request.clone());
						const oldPathname = handleContext.url.pathname;
						const pipeline = Reflect.get(handleContext, pipelineSymbol);
						const { routeData, pathname } = await pipeline.tryRewrite(payload, handleContext.request);
						if (pipeline.manifest.serverLike === true && handleContext.isPrerendered === false && routeData.prerender === true) throw new AstroError({
							...ForbiddenRewrite,
							message: ForbiddenRewrite.message(handleContext.url.pathname, pathname, routeData.component),
							hint: ForbiddenRewrite.hint(routeData.component)
						});
						carriedPayload = payload;
						handleContext.request = newRequest;
						handleContext.url = new URL(newRequest.url);
						handleContext.params = getParams(routeData, pathname);
						handleContext.routePattern = routeData.route;
						setOriginPathname(handleContext.request, oldPathname, pipeline.manifest.trailingSlash, pipeline.manifest.buildFormat);
					}
					return applyHandle(i + 1, handleContext);
				} else return next(payload ?? carriedPayload);
			});
		}
	});
}
//#endregion
//#region ../../node_modules/astro/dist/core/redirects/component.js
var RedirectComponentInstance = { default() {
	return new Response(null, { status: 301 });
} };
var RedirectSinglePageBuiltModule = {
	page: () => Promise.resolve(RedirectComponentInstance),
	onRequest: (_, next) => next()
};
//#endregion
//#region ../../node_modules/astro/dist/core/request-body.js
async function readBodyWithLimit(request, limit) {
	const contentLengthHeader = request.headers.get("content-length");
	if (contentLengthHeader) {
		const contentLength = Number.parseInt(contentLengthHeader, 10);
		if (Number.isFinite(contentLength) && contentLength > limit) throw new BodySizeLimitError(limit);
	}
	if (!request.body) return /* @__PURE__ */ new Uint8Array();
	const reader = request.body.getReader();
	const chunks = [];
	let received = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) {
			received += value.byteLength;
			if (received > limit) throw new BodySizeLimitError(limit);
			chunks.push(value);
		}
	}
	const buffer = new Uint8Array(received);
	let offset = 0;
	for (const chunk of chunks) {
		buffer.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return buffer;
}
var BodySizeLimitError = class extends Error {
	limit;
	constructor(limit) {
		super(`Request body exceeds the configured limit of ${limit} bytes`);
		this.name = "BodySizeLimitError";
		this.limit = limit;
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/server-islands/endpoint.js
var SERVER_ISLAND_ROUTE = "/_server-islands/[name]";
var SERVER_ISLAND_COMPONENT = "_server-islands.astro";
function badRequest(reason) {
	return new Response(null, {
		status: 400,
		statusText: "Bad request: " + reason
	});
}
var DEFAULT_BODY_SIZE_LIMIT = 1024 * 1024;
async function getRequestData(request, bodySizeLimit = DEFAULT_BODY_SIZE_LIMIT) {
	switch (request.method) {
		case "GET": {
			const params = new URL(request.url).searchParams;
			if (!params.has("s") || !params.has("e") || !params.has("p")) return badRequest("Missing required query parameters.");
			const encryptedSlots = params.get("s");
			return {
				encryptedComponentExport: params.get("e"),
				encryptedProps: params.get("p"),
				encryptedSlots
			};
		}
		case "POST": try {
			const body = await readBodyWithLimit(request, bodySizeLimit);
			const raw = new TextDecoder().decode(body);
			const data = JSON.parse(raw);
			if (Object.hasOwn(data, "slots") && typeof data.slots === "object") return badRequest("Plaintext slots are not allowed. Slots must be encrypted.");
			if (Object.hasOwn(data, "componentExport") && typeof data.componentExport === "string") return badRequest("Plaintext componentExport is not allowed. componentExport must be encrypted.");
			return data;
		} catch (e) {
			if (e instanceof BodySizeLimitError) return new Response(null, {
				status: 413,
				statusText: e.message
			});
			if (e instanceof SyntaxError) return badRequest("Request format is invalid.");
			throw e;
		}
		default: return new Response(null, { status: 405 });
	}
}
function createEndpoint(manifest) {
	const page = async (result) => {
		const params = result.params;
		if (!params.name) return new Response(null, {
			status: 400,
			statusText: "Bad request"
		});
		const componentId = params.name;
		const data = await getRequestData(result.request, manifest.serverIslandBodySizeLimit);
		if (data instanceof Response) return data;
		let imp = (await (await manifest.serverIslandMappings?.())?.serverIslandMap)?.get(componentId);
		if (!imp) return new Response(null, {
			status: 404,
			statusText: "Not found"
		});
		const key = await manifest.key;
		let componentExport;
		try {
			componentExport = await decryptString(key, data.encryptedComponentExport, `export:${componentId}`);
		} catch (_e) {
			return badRequest("Encrypted componentExport value is invalid.");
		}
		const encryptedProps = data.encryptedProps;
		let props = {};
		if (encryptedProps !== "") try {
			const propString = await decryptString(key, encryptedProps, `props:${componentId}`);
			props = JSON.parse(propString);
		} catch (_e) {
			return badRequest("Encrypted props value is invalid.");
		}
		let decryptedSlots = {};
		const encryptedSlots = data.encryptedSlots;
		if (encryptedSlots !== "") try {
			const slotsString = await decryptString(key, encryptedSlots, `slots:${componentId}`);
			decryptedSlots = JSON.parse(slotsString);
		} catch (_e) {
			return badRequest("Encrypted slots value is invalid.");
		}
		let Component = (await imp())[componentExport];
		const slots = {};
		for (const prop in decryptedSlots) slots[prop] = createSlotValueFromString(decryptedSlots[prop]);
		result.response.headers.set("X-Robots-Tag", "noindex");
		if (isAstroComponentFactory(Component)) {
			const ServerIsland = Component;
			Component = function(...args) {
				return ServerIsland.apply(this, args);
			};
			Object.assign(Component, ServerIsland);
			Component.propagation = "self";
		}
		return renderTemplate`${renderComponent(result, "Component", Component, props, slots)}`;
	};
	page.isAstroComponentFactory = true;
	return {
		default: page,
		partial: true
	};
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/default.js
function createDefaultRoutes(manifest) {
	const root = new URL(manifest.rootDir);
	return [{
		instance: default404Instance,
		matchesComponent: (filePath) => filePath.href === new URL(DEFAULT_404_COMPONENT, root).href,
		route: DEFAULT_404_ROUTE.route,
		component: DEFAULT_404_COMPONENT
	}, {
		instance: createEndpoint(manifest),
		matchesComponent: (filePath) => filePath.href === new URL(SERVER_ISLAND_COMPONENT, root).href,
		route: SERVER_ISLAND_ROUTE,
		component: SERVER_ISLAND_COMPONENT
	}];
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/astro-designed-error-pages.js
function ensure404Route(manifest) {
	if (!manifest.routes.some((route) => route.route === "/404")) manifest.routes.push(DEFAULT_404_ROUTE);
	return manifest;
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/priority.js
function routeComparator(a, b) {
	const commonLength = Math.min(a.segments.length, b.segments.length);
	for (let index = 0; index < commonLength; index++) {
		const aSegment = a.segments[index];
		const bSegment = b.segments[index];
		const aIsStatic = aSegment.every((part) => !part.dynamic && !part.spread);
		const bIsStatic = bSegment.every((part) => !part.dynamic && !part.spread);
		if (aIsStatic && bIsStatic) {
			const aContent = aSegment.map((part) => part.content).join("");
			const bContent = bSegment.map((part) => part.content).join("");
			if (aContent !== bContent) return aContent.localeCompare(bContent);
		}
		if (aIsStatic !== bIsStatic) return aIsStatic ? -1 : 1;
		const aAllDynamic = aSegment.every((part) => part.dynamic);
		if (aAllDynamic !== bSegment.every((part) => part.dynamic)) return aAllDynamic ? 1 : -1;
		const aHasSpread = aSegment.some((part) => part.spread);
		if (aHasSpread !== bSegment.some((part) => part.spread)) return aHasSpread ? 1 : -1;
	}
	const aLength = a.segments.length;
	const bLength = b.segments.length;
	if (aLength !== bLength) {
		const aEndsInRest = a.segments.at(-1)?.some((part) => part.spread);
		const bEndsInRest = b.segments.at(-1)?.some((part) => part.spread);
		if (aEndsInRest !== bEndsInRest && Math.abs(aLength - bLength) === 1) {
			if (aLength > bLength && aEndsInRest) return 1;
			if (bLength > aLength && bEndsInRest) return -1;
		}
		return aLength > bLength ? -1 : 1;
	}
	if (a.type === "endpoint" !== (b.type === "endpoint")) return a.type === "endpoint" ? -1 : 1;
	return a.route.localeCompare(b.route);
}
//#endregion
//#region ../../node_modules/astro/dist/core/routing/router.js
var Router = class {
	#routes;
	#base;
	#baseWithoutTrailingSlash;
	#buildFormat;
	#trailingSlash;
	constructor(routes, options) {
		this.#routes = [...routes].sort(routeComparator);
		this.#base = normalizeBase(options.base);
		this.#baseWithoutTrailingSlash = removeTrailingForwardSlash(this.#base);
		this.#buildFormat = options.buildFormat;
		this.#trailingSlash = options.trailingSlash;
	}
	/**
	* Match an input pathname against the route list.
	* If allowWithoutBase is true, a non-base-prefixed path is still considered.
	*/
	match(inputPathname, { allowWithoutBase = false } = {}) {
		const normalized = getRedirectForPathname(inputPathname);
		if (normalized.redirect) return {
			type: "redirect",
			location: normalized.redirect,
			status: 301
		};
		if (this.#base !== "/") {
			const baseWithSlash = `${this.#baseWithoutTrailingSlash}/`;
			if (this.#trailingSlash === "always" && (normalized.pathname === this.#baseWithoutTrailingSlash || normalized.pathname === this.#base)) return {
				type: "redirect",
				location: baseWithSlash,
				status: 301
			};
			if (this.#trailingSlash === "never" && normalized.pathname === baseWithSlash) return {
				type: "redirect",
				location: this.#baseWithoutTrailingSlash,
				status: 301
			};
		}
		const baseResult = stripBase(normalized.pathname, this.#base, this.#baseWithoutTrailingSlash, this.#trailingSlash);
		if (!baseResult) {
			if (!allowWithoutBase) return {
				type: "none",
				reason: "outside-base"
			};
		}
		let pathname = baseResult ?? normalized.pathname;
		if (this.#buildFormat === "file") pathname = normalizeFileFormatPathname(pathname);
		const route = this.#routes.find((candidate) => {
			if (candidate.pattern.test(pathname)) return true;
			return candidate.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
		});
		if (!route) return {
			type: "none",
			reason: "no-match"
		};
		return {
			type: "match",
			route,
			params: getParams(route, pathname),
			pathname
		};
	}
	/**
	* Returns all routes that match the given pathname, in priority order.
	* Used when the first match (e.g. a prerendered route) cannot serve
	* the request and subsequent matches need to be tried.
	*/
	matchAll(inputPathname, { allowWithoutBase = false } = {}) {
		const normalized = getRedirectForPathname(inputPathname);
		if (normalized.redirect) return [];
		const baseResult = stripBase(normalized.pathname, this.#base, this.#baseWithoutTrailingSlash, this.#trailingSlash);
		if (!baseResult && !allowWithoutBase) return [];
		let pathname = baseResult ?? normalized.pathname;
		if (this.#buildFormat === "file") pathname = normalizeFileFormatPathname(pathname);
		return this.#routes.filter((candidate) => {
			if (candidate.pattern.test(pathname)) return true;
			return candidate.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
		});
	}
};
function normalizeBase(base) {
	if (!base) return "/";
	if (base === "/") return base;
	return prependForwardSlash(base);
}
function getRedirectForPathname(pathname) {
	let value = prependForwardSlash(pathname);
	if (value.startsWith("//")) return {
		pathname: value,
		redirect: `/${value.replace(/^\/+/, "")}`
	};
	return { pathname: value };
}
function stripBase(pathname, base, baseWithoutTrailingSlash, trailingSlash) {
	if (base === "/") return pathname;
	const baseWithSlash = `${baseWithoutTrailingSlash}/`;
	if (pathname === baseWithoutTrailingSlash || pathname === base) return trailingSlash === "always" ? null : "/";
	if (pathname === baseWithSlash) return trailingSlash === "never" ? null : "/";
	if (pathname.startsWith(baseWithSlash)) return pathname.slice(baseWithoutTrailingSlash.length);
	return null;
}
function normalizeFileFormatPathname(pathname) {
	if (pathname.endsWith("/index.html")) {
		const trimmed = pathname.slice(0, -11);
		return trimmed === "" ? "/" : trimmed;
	}
	if (pathname.endsWith(".html")) {
		const trimmed = pathname.slice(0, -5);
		return trimmed === "" ? "/" : trimmed;
	}
	return pathname;
}
//#endregion
//#region ../../node_modules/@astrojs/internal-helpers/dist/object.js
var FORBIDDEN_PATH_KEYS = /* @__PURE__ */ new Set([
	"__proto__",
	"constructor",
	"prototype"
]);
//#endregion
//#region ../../node_modules/astro/dist/core/logger/core.js
var dateTimeFormat = new Intl.DateTimeFormat([], {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false
});
var levels = {
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	silent: 90
};
function log(opts, level, label, message, newLine = true) {
	const logLevel = opts.level;
	const dest = opts.destination;
	const event = {
		label,
		level,
		message,
		newLine
	};
	if (!isLogLevelEnabled(logLevel, level)) return;
	dest.write(event);
}
function isLogLevelEnabled(configuredLogLevel, level) {
	return levels[configuredLogLevel] <= levels[level];
}
function info(opts, label, message, newLine = true) {
	return log(opts, "info", label, message, newLine);
}
function warn(opts, label, message, newLine = true) {
	return log(opts, "warn", label, message, newLine);
}
function error(opts, label, message, newLine = true) {
	return log(opts, "error", label, message, newLine);
}
function debug(...args) {
	if ("_astroGlobalDebug" in globalThis) globalThis._astroGlobalDebug(...args);
}
function getEventPrefix({ level, label }) {
	const timestamp = `${dateTimeFormat.format(/* @__PURE__ */ new Date())}`;
	const prefix = [];
	if (level === "error" || level === "warn") {
		prefix.push(colors.bold(timestamp));
		prefix.push(`[${level.toUpperCase()}]`);
	} else prefix.push(timestamp);
	if (label) prefix.push(`[${label}]`);
	if (level === "error") return colors.red(prefix.join(" "));
	if (level === "warn") return colors.yellow(prefix.join(" "));
	if (prefix.length === 1) return colors.dim(prefix[0]);
	return colors.dim(prefix[0]) + " " + colors.blue(prefix.splice(1).join(" "));
}
var AstroLogger = class {
	options;
	constructor(options) {
		this.options = options;
	}
	info(label, message, newLine = true) {
		info(this.options, label, message, newLine);
	}
	warn(label, message, newLine = true) {
		warn(this.options, label, message, newLine);
	}
	error(label, message, newLine = true) {
		error(this.options, label, message, newLine);
	}
	debug(label, ...messages) {
		debug(label, ...messages);
	}
	level() {
		return this.options.level;
	}
	forkIntegrationLogger(label) {
		return new AstroIntegrationLogger(this.options, label);
	}
	setDestination(destination) {
		this.options.destination = destination;
	}
	/**
	* It calls the `close` function of the provided destination, if it exists.
	*/
	close() {
		if (this.options.destination.close) this.options.destination.close();
	}
	/**
	* It calls the `flush` function of the provided destination, if it exists.
	*/
	flush() {
		if (this.options.destination.flush) this.options.destination.flush();
	}
};
var AstroIntegrationLogger = class AstroIntegrationLogger {
	options;
	label;
	constructor(logging, label) {
		this.options = logging;
		this.label = label;
	}
	/**
	* Creates a new logger instance with a new label, but the same log options.
	*/
	fork(label) {
		return new AstroIntegrationLogger(this.options, label);
	}
	info(message) {
		info(this.options, this.label, message);
	}
	warn(message) {
		warn(this.options, this.label, message);
	}
	error(message) {
		error(this.options, this.label, message);
	}
	debug(message) {
		debug(this.label, message);
	}
	/**
	* It calls the `flush` function of the provided destination, if it exists.
	*/
	flush() {
		if (this.options.destination.flush) this.options.destination.flush();
	}
	/**
	* It calls the `close` function of the provided destination, if it exists.
	*/
	close() {
		if (this.options.destination.close) this.options.destination.close();
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/logger/public.js
function matchesLevel(messageLevel, configuredLevel) {
	return levels[messageLevel] >= levels[configuredLevel];
}
//#endregion
//#region ../../node_modules/astro/dist/core/logger/impls/node.js
function nodeLogDestination(config = {}) {
	const { level = "info" } = config;
	return { write(event) {
		let dest = process.stderr;
		if (levels[event.level] < levels["error"]) dest = process.stdout;
		if (!matchesLevel(event.level, level)) return;
		let trailingLine = event.newLine ? "\n" : "";
		if (event.label === "SKIP_FORMAT") dest.write(event.message + trailingLine);
		else dest.write(getEventPrefix(event) + " " + event.message + trailingLine);
	} };
}
function node_default(options) {
	return nodeLogDestination(options);
}
//#endregion
//#region ../../node_modules/astro/dist/core/logger/impls/console.js
function consoleLogDestination(config = {}) {
	const { level = "info" } = config;
	return { write(event) {
		let dest = console.error;
		if (levels[event.level] < levels["error"]) dest = console.info;
		if (!matchesLevel(event.level, level)) return;
		if (event.label === "SKIP_FORMAT") dest(event.message);
		else dest(getEventPrefix(event) + " " + event.message);
	} };
}
function createConsoleLogger({ level }) {
	return new AstroLogger({
		level,
		destination: consoleLogDestination()
	});
}
function console_default(options) {
	return consoleLogDestination(options);
}
//#endregion
//#region ../../node_modules/astro/dist/core/logger/impls/json.js
var SGR_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
function jsonLoggerDestination(config = {}) {
	const { pretty = false, level = "info" } = config;
	return { write(event) {
		let dest = process.stderr;
		if (levels[event.level] < levels["error"]) dest = process.stdout;
		if (!matchesLevel(event.level, level)) return;
		let trailingLine = event.newLine ? "\n" : "";
		const message = event.message.replace(SGR_REGEX, "");
		if (pretty) dest.write(JSON.stringify({
			message,
			label: event.label,
			level: event.level
		}, null, 2) + trailingLine);
		else dest.write(JSON.stringify({
			message,
			label: event.label,
			level: event.level
		}) + trailingLine);
	} };
}
//#endregion
//#region ../../node_modules/astro/dist/core/logger/impls/compose.js
function compose(destinations) {
	return {
		write(chunk) {
			for (const logger of destinations) logger.write(chunk);
		},
		flush() {
			for (const logger of destinations) if (logger.flush) logger.flush();
		},
		close() {
			for (const logger of destinations) if (logger.close) logger.close();
		}
	};
}
//#endregion
//#region ../../node_modules/astro/dist/core/logger/load.js
async function loadLogger(config, level = "info") {
	let cause = void 0;
	try {
		switch (config.entrypoint) {
			case "astro/logger/node": return new AstroLogger({
				destination: node_default(config.config),
				level
			});
			case "astro/logger/console": return new AstroLogger({
				destination: console_default(config.config),
				level
			});
			case "astro/logger/json": return new AstroLogger({
				destination: jsonLoggerDestination(config.config),
				level
			});
			case "astro/logger/compose": {
				let destinations = [];
				if (config.config?.loggers) {
					const loggers = config.config?.loggers;
					destinations = await Promise.all(loggers.map(async (loggerConfig) => {
						return (await import(
							/* @vite-ignore */
							loggerConfig.entrypoint
)).default(loggerConfig.config);
					}));
				}
				return new AstroLogger({
					destination: compose(destinations),
					level
				});
			}
			default: return new AstroLogger({
				destination: (await import(
					/* @vite-ignore */
					config.entrypoint
)).default(config.config),
				level
			});
		}
	} catch (e) {
		if (e instanceof Error) cause = e;
	}
	const error = new AstroError({
		...UnableToLoadLogger,
		message: UnableToLoadLogger.message(config.entrypoint)
	});
	if (cause) error.cause = cause;
	throw error;
}
//#endregion
//#region ../../node_modules/astro/dist/core/base-pipeline.js
var PipelineFeatures = {
	redirects: 1,
	sessions: 2,
	actions: 4,
	middleware: 8,
	i18n: 16,
	cache: 32
};
var ALL_PIPELINE_FEATURES = PipelineFeatures.redirects | PipelineFeatures.sessions | PipelineFeatures.actions | PipelineFeatures.middleware | PipelineFeatures.i18n | PipelineFeatures.cache;
var Pipeline = class {
	internalMiddleware;
	resolvedMiddleware = void 0;
	resolvedLogger = false;
	resolvedActions = void 0;
	resolvedSessionDriver = void 0;
	resolvedCacheProvider = void 0;
	compiledCacheRoutes = void 0;
	/**
	* Bit mask of pipeline features activated by handler classes.
	* Each handler sets its bit via `|=`. Only meaningful when a
	* custom `src/fetch.ts` fetch handler is in use.
	*/
	usedFeatures = 0;
	logger;
	manifest;
	/**
	* "development" or "production" only
	*/
	runtimeMode;
	renderers;
	resolve;
	streaming;
	/**
	* Used to provide better error messages for `Astro.clientAddress`
	*/
	adapterName;
	clientDirectives;
	inlinedScripts;
	compressHTML;
	i18n;
	middleware;
	routeCache;
	/**
	* Used for `Astro.site`.
	*/
	site;
	/**
	* Array of built-in, internal, routes.
	* Used to find the route module
	*/
	defaultRoutes;
	actions;
	sessionDriver;
	cacheProvider;
	cacheConfig;
	serverIslands;
	/** Route data derived from the manifest, used for route matching. */
	manifestData;
	/** Pattern-matching router built from manifestData. */
	#router;
	constructor(logger, manifest, runtimeMode, renderers, resolve, streaming, adapterName = manifest.adapterName, clientDirectives = manifest.clientDirectives, inlinedScripts = manifest.inlinedScripts, compressHTML = manifest.compressHTML, i18n = manifest.i18n, middleware = manifest.middleware, routeCache = new RouteCache(logger, runtimeMode), site = manifest.site ? new URL(manifest.site) : void 0, defaultRoutes = createDefaultRoutes(manifest), actions = manifest.actions, sessionDriver = manifest.sessionDriver, cacheProvider = manifest.cacheProvider, cacheConfig = manifest.cacheConfig, serverIslands = manifest.serverIslandMappings) {
		this.logger = logger;
		this.manifest = manifest;
		this.runtimeMode = runtimeMode;
		this.renderers = renderers;
		this.resolve = resolve;
		this.streaming = streaming;
		this.adapterName = adapterName;
		this.clientDirectives = clientDirectives;
		this.inlinedScripts = inlinedScripts;
		this.compressHTML = compressHTML;
		this.i18n = i18n;
		this.middleware = middleware;
		this.routeCache = routeCache;
		this.site = site;
		this.defaultRoutes = defaultRoutes;
		this.actions = actions;
		this.sessionDriver = sessionDriver;
		this.cacheProvider = cacheProvider;
		this.cacheConfig = cacheConfig;
		this.serverIslands = serverIslands;
		this.manifestData = { routes: (manifest.routes ?? []).map((route) => route.routeData) };
		ensure404Route(this.manifestData);
		this.#router = new Router(this.manifestData.routes, {
			base: manifest.base,
			trailingSlash: manifest.trailingSlash,
			buildFormat: manifest.buildFormat
		});
		this.internalMiddleware = [];
	}
	/**
	* Low-level route matching against the manifest routes. Returns the
	* matched `RouteData` or `undefined`. Does not filter prerendered
	* routes or check public assets — use `BaseApp.match()` for that.
	*/
	matchRoute(pathname) {
		const match = this.#router.match(pathname, { allowWithoutBase: true });
		if (match.type !== "match") return void 0;
		return match.route;
	}
	/**
	* Returns all routes matching the given pathname, in priority order.
	* Used when the first match cannot serve the request (e.g. a
	* prerendered dynamic route that doesn't cover this specific path)
	* and the caller needs to try subsequent matches.
	*/
	matchAllRoutes(pathname) {
		return this.#router.matchAll(pathname, { allowWithoutBase: true });
	}
	/**
	* Rebuilds the internal router after routes have been added or
	* removed (e.g. by the dev server on HMR).
	*/
	rebuildRouter() {
		this.#router = new Router(this.manifestData.routes, {
			base: this.manifest.base,
			trailingSlash: this.manifest.trailingSlash,
			buildFormat: this.manifest.buildFormat
		});
	}
	/**
	* Resolves the middleware from the manifest, and returns the `onRequest` function. If `onRequest` isn't there,
	* it returns a no-op function
	*/
	async getMiddleware() {
		if (this.resolvedMiddleware) return this.resolvedMiddleware;
		if (this.middleware) {
			const internalMiddlewares = [(await this.middleware()).onRequest ?? NOOP_MIDDLEWARE_FN];
			if (this.manifest.checkOrigin) internalMiddlewares.unshift(createOriginCheckMiddleware());
			this.resolvedMiddleware = sequence(...internalMiddlewares);
			return this.resolvedMiddleware;
		} else {
			this.resolvedMiddleware = NOOP_MIDDLEWARE_FN;
			return this.resolvedMiddleware;
		}
	}
	/**
	* Clears the cached middleware so it is re-resolved on the next request.
	* Called via HMR when middleware files change during development.
	*/
	clearMiddleware() {
		this.resolvedMiddleware = void 0;
	}
	/**
	* Resolves the logger destination from the manifest and updates the pipeline logger.
	* If the user configured `logger`, the bundled logger factory is loaded
	* and replaces the default console destination. This is lazy and only resolves once.
	*/
	async getLogger() {
		if (this.resolvedLogger) return this.logger;
		this.resolvedLogger = true;
		if (this.manifest.loggerConfig) this.logger = await loadLogger(this.manifest.loggerConfig);
		return this.logger;
	}
	async getActions() {
		if (this.resolvedActions) return this.resolvedActions;
		else if (this.actions) {
			this.resolvedActions = await this.actions();
			return this.resolvedActions;
		}
		return NOOP_ACTIONS_MOD;
	}
	async getSessionDriver() {
		if (this.resolvedSessionDriver !== void 0) return this.resolvedSessionDriver;
		if (this.sessionDriver) {
			const driverModule = await this.sessionDriver();
			this.resolvedSessionDriver = driverModule?.default || null;
			return this.resolvedSessionDriver;
		}
		this.resolvedSessionDriver = null;
		return null;
	}
	async getCacheProvider() {
		if (this.resolvedCacheProvider !== void 0) return this.resolvedCacheProvider;
		if (this.cacheProvider) {
			const factory = (await this.cacheProvider())?.default || null;
			this.resolvedCacheProvider = factory ? factory(this.cacheConfig?.options) : null;
			return this.resolvedCacheProvider;
		}
		this.resolvedCacheProvider = null;
		return null;
	}
	async getServerIslands() {
		if (this.serverIslands) return this.serverIslands();
		return {
			serverIslandMap: /* @__PURE__ */ new Map(),
			serverIslandNameMap: /* @__PURE__ */ new Map()
		};
	}
	async getAction(path) {
		const pathKeys = path.split(".").map((key) => decodeURIComponent(key));
		let { server } = await this.getActions();
		if (!server || !(typeof server === "object")) throw new TypeError(`Expected \`server\` export in actions file to be an object. Received ${typeof server}.`);
		for (const key of pathKeys) {
			if (FORBIDDEN_PATH_KEYS.has(key)) throw new AstroError({
				...ActionNotFoundError,
				message: ActionNotFoundError.message(pathKeys.join("."))
			});
			if (!Object.hasOwn(server, key)) throw new AstroError({
				...ActionNotFoundError,
				message: ActionNotFoundError.message(pathKeys.join("."))
			});
			server = server[key];
		}
		if (typeof server !== "function") throw new TypeError(`Expected handler for action ${pathKeys.join(".")} to be a function. Received ${typeof server}.`);
		return server;
	}
	async getModuleForRoute(route) {
		for (const defaultRoute of this.defaultRoutes) if (route.component === defaultRoute.component) return { page: () => Promise.resolve(defaultRoute.instance) };
		if (route.type === "redirect") return RedirectSinglePageBuiltModule;
		else {
			if (this.manifest.pageMap) {
				const importComponentInstance = this.manifest.pageMap.get(route.component);
				if (!importComponentInstance) throw new Error(`Unexpectedly unable to find a component instance for route ${route.route}`);
				return await importComponentInstance();
			} else if (this.manifest.pageModule) return this.manifest.pageModule;
			throw new Error("Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error, please file an issue.");
		}
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/cookies/cookies.js
var DELETED_EXPIRATION = /* @__PURE__ */ new Date(0);
var DELETED_VALUE = "deleted";
var responseSentSymbol = /* @__PURE__ */ Symbol.for("astro.responseSent");
var identity = (value) => value;
var AstroCookie = class {
	value;
	constructor(value) {
		this.value = value;
	}
	json() {
		if (this.value === void 0) throw new Error(`Cannot convert undefined to an object.`);
		return JSON.parse(this.value);
	}
	number() {
		return Number(this.value);
	}
	boolean() {
		if (this.value === "false") return false;
		if (this.value === "0") return false;
		return Boolean(this.value);
	}
};
var AstroCookies = class {
	#request;
	#requestValues;
	#outgoing;
	#consumed;
	constructor(request) {
		this.#request = request;
		this.#requestValues = null;
		this.#outgoing = null;
		this.#consumed = false;
	}
	/**
	* Astro.cookies.delete(key) is used to delete a cookie. Using this method will result
	* in a Set-Cookie header added to the response.
	* @param key The cookie to delete
	* @param options Options related to this deletion, such as the path of the cookie.
	*/
	delete(key, options) {
		const { maxAge: _ignoredMaxAge, expires: _ignoredExpires, ...sanitizedOptions } = options || {};
		const serializeOptions = {
			expires: DELETED_EXPIRATION,
			...sanitizedOptions
		};
		this.#ensureOutgoingMap().set(key, [
			DELETED_VALUE,
			serialize(key, DELETED_VALUE, serializeOptions),
			false
		]);
	}
	/**
	* Astro.cookies.get(key) is used to get a cookie value. The cookie value is read from the
	* request. If you have set a cookie via Astro.cookies.set(key, value), the value will be taken
	* from that set call, overriding any values already part of the request.
	* @param key The cookie to get.
	* @returns An object containing the cookie value as well as convenience methods for converting its value.
	*/
	get(key, options = void 0) {
		if (this.#outgoing?.has(key)) {
			let [serializedValue, , isSetValue] = this.#outgoing.get(key);
			if (isSetValue) return new AstroCookie(serializedValue);
			else return;
		}
		const decode = options?.decode ?? decodeURIComponent;
		const values = this.#ensureParsed();
		if (key in values) {
			const value = values[key];
			if (value) {
				let decodedValue;
				try {
					decodedValue = decode(value);
				} catch (_error) {
					decodedValue = value;
				}
				return new AstroCookie(decodedValue);
			}
		}
	}
	/**
	* Astro.cookies.has(key) returns a boolean indicating whether this cookie is either
	* part of the initial request or set via Astro.cookies.set(key)
	* @param key The cookie to check for.
	* @param _options This parameter is no longer used.
	* @returns
	*/
	has(key, _options) {
		if (this.#outgoing?.has(key)) {
			let [, , isSetValue] = this.#outgoing.get(key);
			return isSetValue;
		}
		return this.#ensureParsed()[key] !== void 0;
	}
	/**
	* Astro.cookies.set(key, value) is used to set a cookie's value. If provided
	* an object it will be stringified via JSON.stringify(value). Additionally you
	* can provide options customizing how this cookie will be set, such as setting httpOnly
	* in order to prevent the cookie from being read in client-side JavaScript.
	* @param key The name of the cookie to set.
	* @param value A value, either a string or other primitive or an object.
	* @param options Options for the cookie, such as the path and security settings.
	*/
	set(key, value, options) {
		if (this.#consumed) {
			const warning = /* @__PURE__ */ new Error("Astro.cookies.set() was called after the cookies had already been sent to the browser.\nThis may have happened if this method was called in an imported component.\nPlease make sure that Astro.cookies.set() is only called in the frontmatter of the main page.");
			warning.name = "Warning";
			console.warn(warning);
		}
		let serializedValue;
		if (typeof value === "string") serializedValue = value;
		else {
			let toStringValue = value.toString();
			if (toStringValue === Object.prototype.toString.call(value)) serializedValue = JSON.stringify(value);
			else serializedValue = toStringValue;
		}
		const serializeOptions = {};
		if (options) Object.assign(serializeOptions, options);
		this.#ensureOutgoingMap().set(key, [
			serializedValue,
			serialize(key, serializedValue, serializeOptions),
			true
		]);
		if (this.#request[responseSentSymbol]) throw new AstroError({ ...ResponseSentError });
	}
	/**
	* Merges a new AstroCookies instance into the current instance. Any new cookies
	* will be added to the current instance, overwriting any existing cookies with the same name.
	*/
	merge(cookies) {
		const outgoing = cookies.#outgoing;
		if (outgoing) for (const [key, value] of outgoing) this.#ensureOutgoingMap().set(key, value);
	}
	/**
	* Astro.cookies.header() returns an iterator for the cookies that have previously
	* been set by either Astro.cookies.set() or Astro.cookies.delete().
	* This method is primarily used by adapters to set the header on outgoing responses.
	* @returns
	*/
	*headers() {
		if (this.#outgoing == null) return;
		for (const [, value] of this.#outgoing) yield value[1];
	}
	/**
	* Marks the cookies as consumed and returns the header values.
	* After consumption, any subsequent `set()` calls will warn.
	*/
	consume() {
		this.#consumed = true;
		return this.headers();
	}
	/**
	* @deprecated Use the instance method `cookies.consume()` instead.
	* Kept for backward compatibility with adapters.
	*/
	static consume(cookies) {
		return cookies.consume();
	}
	#ensureParsed() {
		if (!this.#requestValues) this.#parse();
		if (!this.#requestValues) this.#requestValues = /* @__PURE__ */ Object.create(null);
		return this.#requestValues;
	}
	#ensureOutgoingMap() {
		if (!this.#outgoing) this.#outgoing = /* @__PURE__ */ new Map();
		return this.#outgoing;
	}
	#parse() {
		const raw = this.#request.headers.get("cookie");
		if (!raw) return;
		this.#requestValues = parse(raw, { decode: identity });
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/cookies/response.js
var astroCookiesSymbol = /* @__PURE__ */ Symbol.for("astro.cookies");
function attachCookiesToResponse(response, cookies) {
	Reflect.set(response, astroCookiesSymbol, cookies);
}
function getCookiesFromResponse(response) {
	let cookies = Reflect.get(response, astroCookiesSymbol);
	if (cookies != null) return cookies;
	else return;
}
function* getSetCookiesFromResponse(response) {
	const cookies = getCookiesFromResponse(response);
	if (!cookies) return [];
	for (const headerValue of cookies.consume()) yield headerValue;
	return [];
}
//#endregion
//#region ../../node_modules/astro/dist/actions/consts.js
var ACTION_QUERY_PARAMS = {
	actionName: "_action",
	actionPayload: "_astroActionPayload"
};
//#endregion
//#region ../../node_modules/astro/dist/actions/runtime/client.js
var codeToStatusMap = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	PAYMENT_REQUIRED: 402,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	NOT_ACCEPTABLE: 406,
	PROXY_AUTHENTICATION_REQUIRED: 407,
	REQUEST_TIMEOUT: 408,
	CONFLICT: 409,
	GONE: 410,
	LENGTH_REQUIRED: 411,
	PRECONDITION_FAILED: 412,
	CONTENT_TOO_LARGE: 413,
	URI_TOO_LONG: 414,
	UNSUPPORTED_MEDIA_TYPE: 415,
	RANGE_NOT_SATISFIABLE: 416,
	EXPECTATION_FAILED: 417,
	MISDIRECTED_REQUEST: 421,
	UNPROCESSABLE_CONTENT: 422,
	LOCKED: 423,
	FAILED_DEPENDENCY: 424,
	TOO_EARLY: 425,
	UPGRADE_REQUIRED: 426,
	PRECONDITION_REQUIRED: 428,
	TOO_MANY_REQUESTS: 429,
	REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
	UNAVAILABLE_FOR_LEGAL_REASONS: 451,
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504,
	HTTP_VERSION_NOT_SUPPORTED: 505,
	VARIANT_ALSO_NEGOTIATES: 506,
	INSUFFICIENT_STORAGE: 507,
	LOOP_DETECTED: 508,
	NETWORK_AUTHENTICATION_REQUIRED: 511
};
var statusToCodeMap = Object.fromEntries(Object.entries(codeToStatusMap).map(([key, value]) => [value, key]));
var ActionError = class ActionError extends Error {
	type = "AstroActionError";
	code = "INTERNAL_SERVER_ERROR";
	status = 500;
	constructor(params) {
		super(params.message);
		this.code = params.code;
		this.status = ActionError.codeToStatus(params.code);
		if (params.stack) this.stack = params.stack;
	}
	static codeToStatus(code) {
		return codeToStatusMap[code];
	}
	static statusToCode(status) {
		return statusToCodeMap[status] ?? "INTERNAL_SERVER_ERROR";
	}
	static fromJson(body) {
		if (isInputError(body)) return new ActionInputError(body.issues);
		if (isActionError(body)) return new ActionError(body);
		return new ActionError({ code: "INTERNAL_SERVER_ERROR" });
	}
};
function isActionError(error) {
	return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionError";
}
function isInputError(error) {
	return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionInputError" && "issues" in error && Array.isArray(error.issues);
}
var ActionInputError = class extends ActionError {
	type = "AstroActionInputError";
	issues;
	fields;
	constructor(issues) {
		super({
			message: `Failed to validate: ${JSON.stringify(issues, null, 2)}`,
			code: "BAD_REQUEST"
		});
		this.issues = issues;
		this.fields = {};
		for (const issue of issues) if (issue.path.length > 0) {
			const key = issue.path[0].toString();
			this.fields[key] ??= [];
			this.fields[key]?.push(issue.message);
		}
	}
};
function deserializeActionResult(res) {
	if (res.type === "error") {
		let json;
		try {
			json = JSON.parse(res.body);
		} catch {
			return {
				data: void 0,
				error: new ActionError({
					message: res.body,
					code: "INTERNAL_SERVER_ERROR"
				})
			};
		}
		if (Object.assign({
			"ASSETS_PREFIX": void 0,
			"BASE_URL": "/",
			"DEV": false,
			"MODE": "production",
			"PROD": true,
			"SITE": void 0,
			"SSR": true
		}, { _: "/Users/remi/Sites/remino/jukette/node_modules/.bin/astro" })?.PROD) return {
			error: ActionError.fromJson(json),
			data: void 0
		};
		else {
			const error = ActionError.fromJson(json);
			error.stack = actionResultErrorStack.get();
			return {
				error,
				data: void 0
			};
		}
	}
	if (res.type === "empty") return {
		data: void 0,
		error: void 0
	};
	return {
		data: parse$1(res.body, { URL: (href) => new URL(href) }),
		error: void 0
	};
}
var actionResultErrorStack = /* @__PURE__ */ (function actionResultErrorStackFn() {
	let errorStack;
	return {
		set(stack) {
			errorStack = stack;
		},
		get() {
			return errorStack;
		}
	};
})();
function getActionQueryString(name) {
	return `?${new URLSearchParams({ [ACTION_QUERY_PARAMS.actionName]: name }).toString()}`;
}
//#endregion
//#region ../../node_modules/astro/dist/actions/runtime/server.js
function getActionContext(context) {
	const callerInfo = getCallerInfo(context);
	const actionResultAlreadySet = Boolean(context.locals._actionPayload);
	let action = void 0;
	if (callerInfo && context.request.method === "POST" && !actionResultAlreadySet) action = {
		calledFrom: callerInfo.from,
		name: callerInfo.name,
		handler: async () => {
			const pipeline = Reflect.get(context, pipelineSymbol);
			const callerInfoName = shouldAppendForwardSlash(pipeline.manifest.trailingSlash, pipeline.manifest.buildFormat) ? removeTrailingForwardSlash(callerInfo.name) : callerInfo.name;
			let baseAction;
			try {
				baseAction = await pipeline.getAction(callerInfoName);
			} catch (error) {
				if (error instanceof Error && "name" in error && typeof error.name === "string" && error.name === ActionNotFoundError.name) return {
					data: void 0,
					error: new ActionError({ code: "NOT_FOUND" })
				};
				throw error;
			}
			const bodySizeLimit = pipeline.manifest.actionBodySizeLimit;
			let input;
			try {
				input = await parseRequestBody(context.request, bodySizeLimit);
			} catch (e) {
				if (e instanceof ActionError) return {
					data: void 0,
					error: e
				};
				if (e instanceof TypeError) return {
					data: void 0,
					error: new ActionError({ code: "UNSUPPORTED_MEDIA_TYPE" })
				};
				throw e;
			}
			const omitKeys = [
				"props",
				"getActionResult",
				"callAction",
				"redirect"
			];
			const actionAPIContext = Object.create(Object.getPrototypeOf(context), Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(context)).filter(([key]) => !omitKeys.includes(key))));
			Reflect.set(actionAPIContext, ACTION_API_CONTEXT_SYMBOL, true);
			return baseAction.bind(actionAPIContext)(input);
		}
	};
	function setActionResult(actionName, actionResult) {
		context.locals._actionPayload = {
			actionResult,
			actionName
		};
	}
	return {
		action,
		setActionResult,
		serializeActionResult,
		deserializeActionResult
	};
}
function getCallerInfo(ctx) {
	if (ctx.routePattern === "/_actions/[...path]") return {
		from: "rpc",
		name: ctx.url.pathname.replace(/^.*\/_actions\//, "")
	};
	const queryParam = ctx.url.searchParams.get(ACTION_QUERY_PARAMS.actionName);
	if (queryParam) return {
		from: "form",
		name: queryParam
	};
}
async function parseRequestBody(request, bodySizeLimit) {
	const contentType = request.headers.get("content-type");
	const contentLengthHeader = request.headers.get("content-length");
	const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : void 0;
	const hasContentLength = typeof contentLength === "number" && Number.isFinite(contentLength);
	if (!contentType) return void 0;
	if (hasContentLength && contentLength > bodySizeLimit) throw new ActionError({
		code: "CONTENT_TOO_LARGE",
		message: `Request body exceeds ${bodySizeLimit} bytes`
	});
	try {
		if (hasContentType(contentType, formContentTypes)) {
			if (!hasContentLength) {
				const body = await readBodyWithLimit(request.clone(), bodySizeLimit);
				return await new Request(request.url, {
					method: request.method,
					headers: request.headers,
					body: toArrayBuffer(body)
				}).formData();
			}
			return await request.clone().formData();
		}
		if (hasContentType(contentType, ["application/json"])) {
			if (contentLength === 0) return void 0;
			if (!hasContentLength) {
				const body = await readBodyWithLimit(request.clone(), bodySizeLimit);
				if (body.byteLength === 0) return void 0;
				return JSON.parse(new TextDecoder().decode(body));
			}
			return await request.clone().json();
		}
	} catch (e) {
		if (e instanceof BodySizeLimitError) throw new ActionError({
			code: "CONTENT_TOO_LARGE",
			message: `Request body exceeds ${bodySizeLimit} bytes`
		});
		throw e;
	}
	throw new TypeError("Unsupported content type");
}
var ACTION_API_CONTEXT_SYMBOL = /* @__PURE__ */ Symbol.for("astro.actionAPIContext");
var formContentTypes = ["application/x-www-form-urlencoded", "multipart/form-data"];
function hasContentType(contentType, expected) {
	const type = contentType.split(";")[0].toLowerCase();
	return expected.some((t) => type === t);
}
function serializeActionResult(res) {
	if (res.error) {
		if (Object.assign({
			"ASSETS_PREFIX": void 0,
			"BASE_URL": "/",
			"DEV": false,
			"MODE": "production",
			"PROD": true,
			"SITE": void 0,
			"SSR": true
		}, { _: "/Users/remi/Sites/remino/jukette/node_modules/.bin/astro" })?.DEV) actionResultErrorStack.set(res.error.stack);
		let body2;
		if (res.error instanceof ActionInputError) body2 = {
			type: res.error.type,
			issues: res.error.issues,
			fields: res.error.fields
		};
		else body2 = {
			...res.error,
			message: res.error.message
		};
		return {
			type: "error",
			status: res.error.status,
			contentType: "application/json",
			body: JSON.stringify(body2)
		};
	}
	if (res.data === void 0) return {
		type: "empty",
		status: 204
	};
	let body;
	try {
		body = stringify(res.data, { URL: (value) => value instanceof URL && value.href });
	} catch (e) {
		let hint = ActionsReturnedInvalidDataError.hint;
		if (res.data instanceof Response) hint = REDIRECT_STATUS_CODES.includes(res.data.status) ? "If you need to redirect when the action succeeds, trigger a redirect where the action is called. See the Actions guide for server and client redirect examples: https://docs.astro.build/en/guides/actions." : "If you need to return a Response object, try using a server endpoint instead. See https://docs.astro.build/en/guides/endpoints/#server-endpoints-api-routes";
		throw new AstroError({
			...ActionsReturnedInvalidDataError,
			message: ActionsReturnedInvalidDataError.message(String(e)),
			hint
		});
	}
	return {
		type: "data",
		status: 200,
		contentType: "application/json+devalue",
		body
	};
}
function toArrayBuffer(buffer) {
	const copy = new Uint8Array(buffer.byteLength);
	copy.set(buffer);
	return copy.buffer;
}
//#endregion
//#region ../../node_modules/astro/dist/actions/utils.js
function hasActionPayload(locals) {
	return "_actionPayload" in locals;
}
function createGetActionResult(locals) {
	return (actionFn) => {
		if (!hasActionPayload(locals) || actionFn.toString() !== getActionQueryString(locals._actionPayload.actionName)) return;
		return deserializeActionResult(locals._actionPayload.actionResult);
	};
}
function createCallAction(context) {
	return (baseAction, input) => {
		Reflect.set(context, ACTION_API_CONTEXT_SYMBOL, true);
		return baseAction.bind(context)(input);
	};
}
//#endregion
//#region ../../node_modules/astro/dist/core/csp/runtime.js
function deduplicateDirectiveValues(existingDirective, newDirective) {
	const [directiveName, ...existingValues] = existingDirective.split(/\s+/).filter(Boolean);
	const [newDirectiveName, ...newValues] = newDirective.split(/\s+/).filter(Boolean);
	if (directiveName !== newDirectiveName) return;
	return `${directiveName} ${Array.from(/* @__PURE__ */ new Set([...existingValues, ...newValues])).join(" ")}`;
}
function pushDirective(directives, newDirective) {
	if (directives.length === 0) return [newDirective];
	const finalDirectives = [];
	let matched = false;
	for (const directive of directives) {
		if (matched) {
			finalDirectives.push(directive);
			continue;
		}
		const result = deduplicateDirectiveValues(directive, newDirective);
		if (result) {
			finalDirectives.push(result);
			matched = true;
		} else finalDirectives.push(directive);
	}
	if (!matched) finalDirectives.push(newDirective);
	return finalDirectives;
}
//#endregion
//#region ../../node_modules/astro/dist/i18n/fallback.js
function computeFallbackRoute(options) {
	const { pathname, responseStatus, fallback, fallbackType, locales, defaultLocale, strategy, base } = options;
	if (responseStatus !== 404) return { type: "none" };
	if (!fallback || Object.keys(fallback).length === 0) return { type: "none" };
	const urlLocale = pathname.split("/").find((segment) => {
		for (const locale of locales) if (typeof locale === "string") {
			if (locale === segment) return true;
		} else if (locale.path === segment) return true;
		return false;
	});
	if (!urlLocale) return { type: "none" };
	if (!Object.keys(fallback).includes(urlLocale)) return { type: "none" };
	const fallbackLocale = fallback[urlLocale];
	const pathFallbackLocale = getPathByLocale(fallbackLocale, locales);
	let newPathname;
	if (pathFallbackLocale === defaultLocale && strategy === "pathname-prefix-other-locales") if (pathname.includes(`${base}`)) newPathname = pathname.replace(`/${urlLocale}`, ``);
	else newPathname = pathname.replace(`/${urlLocale}`, `/`);
	else newPathname = pathname.replace(`/${urlLocale}`, `/${pathFallbackLocale}`);
	return {
		type: fallbackType,
		pathname: newPathname
	};
}
//#endregion
//#region ../../node_modules/astro/dist/i18n/router.js
var I18nRouter = class {
	#strategy;
	#defaultLocale;
	#locales;
	#base;
	#domains;
	constructor(options) {
		this.#strategy = options.strategy;
		this.#defaultLocale = options.defaultLocale;
		this.#locales = options.locales;
		this.#base = options.base === "/" ? "/" : removeTrailingForwardSlash(options.base || "");
		this.#domains = options.domains;
	}
	/**
	* Evaluate routing strategy for a pathname.
	* Returns decision object (not HTTP Response).
	*/
	match(pathname, context) {
		if (this.shouldSkipProcessing(pathname, context)) return { type: "continue" };
		switch (this.#strategy) {
			case "manual": return { type: "continue" };
			case "pathname-prefix-always": return this.matchPrefixAlways(pathname, context);
			case "domains-prefix-always":
				if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) return { type: "continue" };
				return this.matchPrefixAlways(pathname, context);
			case "pathname-prefix-other-locales": return this.matchPrefixOtherLocales(pathname, context);
			case "domains-prefix-other-locales":
				if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) return { type: "continue" };
				return this.matchPrefixOtherLocales(pathname, context);
			case "pathname-prefix-always-no-redirect": return this.matchPrefixAlwaysNoRedirect(pathname, context);
			case "domains-prefix-always-no-redirect":
				if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) return { type: "continue" };
				return this.matchPrefixAlwaysNoRedirect(pathname, context);
			default: return { type: "continue" };
		}
	}
	/**
	* Check if i18n processing should be skipped for this request
	*/
	shouldSkipProcessing(pathname, context) {
		if (pathname.includes("/404") || pathname.includes("/500")) return true;
		if (pathname.includes("/_server-islands/")) return true;
		if (context.isReroute) return true;
		if (context.routeType && context.routeType !== "page" && context.routeType !== "fallback") return true;
		return false;
	}
	/**
	* Strategy: pathname-prefix-always
	* All locales must have a prefix, including the default locale.
	*/
	matchPrefixAlways(pathname, _context) {
		if (pathname === this.#base + "/" || pathname === this.#base) return {
			type: "redirect",
			location: `${this.#base === "/" ? "" : this.#base}/${this.#defaultLocale}`
		};
		if (!pathHasLocale(pathname, this.#locales)) return { type: "notFound" };
		return { type: "continue" };
	}
	/**
	* Strategy: pathname-prefix-other-locales
	* Default locale has no prefix, other locales must have a prefix.
	*/
	matchPrefixOtherLocales(pathname, _context) {
		let pathnameContainsDefaultLocale = false;
		for (const segment of pathname.split("/")) if (normalizeTheLocale(segment) === normalizeTheLocale(this.#defaultLocale)) {
			pathnameContainsDefaultLocale = true;
			break;
		}
		if (pathnameContainsDefaultLocale) return {
			type: "notFound",
			location: pathname.replace(`/${this.#defaultLocale}`, "")
		};
		return { type: "continue" };
	}
	/**
	* Strategy: pathname-prefix-always-no-redirect
	* Like prefix-always but allows root to serve instead of redirecting
	*/
	matchPrefixAlwaysNoRedirect(pathname, _context) {
		if (pathname === this.#base + "/" || pathname === this.#base) return { type: "continue" };
		if (!pathHasLocale(pathname, this.#locales)) return { type: "notFound" };
		return { type: "continue" };
	}
	/**
	* Check if the current locale doesn't belong to the configured domain.
	* Used for domain-based routing strategies.
	*/
	localeHasntDomain(currentLocale, currentDomain) {
		if (!this.#domains || !currentDomain) return false;
		if (!currentLocale) return false;
		const localesForDomain = this.#domains[currentDomain];
		if (!localesForDomain) return true;
		return !localesForDomain.includes(currentLocale);
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/i18n/handler.js
var I18n = class {
	#i18n;
	#base;
	#trailingSlash;
	#format;
	#router;
	constructor(i18n, base, trailingSlash, format) {
		this.#i18n = i18n;
		this.#base = base;
		this.#trailingSlash = trailingSlash;
		this.#format = format;
		this.#router = new I18nRouter({
			strategy: i18n.strategy,
			defaultLocale: i18n.defaultLocale,
			locales: i18n.locales,
			base,
			domains: i18n.domainLookupTable ? Object.keys(i18n.domainLookupTable).reduce((acc, domain) => {
				const locale = i18n.domainLookupTable[domain];
				if (!acc[domain]) acc[domain] = [];
				acc[domain].push(locale);
				return acc;
			}, {}) : void 0
		});
	}
	async finalize(state, response) {
		state.pipeline.usedFeatures |= PipelineFeatures.i18n;
		const i18n = this.#i18n;
		if (state.skipErrorReroute && typeof i18n.fallback === "undefined") return response;
		if (state.responseRouteType !== "page" && state.responseRouteType !== "fallback") return response;
		const url = state.url;
		const currentLocale = state.computeCurrentLocale();
		const isPrerendered = state.routeData.prerender;
		const routerContext = {
			currentLocale,
			currentDomain: url.hostname,
			routeType: state.responseRouteType,
			isReroute: false
		};
		const routeDecision = this.#router.match(url.pathname, routerContext);
		switch (routeDecision.type) {
			case "redirect": {
				let location = routeDecision.location;
				if (shouldAppendForwardSlash(this.#trailingSlash, this.#format)) location = appendForwardSlash(location);
				return new Response(null, {
					status: routeDecision.status ?? 302,
					headers: { Location: location }
				});
			}
			case "notFound": {
				if (isPrerendered) {
					const prerenderedRes = new Response(response.body, {
						status: 404,
						headers: response.headers
					});
					state.skipErrorReroute = true;
					if (routeDecision.location) prerenderedRes.headers.set("Location", routeDecision.location);
					return prerenderedRes;
				}
				const headers = new Headers();
				if (routeDecision.location) headers.set("Location", routeDecision.location);
				return new Response(null, {
					status: 404,
					headers
				});
			}
			case "continue": break;
		}
		if (i18n.fallback && i18n.fallbackType) {
			const effectiveStatus = state.responseRouteType === "fallback" ? 404 : response.status;
			const fallbackDecision = computeFallbackRoute({
				pathname: url.pathname,
				responseStatus: effectiveStatus,
				currentLocale,
				fallback: i18n.fallback,
				fallbackType: i18n.fallbackType,
				locales: i18n.locales,
				defaultLocale: i18n.defaultLocale,
				strategy: i18n.strategy,
				base: this.#base
			});
			switch (fallbackDecision.type) {
				case "redirect": return new Response(null, {
					status: 302,
					headers: { Location: fallbackDecision.pathname + url.search }
				});
				case "rewrite": return await state.rewrite(fallbackDecision.pathname + url.search);
				case "none": break;
			}
		}
		return response;
	}
};
//#endregion
//#region ../../node_modules/astro/dist/i18n/index.js
function getPathByLocale(locale, locales) {
	for (const loopLocale of locales) if (typeof loopLocale === "string") {
		if (loopLocale === locale) return loopLocale;
	} else for (const code of loopLocale.codes) if (code === locale) return loopLocale.path;
	throw new AstroError(i18nNoLocaleFoundInPath);
}
function getAllCodes(locales) {
	const result = [];
	for (const loopLocale of locales) if (typeof loopLocale === "string") result.push(loopLocale);
	else result.push(...loopLocale.codes);
	return result;
}
//#endregion
//#region ../../node_modules/astro/dist/i18n/utils.js
function parseLocale(header) {
	if (header === "*") return [{
		locale: header,
		qualityValue: void 0
	}];
	const result = [];
	const localeValues = header.split(",").map((str) => str.trim());
	for (const localeValue of localeValues) {
		const split = localeValue.split(";").map((str) => str.trim());
		const localeName = split[0];
		const qualityValue = split[1];
		if (!split) continue;
		if (qualityValue && qualityValue.startsWith("q=")) {
			const qualityValueAsFloat = Number.parseFloat(qualityValue.slice(2));
			if (Number.isNaN(qualityValueAsFloat) || qualityValueAsFloat > 1) result.push({
				locale: localeName,
				qualityValue: void 0
			});
			else result.push({
				locale: localeName,
				qualityValue: qualityValueAsFloat
			});
		} else result.push({
			locale: localeName,
			qualityValue: void 0
		});
	}
	return result;
}
function sortAndFilterLocales(browserLocaleList, locales) {
	const normalizedLocales = getAllCodes(locales).map(normalizeTheLocale);
	return browserLocaleList.filter((browserLocale) => {
		if (browserLocale.locale !== "*") return normalizedLocales.includes(normalizeTheLocale(browserLocale.locale));
		return true;
	}).sort((a, b) => {
		if (a.qualityValue && b.qualityValue) return Math.sign(b.qualityValue - a.qualityValue);
		return 0;
	});
}
function computePreferredLocale(request, locales) {
	const acceptHeader = request.headers.get("Accept-Language");
	let result = void 0;
	if (acceptHeader) {
		const firstResult = sortAndFilterLocales(parseLocale(acceptHeader), locales).at(0);
		if (firstResult && firstResult.locale !== "*") {
			outer: for (const currentLocale of locales) if (typeof currentLocale === "string") {
				if (normalizeTheLocale(currentLocale) === normalizeTheLocale(firstResult.locale)) {
					result = currentLocale;
					break;
				}
			} else for (const currentCode of currentLocale.codes) if (normalizeTheLocale(currentCode) === normalizeTheLocale(firstResult.locale)) {
				result = currentCode;
				break outer;
			}
		}
	}
	return result;
}
function computePreferredLocaleList(request, locales) {
	const acceptHeader = request.headers.get("Accept-Language");
	let result = [];
	if (acceptHeader) {
		const browserLocaleList = sortAndFilterLocales(parseLocale(acceptHeader), locales);
		if (browserLocaleList.length === 1 && browserLocaleList.at(0).locale === "*") return getAllCodes(locales);
		else if (browserLocaleList.length > 0) {
			for (const browserLocale of browserLocaleList) for (const loopLocale of locales) if (typeof loopLocale === "string") {
				if (normalizeTheLocale(loopLocale) === normalizeTheLocale(browserLocale.locale)) result.push(loopLocale);
			} else for (const code of loopLocale.codes) if (code === browserLocale.locale) result.push(code);
		}
	}
	return result;
}
function computeCurrentLocale(pathname, locales, defaultLocale) {
	for (const segment of pathname.split("/").map(normalizeThePath)) for (const locale of locales) if (typeof locale === "string") {
		if (!segment.includes(locale)) continue;
		if (normalizeTheLocale(locale) === normalizeTheLocale(segment)) return locale;
	} else if (locale.path === segment) return locale.codes.at(0);
	else for (const code of locale.codes) if (normalizeTheLocale(code) === normalizeTheLocale(segment)) return code;
	for (const locale of locales) if (typeof locale === "string") {
		if (locale === defaultLocale) return locale;
	} else if (locale.path === defaultLocale) return locale.codes.at(0);
}
function computeCurrentLocaleFromParams(params, locales) {
	const byNormalizedCode = /* @__PURE__ */ new Map();
	const byPath = /* @__PURE__ */ new Map();
	for (const locale of locales) if (typeof locale === "string") byNormalizedCode.set(normalizeTheLocale(locale), locale);
	else {
		byPath.set(locale.path, locale.codes[0]);
		for (const code of locale.codes) byNormalizedCode.set(normalizeTheLocale(code), code);
	}
	for (const value of Object.values(params)) {
		if (!value) continue;
		const pathMatch = byPath.get(value);
		if (pathMatch) return pathMatch;
		const codeMatch = byNormalizedCode.get(normalizeTheLocale(value));
		if (codeMatch) return codeMatch;
	}
}
//#endregion
//#region ../../node_modules/astro/dist/core/middleware/callMiddleware.js
async function callMiddleware(onRequest, apiContext, responseFunction) {
	let nextCalled = false;
	let responseFunctionPromise = void 0;
	const next = async (payload) => {
		nextCalled = true;
		responseFunctionPromise = responseFunction(apiContext, payload);
		return responseFunctionPromise;
	};
	const middlewarePromise = onRequest(apiContext, next);
	return await Promise.resolve(middlewarePromise).then(async (value) => {
		if (nextCalled) if (typeof value !== "undefined") {
			if (value instanceof Response === false) throw new AstroError(MiddlewareNotAResponse);
			return value;
		} else if (responseFunctionPromise) return responseFunctionPromise;
		else throw new AstroError(MiddlewareNotAResponse);
		else if (typeof value === "undefined") throw new AstroError(MiddlewareNoDataOrNextCalled);
		else if (value instanceof Response === false) throw new AstroError(MiddlewareNotAResponse);
		else return value;
	});
}
//#endregion
//#region ../../node_modules/astro/dist/core/cache/runtime/noop.js
var EMPTY_OPTIONS = Object.freeze({ tags: [] });
var NoopAstroCache = class {
	enabled = false;
	set() {}
	get tags() {
		return [];
	}
	get options() {
		return EMPTY_OPTIONS;
	}
	async invalidate() {}
};
var hasWarned = false;
var DisabledAstroCache = class {
	enabled = false;
	#logger;
	constructor(logger) {
		this.#logger = logger;
	}
	#warn() {
		if (!hasWarned) {
			hasWarned = true;
			this.#logger?.warn("cache", "`cache.set()` was called but caching is not enabled. Configure a cache provider in your Astro config under `cache` to enable caching.");
		}
	}
	set() {
		this.#warn();
	}
	get tags() {
		return [];
	}
	get options() {
		return EMPTY_OPTIONS;
	}
	async invalidate() {
		throw new AstroError(CacheNotEnabled);
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/middleware/astro-middleware.js
var AstroMiddleware = class {
	#pipeline;
	constructor(pipeline) {
		this.#pipeline = pipeline;
	}
	async handle(state, renderRouteCallback) {
		state.pipeline.usedFeatures |= PipelineFeatures.middleware;
		const pipeline = this.#pipeline;
		await state.getProps();
		const apiContext = state.getAPIContext();
		state.counter++;
		if (state.counter === 4) return new Response("Loop Detected", {
			status: 508,
			statusText: "Astro detected a loop where you tried to call the rewriting logic more than four times."
		});
		const next = async (ctx, payload) => {
			if (payload) {
				pipeline.logger.debug("router", "Called rewriting to:", payload);
				applyRewriteToState(state, payload, await pipeline.tryRewrite(payload, state.request));
			}
			return renderRouteCallback(state, ctx);
		};
		let response;
		if (state.skipMiddleware) response = await next(apiContext);
		else {
			const pipelineMiddleware = await pipeline.getMiddleware();
			response = await callMiddleware(sequence(...pipeline.internalMiddleware, pipelineMiddleware), apiContext, next);
		}
		response = this.#finalize(state, response);
		state.response = response;
		return response;
	}
	/**
	* Like `handle`, but mirrors the app-level error handling that
	* `AstroHandler` provides on the standard path, the same way
	* `PagesHandler.handleWithErrorFallback` does for `pages()`. When no
	* route matched it returns a 404 marked with `X-Astro-Error` for the
	* app's post-check; when Astro's own middleware chain throws it logs the
	* error and renders the custom `500.astro`.
	*
	* Errors surfaced through `renderRouteCallback` (the host framework's
	* `next`, e.g. host middleware mounted below `middleware()`) are
	* re-thrown instead, so the host's own error handling still runs rather
	* than being swallowed into Astro's 500 page. A sentinel tells the two
	* apart.
	*
	* Used by the composable `astro/fetch` `middleware()` entry point, where
	* there is no surrounding `AstroHandler` to supply this fallback.
	*/
	async handleWithErrorFallback(app, state, renderRouteCallback) {
		if (!state.routeData) return new Response(null, {
			status: 404,
			headers: { [ASTRO_ERROR_HEADER]: "true" }
		});
		let nextError;
		try {
			return await this.handle(state, async (s, ctx) => {
				try {
					return await renderRouteCallback(s, ctx);
				} catch (err) {
					nextError = err;
					throw err;
				}
			});
		} catch (err) {
			if (err === nextError) throw err;
			app.logger.error(null, err.stack || err.message || String(err));
			return app.renderError(state.request, {
				...state.renderOptions,
				status: 500,
				error: err,
				pathname: state.pathname
			});
		}
	}
	#finalize(state, response) {
		attachCookiesToResponse(response, state.cookies);
		return response;
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/pages/handler.js
var EMPTY_SLOTS = Object.freeze({});
var PagesHandler = class {
	#pipeline;
	constructor(pipeline) {
		this.#pipeline = pipeline;
	}
	async handle(state, ctx) {
		const { logger, streaming } = this.#pipeline;
		state.resetResponseMetadata();
		let response;
		const componentInstance = await state.loadComponentInstance();
		switch (state.routeData.type) {
			case "endpoint":
				response = await renderEndpoint(componentInstance, ctx, state.routeData.prerender, logger, state);
				break;
			case "page": {
				const props = await state.getProps();
				const actionApiContext = state.getActionAPIContext();
				const result = await state.createResult(componentInstance, actionApiContext);
				try {
					response = await renderPage(result, componentInstance?.default, props, state.slots ?? EMPTY_SLOTS, streaming, state.routeData);
				} catch (e) {
					result.cancelled = true;
					throw e;
				}
				state.responseRouteType = "page";
				if (state.routeData.route === "/404" || state.routeData.route === "/500") state.skipErrorReroute = true;
				break;
			}
			case "redirect": return new Response(null, {
				status: 404,
				headers: { [ASTRO_ERROR_HEADER]: "true" }
			});
			case "fallback":
				state.responseRouteType = "fallback";
				return new Response(null, { status: 500 });
		}
		const responseCookies = getCookiesFromResponse(response);
		if (responseCookies) state.cookies.merge(responseCookies);
		state.response = response;
		return response;
	}
	/**
	* Like `handle`, but mirrors the app-level error handling that
	* `AstroHandler` provides on the standard path: unmatched routes
	* return a 404 marked with `X-Astro-Error` for the app's post-check
	* to render the 404 error page, and render-time errors are logged
	* and render the 500 error page instead of propagating to the host
	* framework.
	*
	* Used by the composable `astro/fetch` `pages()` entry point, where
	* there is no surrounding `AstroHandler` to supply this fallback.
	*/
	async handleWithErrorFallback(app, state) {
		if (!state.routeData) return new Response(null, {
			status: 404,
			headers: { [ASTRO_ERROR_HEADER]: "true" }
		});
		const ctx = state.getAPIContext();
		if (this.#pipeline.manifest.checkOrigin && isForbiddenCrossOriginRequest(ctx.request, ctx.url, ctx.isPrerendered)) return createCrossOriginForbiddenResponse(ctx.request);
		try {
			return await this.handle(state, ctx);
		} catch (err) {
			app.logger.error(null, err.stack || err.message || String(err));
			return app.renderError(state.request, {
				...state.renderOptions,
				status: 500,
				error: err,
				pathname: state.pathname
			});
		}
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/util/normalized-url.js
function createNormalizedUrl(requestUrl) {
	return normalizeUrl(new URL(requestUrl));
}
function normalizeUrl(url) {
	try {
		url.pathname = validateAndDecodePathname(url.pathname);
	} catch {
		try {
			url.pathname = decodeURI(url.pathname);
		} catch {}
	}
	url.pathname = collapseDuplicateSlashes(url.pathname);
	return url;
}
//#endregion
//#region ../../node_modules/astro/dist/core/rewrites/handler.js
function applyRewriteToState(state, payload, { routeData, componentInstance, newUrl, pathname }, { mergeCookies = false } = {}) {
	const pipeline = state.pipeline;
	const oldPathname = state.pathname;
	const isI18nFallback = routeData.fallbackRoutes && routeData.fallbackRoutes.length > 0;
	if (pipeline.manifest.serverLike && !state.routeData.prerender && routeData.prerender && !isI18nFallback) throw new AstroError({
		...ForbiddenRewrite,
		message: ForbiddenRewrite.message(state.pathname, pathname, routeData.component),
		hint: ForbiddenRewrite.hint(routeData.component)
	});
	state.routeData = routeData;
	state.componentInstance = componentInstance;
	if (payload instanceof Request) state.request = payload;
	else state.request = copyRequest(newUrl, state.request, routeData.prerender, pipeline.logger, state.routeData.route);
	state.url = createNormalizedUrl(state.request.url);
	if (mergeCookies) {
		const newCookies = new AstroCookies(state.request);
		if (state.cookies) newCookies.merge(state.cookies);
		state.cookies = newCookies;
	}
	state.params = getParams(routeData, pathname);
	state.pathname = pathname;
	state.isRewriting = true;
	state.status = 200;
	setOriginPathname(state.request, oldPathname, pipeline.manifest.trailingSlash, pipeline.manifest.buildFormat);
	state.invalidateContexts();
}
var Rewrites = class {
	async execute(state, payload) {
		const pipeline = state.pipeline;
		pipeline.logger.debug("router", "Calling rewrite: ", payload);
		applyRewriteToState(state, payload, await pipeline.tryRewrite(payload, state.request), { mergeCookies: true });
		const middleware = new AstroMiddleware(pipeline);
		const pagesHandler = new PagesHandler(pipeline);
		return middleware.handle(state, pagesHandler.handle.bind(pagesHandler));
	}
};
//#endregion
//#region ../../node_modules/astro/dist/core/routing/match.js
function matchRoute(pathname, manifest) {
	if (isRoute404(pathname)) {
		const errorRoute = manifest.routes.find((route) => isRoute404(route.route));
		if (errorRoute) return errorRoute;
	}
	if (isRoute500(pathname)) {
		const errorRoute = manifest.routes.find((route) => isRoute500(route.route));
		if (errorRoute) return errorRoute;
	}
	return manifest.routes.find((route) => {
		return route.pattern.test(pathname) || route.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
	});
}
function isRoute404or500(route) {
	return isRoute404(route.route) || isRoute500(route.route);
}
function isRouteServerIsland(route) {
	return route.component === SERVER_ISLAND_COMPONENT;
}
//#endregion
//#region ../../node_modules/astro/dist/core/app/render-options.js
var renderOptionsSymbol = /* @__PURE__ */ Symbol.for("astro.renderOptions");
function getRenderOptions(request) {
	return Reflect.get(request, renderOptionsSymbol);
}
function setRenderOptions(request, options) {
	Reflect.set(request, renderOptionsSymbol, options);
}
//#endregion
//#region ../../node_modules/astro/dist/core/app/validate-headers.js
function getFirstForwardedValue(multiValueHeader) {
	return multiValueHeader?.toString().split(",").map((e) => e.trim())[0];
}
function sanitizeHost(hostname) {
	if (!hostname) return void 0;
	if (/[/\\]/.test(hostname)) return void 0;
	return hostname;
}
function parseHost(host) {
	const parts = host.split(":");
	return {
		hostname: parts[0],
		port: parts[1]
	};
}
function matchesAllowedDomains(hostname, protocol, port, allowedDomains) {
	const urlString = `${protocol}://${port ? `${hostname}:${port}` : hostname}`;
	if (!URL.canParse(urlString)) return false;
	const testUrl = new URL(urlString);
	return allowedDomains.some((pattern) => matchPattern(testUrl, pattern));
}
function validateHost(host, protocol, allowedDomains) {
	if (!host || host.length === 0) return void 0;
	if (!allowedDomains || allowedDomains.length === 0) return void 0;
	const sanitized = sanitizeHost(host);
	if (!sanitized) return void 0;
	const { hostname, port } = parseHost(sanitized);
	if (matchesAllowedDomains(hostname, protocol, port, allowedDomains)) return sanitized;
}
function validateForwardedHeaders(forwardedProtocol, forwardedHost, forwardedPort, allowedDomains) {
	const result = {};
	if (forwardedProtocol) {
		if (allowedDomains && allowedDomains.length > 0) {
			if (allowedDomains.some((pattern) => pattern.protocol !== void 0)) try {
				const testUrl = new URL(`${forwardedProtocol}://example.com`);
				if (allowedDomains.some((pattern) => matchPattern(testUrl, { protocol: pattern.protocol }))) result.protocol = forwardedProtocol;
			} catch {}
			else if (/^https?$/.test(forwardedProtocol)) result.protocol = forwardedProtocol;
		}
	}
	if (forwardedPort && allowedDomains && allowedDomains.length > 0) {
		if (allowedDomains.some((pattern) => pattern.port !== void 0)) {
			if (allowedDomains.some((pattern) => pattern.port === forwardedPort)) result.port = forwardedPort;
		}
	}
	if (forwardedHost && forwardedHost.length > 0 && allowedDomains && allowedDomains.length > 0) {
		const protoForValidation = result.protocol || "https";
		const sanitized = sanitizeHost(forwardedHost);
		if (sanitized) {
			const { hostname, port: portFromHost } = parseHost(sanitized);
			if (matchesAllowedDomains(hostname, protoForValidation, result.port || portFromHost, allowedDomains)) result.host = sanitized;
		}
	}
	return result;
}
//#endregion
//#region ../../node_modules/astro/dist/core/fetch/fetch-state.js
var FetchState = class {
	pipeline;
	/**
	* The request to render. Mutated during rewrites so subsequent renders
	* see the rewritten URL.
	*/
	request;
	routeData;
	/**
	* The pathname to use for routing and rendering. Starts out as the raw,
	* base-stripped, decoded pathname from the request. May be further
	* normalized by `AstroHandler` after routeData is known (in dev, when
	* the matched route has no `.html` extension, `.html` / `/index.html`
	* suffixes are stripped).
	*/
	pathname;
	/** Resolved render options (addCookieHeader, clientAddress, locals, etc.). */
	renderOptions;
	/** When the request started, used to log duration. */
	timeStart;
	/**
	* The route's loaded component module. Set before middleware runs; may
	* be swapped during in-flight rewrites from inside the middleware chain.
	*/
	componentInstance;
	/**
	* Slot overrides supplied by the container API. `undefined` for HTTP
	* requests — `PagesHandler` coalesces to `{}` on read so we don't
	* allocate an empty object per request.
	*/
	slots;
	/**
	* The `Response` produced by handlers, if any. Set after page
	* rendering or middleware completes.
	*/
	response;
	/**
	* Default HTTP status for the rendered response. Callers override
	* before rendering runs (e.g. `AstroHandler` sets this from
	* `BaseApp.getDefaultStatusCode`; error handlers set `404` / `500`).
	*/
	status = 200;
	/** Whether user middleware should be skipped for this request. */
	skipMiddleware = false;
	/**
	* Set to `true` when the request path was encoded too many times to fully
	* decode (see {@link validateAndDecodePathname}). These requests are
	* rejected with a `400` before middleware or routing run.
	*/
	invalidEncoding = false;
	/** A flag that tells the render content if the rewriting was triggered. */
	isRewriting = false;
	/** A safety net in case of loops (rewrite counter). */
	counter = 0;
	/** Cookies for this request. Created lazily on first access. */
	cookies;
	/** Route params derived from routeData + pathname. Computed lazily. */
	#params;
	get params() {
		if (!this.#params && this.routeData) this.#params = getParams(this.routeData, this.pathname);
		return this.#params;
	}
	set params(value) {
		this.#params = value;
	}
	/** Normalized URL for this request. */
	url;
	/** Client address for this request. */
	clientAddress;
	/** Whether this is a partial render (container API). */
	partial;
	/** Internal metadata about the current response route type. */
	responseRouteType;
	/** Internal flag to prevent rerouting this response to an error page. */
	skipErrorReroute = false;
	/** Whether to inject CSP meta tags. */
	shouldInjectCspMetaTags;
	/** Request-scoped locals object, shared with user middleware. */
	locals = {};
	/**
	* Memoized `props` (see `getProps`). `null` means "not yet computed"
	* — using `null` (rather than `undefined`) keeps the hidden class
	* stable and distinct from a valid-but-empty result.
	*/
	props = null;
	/** Memoized `ActionAPIContext` (see `getActionAPIContext`). */
	actionApiContext = null;
	/** Memoized `APIContext` (see `getAPIContext`). */
	apiContext = null;
	/** Registered context providers keyed by name. Lazy-initialized on first provide(). */
	#providers;
	/** Cached values from resolved providers. Lazy-initialized on first resolve(). */
	#providersResolvedValues;
	/** Cached promise for lazy component instance loading. */
	#componentInstancePromise;
	/** SSR result for the current page render. */
	result;
	/** Initial props (from container/error handler). */
	initialProps = {};
	/** Rewrites handler instance. Lazy-initialized on first rewrite(). */
	#rewrites;
	/** Memoized Astro page partial. */
	#astroPagePartial;
	/**
	* Locale-prefixed pathname derived from the Host header for domain-based
	* i18n routing (e.g. `/en/boats/1/foo`), or `undefined` when the request
	* isn't served from a locale-mapped domain. When set, `this.pathname` is
	* derived from it so locale/param resolution match the route pattern.
	*/
	#domainPathname;
	/** Memoized current locale. */
	#currentLocale;
	/** Memoized preferred locale. */
	#preferredLocale;
	/** Memoized preferred locale list. */
	#preferredLocaleList;
	constructor(pipeline, request, options) {
		this.pipeline = pipeline;
		this.request = request;
		options ??= getRenderOptions(request);
		this.routeData = options?.routeData;
		this.renderOptions = options ?? {
			addCookieHeader: false,
			clientAddress: void 0,
			locals: void 0,
			prerenderedErrorPageFetch: fetch,
			routeData: void 0,
			waitUntil: void 0
		};
		this.componentInstance = void 0;
		this.slots = void 0;
		const url = new URL(request.url);
		const domainPathname = computePathnameFromDomain(request, url, pipeline.manifest.i18n, pipeline.manifest.base, pipeline.manifest.trailingSlash, pipeline.logger);
		if (domainPathname) {
			this.#domainPathname = domainPathname;
			try {
				this.pathname = decodeURI(domainPathname);
			} catch {
				this.pathname = domainPathname;
			}
		} else this.pathname = this.#computePathname(url);
		this.timeStart = performance.now();
		this.clientAddress = options?.clientAddress;
		this.locals = options?.locals ?? {};
		this.url = normalizeUrl(url);
		this.cookies = new AstroCookies(request);
		if (pipeline.manifest.allowedDomains && pipeline.manifest.allowedDomains.length > 0 && !this.routeData?.prerender) this.#applyForwardedHeaders();
		if (!Reflect.get(this.request, originPathnameSymbol)) setOriginPathname(this.request, this.pathname, pipeline.manifest.trailingSlash, pipeline.manifest.buildFormat);
		this.#resolveRouteData();
	}
	/**
	* Triggers a rewrite. Delegates to the Rewrites handler.
	*/
	rewrite(payload) {
		return (this.#rewrites ??= new Rewrites()).execute(this, payload);
	}
	/**
	* Creates the SSR result for the current page render.
	*/
	async createResult(mod, ctx) {
		const pipeline = this.pipeline;
		const { clientDirectives, inlinedScripts, compressHTML, manifest, renderers, resolve } = pipeline;
		const routeData = this.routeData;
		const { links, scripts, styles } = await pipeline.headElements(routeData);
		const extraStyleHashes = [];
		const extraScriptHashes = [];
		const shouldInjectCspMetaTags = this.shouldInjectCspMetaTags ?? manifest.shouldInjectCspMetaTags;
		const cspAlgorithm = manifest.csp?.algorithm ?? "SHA-256";
		if (shouldInjectCspMetaTags) {
			for (const style of styles) extraStyleHashes.push(await generateCspDigest(style.children, cspAlgorithm));
			for (const script of scripts) extraScriptHashes.push(await generateCspDigest(script.children, cspAlgorithm));
		}
		const componentMetadata = await pipeline.componentMetadata(routeData) ?? manifest.componentMetadata;
		const headers = new Headers({ "Content-Type": "text/html" });
		const partial = typeof this.partial === "boolean" ? this.partial : Boolean(mod.partial);
		const actionResult = hasActionPayload(this.locals) ? deserializeActionResult(this.locals._actionPayload.actionResult) : void 0;
		const status = this.status;
		const response = {
			status: actionResult?.error ? actionResult?.error.status : status,
			statusText: actionResult?.error ? actionResult?.error.type : "OK",
			get headers() {
				return headers;
			},
			set headers(_) {
				throw new AstroError(AstroResponseHeadersReassigned);
			}
		};
		const state = this;
		const result = {
			base: manifest.base,
			userAssetsBase: manifest.userAssetsBase,
			cancelled: false,
			clientDirectives,
			inlinedScripts,
			componentMetadata,
			compressHTML,
			cookies: this.cookies,
			createAstro: (props, slots) => state.createAstro(result, props, slots, ctx),
			links,
			params: this.params,
			partial,
			pathname: this.pathname,
			renderers,
			resolve,
			response,
			request: this.request,
			scripts,
			styles,
			actionResult,
			async getServerIslandNameMap() {
				return (await pipeline.getServerIslands()).serverIslandNameMap ?? /* @__PURE__ */ new Map();
			},
			key: manifest.key,
			trailingSlash: manifest.trailingSlash,
			_metadata: {
				hasHydrationScript: false,
				rendererSpecificHydrationScripts: /* @__PURE__ */ new Set(),
				hasRenderedHead: false,
				renderedScripts: /* @__PURE__ */ new Set(),
				hasDirectives: /* @__PURE__ */ new Set(),
				hasRenderedServerIslandRuntime: false,
				headInTree: false,
				extraHead: [],
				extraStyleHashes,
				extraScriptHashes,
				propagators: /* @__PURE__ */ new Set(),
				routeHasPropagation: false,
				pendingSlotEvaluations: [],
				templateDepth: 0
			},
			cspDestination: manifest.csp?.cspDestination ?? (routeData.prerender ? "meta" : "header"),
			shouldInjectCspMetaTags,
			cspAlgorithm,
			scriptHashes: manifest.csp?.scriptHashes ? [...manifest.csp.scriptHashes] : [],
			scriptResources: manifest.csp?.scriptResources ? [...manifest.csp.scriptResources] : [],
			styleHashes: manifest.csp?.styleHashes ? [...manifest.csp.styleHashes] : [],
			styleResources: manifest.csp?.styleResources ? [...manifest.csp.styleResources] : [],
			directives: manifest.csp?.directives ? [...manifest.csp.directives] : [],
			isStrictDynamic: manifest.csp?.isStrictDynamic ?? false,
			internalFetchHeaders: manifest.internalFetchHeaders
		};
		this.result = result;
		return result;
	}
	/**
	* Creates the Astro global object for a component render.
	*/
	createAstro(result, props, slotValues, apiContext) {
		let astroPagePartial;
		if (this.isRewriting) this.#astroPagePartial = this.createAstroPagePartial(result, apiContext);
		this.#astroPagePartial ??= this.createAstroPagePartial(result, apiContext);
		astroPagePartial = this.#astroPagePartial;
		const astroComponentPartial = {
			props,
			self: null
		};
		const Astro = Object.assign(Object.create(astroPagePartial), astroComponentPartial);
		let _slots;
		Object.defineProperty(Astro, "slots", { get: () => {
			if (!_slots) _slots = new Slots(result, slotValues, this.pipeline.logger);
			return _slots;
		} });
		return Astro;
	}
	/**
	* Creates the Astro page-level partial (prototype for Astro global).
	*/
	createAstroPagePartial(result, apiContext) {
		const state = this;
		const { cookies, locals, params, pipeline, url } = this;
		const { response } = result;
		const redirect = (path, status = 302) => {
			if (state.request[responseSentSymbol$1]) throw new AstroError({ ...ResponseSentError });
			return new Response(null, {
				status,
				headers: { Location: path }
			});
		};
		const rewrite = async (reroutePayload) => {
			return await state.rewrite(reroutePayload);
		};
		const callAction = createCallAction(apiContext);
		const partial = {
			generator: ASTRO_GENERATOR,
			routePattern: this.routeData.route,
			isPrerendered: this.routeData.prerender,
			cookies,
			get clientAddress() {
				return state.getClientAddress();
			},
			get currentLocale() {
				return state.computeCurrentLocale();
			},
			params,
			get preferredLocale() {
				return state.computePreferredLocale();
			},
			get preferredLocaleList() {
				return state.computePreferredLocaleList();
			},
			locals,
			redirect,
			rewrite,
			request: this.request,
			response,
			site: pipeline.site,
			getActionResult: createGetActionResult(locals),
			get callAction() {
				return callAction;
			},
			url,
			get originPathname() {
				return getOriginPathname(state.request);
			},
			get csp() {
				return state.getCsp();
			},
			get logger() {
				return {
					info(msg) {
						pipeline.logger.info(null, msg);
					},
					warn(msg) {
						pipeline.logger.warn(null, msg);
					},
					error(msg) {
						pipeline.logger.error(null, msg);
					}
				};
			}
		};
		this.defineProviderGetters(partial);
		return partial;
	}
	getClientAddress() {
		const { pipeline, clientAddress } = this;
		const routeData = this.routeData;
		if (routeData.prerender) throw new AstroError({
			...PrerenderClientAddressNotAvailable,
			message: PrerenderClientAddressNotAvailable.message(routeData.component)
		});
		if (clientAddress) return clientAddress;
		if (pipeline.adapterName) throw new AstroError({
			...ClientAddressNotAvailable,
			message: ClientAddressNotAvailable.message(pipeline.adapterName)
		});
		throw new AstroError(StaticClientAddressNotAvailable);
	}
	getCookies() {
		return this.cookies;
	}
	getCsp() {
		const state = this;
		const { pipeline } = this;
		if (!pipeline.manifest.csp) {
			if (pipeline.runtimeMode === "production") pipeline.logger.warn("csp", `context.csp was used when rendering the route ${colors.green(state.routeData.route)}, but CSP was not configured. For more information, see https://docs.astro.build/en/reference/configuration-reference/#securitycsp`);
			return;
		}
		return {
			insertDirective(payload) {
				if (state.result) state.result.directives = pushDirective(state.result.directives, payload);
			},
			insertScriptResource(resource) {
				state.result?.scriptResources.push(resource);
			},
			insertStyleResource(resource) {
				state.result?.styleResources.push(resource);
			},
			insertStyleHash(hash) {
				state.result?.styleHashes.push(hash);
			},
			insertScriptHash(hash) {
				state.result?.scriptHashes.push(hash);
			}
		};
	}
	computeCurrentLocale() {
		const { url, pipeline: { i18n }, routeData } = this;
		if (!i18n || !routeData) return;
		const { defaultLocale, locales, strategy } = i18n;
		const fallbackTo = strategy === "pathname-prefix-other-locales" || strategy === "domains-prefix-other-locales" ? defaultLocale : void 0;
		if (this.#currentLocale) return this.#currentLocale;
		let computedLocale;
		if (isRouteServerIsland(routeData)) {
			let referer = this.request.headers.get("referer");
			if (referer) {
				if (URL.canParse(referer)) referer = new URL(referer).pathname;
				computedLocale = computeCurrentLocale(referer, locales, defaultLocale);
			}
		} else {
			let pathname = routeData.pathname;
			if (this.#domainPathname) pathname = this.pathname;
			else if (url && !routeData.pattern.test(url.pathname)) {
				for (const fallbackRoute of routeData.fallbackRoutes) if (fallbackRoute.pattern.test(url.pathname)) {
					pathname = fallbackRoute.pathname;
					break;
				}
			}
			pathname = pathname && !isRoute404or500(routeData) ? pathname : url.pathname ?? this.pathname;
			computedLocale = computeCurrentLocale(pathname, locales, defaultLocale);
			if (routeData.params.length > 0) {
				const localeFromParams = computeCurrentLocaleFromParams(this.params, locales);
				if (localeFromParams) computedLocale = localeFromParams;
			}
		}
		this.#currentLocale = computedLocale ?? fallbackTo;
		return this.#currentLocale;
	}
	computePreferredLocale() {
		const { pipeline: { i18n }, request } = this;
		if (!i18n) return;
		return this.#preferredLocale ??= computePreferredLocale(request, i18n.locales);
	}
	computePreferredLocaleList() {
		const { pipeline: { i18n }, request } = this;
		if (!i18n) return;
		return this.#preferredLocaleList ??= computePreferredLocaleList(request, i18n.locales);
	}
	/**
	* Lazily loads the route's component module. Returns the cached
	* instance if already loaded. The promise is cached so concurrent
	* callers share the same load.
	*/
	async loadComponentInstance() {
		if (this.componentInstance) return this.componentInstance;
		if (this.#componentInstancePromise) return this.#componentInstancePromise;
		this.#componentInstancePromise = this.pipeline.getComponentByRoute(this.routeData).then((mod) => {
			this.componentInstance = mod;
			return mod;
		});
		return this.#componentInstancePromise;
	}
	/**
	* Registers a context provider under the given key. Handlers call
	* this to contribute values to the request context (e.g. sessions).
	* The `create` factory is called lazily on the first `resolve(key)`.
	*/
	provide(key, provider) {
		(this.#providers ??= /* @__PURE__ */ new Map()).set(key, provider);
	}
	/**
	* Lazily resolves a provider registered under `key`. Calls
	* `provider.create()` on first access and caches the result.
	* Returns `undefined` if no provider was registered for the key.
	*/
	resolve(key) {
		if (this.#providersResolvedValues?.has(key)) return this.#providersResolvedValues.get(key);
		const provider = this.#providers?.get(key);
		if (!provider) return void 0;
		const value = provider.create();
		(this.#providersResolvedValues ??= /* @__PURE__ */ new Map()).set(key, value);
		return value;
	}
	/**
	* Runs all registered `finalize` callbacks. Should be called after
	* the response is produced, typically in a `finally` block.
	*
	* Returns synchronously (no promise allocation) when nothing needs
	* finalizing — important for the hot path where sessions are not used.
	*/
	finalizeAll() {
		if (!this.#providersResolvedValues || this.#providersResolvedValues.size === 0) return;
		let chain;
		for (const [key, provider] of this.#providers) if (provider.finalize && this.#providersResolvedValues.has(key)) {
			const result = provider.finalize(this.#providersResolvedValues.get(key));
			if (result) chain = chain ? chain.then(() => result) : result;
		}
		return chain;
	}
	/**
	* Adds lazy getters to `target` for each registered provider key.
	* Used by context creation (APIContext, Astro global) so that
	* provider values like `session` and `cache` appear as properties
	* without hard-coding the keys.
	*
	* Always defines a `session` getter (returning `undefined` when no
	* provider is registered) so `ctx.session` / `Astro.session` is a
	* present property regardless of whether the sessions handler was
	* included in the pipeline.
	*/
	defineProviderGetters(target) {
		const state = this;
		if (this.#providers) for (const key of this.#providers.keys()) Object.defineProperty(target, key, {
			get: () => state.resolve(key),
			enumerable: true,
			configurable: true
		});
		if (!this.#providers?.has("session")) {
			let warned = false;
			Object.defineProperty(target, "session", {
				get() {
					if (!warned) {
						warned = true;
						state.pipeline.logger.warn("session", "`Astro.session` was accessed but no session storage is configured. Either configure the storage manually or use an adapter that provides session storage. For more information, see https://docs.astro.build/en/guides/sessions/");
					}
				},
				enumerable: true,
				configurable: true
			});
		}
	}
	/**
	* Resolves the route to use for this request and stores it on
	* `this.routeData`. If the adapter (or the dev server) provided a
	* `routeData` via render options it's already set and this is a
	* no-op. Otherwise we use the app's synchronous route matcher and
	* fall back to a `404.astro` route so middleware can still run.
	*
	* Called eagerly from the constructor so individual handlers
	* (actions, pages, middleware, etc.) always see a resolved route
	* without the caller needing an extra setup step.
	*
	* Once routeData is known, finalizes `this.pathname`: in dev, if the
	* matched route has no `.html` extension, strip `.html` / `/index.html`
	* suffixes so the rendering pipeline sees the canonical pathname.
	*/
	/**
	* Strip `.html` / `/index.html` suffixes from the pathname so the
	* rendering pipeline sees the canonical route path. Only applies to
	* page routes where `.html` is framework-injected. Endpoint routes
	* preserve `.html` because any such suffix is user-provided (e.g.
	* from `getStaticPaths` params). Skipped when the matched route
	* itself has an `.html` extension in its definition.
	*/
	#stripHtmlExtension() {
		if (this.routeData && this.routeData.type === "page" && !routeHasHtmlExtension(this.routeData)) this.pathname = this.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
	}
	#resolveRouteData() {
		const pipeline = this.pipeline;
		if (this.routeData) {
			this.#stripHtmlExtension();
			return;
		}
		const matched = pipeline.matchRoute(this.pathname);
		if (matched && matched.prerender && pipeline.manifest.serverLike) if (matched.params.length > 0) {
			const allMatches = pipeline.matchAllRoutes(this.pathname);
			this.routeData = allMatches.find((r) => !r.prerender);
		} else this.routeData = void 0;
		else this.routeData = matched;
		pipeline.logger.debug("router", "Astro matched the following route for " + this.request.url);
		pipeline.logger.debug("router", "RouteData:\n" + this.routeData);
		if (!this.routeData) {
			const custom404 = getCustom404Route(pipeline.manifestData);
			if (custom404 && !custom404.prerender) this.routeData = custom404;
		}
		if (!this.routeData) {
			pipeline.logger.debug("router", "Astro hasn't found routes that match " + this.request.url);
			pipeline.logger.debug("router", "Here's the available routes:\n", pipeline.manifestData);
			return;
		}
		this.#stripHtmlExtension();
	}
	/**
	* Strips the pipeline's base from the request URL, prepends a forward
	* slash, and decodes the pathname. Falls back to the raw (not decoded)
	* pathname if `decodeURI` throws.
	*
	* Mirrors `BaseApp.removeBase`, including the
	* `collapseDuplicateLeadingSlashes` fix that prevents middleware
	* authorization bypass when the URL starts with `//`.
	*/
	#computePathname(url) {
		let pathname = collapseDuplicateLeadingSlashes(url.pathname);
		const base = this.pipeline.manifest.base;
		if (pathname.startsWith(base)) {
			const baseWithoutTrailingSlash = removeTrailingForwardSlash(base);
			pathname = pathname.slice(baseWithoutTrailingSlash.length + 1);
		}
		pathname = prependForwardSlash(pathname);
		try {
			return validateAndDecodePathname(pathname);
		} catch (e) {
			if (e instanceof MultiLevelEncodingError) {
				this.invalidEncoding = true;
				return pathname;
			}
			this.pipeline.logger.error(null, e.toString());
			return pathname;
		}
	}
	/**
	* Reads X-Forwarded-Proto, X-Forwarded-Host, and X-Forwarded-Port
	* from the request headers, validates them against the manifest's
	* `allowedDomains`, and updates `this.url` accordingly. Also resolves
	* `clientAddress` from X-Forwarded-For when the host is trusted.
	*
	* Only called when `allowedDomains` is configured — without it,
	* forwarded headers are never trusted.
	*/
	#applyForwardedHeaders() {
		const headers = this.request.headers;
		const allowedDomains = this.pipeline.manifest.allowedDomains;
		const validated = validateForwardedHeaders(getFirstForwardedValue(headers.get("x-forwarded-proto") ?? void 0), getFirstForwardedValue(headers.get("x-forwarded-host") ?? void 0), getFirstForwardedValue(headers.get("x-forwarded-port") ?? void 0), allowedDomains);
		if (!validated.protocol && !validated.host && !validated.port) return;
		if (validated.protocol) this.url.protocol = validated.protocol + ":";
		if (validated.host) {
			const colonIdx = validated.host.indexOf(":");
			if (colonIdx !== -1) {
				this.url.hostname = validated.host.slice(0, colonIdx);
				this.url.port = validated.host.slice(colonIdx + 1);
			} else {
				this.url.hostname = validated.host;
				this.url.port = "";
			}
		}
		if (validated.port) this.url.port = validated.port;
		if (validated.host !== void 0 && !this.clientAddress) {
			const forwardedFor = getFirstForwardedValue(this.request.headers.get("x-forwarded-for") ?? void 0);
			if (forwardedFor) this.clientAddress = forwardedFor;
		}
		const oldRequest = this.request;
		this.request = new Request(this.url, oldRequest);
		const app = Reflect.get(oldRequest, appSymbol);
		if (app !== void 0) Reflect.set(this.request, appSymbol, app);
	}
	/**
	* Returns the resolved `props` for this render, computing them lazily
	* from the route + component module on first access. If the
	* `initialProps` already carries user-supplied props (e.g. the
	* container API) those are used verbatim.
	*/
	async getProps() {
		if (this.props !== null) return this.props;
		if (Object.keys(this.initialProps).length > 0) {
			this.props = this.initialProps;
			return this.props;
		}
		const pipeline = this.pipeline;
		const mod = await this.loadComponentInstance();
		this.props = await getProps({
			mod,
			routeData: this.routeData,
			routeCache: pipeline.routeCache,
			pathname: this.pathname,
			logger: pipeline.logger,
			serverLike: pipeline.manifest.serverLike,
			base: pipeline.manifest.base,
			trailingSlash: pipeline.manifest.trailingSlash
		});
		return this.props;
	}
	/**
	* Returns the `ActionAPIContext` for this render, creating it lazily.
	* Used by middleware, actions, and page dispatch.
	*/
	getActionAPIContext() {
		if (this.actionApiContext !== null) return this.actionApiContext;
		const state = this;
		const ctx = {
			get cookies() {
				return state.cookies;
			},
			routePattern: this.routeData.route,
			isPrerendered: this.routeData.prerender,
			get clientAddress() {
				return state.getClientAddress();
			},
			get currentLocale() {
				return state.computeCurrentLocale();
			},
			generator: ASTRO_GENERATOR,
			get locals() {
				return state.locals;
			},
			set locals(_) {
				throw new AstroError(LocalsReassigned);
			},
			params: this.params,
			get preferredLocale() {
				return state.computePreferredLocale();
			},
			get preferredLocaleList() {
				return state.computePreferredLocaleList();
			},
			request: this.request,
			site: this.pipeline.site,
			url: this.url,
			get originPathname() {
				return getOriginPathname(state.request);
			},
			get csp() {
				return state.getCsp();
			},
			get logger() {
				return {
					info(msg) {
						state.pipeline.logger.info(null, msg);
					},
					warn(msg) {
						state.pipeline.logger.warn(null, msg);
					},
					error(msg) {
						state.pipeline.logger.error(null, msg);
					}
				};
			}
		};
		this.defineProviderGetters(ctx);
		this.actionApiContext = ctx;
		return this.actionApiContext;
	}
	/**
	* Returns the `APIContext` for this render, creating it lazily from
	* the memoized props + action context.
	*
	* Callers must ensure `getProps()` has resolved at least once before
	* calling this.
	*/
	getAPIContext() {
		if (this.apiContext !== null) return this.apiContext;
		const actionApiContext = this.getActionAPIContext();
		const state = this;
		const redirect = (path, status = 302) => new Response(null, {
			status,
			headers: { Location: path }
		});
		const rewrite = async (reroutePayload) => {
			return await state.rewrite(reroutePayload);
		};
		Reflect.set(actionApiContext, pipelineSymbol, this.pipeline);
		actionApiContext[fetchStateSymbol] = this;
		this.apiContext = Object.assign(actionApiContext, {
			props: this.props,
			redirect,
			rewrite,
			getActionResult: createGetActionResult(actionApiContext.locals),
			callAction: createCallAction(actionApiContext)
		});
		return this.apiContext;
	}
	/**
	* Invalidates the cached `APIContext` so the next `getAPIContext()`
	* call re-derives it from the (possibly mutated) state. Used
	* after an in-flight rewrite swaps the route / request / params.
	*/
	invalidateContexts() {
		this.props = null;
		this.actionApiContext = null;
		this.apiContext = null;
	}
	resetResponseMetadata() {
		this.responseRouteType = void 0;
		this.skipErrorReroute = false;
	}
};
//#endregion
export { createCrossOriginForbiddenResponse as A, hasFileExtension as B, sequence as C, routeIsFallback as D, getFallbackRoute as E, matchPattern as F, removeTrailingForwardSlash as G, joinPaths as H, appendForwardSlash as I, slash as K, collapseDuplicateLeadingSlashes as L, defineMiddleware as M, computePathnameFromDomain as N, routeIsRedirect as O, pathHasLocale as P, collapseDuplicateTrailingSlashes as R, RedirectSinglePageBuiltModule as S, getRouteGenerator as T, prependForwardSlash as U, isInternalPath as V, removeLeadingForwardSlash as W, PipelineFeatures as _, PagesHandler as a, routeComparator as b, NoopAstroCache as c, serializeActionResult as d, attachCookiesToResponse as f, Pipeline as g, ALL_PIPELINE_FEATURES as h, matchRoute as i, isForbiddenCrossOriginRequest as j, NOOP_MIDDLEWARE_FN as k, I18n as l, getSetCookiesFromResponse as m, validateHost as n, AstroMiddleware as o, getCookiesFromResponse as p, setRenderOptions as r, DisabledAstroCache as s, FetchState as t, getActionContext as u, createConsoleLogger as v, findRouteToRewrite as w, createDefaultRoutes as x, AstroIntegrationLogger as y, fileExtension as z };
