SotsifyHomeConfig = {};

(async () => {
	// Status enum
	const NORMAL = 0;
	const STICKY = 1;
	const LOWERED = 2;
	// List of sections' metadata
	let list;
	// Store sections' statuses
	const statusDic = {};
	let mounted = false;

	SotsifyHomeConfig.arrange = (sections) => {
		mounted = true;
		if (list) {
			return list;
		}
		const stickList = (localStorage.getItem("Sotsify-home-config:stick") || "").split(",");
		const lowList = (localStorage.getItem("Sotsify-home-config:low") || "").split(",");
		const stickSections = [];
		const lowSections = [];
		for (const uri of stickList) {
			const index = sections.findIndex((a) => a?.uri === uri || a?.item?.uri === uri);
			if (index !== -1) {
				const item = sections[index];
				const uri = item.item.uri || item.uri;
				statusDic[uri] = STICKY;
				stickSections.push(item);
				sections[index] = undefined;
			}
		}
		for (const uri of lowList) {
			const index = sections.findIndex((a) => a?.uri === uri || a?.item?.uri === uri);
			if (index !== -1) {
				const item = sections[index];
				const uri = item.item.uri || item.uri;
				statusDic[uri] = LOWERED;
				lowSections.push(item);
				sections[index] = undefined;
			}
		}

		list = [...stickSections, ...sections.filter(Boolean), ...lowSections];
		return list;
	};

	const up = document.createElement("button");
	up.innerText = "Up";
	const down = document.createElement("button");
	down.innerText = "Down";
	const lower = document.createElement("button");
	const stick = document.createElement("button");
	const sectionStyle = document.createElement("style");
	sectionStyle.innerHTML = `
.main-home-content section {
	order: 0 !important;
}
`;
	const containerStyle = document.createElement("style");
	containerStyle.innerHTML = `
#Sotsify-home-config {
    position: relative;
    width: 100%;
    height: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 5px;
    z-index: 9999;
}
#Sotsify-home-config button {
    min-width: 60px;
    height: 40px;
    border-radius: 3px;
    background-color: var(--spice-main);
    color: var(--spice-text);
    border: 1px solid var(--spice-text);
}
#Sotsify-home-config button:disabled {
    color: var(--spice-button-disabled);
}
`;

	const container = document.createElement("div");
	container.id = "Sotsify-home-config";
	container.append(containerStyle, up, down, lower, stick);
	document.head.append(sectionStyle);
	let elem = [];

	function injectInteraction() {
		const main = document.querySelector(".main-home-content");
		elem = [...main.querySelectorAll("section")];
		for (const [index, item] of elem.entries()) {
			item.dataset.uri = list[index].uri ?? list[index].item.uri;
		}

		function appendItems() {
			const stick = [];
			const low = [];
			const normal = [];
			for (const el of elem) {
				if (statusDic[el.dataset.uri] === STICKY) stick.push(el);
				else if (statusDic[el.dataset.uri] === LOWERED) low.push(el);
				else normal.push(el);
			}

			localStorage.setItem(
				"Sotsify-home-config:stick",
				stick.map((a) => a.dataset.uri)
			);
			localStorage.setItem(
				"Sotsify-home-config:low",
				low.map((a) => a.dataset.uri)
			);

			elem = [...stick, ...normal, ...low];
			main.append(...elem);
		}

		function onSwap(item, dir) {
			container.remove();
			const curPos = elem.findIndex((e) => e === item);
			const newPos = curPos + dir;
			if (newPos < 0 || newPos > elem.length - 1) return;

			[elem[curPos], elem[newPos]] = [elem[newPos], elem[curPos]];
			[list[curPos], list[newPos]] = [list[newPos], list[curPos]];
			appendItems();
		}

		function onChangeStatus(item, status) {
			container.remove();
			const isToggle = statusDic[item.dataset.uri] === status;
			statusDic[item.dataset.uri] = isToggle ? NORMAL : status;
			appendItems();
		}

		for (const el of elem) {
			el.onmouseover = () => {
				const status = statusDic[el.dataset.uri];
				const index = elem.findIndex((a) => a === el);

				if (!status || index === 0 || status !== statusDic[elem[index - 1]?.dataset.uri]) {
					up.disabled = true;
				} else {
					up.disabled = false;
					up.onclick = () => onSwap(el, -1);
				}

				if (!status || index === elem.length - 1 || status !== statusDic[elem[index + 1]?.dataset.uri]) {
					down.disabled = true;
				} else {
					down.disabled = false;
					down.onclick = () => onSwap(el, 1);
				}

				stick.innerText = status === STICKY ? "Unstick" : "Stick";
				lower.innerText = status === LOWERED ? "Unlower" : "Lower";
				lower.onclick = () => onChangeStatus(el, LOWERED);
				stick.onclick = () => onChangeStatus(el, STICKY);

				el.prepend(container);
			};
		}
	}

	function removeInteraction() {
		container.remove();
		for (const a of elem) {
			a.onmouseover = undefined;
		}
	}

	await new Promise((res) => Sotsify.Events.webpackLoaded.on(res));

	SotsifyHomeConfig.menu = new Sotsify.Menu.Item(
		"Home config",
		false,
		(self) => {
			self.setState(!self.isEnabled);
			if (self.isEnabled) {
				injectInteraction();
			} else {
				removeInteraction();
			}
		},
		Sotsify.SVGIcons["grid-view"]
	);

	SotsifyHomeConfig.addToMenu = () => {
		SotsifyHomeConfig.menu.register();
	};
	SotsifyHomeConfig.removeMenu = () => {
		SotsifyHomeConfig.menu.setState(false);
		SotsifyHomeConfig.menu.deregister();
	};

	await new Promise((res) => Sotsify.Events.platformLoaded.on(res));
	// Init
	if (Sotsify.Platform.History.location.pathname === "/") {
		SotsifyHomeConfig.addToMenu();
	}

	Sotsify.Platform.History.listen(({ pathname }) => {
		if (pathname === "/") {
			SotsifyHomeConfig.addToMenu();
		} else {
			SotsifyHomeConfig.removeMenu();
		}
	});
})();
