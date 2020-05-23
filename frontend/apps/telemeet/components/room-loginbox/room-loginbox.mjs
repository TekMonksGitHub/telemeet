/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {router} from "/framework/js/router.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

async function elementConnected(element) {
	const data = {};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;
	data.roomname = element.getAttribute("roomname"); data.name = element.getAttribute("name"); data.pass = element.getAttribute("pass");
	
	if (element.id) {
		if (!room_loginbox.datas) room_loginbox.datas = {}; room_loginbox.datas[element.id] = data;
	} else room_loginbox.data = data;
}

async function signin(element) {	
	const shadowRoot = room_loginbox.getShadowRootByContainedElement(element);

	const roomSelector = shadowRoot.querySelector("input#roomid"); const room = roomSelector.value;
	const nameSelector = shadowRoot.querySelector("input#name"); const name = nameSelector.value;
	const passSelector = shadowRoot.querySelector("input#pass"); const pass = passSelector.value;
	
	const req = {room, name, pass};
	const resp = await apiman.rest(APP_CONSTANTS.API_ENTERROOM, "GET", req, false, true);
	if (resp && resp.result) router.loadPage(`${APP_CONSTANTS.ROOM_HTML}?room=${room}&name=${name}&pass=${pass}`);
	else shadowRoot.querySelector("span#error").style.display = "inline";
}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM
export const room_loginbox = {signin, trueWebComponentMode, elementConnected}
monkshu_component.register("room-loginbox", `${APP_CONSTANTS.APP_PATH}/components/room-loginbox/room-loginbox.html`, room_loginbox);