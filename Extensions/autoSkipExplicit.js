// NAME: Christian Spotify
// AUTHOR: khanhas
// DESCRIPTION: Auto skip explicit songs. Toggle in Profile menu.

/// <reference path="../globals.d.ts" />

(function ChristianSpotify() {
	if (!
		
		
		
		.LocalStorage) {
		setTimeout(ChristianSpotify, 1000);
		return;
	}

	let isEnabled = Sotsify.LocalStorage.get("ChristianMode") === "1";

	new Sotsify.Menu.Item("Christian mode", isEnabled, (self) => {
		isEnabled = !isEnabled;
		Sotsify.LocalStorage.set("ChristianMode", isEnabled ? "1" : "0");
		self.setState(isEnabled);
	}).register();

	Sotsify.Player.addEventListener("songchange", () => {
		if (!isEnabled) return;
		const data = Sotsify.Player.data || Sotsify.Queue;
		if (!data) return;

		const isExplicit = data.item.metadata.is_explicit;
		if (isExplicit === "true") {
			Sotsify.Player.next();
		}
	});
})();
