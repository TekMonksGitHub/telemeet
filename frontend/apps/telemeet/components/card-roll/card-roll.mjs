/** 
 * Can show cards in a swippable or scrollable horizontal or
 * vertical filmstrips.
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "/framework/js/util.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta), MOBILE_BREAKPOINT = "959px";

async function elementConnected(host) {
	Object.defineProperty(host, "value", { configurable: true,
		get: _=> card_roll.getMemoryByHost(host).value || decodeURIComponent(host.getAttribute("value")),
		set: async value => {
			card_roll.bindData(await _createElementData(host, value), host.id);
			card_roll.getMemoryByHost(host).value = value;
		} 
	});
	card_roll.setDataByHost(host, await _createElementData(host, decodeURIComponent(host.getAttribute("value"))));
}

const _createElementData = async (host, value="[]") => {
	let cards = []; try{cards = JSON.parse(value)} catch (err) {};
	return { cards, isColumnLayout: host.getAttribute("column")?.toLowerCase() == "true"?true:undefined,
		styleBody: host.getAttribute("styleBody")?`<style>${await card_roll.getAttrValue(host,"styleBody")}</style>`:undefined,
		MOBILE_MEDIA_QUERY_START: `<style>@media only screen and (max-width: ${host.getAttribute("mobilebreakpoint")||MOBILE_BREAKPOINT}) and (hover: none) {`,
		MOBILE_MEDIA_QUERY_END: "}</style>",
		DESKTOP_MEDIA_QUERY_START: `<style>@media (hover: hover) {`,
		DESKTOP_MEDIA_QUERY_END: "}</style>",
		componentpath: COMPONENT_PATH  }; 
};

// convert this all into a WebComponent so we can use it
export const card_roll = {trueWebComponentMode: true, elementConnected}
monkshu_component.register("card-roll", `${COMPONENT_PATH}/card-roll.html`, card_roll);