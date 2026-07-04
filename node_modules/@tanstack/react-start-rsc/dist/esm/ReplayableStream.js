//#region src/ReplayableStream.ts
var REPLAYABLE_STREAM_MARKER = Symbol.for("tanstack.rsc.ReplayableStream");
var ReplayableStream = class {
	constructor(source, options = {}) {
		this.source = source;
		this.options = options;
		this[REPLAYABLE_STREAM_MARKER] = true;
		this.chunks = [];
		this.done = false;
		this.error = null;
		this.waiter = null;
		this.aborted = false;
		this.released = false;
		this.sourceReader = null;
		this.abortListener = null;
		this.abortSignal = options.signal;
		this.start();
	}
	start() {
		const signal = this.abortSignal;
		if (signal?.aborted) {
			this.handleAbort();
			return;
		}
		const onAbort = () => this.handleAbort();
		this.abortListener = onAbort;
		signal?.addEventListener("abort", onAbort, { once: true });
		const reader = this.source.getReader();
		this.sourceReader = reader;
		const pump = async () => {
			try {
				while (!this.aborted && !this.released) {
					const { done, value } = await reader.read();
					if (done) break;
					if (this.aborted || this.released) break;
					this.chunks.push(value);
					this.notify();
				}
				this.done = true;
			} catch (err) {
				if (!this.aborted && !this.released) this.error = err;
				this.done = true;
			} finally {
				this.detachAbortListener();
				try {
					reader.releaseLock();
				} catch {}
				if (this.sourceReader === reader) this.sourceReader = null;
				this.notify();
			}
		};
		pump();
	}
	detachAbortListener() {
		const signal = this.abortSignal;
		const listener = this.abortListener;
		if (signal && listener) signal.removeEventListener("abort", listener);
		this.abortListener = null;
	}
	cancelSource(reason) {
		const reader = this.sourceReader;
		this.sourceReader = null;
		try {
			reader?.cancel(reason).catch(() => {});
		} catch {}
	}
	handleAbort() {
		if (this.aborted) return;
		this.aborted = true;
		this.done = true;
		const reason = this.abortSignal?.reason ?? /* @__PURE__ */ new Error("ReplayableStream aborted");
		this.detachAbortListener();
		this.abortSignal = void 0;
		this.cancelSource(reason);
		this.chunks = [];
		this.released = true;
		this.notify();
	}
	notify() {
		if (this.waiter) {
			this.waiter.resolve();
			this.waiter = null;
		}
	}
	wait() {
		if (this.done || this.released) return Promise.resolve();
		if (!this.waiter) this.waiter = Promise.withResolvers();
		return this.waiter.promise;
	}
	/**
	* Explicitly release buffered chunks.
	* Call this when you know no more replay streams will be created.
	* After calling release(), createReplayStream() will return empty streams.
	*/
	release() {
		if (this.released) return;
		this.released = true;
		this.chunks = [];
		this.detachAbortListener();
		this.abortSignal = void 0;
		this.cancelSource(/* @__PURE__ */ new Error("ReplayableStream released"));
		this.notify();
	}
	/**
	* Check if the stream data has been released
	*/
	isReleased() {
		return this.released;
	}
	/**
	* Create an independent replay stream. Each call returns a fresh reader
	* that starts from the beginning of the buffered data.
	*
	* If the stream has been released, returns a stream that closes immediately.
	*/
	createReplayStream() {
		if (this.released) return new ReadableStream({ start(controller) {
			controller.close();
		} });
		let index = 0;
		return new ReadableStream({
			pull: async (controller) => {
				while (true) {
					if (this.released) {
						controller.close();
						return;
					}
					if (index < this.chunks.length) {
						controller.enqueue(this.chunks[index++]);
						return;
					}
					if (this.done) {
						if (this.error && !this.aborted) controller.error(this.error);
						else controller.close();
						return;
					}
					await this.wait();
				}
			},
			cancel: () => {}
		});
	}
};
//#endregion
export { ReplayableStream };

//# sourceMappingURL=ReplayableStream.js.map