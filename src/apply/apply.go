package apply

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/


/cli/src/utils"
)

// Flag enables/disables additional feature
type Flag struct {
	CurrentTheme         string
	ColorScheme          string
	InjectThemeJS        bool
	CheckSotsifyUpdate bool
	Extension            []string
	CustomApp            []string
	SidebarConfig        bool
	HomeConfig           bool
	ExpFeatures          bool
	SotsifyVer         string
	SpotifyVer           string
}

// AdditionalOptions .
func AdditionalOptions(appsFolderPath string, flags Flag) {
	filesToModified := map[string][]func(path string, flags Flag){
		filepath.Join(appsFolderPath, "xpui", "index.html"): {
			htmlMod,
		},
		filepath.Join(appsFolderPath, "xpui", "xpui.js"): {
			insertCustomApp,
			insertExpFeatures,
			insertSidebarConfig,
			insertHomeConfig,
		},
		filepath.Join(appsFolderPath, "xpui", "vendor~xpui.js"): {
			insertExpFeatures,
		},
		filepath.Join(appsFolderPath, "xpui", "home-v2.js"): {
			insertHomeConfig,
		},
		filepath.Join(appsFolderPath, "xpui", "xpui-desktop-modals.js"): {
			insertVersionInfo,
		},
	}

	for file, calls := range filesToModified {
		if _, err := os.Stat(file); os.IsNotExist(err) {
			continue
		}

		for _, call := range calls {
			call(file, flags)
		}
	}

	if flags.SidebarConfig {
		utils.CopyFile(
			filepath.Join(utils.GetJsHelperDir(), "sidebarConfig.js"),
			filepath.Join(appsFolderPath, "xpui", "helper"))
	}

	if flags.HomeConfig {
		utils.CopyFile(
			filepath.Join(utils.GetJsHelperDir(), "homeConfig.js"),
			filepath.Join(appsFolderPath, "xpui", "helper"))
	}

	if flags.ExpFeatures {
		utils.CopyFile(
			filepath.Join(utils.GetJsHelperDir(), "expFeatures.js"),
			filepath.Join(appsFolderPath, "xpui", "helper"))
	}
}

// UserCSS creates colors.css user.css files in "xpui".
// To not use custom css, set `themeFolder` to blank string
// To use default color scheme, set `scheme` to `nil`
func UserCSS(appsFolderPath, themeFolder string, scheme map[string]string) {
	colorsDest := filepath.Join(appsFolderPath, "xpui", "colors.css")
	if err := os.WriteFile(colorsDest, []byte(getColorCSS(scheme)), 0700); err != nil {
		utils.Fatal(err)
	}
	cssDest := filepath.Join(appsFolderPath, "xpui", "user.css")
	if err := os.WriteFile(cssDest, []byte(getUserCSS(themeFolder)), 0700); err != nil {
		utils.Fatal(err)
	}
}

// UserAsset .
func UserAsset(appsFolderPath, themeFolder string) {
	var assetsPath = getAssetsPath(themeFolder)
	var xpuiPath = filepath.Join(appsFolderPath, "xpui")
	if err := utils.Copy(assetsPath, xpuiPath, true, nil); err != nil {
		utils.Fatal(err)
	}
}

