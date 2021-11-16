/**
 * WebRTC meeting component. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {util} from "/framework/js/util.mjs";
import {session} from "/framework/js/session.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta);

async function elementConnected(host) {
	const data = {}; 

	if (host.getAttribute("styleBody")) data.styleBody = `<style>${host.getAttribute("styleBody")}</style>`;
	data.componentpath = COMPONENT_PATH;
	data.name = host.getAttribute("name")||"";
	data.room = host.getAttribute("room")||"";
	data.pass = host.getAttribute("pass")||"";
	data["show-joiner-dialog"] = host.getAttribute("show-joiner-dialog") || undefined;

	telemeet_join.setDataByHost(host, data);

	const memory = telemeet_join.getMemoryByHost(host); 
	memory.roomExitListeners = []; memory.mikeOn = true; memory.videoOn = false;
}

async function elementRendered(element) {  
	const shadowRoot = telemeet_join.getShadowRootByHost(element), containedElement = shadowRoot.querySelector("div#telemeet");
	_startVideo(shadowRoot, containedElement); 
}

async function toggleVideo(element, isFromMeet) {
	const iconToggleArray = [`${COMPONENT_PATH}/img/camera.svg`, `${COMPONENT_PATH}/img/nocamera.svg`];
	if (isFromMeet) {  // localized change just to the currently open meeting
		_getMeetAPI(element).executeCommand("toggleVideo"); 
		_toggleIcon(element, iconToggleArray); 
		return;
	}
	
	// no meeting open, this is for our prejoin conditions now.
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	if (_getMemoryVariable("videoOn", element)) _stopVideo(telemeet_join.getShadowRootByContainedElement(element), element); 
	else await _startVideo(telemeet_join.getShadowRootByContainedElement(element), element); 
	_toggleIcon(element, iconToggleArray); _toggleIcon(shadowRoot.querySelector("div#telemeet img#camcontrol"), iconToggleArray);
}

async function toggleMike(element, isFromMeet) {
	const iconToggleArray = [`${COMPONENT_PATH}/img/mike.svg`, `${COMPONENT_PATH}/img/nomike.svg`];
	if (isFromMeet) { // localized change just to the currently open meeting
		_toggleIcon(element, iconToggleArray); 
		_getMeetAPI(element).executeCommand("toggleAudio"); 
		return;
	}	
	
	// no meeting open, this is for our prejoin conditions now.
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	_toggleIcon(element, iconToggleArray); _toggleIcon(shadowRoot.querySelector("div#telemeet img#mikecontrol"), iconToggleArray);
	_setMemoryVariable("mikeOn", element, !_getMemoryVariable("mikeOn", element));
}

const exitMeeting = element => _getMeetAPI(element).executeCommand("hangup");

async function joinRoom(hostElement, roomName, roomPass, enterOnly, name) {
	const shadowRoot = telemeet_join.getShadowRootByHost(hostElement), containedElement = shadowRoot.querySelector("div#telemeet");

	if (enterOnly) session.set(APP_CONSTANTS.USERNAME, name);
	
	if (roomName.trim() == "") {_showError(await i18n.get("NoRoom")); return;}
	if (roomPass.trim() == "") {_showError(await i18n.get("NoPass")); return;}

	const req = {room: roomName, pass: roomPass, id: session.get(APP_CONSTANTS.USERID)};
	const result = await apiman.rest(enterOnly?APP_CONSTANTS.API_ENTERROOM:APP_CONSTANTS.API_CREATEROOM, 
		enterOnly?"GET":"POST", req, enterOnly?false:true, enterOnly?true:false);

	if (result && !result.result) {
		_showError(await i18n.get(enterOnly?(result.failureReason=="NO_ROOM"?"RoomNotCreatedError":"RoomPasswordError"):"RoomExistsPasswordError"));
		return;
	}

	const sessionMemory = telemeet_join.getSessionMemory(hostElement.id), roomExitListeners = _getMemoryVariable("roomExitListeners", containedElement);
	if (result && await _operateFirewall("allow", enterOnly, sessionMemory)) {	// open firewall and join the room add listeners to delete it on close and logouts
		let roomClosed = false;	// room is open now

		const exitListener = (isGuest, isModerator, room, pass, callFromLogout) => {	// delete the room, close FW on moderator exit
			if (!callFromLogout) roomExitListeners.splice(roomExitListeners.indexOf(exitListener), 1);
			if (roomClosed) return;	// already closed
			LOG.info(`Deleting room ${room} due to ${callFromLogout?"moderator logout":"moderator left."}`);
			if (!isGuest && isModerator) apiman.rest(APP_CONSTANTS.API_DELETEROOM, "POST", 
				{room, pass, id: session.get(APP_CONSTANTS.USERID)}, true, false);
			_operateFirewall("disallow", enterOnly, sessionMemory); if (telemeet_join.getMemoryByHost(hostElement).videoOn && 
				(!callFromLogout)) _startVideo(shadowRoot, containedElement); roomClosed = true;
		}; roomExitListeners.push(exitListener);

		loginmanager.addLogoutListener(_=>exitListener(!result.isModerator, result.isModerator, roomName, roomPass, true));

		_openTelemeet(result.url, roomPass, hostElement, enterOnly, result.isModerator);
	} else _showError(await i18n.get("InternalError", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
}

const _getMeetAPI = element => telemeet_join.getMemoryByContainedElement(element).meetAPI;

async function _operateFirewall(operation, isGuest, sessionMemory) {
	if (operation == "disallow") _stopBackendHeartbeats(sessionMemory);	// this will auto close the firewall after heartbeat timeout, as we open it in heartbeat mode
	const req = {id: session.get(isGuest?APP_CONSTANTS.USERNAME:APP_CONSTANTS.USERID), operation, ip:await _getPublicIP(), mode:"heartbeat_mode"};
	const result = await apiman.rest(APP_CONSTANTS.API_FWCONTROL, "POST", req, true, false);
	if (result && result.result && operation == "allow") _startBackendHeartbeats(isGuest, sessionMemory);
	return result?result.result:false;
}

function _stopBackendHeartbeats(sessionMemory) {
	if (sessionMemory.heartbeatTimer) { for (const timer of sessionMemory.heartbeatTimer) clearInterval(timer); sessionMemory.heartbeatTimer = []; }
}

function _startBackendHeartbeats(isGuest, sessionMemory) {
	_stopBackendHeartbeats(sessionMemory); sessionMemory.heartbeatTimer = sessionMemory.heartbeatTimer || [];
	sessionMemory.heartbeatTimer.push(setInterval(_operateFirewall, APP_CONSTANTS.FW_HEARTBEATINTERVAL, "keepopen", isGuest, sessionMemory));
}

async function _startVideo(shadowRoot, element) {
	if (_getMemoryVariable("videoOn", element)) return;
	const video = shadowRoot.querySelector("video#video"); 
	try {
		const stream = await navigator.mediaDevices.getUserMedia({video: true});
		video.srcObject = stream; _setMemoryVariable("videoOn", element, true);
	} catch (err) {
		_showError(await i18n.get("NoCamera", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
		LOG.error(`Unable to access the camera: ${err}`);
	}
}

function _stopVideo(shadowRoot, element) {
	if (!_getMemoryVariable("videoOn", element)) return;
	const video = shadowRoot.querySelector("video#video");
	if (video.srcObject) for (const track of video.srcObject.getTracks()) if (track.readyState == "live") track.stop();
	delete video.srcObject; _setMemoryVariable("videoOn", element, false);
}

function _showError(error) {
	monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/error.html`, true, false,
		{error}, "dialog", [], _=> monkshu_env.components['dialog-box'].hideDialog("dialog"));
}

async function _getPublicIP() {
	let data = await $$.requireText("https://www.cloudflare.com/cdn-cgi/trace"); 
	data = data.replace(/[\r\n]+/g, '","').replace(/\=+/g, '":"'); 
	data = '{"' + data.slice(0, data.lastIndexOf('","')) + '"}';
	data = JSON.parse(data);
	return data.ip;
}

async function _openTelemeet(url, roomPass, hostElement, isGuest, isModerator) {
	const shadowRoot = telemeet_join.getShadowRootByHost(hostElement);
	const telemeet = shadowRoot.querySelector("div#telemeet");

	const hostURL = new URL(url), roomName = hostURL.pathname.replace(/^\/+/,"");
	await $$.require("./components/telemeet-join/3p/external_api.js");
	const meetAPI = new JitsiMeetExternalAPI(hostURL.host, {
		roomName,
		width: "100%",
		height: "100%",
		parentNode: telemeet,
		noSSL: false,
		configOverwrite: { 
			startWithVideoMuted: !_getMemoryVariable("videoOn", telemeet), 
			startWithAudioMuted: !_getMemoryVariable("mikeOn", telemeet), 
			remoteVideoMenu: {disableKick: true} 
		},
		interfaceConfigOverwrite: { 
			AUTHENTICATION_ENABLE: false,
			TOOLBAR_BUTTONS: [], 
			DEFAULT_BACKGROUND: "#000000",
			DEFAULT_REMOTE_DISPLAY_NAME: "Fellow Teleworkr",
			DEFAULT_LOCAL_DISPLAY_NAME: "Fellow Teleworkr",
			APP_NAME: "Teleworkr Meet",
			NATIVE_APP_NAME: "Teleworkr Meet",
			JITSI_WATERMARK_LINK: "http://teleworkr.com",
			HIDE_INVITE_MORE_HEADER: true,
			SHOW_POWERED_BY: false,
			SUPPORT_URL: "http://teleworkr.com"
		},
	});
	meetAPI.executeCommand("displayName", session.get(APP_CONSTANTS.USERNAME));
	const _roomExited = _ => {
		telemeet.classList.remove("visible"); _setMemoryVariable("meetOpen", telemeet, false);
		telemeet.removeChild(util.getChildrenByTagName(telemeet, "iframe")[0]);	// remove the iframe
		meetAPI.dispose(); const roomExitListeners = _getMemoryVariable("roomExitListeners", telemeet);
		for (const roomExitListener of roomExitListeners) roomExitListener(isGuest, isModerator, roomName, roomPass);
	}
	meetAPI.addEventListener("videoConferenceLeft", _roomExited);

	// show telemeet, and stop local video - as it hits performance otherwise
	telemeet_join.getMemoryByHost(hostElement).meetAPI = meetAPI; _setMemoryVariable("meetOpen", telemeet, true);
	if (_getMemoryVariable("videoOn", telemeet)) _stopVideo(shadowRoot, telemeet); telemeet.classList.add("visible");
}

const _getMemoryVariable = (varName, element) => telemeet_join.getMemoryByContainedElement(element)[varName];
const _setMemoryVariable = (varName, element, value) => telemeet_join.getMemoryByContainedElement(element)[varName] = value;

const _toggleIcon = (element, icons) => { if (element.src == icons[0]) element.src = icons[1]; else element.src = icons[0]; }

const trueWebComponentMode = false;	// making this false renders the component without using Shadow DOM
export const telemeet_join = {trueWebComponentMode, elementConnected, elementRendered, toggleVideo, toggleMike, 
	joinRoom, exitMeeting};
monkshu_component.register("telemeet-join", `${APP_CONSTANTS.APP_PATH}/components/telemeet-join/telemeet-join.html`, telemeet_join);