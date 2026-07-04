//#region src/hydration/media.ts
var mediaType = "media";
/* @__NO_SIDE_EFFECTS__ */
function media(query) {
	return {
		_t: mediaType,
		_s: ({ gate, prefetch }) => {
			if (!query) return;
			const callback = prefetch ?? gate.resolve;
			const mediaQuery = window.matchMedia(query);
			const onChange = () => {
				if (mediaQuery.matches) callback();
			};
			mediaQuery.addEventListener("change", onChange);
			onChange();
			return () => mediaQuery.removeEventListener("change", onChange);
		}
	};
}
//#endregion
export { media };

//# sourceMappingURL=media.js.map