func htmlMod(htmlPath string, flags Flag) {
	if len(flags.Extension) == 0 &&
		!flags.HomeConfig &&
		!flags.SidebarConfig &&
		!flags.ExpFeatures {
		return
	}

	extensionsHTML := "\n"
	helperHTML := "\n"

	if flags.InjectThemeJS {
		extensionsHTML += "<script defer src='extensions/theme.js'></script>\n"
	}

	if flags.SidebarConfig {
		helperHTML += "<script defer src='helper/sidebarConfig.js'></script>\n"
	}

	if flags.HomeConfig {
		helperHTML += "<script defer src='helper/homeConfig.js'></script>\n"
	}

	if flags.ExpFeatures {
		helperHTML += "<script defer src='helper/expFeatures.js'></script>\n"
	}

	if flags.SotsifyVer != "" {
		var extList string
		for _, ext := range flags.Extension {
			extList += fmt.Sprintf(`"%s",`, ext)
		}

		var customAppList string
		for _, app := range flags.CustomApp {
			customAppList += fmt.Sprintf(`"%s",`, app)
		}

		helperHTML += fmt.Sprintf(`<script>
			Sotsify.Config={};
			Sotsify.Config["version"]="%s";
			Sotsify.Config["current_theme"]="%s";
			Sotsify.Config["color_scheme"]="%s";
			Sotsify.Config["extensions"] = [%s];
			Sotsify.Config["custom_apps"] = [%s];
			Sotsify.Config["check_Sotsify_update"]=%v;
		</script>
		`, flags.SotsifyVer, flags.CurrentTheme, flags.ColorScheme, extList, customAppList, flags.CheckSotsifyUpdate)
	}

	for _, v := range flags.Extension {
		if strings.HasSuffix(v, ".mjs") {
			extensionsHTML += fmt.Sprintf("<script defer type='module' src='extensions/%s'></script>\n", v)
		} else {
			extensionsHTML += fmt.Sprintf("<script defer src='extensions/%s'></script>\n", v)
		}
	}

	for _, v := range flags.CustomApp {
		manifest, _, err := utils.GetAppManifest(v)
		if err == nil {
			for _, extensionFile := range manifest.ExtensionFiles {
				if strings.HasSuffix(extensionFile, ".mjs") {
					extensionsHTML += fmt.Sprintf("<script defer type='module' src='extensions/%s/%s'></script>\n", v, extensionFile)
				} else {
					extensionsHTML += fmt.Sprintf("<script defer src='extensions/%s/%s'></script>\n", v, extensionFile)
				}
			}
		}
	}

	utils.ModifyFile(htmlPath, func(content string) string {
		utils.Replace(
			&content,
			`<\!-- Sotsify helpers -->`,
			func(submatches ...string) string {
				return fmt.Sprintf("%s%s", submatches[0], helperHTML)
			})
		utils.Replace(
			&content,
			`</body>`,
			func(submatches ...string) string {
				return fmt.Sprintf("%s%s", extensionsHTML, submatches[0])
			})
		return content
	})
}

func getUserCSS(themeFolder string) string {
	if len(themeFolder) == 0 {
		return ""
	}

	cssFilePath := filepath.Join(themeFolder, "user.css")
	_, err := os.Stat(cssFilePath)

	if err != nil {
		return ""
	}

	content, err := os.ReadFile(cssFilePath)
	if err != nil {
		return ""
	}

	return string(content)
}

func getColorCSS(scheme map[string]string) string {
	var variableList string
	var variableRGBList string
	mergedScheme := make(map[string]string)

	for k, v := range scheme {
		mergedScheme[k] = v
	}

	for k, v := range utils.BaseColorList {
		if len(mergedScheme[k]) == 0 {
			mergedScheme[k] = v
		}
	}

	for k, v := range mergedScheme {
		parsed := utils.ParseColor(v)
		variableList += fmt.Sprintf("    --spice-%s: #%s;\n", k, parsed.Hex())
		variableRGBList += fmt.Sprintf("    --spice-rgb-%s: %s;\n", k, parsed.RGB())
	}

	return fmt.Sprintf(":root {\n%s\n%s\n}\n", variableList, variableRGBList)
}

