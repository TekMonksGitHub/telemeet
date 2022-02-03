/** 
 * Can show cards in a swippable or scrollable horizontal or
 * vertical filmstrips.
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "/framework/js/util.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta);

async function elementConnected(host) {
	const imageList = JSON.parse(decodeURIComponent(host.getAttribute("imagelist")));

	const defaultImage = host.getAttribute("defaultvalue"), selectedIndex = defaultImage ? 
		(_getImageIndex(host, defaultImage) != -1 ? _getImageIndex(host, defaultImage) : 0) : 0;

	Object.defineProperty(host, "value", { configurable: true,
		get: _=> image_picker.getMemoryByHost(host).value,
		set: async value => {
			const parsedValue = isNaN(parseInt(value))?0:parseInt(value);
			image_picker.getMemoryByHost(host).value = imageList[parsedValue];
			image_picker.bindData(await _createElementData(host, parsedValue), host.id);
		} 
	});
	image_picker.setDataByHost(host, await _createElementData(host, selectedIndex));
}

function imgSelected(imgElement, imgURL) {
	const host = image_picker.getHostElement(imgElement), selectedIndex = _getImageIndex(host, imgURL);
	if (selectedIndex != -1) host.value = selectedIndex;
}

const _createElementData = async (host, selected=0) => {
	const imageList = JSON.parse(decodeURIComponent(host.getAttribute("imagelist"))) || [], images = [];
	for (let [i,img] of imageList.entries()) images.push({imgurl: img, selected: i==selected?true:undefined});
	return { images, 
		styleBody: host.getAttribute("styleBody") ? `<style>${await image_picker.getAttrValue(host,"styleBody")}</style>` : undefined }; 
};

const _getImageIndex = (host, imgURL) => JSON.parse(decodeURIComponent(host.getAttribute("imagelist"))).indexOf(imgURL);

// convert this all into a WebComponent so we can use it
export const image_picker = {trueWebComponentMode: true, elementConnected, imgSelected}
monkshu_component.register("image-picker", `${COMPONENT_PATH}/image-picker.html`, image_picker);