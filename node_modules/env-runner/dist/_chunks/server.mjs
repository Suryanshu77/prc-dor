import { watch } from "node:fs";
var RunnerManager = class {
	_runner;
	_messageQueue = [];
	_messageListeners = /* @__PURE__ */ new Set();
	_closed = false;
	_reloading = false;
	_moduleInvalidated = false;
	_pendingModuleReload;
	_closeListeners = /* @__PURE__ */ new Set();
	_readyListeners = /* @__PURE__ */ new Set();
	constructor(runner) {
		if (runner) this._attach(runner);
	}
	get ready() {
		return this._runner?.ready ?? false;
	}
	get closed() {
		return this._closed;
	}
	async reload(runner) {
		this._reloading = true;
		try {
			runner ??= await this._createRunner();
			const prev = this._runner;
			this._detach();
			this._attach(runner);
			this._moduleInvalidated = false;
			if (prev) await prev.close();
		} finally {
			this._reloading = false;
		}
	}
	_createRunner() {
		throw new Error("reload() requires a runner argument (this manager has no runner factory)");
	}
	fetch = (input, init) => this._fetch(input, init);
	async _fetch(input, init) {
		const runner = await this._waitForRunner();
		if (!runner) return new Response("Runner is unavailable", { status: 503 });
		if (this._moduleInvalidated) await this._flushInvalidation(runner);
		return runner.fetch(input, init);
	}
	_flushInvalidation(runner) {
		this._pendingModuleReload ??= Promise.resolve(runner.reloadModule?.()).then(() => {
			this._moduleInvalidated = false;
		}).finally(() => {
			this._pendingModuleReload = void 0;
		});
		return this._pendingModuleReload;
	}
	upgrade = (context) => {
		this._runner?.upgrade?.(context);
	};
	sendMessage(message) {
		if (!this._runner || !this._runner.ready) {
			this._messageQueue.push(message);
			return;
		}
		this._runner.sendMessage(message);
	}
	onMessage(listener) {
		this._messageListeners.add(listener);
		this._runner?.onMessage(listener);
	}
	offMessage(listener) {
		this._messageListeners.delete(listener);
		this._runner?.offMessage(listener);
	}
	waitForReady(timeout = 5e3) {
		if (this.ready) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this._messageListeners.delete(listener);
				reject(/* @__PURE__ */ new Error("Runner did not become ready in time"));
			}, timeout);
			const listener = (message) => {
				if (message?.address || this.ready) {
					clearTimeout(timer);
					this._messageListeners.delete(listener);
					resolve();
				}
			};
			this._messageListeners.add(listener);
		});
	}
	rpc(name, data, opts) {
		const id = Math.random().toString(36).slice(2);
		const timeout = opts?.timeout ?? 3e3;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				cleanup();
				reject(/* @__PURE__ */ new Error(`RPC "${name}" timed out`));
			}, timeout);
			const listener = (msg) => {
				if (msg?.__rpc_id === id) {
					cleanup();
					if (msg.error) reject(typeof msg.error === "string" ? new Error(msg.error) : msg.error);
					else resolve(msg.data);
				}
			};
			const cleanup = () => {
				clearTimeout(timer);
				this.offMessage(listener);
			};
			this.onMessage(listener);
			this.sendMessage({
				__rpc: name,
				__rpc_id: id,
				data
			});
		});
	}
	async reloadModule(timeout) {
		if (!this._runner?.reloadModule) throw new Error("Active runner does not support reloadModule()");
		await this._runner.reloadModule(timeout);
		this._moduleInvalidated = false;
	}
	async invalidateModule(specifier, timeout) {
		if (!this._runner?.invalidateModule) throw new Error("Active runner does not support invalidateModule()");
		await this._runner.invalidateModule(specifier, timeout);
		this._moduleInvalidated = true;
	}
	async close() {
		this._closed = true;
		this._messageQueue.length = 0;
		const runner = this._runner;
		this._detach();
		if (runner) await runner.close();
	}
	async [Symbol.asyncDispose]() {
		await this.close();
	}
	onClose(listener) {
		this._closeListeners.add(listener);
	}
	offClose(listener) {
		this._closeListeners.delete(listener);
	}
	onReady(listener) {
		this._readyListeners.add(listener);
	}
	offReady(listener) {
		this._readyListeners.delete(listener);
	}
	_internalListener = (message) => {
		if (message?.address) {
			this._flushQueue();
			for (const fn of this._readyListeners) fn(this, message.address);
		}
	};
	_attach(runner) {
		this._runner = runner;
		runner.onMessage(this._internalListener);
		for (const listener of this._messageListeners) runner.onMessage(listener);
		const originalClose = runner.close.bind(runner);
		runner.close = async () => {
			await originalClose();
			if (this._runner === runner) {
				this._runner = void 0;
				for (const fn of this._closeListeners) fn(this);
			}
		};
		if (runner.ready) this._flushQueue();
	}
	_detach() {
		const runner = this._runner;
		if (!runner) return;
		this._runner = void 0;
		runner.offMessage(this._internalListener);
		for (const listener of this._messageListeners) runner.offMessage(listener);
	}
	_waitForRunner(timeout = 3e3) {
		if (this._runner) return Promise.resolve(this._runner);
		if (!this._reloading) return Promise.resolve(void 0);
		return new Promise((resolve) => {
			const start = Date.now();
			const check = () => {
				if (this._runner) return resolve(this._runner);
				if (this._closed || Date.now() - start >= timeout) return resolve(void 0);
				setTimeout(check, 50);
			};
			setTimeout(check, 50);
		});
	}
	_flushQueue() {
		if (!this._runner || this._messageQueue.length === 0) return;
		const queue = [...this._messageQueue];
		this._messageQueue.length = 0;
		for (const msg of queue) this._runner.sendMessage(msg);
	}
};
const loaders = {
	"node-worker": () => import("env-runner/runners/node-worker").then((m) => m.NodeWorkerEnvRunner),
	"node-process": () => import("env-runner/runners/node-process").then((m) => m.NodeProcessEnvRunner),
	"bun-process": () => import("env-runner/runners/bun-process").then((m) => m.BunProcessEnvRunner),
	"deno-process": () => import("env-runner/runners/deno-process").then((m) => m.DenoProcessEnvRunner),
	self: () => import("env-runner/runners/self").then((m) => m.SelfEnvRunner),
	miniflare: () => import("env-runner/runners/miniflare").then((m) => m.MiniflareEnvRunner),
	vercel: () => import("env-runner/runners/vercel").then((m) => m.VercelEnvRunner),
	netlify: () => import("env-runner/runners/netlify").then((m) => m.NetlifyEnvRunner)
};
async function loadRunner(runner, opts) {
	return new (await (loaders[runner]()))(opts);
}
var EnvServer = class extends RunnerManager {
	_opts;
	_watchers = [];
	_reloadTimeout;
	_reloadListeners = /* @__PURE__ */ new Set();
	_startPromise;
	runner = null;
	onReload(listener) {
		this._reloadListeners.add(listener);
	}
	offReload(listener) {
		this._reloadListeners.delete(listener);
	}
	constructor(opts) {
		super();
		this._opts = opts;
	}
	start() {
		this._startPromise ??= this._start().catch((error) => {
			this._startPromise = void 0;
			throw error;
		});
		return this._startPromise;
	}
	async reload(runner) {
		this.runner = runner ?? await this._createRunner();
		await super.reload(this.runner);
	}
	async close() {
		this._stopWatching();
		await super.close();
	}
	async _fetch(input, init) {
		if (!this.closed) await this.start();
		return super._fetch(input, init);
	}
	async _start() {
		await this.reload();
		if (this._opts.watch) this._startWatching();
		return this;
	}
	async _createRunner() {
		return loadRunner(this._opts.runner || "node-worker", {
			name: this._opts.name || this._opts.entry,
			hooks: this._opts.hooks,
			data: {
				...this._opts.data,
				entry: this._opts.entry
			},
			execArgv: this._opts.execArgv
		});
	}
	_startWatching() {
		const paths = [this._opts.entry, ...this._opts.watchPaths || []];
		for (const path of paths) try {
			const watcher = watch(path, { recursive: true }, () => {
				this._scheduleReload();
			});
			this._watchers.push(watcher);
		} catch {}
	}
	_stopWatching() {
		clearTimeout(this._reloadTimeout);
		for (const watcher of this._watchers) watcher.close();
		this._watchers.length = 0;
	}
	_scheduleReload() {
		clearTimeout(this._reloadTimeout);
		this._reloadTimeout = setTimeout(async () => {
			try {
				await this.reload();
				for (const fn of this._reloadListeners) fn();
			} catch (error) {
				console.error("Failed to reload runner:", error);
			}
		}, 100);
	}
};
export { EnvServer, RunnerManager, loadRunner };
