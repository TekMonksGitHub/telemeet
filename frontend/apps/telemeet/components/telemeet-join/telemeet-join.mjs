/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {session} from "/framework/js/session.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";

const roomExitListeners = []; let videoOn = false; let id;

async function elementConnected(element) {
	const data = {}; id = element.id;

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;
	data.camicon = element.getAttribute("camicon")||"camera.svg";
	data.name = element.getAttribute("name")||"";
	data.room = element.getAttribute("room")||"";
	data.pass = element.getAttribute("pass")||"";
	
	if (element.id) {
		if (!telemeet_join.datas) telemeet_join.datas = {}; telemeet_join.datas[element.id] = data;
	} else telemeet_join.data = data;
}

async function toggleVideo(element) {
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	const camicon = shadowRoot.querySelector("img#camicon");

	const hostElement = telemeet_join.getHostElement(element);
	const camiconimg = hostElement.getAttribute("camicon")||"camera.svg";
	const nocamiconimg = hostElement.getAttribute("nocamicon")||"nocamera.svg";
	if (videoOn) {_stopVideo(shadowRoot); camicon.src = `./img/${camiconimg}`;}
	else {await _startVideo(shadowRoot); camicon.src = `./img/${nocamiconimg}`;}
}

async function joinRoom(element) {
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	const hostElement = telemeet_join.getHostElement(element);
	const enterOnly = hostElement.getAttribute("enterOnly")?true:false;	// enterOnly means guest user joining the room
	const roomName = shadowRoot.querySelector("input#room").value;
	const roomPass = shadowRoot.querySelector("input#roompass").value;

	if (enterOnly) {
		const name = shadowRoot.querySelector("input#name").value;
		if (!name || name.trim() == "") {_showError(await i18n.get("NoName")); return;}
		session.set(APP_CONSTANTS.USERNAME, name);
	}
	
	if (roomName.trim() == "") {_showError(await i18n.get("NoRoom")); return;}
	if (roomPass.trim() == "") {_showError(await i18n.get("NoPass")); return;}

	const req = {room: roomName, pass: roomPass, id: session.get(APP_CONSTANTS.USERID)};
	const result = await apiman.rest(enterOnly?APP_CONSTANTS.API_ENTERROOM:APP_CONSTANTS.API_CREATEROOM, 
		enterOnly?"GET":"POST", req, enterOnly?false:true, enterOnly?true:false);

	if (result && !result.result) {
		_showError(await i18n.get(enterOnly?(result.failureReason=="NO_ROOM"?"RoomNotCreatedError":"RoomPasswordError"):"RoomExistsPasswordError"));
		return;
	}

	if (result) {	// open firewall and join the room
		if (await _operateFirewall("allow", enterOnly)) {	// room created, add listeners to delete it on close and logouts
			let roomClosed = false;	// room is open now

			const exitListener = (isGuest, isModerator, room, pass) => {	// delete the room, close FW on moderator exit
				roomExitListeners.splice(roomExitListeners.indexOf(exitListener), 1);
				if (roomClosed) return;	// already closed
				if (!isGuest && isModerator) apiman.rest(APP_CONSTANTS.API_DELETEROOM, "POST", 
					{room, pass, id: session.get(APP_CONSTANTS.USERID)}, true, false);
				_operateFirewall("disallow", enterOnly); if (videoOn) _startVideo(shadowRoot);
				roomClosed = true;
			}; roomExitListeners.push(exitListener);

			loginmanager.addLogoutListener(_=>{	// delete room on session timeout, logout etc
				if (roomClosed) return;	// already closed
				const isGuest = !result.isModerator, isModerator = result.isModerator, room = roomName, pass = roomPass;
				if (!isGuest && isModerator) apiman.rest(APP_CONSTANTS.API_DELETEROOM, "POST", 
					{room, pass, id: session.get(APP_CONSTANTS.USERID)}, true, false);
				_operateFirewall("disallow", enterOnly);
				roomClosed = true;
			});

			_openTelemeet(result.url, roomPass, element, enterOnly, result.isModerator);
		} else _showError(await i18n.get("InternalError", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
	} else _showError(await i18n.get("InternalError", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
}

async function _operateFirewall(operation, isGuest) {
	if (operation == "disallow") _stopBackendHeartbeats();	// this will auto close the firewall after heartbeat timeout, as we open it in heartbeat mode
	const req = {id: session.get(isGuest?APP_CONSTANTS.USERNAME:APP_CONSTANTS.USERID), operation, ip:await _getPublicIP(), mode:"heartbeat_mode"};
	const result = await apiman.rest(APP_CONSTANTS.API_FWCONTROL, "POST", req, true, false);
	if (result && result.result && operation == "allow") _startBackendHeartbeats(isGuest);
	return result?result.result:false;
}

function _stopBackendHeartbeats() {
	const memory = telemeet_join.getSessionMemory(id); 
	if (memory.heartbeatTimer) { for (const timer of memory.heartbeatTimer) clearInterval(timer); memory.heartbeatTimer = []; }
}

function _startBackendHeartbeats(isGuest) {
	_stopBackendHeartbeats(); const memory = telemeet_join.getSessionMemory(id); memory.heartbeatTimer = memory.heartbeatTimer || [];
	memory.heartbeatTimer.push(setInterval(_operateFirewall, APP_CONSTANTS.FW_HEARTBEATINTERVAL, "keepopen", isGuest));
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
	delete video.srcObject;
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

	const hostURL = new URL(url), roomName = hostURL.pathname.replace(/^\/+/,"");
	await $$.require("./components/telemeet-join/3p/external_api.js");
	const meetAPI = new JitsiMeetExternalAPI(hostURL.host, {
		roomName,
		width: "100%",
		height: "100%",
		parentNode: telemeet,
		noSSL: false,
		configOverwrite: { startWithVideoMuted: !videoOn, remoteVideoMenu: {disableKick: true} },
		interfaceConfigOverwrite: { 
			AUTHENTICATION_ENABLE: false,
			TOOLBAR_BUTTONS: [
				'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
				'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
				'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
				'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
				'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
				'e2ee'
			], 
			DEFAULT_BACKGROUND: "#000000",
			DEFAULT_REMOTE_DISPLAY_NAME: "Fellow Teleworkr",
			DEFAULT_LOCAL_DISPLAY_NAME: "Fellow Teleworkr",
			APP_NAME: "Teleworkr Meet",
			NATIVE_APP_NAME: "Teleworkr Meet",
			JITSI_WATERMARK_LINK: "http://teleworkr.com",
			HIDE_INVITE_MORE_HEADER: true
		},
	});
	meetAPI.executeCommand("displayName", session.get(APP_CONSTANTS.USERNAME));
	meetAPI.addEventListener("videoConferenceLeft", _=>{
		modalcurtain.style.display = "none";  telemeet.classList.remove("visible");
		while (telemeet.firstChild) telemeet.removeChild(telemeet.firstChild);	// remove the iframe
		meetAPI.dispose();
		for (const roomExitListener of roomExitListeners) roomExitListener(isGuest, isModerator, roomName, roomPass);
	});

	// modal curtain, show telemeet, and stop local video - as it hits performance otherwise
	modalcurtain.style.display = "block"; telemeet.classList.add("visible"); if (videoOn) _stopVideo(shadowRoot);
}

const trueWebComponentMode = false;	// making this false renders the component without using Shadow DOM
export const telemeet_join = {trueWebComponentMode, elementConnected, toggleVideo, joinRoom};
monkshu_component.register("telemeet-join", `${APP_CONSTANTS.APP_PATH}/components/telemeet-join/telemeet-join.html`, telemeet_join);