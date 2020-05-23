/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {session} from "/framework/js/session.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

let videoOn = false;

async function elementConnected(element) {
	const data = {};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;
	data.camicon = element.getAttribute("camicon")||"camera.svg";
	data.name = element.getAttribute("name")||"";
	data.room = element.getAttribute("room")||"";
	data.pass = element.getAttribute("pass")||"";
	
	if (element.id) {
		if (!telemeet_join.datas) telemeet_join.datas = {}; telemeet_join.datas[element.id] = data;
	} else telemeet_join.data = data;
}

async function elementRendered(element) {
	const shadowRoot = telemeet_join.getShadowRootByHostId(element.id);
	//_startVideo(shadowRoot);
}

async function toggleVideo(element) {
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	const camicon = shadowRoot.querySelector("img#camicon");

	const hostElement = telemeet_join.getHostElement(element);
	const camiconimg = hostElement.getAttribute("camicon")||"camera.svg";
	const nocamiconimg = hostElement.getAttribute("nocamicon")||"nocamera.svg";
	if (videoOn) {_stopVideo(shadowRoot); camicon.src = `./img/${nocamiconimg}`;}
	else {await _startVideo(shadowRoot); camicon.src = `./img/${camiconimg}`;}
}

async function joinRoom(element) {
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	const hostElement = telemeet_join.getHostElement(element);
	const enterOnly = hostElement.getAttribute("enterOnly")?true:false;
	const roomName = shadowRoot.querySelector("input#room").value;
	const roomPass = shadowRoot.querySelector("input#roompass").value;

	if (enterOnly) {
		const name = shadowRoot.querySelector("input#name").value;
		if (!name || name.trim() == "") {_showError(await i18n.get("NoName", session.get($$.MONKSHU_CONSTANTS.LANG_ID))); return;}
		session.set(APP_CONSTANTS.USERNAME, name);
	}
	
	if (roomName.trim() == "" || roomPass.trim() == "") {
		_showError(await i18n.get("NoRoomOrPass", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
		return;
	}

	const req = {room: roomName, pass: roomPass, id: session.get(APP_CONSTANTS.USERID)};
	const result = await apiman.rest(enterOnly?APP_CONSTANTS.API_ENTERROOM:APP_CONSTANTS.API_CREATEROOM, 
		enterOnly?"GET":"POST", req, enterOnly?false:true, enterOnly?true:false);

	if (result && !result.result) {
		_showError(await i18n.get(enterOnly?"RoomPasswordError":"RoomExistsPasswordError", 
			session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
		return;
	}

	const fwOpenResult = await _openFirewall(true, enterOnly);
	if (result && result.result && fwOpenResult) _openTelemeet(result.url, roomPass, element, enterOnly, result.isModerator);
	else _showError(await i18n.get("InternalError", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
}

async function _openFirewall(allow, isGuest) {
	const req = {id: session.get(isGuest?APP_CONSTANTS.USERNAME:APP_CONSTANTS.USERID), operation: allow?"allow":"disallow", ip:await _getPublicIP()};
	const result = await apiman.rest(APP_CONSTANTS.API_FWCONTROL, "POST", req, true, false);
	return result?result.result:false;
}

async function _startVideo(shadowRoot) {
	if (videoOn) return;
	const video = shadowRoot.querySelector("video#video"); 
	try {
		const stream = await navigator.mediaDevices.getUserMedia({video: true});
		video.srcObject = stream;
		videoOn = true;
	} catch (err) {
		_showError(await i18n.get("NoCamera", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
		LOG.error(`Unable to access the camera: ${err}`);
	}
}

function _stopVideo(shadowRoot) {
	if (!videoOn) return;
	const video = shadowRoot.querySelector("video#video");
	if (video.srcObject) for (const track of video.srcObject.getTracks()) if (track.readyState == "live") track.stop();
	videoOn = false;
}

function _showError(error) {
	monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/error.html`, true, false,
		{error}, "dialog", [], _=> monkshu_env.components['dialog-box'].hideDialog("dialog"));
}

async function _getPublicIP() {
	let data = await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text();
	data = data.replace(/[\r\n]+/g, '","').replace(/\=+/g, '":"'); 
	data = '{"' + data.slice(0, data.lastIndexOf('","')) + '"}';
	data = JSON.parse(data);
	return data.ip;
}

async function _openTelemeet(url, roomPass, element, isGuest, isModerator) {
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);

	const modalcurtain = shadowRoot.querySelector("div#modalcurtain"); 
	const telemeet = shadowRoot.querySelector("div#telemeet");

	const hostURL = new URL(url), roomName = hostURL.pathname.substring(1);
	await $$.require("./components/telemeet-join/3p/external_api.js");
	const meetAPI = new JitsiMeetExternalAPI(hostURL.host, {
		roomName,
		width: "100%",
		height: "100%",
		parentNode: telemeet,
		noSSL: false,
		configOverwrite: { startWithVideoMuted: !videoOn, remoteVideoMenu: {disableKick: true} },
		interfaceConfigOverwrite: { AUTHENTICATION_ENABLE: false,
			TOOLBAR_BUTTONS: [
				'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
				'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
				'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
				'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
				'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
				'e2ee', 'security'
			] },
	});
	meetAPI.executeCommand("displayName", session.get(APP_CONSTANTS.USERNAME));
	meetAPI.addEventListener("videoConferenceLeft", _=>{
		modalcurtain.style.display = "none";  telemeet.classList.remove("visible");
		while (telemeet.firstChild) telemeet.removeChild(telemeet.firstChild);	// remove the iframe
		meetAPI.dispose();
		_openFirewall(false, isGuest);	// close the firewall
		if (!isGuest && isModerator) {	// delete the room on moderator exit
			const req = {room: roomName, pass: roomPass, id: session.get(APP_CONSTANTS.USERID)};
			apiman.rest(APP_CONSTANTS.API_DELETEROOM, "POST", req, true, false);
		}
	});

	modalcurtain.style.display = "block"; telemeet.classList.add("visible");
}

const trueWebComponentMode = false;	// making this false renders the component without using Shadow DOM
export const telemeet_join = {trueWebComponentMode, elementConnected, elementRendered, toggleVideo, joinRoom};
monkshu_component.register("telemeet-join", `${APP_CONSTANTS.APP_PATH}/components/telemeet-join/telemeet-join.html`, telemeet_join);