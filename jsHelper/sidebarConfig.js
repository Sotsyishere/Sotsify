(function SidebarConfig() {
	const sidebar = document.querySelector(".Root__nav-bar");
	if (!sidebar) return setTimeout(SidebarConfig, 100);
	let isGlobalNavbar = false;
	// Status enum
	const HIDDEN = 0;
	const SHOW = 1;
	const STICKY = 2;
	// Store sidebar buttons elements
	let appItems;
	let list;
	let hiddenList;

	let YLXSidebarState = 0;

	// Store sidebar buttons
	let buttons = [];
	let ordered = [];

	function arrangeItems(storage) {
		const newButtons = [...buttons];
		const orderedButtons = [];
		for (const ele of storage) {
			const index = newButtons.findIndex((a) => ele[0] === a?.dataset.id);
			if (index !== -1) {
				orderedButtons.push([newButtons[index], ele[1]]);
				newButtons[index] = undefined;
			}
		}
		for (const button of newButtons) {
			if (button) orderedButtons.push([button, SHOW]);
		}
		ordered = orderedButtons;
	}

	function appendItems() {
		const toShow = [];
		const toHide = [];
		const toStick = [];
		for (const el of ordered) {
			const [item, status] = el;
			if (status === STICKY) {
				appItems.append(item);
				toStick.push(el);
			} else if (status === SHOW) {
				list.append(item);
				toShow.push(el);
			} else {
				hiddenList.append(item);
				toHide.push(el);
			}
		}
		ordered = [...toStick, ...toShow, ...toHide];
	}

	function writeStorage() {
		const array = ordered.map((a) => [a[0].dataset.id, a[1]]);

		return localStorage.setItem("Sotsify-sidebar-config:ylx", JSON.stringify(array));
	}

	const container = document.createElement("div");
	container.id = "Sotsify-sidebar-config";
	const up = document.createElement("button");
	up.innerText = "Up";
	const down = document.createElement("button");
	down.innerText = "Down";
	const hide = document.createElement("button");
	const stick = document.createElement("button");
	const style = document.createElement("style");
	style.innerHTML = `
#Sotsify-hidden-list {
background-color: rgba(var(--spice-rgb-main), .3);
}
#Sotsify-sidebar-config {
position: relative;
width: 100%;
height: 0;
display: flex;
justify-content: space-evenly;
align-items: center;
top: -20px;
left: 0;
}
#Sotsify-sidebar-config button {
min-width: 60px;
border-radius: 3px;
background-color: var(--spice-main);
color: var(--spice-text);
border: 1px solid var(--spice-text);
}
#Sotsify-sidebar-config button:disabled {
color: var(--spice-button-disabled);
}
`;
	container.append(style, up, down, hide, stick);

	function injectInteraction() {
		function onSwap(item, dir) {
			container.remove();
			const curPos = ordered.findIndex((e) => e[0] === item);
			const newPos = curPos + dir;
			if (newPos < 0 || newPos > ordered.length - 1) return;

			[ordered[curPos], ordered[newPos]] = [ordered[newPos], ordered[curPos]];
			appendItems();
		}

		function onChangeStatus(item, status) {
			container.remove();
			const curPos = ordered.findIndex((e) => e[0] === item);
			ordered[curPos][1] = ordered[curPos][1] === status ? SHOW : status;
			appendItems();
		}

		YLXSidebarState = Sotsify.Platform.LocalStorageAPI.getItem("ylx-sidebar-state");
		if (YLXSidebarState === 1) document.querySelector(".main-yourLibraryX-collapseButton > button")?.click();

		document.documentElement.style.setProperty("--nav-bar-width", "280px");

		hiddenList.classList.remove("hidden-visually");
		for (const el of ordered) {
			el[0].onmouseover = () => {
				const [item, status] = el;
				const index = ordered.findIndex((a) => a === el);
				if (index === 0 || ordered[index][1] !== ordered[index - 1][1]) {
					up.disabled = true;
				} else {
					up.disabled = false;
					up.onclick = () => onSwap(item, -1);
				}
				if (index === ordered.length - 1 || ordered[index][1] !== ordered[index + 1][1]) {
					down.disabled = true;
				} else {
					down.disabled = false;
					down.onclick = () => onSwap(item, 1);
				}

				stick.innerText = status === STICKY ? "Unstick" : "Stick";
				hide.innerText = status === HIDDEN ? "Unhide" : "Hide";
				hide.onclick = () => onChangeStatus(item, HIDDEN);
				stick.onclick = () => onChangeStatus(item, STICKY);

				item.append(container);
			};
		}
	}

	function removeInteraction() {
		hiddenList.classList.add("hidden-visually");
		container.remove();
		for (const a of ordered) {
			a[0].onmouseover = undefined;
		}
		if (YLXSidebarState === 1) document.querySelector(".main-yourLibraryX-collapseButton > button")?.click();
		else
			document.documentElement.style.setProperty(
				"--nav-bar-width",
				`${Sotsify.Platform.LocalStorageAPI.getItem(
					YLXSidebarState === 2 ? "ylx-expanded-state-nav-bar-width" : "ylx-default-state-nav-bar-width"
				)}px`
			);
		writeStorage();
	}

	(async () => {
		await new Promise((res) => Sotsify.Events.webpackLoaded.on(res));
		if (document.querySelector(".Root__globalNav")) {
			Sotsify.Snackbar?.enqueueCustomSnackbar("sidebar-config", {
				keyPrefix: "sidebar-config",
				autoHideDuration: 7500,
				children: Sotsify.ReactComponent.Snackbar.wrapper({
					children: Sotsify.ReactComponent.Snackbar.simpleLayout({
						center: Sotsify.React.createElement("div", {
							dangerouslySetInnerHTML: {
								__html:
									"Sidebar config is not supported when Global Navbar is enabled. In your terminal, please run <code>Sotsify config sidebar_config 0</code> command and then re-apply Sotsify with <code>Sotsify apply</code>.",
							},
							style: {
								"text-size": "12px",
							},
						}),
					}),
				}),
			});
			isGlobalNavbar = true;
		}

		if (!isGlobalNavbar) {
			new Sotsify.Menu.Item(
				"Sidebar config",
				false,
				(self) => {
					self.setState(!self.isEnabled);
					if (self.isEnabled) {
						injectInteraction();
					} else {
						removeInteraction();
					}
				},
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="16px" height="16px" fill="currentcolor"><path d="M44.7,11L36,19.6c0,0-2.6,0-5.2-2.6s-2.6-5.2-2.6-5.2l8.7-8.7c-4.9-1.2-10.8,0.4-14.4,4c-5.4,5.4-0.6,12.3-2,13.7C12.9,28.7,5.1,34.7,4.9,35c-2.3,2.3-2.4,6-0.2,8.2c2.2,2.2,5.9,2.1,8.2-0.2c0.3-0.3,6.7-8.4,14.2-15.9c1.4-1.4,8,3.7,13.6-1.8C44.2,21.7,45.9,15.9,44.7,11z M9.4,41.1c-1.4,0-2.5-1.1-2.5-2.5C6.9,37.1,8,36,9.4,36c1.4,0,2.5,1.1,2.5,2.5C11.9,39.9,10.8,41.1,9.4,41.1z"/></svg>`
			).register();
		}
	})();

	function initConfig() {
		const libraryX = document.querySelector(".main-yourLibraryX-navItems");

		if (!libraryX) {
			setTimeout(initConfig, 300);
			return;
		}

		InitSidebarXConfig();
	}

	function InitSidebarXConfig() {
		// STICKY container
		const YLXAppItems = document.querySelector(".main-yourLibraryX-navItems");
		const libraryItems = document.querySelector(".main-yourLibraryX-library");

		if (!YLXAppItems || !libraryItems?.querySelector("ul")) {
			setTimeout(InitSidebarXConfig, 300);
			return;
		}

		appItems = YLXAppItems;
		buttons = [];
		ordered = [];

		appItems.id = "Sotsify-sticky-list";
		// SHOW container
		list = document.createElement("ul");
		list.id = "Sotsify-show-list";
		// HIDDEN container
		hiddenList = document.createElement("ul");
		hiddenList.id = "Sotsify-hidden-list";
		hiddenList.classList.add("hidden-visually");
		const playlistList = libraryItems.querySelector("ul");
		playlistList.id = "Sotsify-playlist-list";
		libraryItems.prepend(list, hiddenList);

		for (const ele of appItems.children) {
			ele.dataset.id = ele.querySelector("a").pathname;
			buttons.push(ele);
		}

		let storage = [];
		try {
			storage = JSON.parse(localStorage.getItem("Sotsify-sidebar-config:ylx"));
			if (!Array.isArray(storage)) throw "";
		} catch {
			storage = buttons.map((el) => [el.dataset.id, STICKY]);
		}

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "childList" && mutation.addedNodes.length) {
					mutation.addedNodes[0].id = "Sotsify-playlist-list";
				}
			}
		});
		observer.observe(playlistList.parentElement, { childList: true });

		arrangeItems(storage);
		appendItems();
	}

	initConfig();

	const customButtonStyle = document.createElement("style");
	customButtonStyle.innerHTML = `
div.GlueDropTarget.personal-library  {
padding: 0 8px;
}
div.GlueDropTarget.personal-library >* {
padding: 0 16px;
height: 40px;
border-radius: 4px;
}
div.GlueDropTarget.personal-library >*.active {
background: var(--spice-card);
}
.main-rootlist-rootlist {
margin-top: 0;
}
.Root__nav-bar :not(.main-yourLibraryX-entryPoints) > #Sotsify-show-list >* {
padding: 0 24px 0 8px;
}
.main-yourLibraryX-entryPoints #Sotsify-show-list,
.main-yourLibraryX-entryPoints #Sotsify-hidden-list {
padding: 0 12px;
}
`;
	document.head.append(customButtonStyle);
})();
