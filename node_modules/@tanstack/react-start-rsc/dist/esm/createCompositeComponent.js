import { RSC_SLOT_USAGES_STREAM, SERVER_COMPONENT_STREAM } from "./ServerComponentTypes.js";
import { ReplayableStream } from "./ReplayableStream.js";
import { createRscCssEnvelope } from "./rscCssEnvelope.js";
import { sanitizeSlotArgs } from "./slotUsageSanitizer.js";
import { ClientSlot } from "./ClientSlot.js";
import { createElement } from "react";
import { renderToReadableStream } from "virtual:tanstack-rsc-runtime";
import { getRequest } from "@tanstack/start-server-core";
import { getStartContext } from "@tanstack/start-storage-context";
//#region src/createCompositeComponent.ts
/**
* Creates a composite server component with slot support.
*
* Supports returning:
* - A ReactNode directly
* - An object structure with ReactNodes: accessed as `src.Foo`
* - Nested structures: accessed as `src.x.Bar`
*
* Props that are functions become slots - they render as ClientSlot placeholders
* in the RSC output, filled in by the consumer with actual implementations.
*
* The returned value is NOT directly renderable. Use `<CompositeComponent src={...} />`.
*
* @example
* ```tsx
* const src = await createCompositeComponent((props) => (
*   <div>
*     <header>{props.header('Dashboard')}</header>
*     <main>{props.children}</main>
*   </div>
* ))
*
* // In route component
* return (
*   <CompositeComponent src={src} header={(title) => <h1>{title}</h1>}>
*     <p>Main content</p>
*   </CompositeComponent>
* )
* ```
*/
async function createCompositeComponent(component, options) {
	const isDev = process.env.NODE_ENV === "development";
	const slotUsagesEmitter = isDev ? createReadableStreamEmitter() : null;
	const { proxy: proxyProps } = createSlotProxy({ onSlotCall: slotUsagesEmitter ? (name, args) => {
		const sanitizedArgs = sanitizeSlotArgs(args);
		slotUsagesEmitter.emit({
			slot: name,
			args: sanitizedArgs.length ? sanitizedArgs : void 0
		});
	} : void 0 });
	async function ServerComponentWrapper() {
		return createRscCssEnvelope(await component(proxyProps), options);
	}
	const flightStream = renderToReadableStream(createElement(ServerComponentWrapper));
	const isRouterRequest = getStartContext({ throwIfNotFound: false })?.handlerType === "router";
	const ssrHandler = globalThis.__RSC_SSR__;
	if (isRouterRequest && ssrHandler) {
		const signal = getRequest().signal;
		const stream = new ReplayableStream(flightStream, { signal });
		const decoded = await ssrHandler.decode(stream);
		slotUsagesEmitter?.close();
		return ssrHandler.createCompositeProxy(stream, decoded, slotUsagesEmitter?.stream);
	}
	return createCompositeHandle(isDev && slotUsagesEmitter ? wrapReadableStream(flightStream, {
		onDone: () => {
			slotUsagesEmitter.close();
		},
		onCancel: () => {
			slotUsagesEmitter.close();
		},
		onError: () => {
			slotUsagesEmitter.close();
		}
	}) : flightStream, { slotUsagesStream: slotUsagesEmitter?.stream });
}
/**
* Creates a composite handle for server function responses.
* No proxy needed - the client will decode and create its own proxy.
*/
function createCompositeHandle(flightStream, options) {
	const streamWrapper = { createReplayStream: () => flightStream };
	const stub = function CompositeComponentStub() {
		throw new Error("CompositeComponent from server function cannot be rendered on server. It should be serialized and sent to the client.");
	};
	stub[SERVER_COMPONENT_STREAM] = streamWrapper;
	if (options?.slotUsagesStream) stub[RSC_SLOT_USAGES_STREAM] = options.slotUsagesStream;
	return stub;
}
/**
* Proxy that turns property access into ClientSlot renders.
* Also tracks accessed slot names for devtools.
*/
function createSlotProxy(options) {
	const cache = /* @__PURE__ */ new Map();
	return { proxy: new Proxy({}, { get(_target, prop) {
		if (prop === "then" || typeof prop !== "string") return void 0;
		if (prop === "children") {
			options?.onSlotCall?.("children", []);
			return createElement(ClientSlot, {
				slot: "children",
				args: []
			});
		}
		let fn = cache.get(prop);
		if (!fn) {
			fn = (...args) => {
				options?.onSlotCall?.(prop, args);
				return createElement(ClientSlot, {
					slot: prop,
					args
				});
			};
			cache.set(prop, fn);
		}
		return fn;
	} }) };
}
function createReadableStreamEmitter() {
	let closed = false;
	const queue = [];
	let controller = null;
	const stream = new ReadableStream({
		start(ctrl) {
			controller = ctrl;
			for (const value of queue) try {
				ctrl.enqueue(value);
			} catch {}
			queue.length = 0;
			if (closed) try {
				ctrl.close();
			} catch {}
		},
		cancel() {
			closed = true;
			controller = null;
			queue.length = 0;
		}
	});
	const emit = (value) => {
		if (closed) return;
		if (!controller) {
			queue.push(value);
			return;
		}
		try {
			controller.enqueue(value);
		} catch {}
	};
	const close = () => {
		if (closed) return;
		closed = true;
		if (controller) {
			try {
				controller.close();
			} catch {}
			controller = null;
		}
	};
	return {
		stream,
		emit,
		close
	};
}
function wrapReadableStream(source, handlers) {
	const reader = source.getReader();
	let finished = false;
	const finish = () => {
		if (finished) return;
		finished = true;
		handlers.onDone?.();
		try {
			reader.releaseLock();
		} catch {}
	};
	return new ReadableStream({
		async pull(controller) {
			try {
				const { value, done } = await reader.read();
				if (done) {
					controller.close();
					finish();
					return;
				}
				controller.enqueue(value);
			} catch (err) {
				try {
					controller.error(err);
				} catch {}
				handlers.onError?.();
				finish();
			}
		},
		async cancel(reason) {
			handlers.onCancel?.();
			try {
				await reader.cancel(reason);
			} catch {}
			finish();
		}
	});
}
//#endregion
export { createCompositeComponent };

//# sourceMappingURL=createCompositeComponent.js.map