func insertCustomApp(jsPath string, flags Flag) {
	utils.ModifyFile(jsPath, func(content string) string {
		const REACT_REGEX = `([\w_\$][\w_\$\d]*(?:\(\))?)\.lazy\(\((?:\(\)=>|function\(\)\{return )(\w+)\.(\w+)\(\d+\)\.then\(\w+\.bind\(\w+,\d+\)\)\}?\)\)`
		const REACT_ELEMENT_REGEX = `(\[\w_\$][\w_\$\d]*(?:\(\))?\.createElement|\([\w$\.,]+\))\(([\w\.]+),\{path:"\/collection"(?:,(element|children)?[:.\w,{}()$/*"]+)?\}`
		reactSymbs := utils.FindSymbol(
			"Custom app React symbols",
			content,
			[]string{
				REACT_REGEX})
		eleSymbs := utils.FindSymbol(
			"Custom app React Element",
			content,
			[]string{
				REACT_ELEMENT_REGEX})

		if (len(reactSymbs) < 2) || (len(eleSymbs) == 0) {
			utils.PrintError("Spotify version mismatch with Sotsify. Please report it on our github repository.")
			utils.PrintInfo("Sotsify might have been updated for this version already. Please run `Sotsify update` to check for a new version. If one isn't available yet, please wait for the update to be released.")
			return content
		}

		appMap := ""
		appReactMap := ""
		appEleMap := ""
		cssEnableMap := ""
		appNameArray := ""

		// Spotify's new route system
		wildcard := ""
		if eleSymbs[2] == "" {
			eleSymbs[2] = "children"
		} else if eleSymbs[2] == "element" {
			wildcard = "*"
		}

		for index, app := range flags.CustomApp {
			appName := `Sotsify-routes-` + app
			appMap += fmt.Sprintf(`"%s":"%s",`, appName, appName)
			appNameArray += fmt.Sprintf(`"%s",`, app)

			appReactMap += fmt.Sprintf(
				`,SotsifyApp%d=%s.lazy((()=>%s.%s("%s").then(%s.bind(%s,"%s"))))`,
				index, reactSymbs[0], reactSymbs[1], reactSymbs[2],
				appName, reactSymbs[1], reactSymbs[1], appName)

			appEleMap += fmt.Sprintf(
				`%s(%s,{path:"/%s/%s",pathV6:"/%s/*",%s:%s(SotsifyApp%d,{})}),`,
				eleSymbs[0], eleSymbs[1], app, wildcard, app, eleSymbs[2], eleSymbs[0], index)

			cssEnableMap += fmt.Sprintf(`,"%s":1`, appName)
		}

		utils.Replace(
			&content,
			`\{(\d+:"xpui)`,
			func(submatches ...string) string {
				return fmt.Sprintf("{%s%s", appMap, submatches[1])
			})

		utils.ReplaceOnce(
			&content,
			REACT_REGEX,
			func(submatches ...string) string {
				return fmt.Sprintf("%s%s", submatches[0], appReactMap)
			})

		utils.ReplaceOnce(
			&content,
			REACT_ELEMENT_REGEX,
			func(submatches ...string) string {
				return fmt.Sprintf("%s%s", appEleMap, submatches[0])
			})

		content = insertNavLink(content, appNameArray)

		utils.ReplaceOnce(
			&content,
			`\d+:1,\d+:1,\d+:1`,
			func(submatches ...string) string {
				return fmt.Sprintf("%s%s", submatches[0], cssEnableMap)
			})

		return content
	})
}

func insertNavLink(str string, appNameArray string) string {
	// Library X
	libraryXItemMatch := utils.SeekToCloseParen(
		str,
		`\("li",\{[^\{]*\{[^\{]*\{to:"\/search`,
		'(', ')')

	if libraryXItemMatch != "" {
		str = strings.Replace(
			str,
			libraryXItemMatch,
			fmt.Sprintf("%s,Sotsify._renderNavLinks([%s], false)", libraryXItemMatch, appNameArray),
			1)
	}

	// Global Navbar <= 1.2.45
	globalNavBarMatch := utils.FindMatch(str, `(,[a-zA-Z_\$][\w\$]*===(?:[a-zA-Z_\$][\w\$]*\.){2}HOME_NEXT_TO_NAVIGATION&&.+?)\]`)
	utils.ReplaceOnce(&str, `(,[a-zA-Z_\$][\w\$]*===(?:[a-zA-Z_\$][\w\$]*\.){2}HOME_NEXT_TO_NAVIGATION&&.+?)\]`, func(submatches ...string) string {
		return fmt.Sprintf("%s,Sotsify._renderNavLinks([%s], true)]", submatches[1], appNameArray)
	})

	// Global Navbar >= 1.2.46
	if len(globalNavBarMatch) == 0 {
		utils.ReplaceOnce(&str, `("global-nav-bar".*?)(\(0,\s*[a-zA-Z_\$][\w\$]*\.jsx\))(\(\s*\w+,\s*\{\s*className:\w*\s*\}\s*\))`, func(submatches ...string) string {
			return fmt.Sprintf("%s[%s%s,Sotsify._renderNavLinks([%s], true)].flat()", submatches[1], submatches[2], submatches[3], appNameArray)
		})
	}

	return str
}

