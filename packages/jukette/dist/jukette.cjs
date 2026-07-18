/*! jukette v0.5.0 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
let _remino_jukette_audio = require("@remino/jukette-audio");
//#region src/lib/jukette.ts
(0, _remino_jukette_audio.register)();
//#endregion
Object.keys(_remino_jukette_audio).forEach(function(k) {
	if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function() {
			return _remino_jukette_audio[k];
		}
	});
});
var _remino_jukette_core = require("@remino/jukette-core");
Object.keys(_remino_jukette_core).forEach(function(k) {
	if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function() {
			return _remino_jukette_core[k];
		}
	});
});
