import { AsyncLocalStorage } from "node:async_hooks";
import { H3Event, clearSession as clearSession$1, deleteCookie as deleteCookie$1, getRequestHost as getRequestHost$1, getRequestIP as getRequestIP$1, getRequestProtocol as getRequestProtocol$1, getRequestURL, getSession as getSession$1, getValidatedQuery as getValidatedQuery$1, parseCookies, sanitizeStatusCode, sanitizeStatusMessage, sealSession as sealSession$1, setCookie as setCookie$1, toResponse, unsealSession as unsealSession$1, updateSession as updateSession$1, useSession as useSession$1 } from "h3-v2";
//#region src/request-response.ts
var GLOBAL_EVENT_STORAGE_KEY = Symbol.for("tanstack-start:event-storage");
var globalObj = globalThis;
if (!globalObj[GLOBAL_EVENT_STORAGE_KEY]) globalObj[GLOBAL_EVENT_STORAGE_KEY] = new AsyncLocalStorage();
var eventStorage = globalObj[GLOBAL_EVENT_STORAGE_KEY];
function isPromiseLike(value) {
	return typeof value.then === "function";
}
function getSetCookieValues(headers) {
	const headersWithSetCookie = headers;
	if (typeof headersWithSetCookie.getSetCookie === "function") return headersWithSetCookie.getSetCookie();
	const value = headers.get("set-cookie");
	return value ? [value] : [];
}
function mergeEventResponseHeaders(response, event) {
	if (response.ok) return;
	const eventSetCookies = getSetCookieValues(event.res.headers);
	if (eventSetCookies.length === 0) return;
	const responseSetCookies = getSetCookieValues(response.headers);
	response.headers.delete("set-cookie");
	for (const cookie of responseSetCookies) response.headers.append("set-cookie", cookie);
	for (const cookie of eventSetCookies) response.headers.append("set-cookie", cookie);
}
function attachResponseHeaders(value, event) {
	if (isPromiseLike(value)) return value.then((resolved) => {
		if (resolved instanceof Response) mergeEventResponseHeaders(resolved, event);
		return resolved;
	});
	if (value instanceof Response) mergeEventResponseHeaders(value, event);
	return value;
}
function requestHandler(handler) {
	return (request, requestOpts) => {
		let h3Event;
		try {
			h3Event = new H3Event(request);
		} catch (error) {
			if (error instanceof URIError) return new Response(null, {
				status: 400,
				statusText: "Bad Request"
			});
			throw error;
		}
		return toResponse(attachResponseHeaders(eventStorage.run({ h3Event }, () => handler(request, requestOpts)), h3Event), h3Event);
	};
}
function getH3Event() {
	const event = eventStorage.getStore();
	if (!event) throw new Error(`No StartEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
	return event.h3Event;
}
function getRequest() {
	return getH3Event().req;
}
function getRequestHeaders() {
	return getH3Event().req.headers;
}
function getRequestHeader(name) {
	return getRequestHeaders().get(name) || void 0;
}
function getRequestIP(opts) {
	return getRequestIP$1(getH3Event(), opts);
}
/**
* Get the request hostname.
*
* If `xForwardedHost` is `true`, it will use the `x-forwarded-host` header if it exists.
*
* If no host header is found, it will default to "localhost".
*/
function getRequestHost(opts) {
	return getRequestHost$1(getH3Event(), opts);
}
/**
* Get the full incoming request URL.
*
* If `xForwardedHost` is `true`, it will use the `x-forwarded-host` header if it exists.
*
* If `xForwardedProto` is `false`, it will not use the `x-forwarded-proto` header.
*/
function getRequestUrl(opts) {
	return getRequestURL(getH3Event(), opts);
}
/**
* Get the request protocol.
*
* If `x-forwarded-proto` header is set to "https", it will return "https". You can disable this behavior by setting `xForwardedProto` to `false`.
*
* If protocol cannot be determined, it will default to "http".
*/
function getRequestProtocol(opts) {
	return getRequestProtocol$1(getH3Event(), opts);
}
function setResponseHeaders(headers) {
	const event = getH3Event();
	for (const [name, value] of Object.entries(headers)) event.res.headers.set(name, value);
}
function getResponseHeaders() {
	return getH3Event().res.headers;
}
function getResponseHeader(name) {
	return getH3Event().res.headers.get(name) || void 0;
}
function setResponseHeader(name, value) {
	const event = getH3Event();
	if (Array.isArray(value)) {
		event.res.headers.delete(name);
		for (const valueItem of value) event.res.headers.append(name, valueItem);
	} else event.res.headers.set(name, value);
}
function removeResponseHeader(name) {
	getH3Event().res.headers.delete(name);
}
function clearResponseHeaders(headerNames) {
	const event = getH3Event();
	if (headerNames && headerNames.length > 0) for (const name of headerNames) event.res.headers.delete(name);
	else for (const name of event.res.headers.keys()) event.res.headers.delete(name);
}
function getResponseStatus() {
	return getH3Event().res.status || 200;
}
function setResponseStatus(code, text) {
	const event = getH3Event();
	if (code) event.res.status = sanitizeStatusCode(code, event.res.status);
	if (text) event.res.statusText = sanitizeStatusMessage(text);
}
/**
* Parse the request to get HTTP Cookie header string and return an object of all cookie name-value pairs.
* @returns Object of cookie name-value pairs
* ```ts
* const cookies = getCookies()
* ```
*/
function getCookies() {
	const cookies = parseCookies(getH3Event());
	const definedCookies = Object.create(null);
	for (const [name, value] of Object.entries(cookies)) if (value !== void 0) definedCookies[name] = value;
	return definedCookies;
}
/**
* Get a cookie value by name.
* @param name Name of the cookie to get
* @returns {*} Value of the cookie (String or undefined)
* ```ts
* const authorization = getCookie('Authorization')
* ```
*/
function getCookie(name) {
	return getCookies()[name];
}
/**
* Set a cookie value by name.
* @param name Name of the cookie to set
* @param value Value of the cookie to set
* @param options {CookieSerializeOptions} Options for serializing the cookie
* ```ts
* setCookie('Authorization', '1234567')
* ```
*/
function setCookie(name, value, options) {
	setCookie$1(getH3Event(), name, value, options);
}
/**
* Remove a cookie by name.
* @param name Name of the cookie to delete
* @param serializeOptions {CookieSerializeOptions} Cookie options
* ```ts
* deleteCookie('SessionId')
* ```
*/
function deleteCookie(name, options) {
	deleteCookie$1(getH3Event(), name, options);
}
function getDefaultSessionConfig(config) {
	return {
		name: "start",
		...config
	};
}
/**
* Create a session manager for the current request.
*/
function useSession(config) {
	return useSession$1(getH3Event(), getDefaultSessionConfig(config));
}
/**
* Get the session for the current request
*/
function getSession(config) {
	return getSession$1(getH3Event(), getDefaultSessionConfig(config));
}
/**
* Update the session data for the current request.
*/
function updateSession(config, update) {
	return updateSession$1(getH3Event(), getDefaultSessionConfig(config), update);
}
/**
* Encrypt and sign the session data for the current request.
*/
function sealSession(config) {
	return sealSession$1(getH3Event(), getDefaultSessionConfig(config));
}
/**
* Decrypt and verify the session data for the current request.
*/
function unsealSession(config, sealed) {
	return unsealSession$1(getH3Event(), getDefaultSessionConfig(config), sealed);
}
/**
* Clear the session data for the current request.
*/
function clearSession(config) {
	return clearSession$1(getH3Event(), {
		name: "start",
		...config
	});
}
function getResponse() {
	return getH3Event().res;
}
function getValidatedQuery(schema) {
	return getValidatedQuery$1(getH3Event(), schema);
}
//#endregion
export { clearResponseHeaders, clearSession, deleteCookie, getCookie, getCookies, getRequest, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestProtocol, getRequestUrl, getResponse, getResponseHeader, getResponseHeaders, getResponseStatus, getSession, getValidatedQuery, removeResponseHeader, requestHandler, sealSession, setCookie, setResponseHeader, setResponseHeaders, setResponseStatus, unsealSession, updateSession, useSession };

//# sourceMappingURL=request-response.js.map