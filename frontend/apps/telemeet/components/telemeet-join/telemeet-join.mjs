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

const roomExitListeners = [], COMPONENT_PATH = util.getModulePath(import.meta); 
let videoOn = false, mikeOn = true, id;

async function elementConnected(element) {
	const data = {}; id = element.id;

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;
	data.componentpath = COMPONENT_PATH;
	data.name = element.getAttribute("name")||"";
	data.room = element.getAttribute("room")||"";
	data.pass = element.getAttribute("pass")||"";
	data["show-joiner-dialog"] = element.getAttribute("show-joiner-dialog") || undefined;

	telemeet_join.setDataByHost(element, data);
}

async function elementRendered(element) {  _startVideo(telemeet_join.getShadowRootByHost(element)); }

async function toggleVideo(element) {
	const camiconimg = `${COMPONENT_PATH}/img/camera.svg`, nocamiconimg = `${COMPONENT_PATH}/img/nocamera.svg`;
	if (videoOn) {_stopVideo(telemeet_join.getShadowRootByContainedElement(element)); element.src = nocamiconimg;}
	else {await _startVideo(telemeet_join.getShadowRootByContainedElement(element)); element.src = camiconimg;}
}

async function toggleMike(element) {
	const mikeiconimg = `${COMPONENT_PATH}/img/microphone.svg`, nomikeiconimg = `${COMPONENT_PATH}/img/nomicrophone.svg`;
	if (mikeOn) element.src = nomikeiconimg; else element.src = mikeiconimg; mikeOn = !mikeOn;
}

async function joinRoom(hostElement, roomName, roomPass, enterOnly, name) {
	const shadowRoot = telemeet_join.getShadowRootByHost(hostElement);

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

	if (result && await _operateFirewall("allow", enterOnly)) {	// open firewall and join the room add listeners to delete it on close and logouts
		let roomClosed = false;	// room is open now

		const exitListener = (isGuest, isModerator, room, pass, callFromLogout) => {	// delete the room, close FW on moderator exit
			if (!callFromLogout) roomExitListeners.splice(roomExitListeners.indexOf(exitListener), 1);
			if (roomClosed) return;	// already closed
			LOG.info(`Deleting room ${room} due to ${callFromLogout?"moderator logout":"moderator left."}`);
			if (!isGuest && isModerator) apiman.rest(APP_CONSTANTS.API_DELETEROOM, "POST", 
				{room, pass, id: session.get(APP_CONSTANTS.USERID)}, true, false);
			_operateFirewall("disallow", enterOnly); if (videoOn && (!callFromLogout)) _startVideo(shadowRoot);
			roomClosed = true;
		}; roomExitListeners.push(exitListener);

		loginmanager.addLogoutListener(_=>exitListener(!result.isModerator, result.isModerator, roomName, roomPass, true));

		_openTelemeet(result.url, roomPass, hostElement, enterOnly, result.isModerator);
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
		video.srcObject = stream; videoOn = true;
	} catch (err) {
		_showError(await i18n.get("NoCamera", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
		LOG.error(`Unable to access the camera: ${err}`);
	}
}

function _stopVideo(shadowRoot) {
	if (!videoOn) return;
	const video = shadowRoot.querySelector("video#video");
	if (video.srcObject) for (const track of video.srcObject.getTracks()) if (track.readyState == "live") track.stop();
	delete video.srcObject; videoOn = false;
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
		configOverwrite: { startWithVideoMuted: !videoOn, startWithAudioMuted: !mikeOn, 
			remoteVideoMenu: {disableKick: true} },
		interfaceConfigOverwrite: { 
			AUTHENTICATION_ENABLE: false,
			TOOLBAR_BUTTONS: [
				'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'fodeviceselection', 'hangup', 
				'profile', 'chat', 'recording', 'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
				'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts', 'tileview', 'videobackgroundblur', 
				'download', 'help', 'mute-everyone', 'e2ee'
			], 
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
	meetAPI.addEventListener("videoConferenceLeft", _=>{
		telemeet.classList.remove("visible");
		while (telemeet.firstChild) telemeet.removeChild(telemeet.firstChild);	// remove the iframe
		meetAPI.dispose();
		for (const roomExitListener of roomExitListeners) roomExitListener(isGuest, isModerator, roomName, roomPass);
	});

	// modal curtain, show telemeet, and stop local video - as it hits performance otherwise
	const _meetIFrameLoaded = waitTimeout => new Promise((resolve, reject) => {
		let timeWaiting = 0;
		const check = _ => {
			if (shadowRoot.querySelector("div#telemeet > iframe")) resolve(); else {
				if (timeWaiting < waitTimeout) {timeWaiting += 100; setTimeout(check, 100);}
				else reject("Timeout");
			}
		}; check();
	});
	try { await _meetIFrameLoaded(60000); } catch (err) {_showError("Meet API failed to load, timedout."); return;}
	if (videoOn) _stopVideo(shadowRoot);
	const iframedoc = shadowRoot.querySelector("div#telemeet > iframe").contentDocument;
	const linkWatermark = iframedoc.querySelector("a.watermark.leftwatermark"), divWatermark = iframedoc.querySelector("div.watermark.leftwatermark");
	if (linkWatermark) linkWatermark.href = "https://teleworkr.com"; 
	if (divWatermark) divWatermark.style.backgroundImage = "https://tekmonks.com/apps/tekmonks/articles/products/telefamily.md/teleworkr.md/header.md/header.en.png";
	telemeet.classList.add("visible"); 
}

const trueWebComponentMode = false;	// making this false renders the component without using Shadow DOM
export const telemeet_join = {trueWebComponentMode, elementConnected, elementRendered, toggleVideo, toggleMike, joinRoom};
monkshu_component.register("telemeet-join", `${APP_CONSTANTS.APP_PATH}/components/telemeet-join/telemeet-join.html`, telemeet_join);