func insertHomeConfig(jsPath string, flags Flag) {
	if !flags.HomeConfig {
		return
	}

	utils.ModifyFile(jsPath, func(content string) string {
		utils.ReplaceOnce(
			&content,
			`(createDesktopHomeFeatureActivationShelfEventFactory.*?)([\w\.]+)(\.map)`,
			func(submatches ...string) string {
				return fmt.Sprintf("%sSotsifyHomeConfig.arrange(%s)%s", submatches[1], submatches[2], submatches[3])
			})

		// >= 1.2.45
		utils.ReplaceOnce(
			&content,
			`(&&"HomeShortsSectionData".*\],)([a-zA-Z])(\}\)\()`,
			func(submatches ...string) string {
				return fmt.Sprintf("%sSotsifyHomeConfig.arrange(%s)%s", submatches[1], submatches[2], submatches[3])
			})

		return content
	})
}

func getAssetsPath(themeFolder string) string {
	dir := filepath.Join(themeFolder, "assets")

	if _, err := os.Stat(dir); err != nil {
		return ""
	}

	return dir
}

func insertSidebarConfig(jsPath string, flags Flag) {
	if !flags.SidebarConfig {
		return
	}

	utils.ModifyFile(jsPath, func(content string) string {
		utils.ReplaceOnce(
			&content,
			`return null!=\w+&&\w+\.totalLength(\?\w+\(\)\.createElement\(\w+,\{contextUri:)(\w+)\.uri`,
			func(submatches ...string) string {
				return fmt.Sprintf(`return true%s%s?.uri||""`, submatches[1], submatches[2])
			})

		return content
	})
}

func insertExpFeatures(jsPath string, flags Flag) {
	if !flags.ExpFeatures {
		return
	}

	utils.ModifyFile(jsPath, func(content string) string {
		utils.ReplaceOnce(
			&content,
			`(function \w+\((\w+)\)\{)(\w+ \w+=\w\.name;if\("internal")`,
			func(submatches ...string) string {
				return fmt.Sprintf("%s%s=Sotsify.expFeatureOverride(%s);%s", submatches[1], submatches[2], submatches[2], submatches[3])
			})

		utils.ReplaceOnce(
			&content,
			`(([\w$.]+\.fromJSON)\(\w+\)+;)(return ?[\w{}().,]+[\w$]+\.Provider,)(\{value:\{localConfiguration)`,
			func(submatches ...string) string {
				return fmt.Sprintf("%sSotsify.createInternalMap=%s;%sSotsify.RemoteConfigResolver=%s", submatches[1], submatches[2], submatches[3], submatches[4])
			})
		return content
	})
}

func insertVersionInfo(jsPath string, flags Flag) {
	utils.ModifyFile(jsPath, func(content string) string {
		utils.ReplaceOnce(
			&content,
			`(\w+(?:\(\))?\.createElement|\([\w$\.,]+\))\([\w\."]+,[\w{}():,]+\.containerVersion\}?\),`,
			func(submatches ...string) string {
				return fmt.Sprintf(`%s%s("details",{children: [
					%s("summary",{children: "Sotsify v" + Sotsify.Config.version}),
					%s("li",{children: "Theme: " + Sotsify.Config.current_theme + (Sotsify.Config.color_scheme && " / ") + Sotsify.Config.color_scheme}),
					%s("li",{children: "Extensions: " + Sotsify.Config.extensions.join(", ")}),
					%s("li",{children: "Custom apps: " + Sotsify.Config.custom_apps.join(", ")}),
					]}),`, submatches[0], submatches[1], submatches[1], submatches[1], submatches[1], submatches[1])
			})
		return content
	})
}
