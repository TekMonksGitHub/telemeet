/**
 * WebRTC meeting component. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {webrtc} from "./lib/webrtc.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {util} from "/framework/js/util.mjs";
import {fwcontrol} from "./lib/fwcontrol.mjs";
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
	if (isFromMeet) { _toggleIcon(element, iconToggleArray); _executeMeetCommand(element, "toggleVideo"); return; }
	
	// no meeting open, this is for our prejoin conditions now.
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	if (_getMemoryVariable("videoOn", element)) _stopVideo(telemeet_join.getShadowRootByContainedElement(element), element); 
	else await _startVideo(telemeet_join.getShadowRootByContainedElement(element), element); 
	_toggleIcon(element, iconToggleArray); _toggleIcon(shadowRoot.querySelector("div#telemeet img#camcontrol"), iconToggleArray);
}

async function toggleMike(element, isFromMeet) {
	const iconToggleArray = [`${COMPONENT_PATH}/img/mike.svg`, `${COMPONENT_PATH}/img/nomike.svg`];
	if (isFromMeet) { _toggleIcon(element, iconToggleArray); _executeMeetCommand(element, "toggleAudio"); return; }
	
	// no meeting open, this is for our prejoin conditions now.
	const shadowRoot = telemeet_join.getShadowRootByContainedElement(element);
	_toggleIcon(element, iconToggleArray); _toggleIcon(shadowRoot.querySelector("div#telemeet img#mikecontrol"), iconToggleArray);
	_setMemoryVariable("mikeOn", element, !_getMemoryVariable("mikeOn", element));
}

const exitMeeting = element => _executeMeetCommand(element, "exitMeeting");

function toggleScreenshare(element) {
	_executeMeetCommand(element, "toggleShareScreen");
	_toggleIcon(element, [`${COMPONENT_PATH}/img/screenshare.svg`, `${COMPONENT_PATH}/img/noscreenshare.svg`]); 
}

async function joinRoom(hostElement, roomName, roomPass, enterOnly, name) {
	const shadowRoot = telemeet_join.getShadowRootByHost(hostElement), divTelemeet = shadowRoot.querySelector("div#telemeet"),
		memory = telemeet_join.getMemoryByContainedElement(divTelemeet);

	if (enterOnly) session.set(APP_CONSTANTS.USERNAME, name);	// guest entry, set user name
	
	if (roomName.trim() == "") {_showError(await i18n.get("NoRoom")); return;}
	if (roomPass.trim() == "") {_showError(await i18n.get("NoPass")); return;}

	const req = {room: roomName, pass: roomPass, id: session.get(APP_CONSTANTS.USERID)};
	const result = await apiman.rest(enterOnly?APP_CONSTANTS.API_ENTERROOM:APP_CONSTANTS.API_CREATEROOM, 
		enterOnly?"GET":"POST", req, enterOnly?false:true, enterOnly?true:false);

	if (result && !result.result) {	// backend refused
		_showError(await i18n.get(enterOnly?(result.failureReason=="NO_ROOM"?"RoomNotCreatedError":"RoomPasswordError"):"RoomExistsPasswordError"));
		return;
	}

	const sessionMemory = telemeet_join.getSessionMemory(hostElement.id), id = session.get(enterOnly?APP_CONSTANTS.USERNAME:APP_CONSTANTS.USERID)
	if (result && await fwcontrol.operateFirewall("allow", id, sessionMemory)) {	// open firewall and join the room add listeners to delete it on close and logouts
		let roomClosed = false;	// room is open now

		const exitListener = (isGuest, isModerator, room, pass, callFromLogout) => {	// delete the room, close FW on moderator exit
			if (roomClosed) return;	else roomClosed = true; // return if already closed, else close it
			divTelemeet.classList.remove("visible");	// stop showing the telemeet div
			LOG.info(`Deleting room ${room} due to ${callFromLogout?"moderator logout":"moderator left."}`);
			if (!isGuest && isModerator) apiman.rest(APP_CONSTANTS.API_DELETEROOM, "POST",	// tell backend room is gone 
				{room, pass, id: session.get(APP_CONSTANTS.USERID)}, true, false);
			fwcontrol.operateFirewall("disallow", id, sessionMemory); 	// stop firewall
			if (memory.videoOn && (!callFromLogout)) _startVideo(shadowRoot, divTelemeet); 	// restart local video if needed
		}; 
		loginmanager.addLogoutListener(_=>exitListener(!result.isModerator, result.isModerator, roomName, roomPass, true));
		webrtc.addRoomExitListener(exitListener, memory); 

		webrtc.addRoomEntryListener(_=>{	
			const videoState = memory.videoOn; _stopVideo(shadowRoot, divTelemeet); memory.videoOn = videoState;
			divTelemeet.classList.add("visible");
		}, memory);

		webrtc.addScreenShareListener(shareOn => shadowRoot.querySelector("img#screensharecontrol").src = 
			`${COMPONENT_PATH}/img/${shareOn?"":"no"}screenshare.svg`, memory);

		webrtc.openTelemeet(result.url, roomPass, enterOnly, result.isModerator, 
			session.get(APP_CONSTANTS.USERNAME), session.get(APP_CONSTANTS.USERID), memory.videoOn, 
			memory.mikeOn, divTelemeet, memory);
	} else _showError(await i18n.get("InternalError", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
}

const _executeMeetCommand = (containedElement, command, params) => webrtc[command](
	telemeet_join.getMemoryByContainedElement(containedElement), params);

async function _startVideo(shadowRoot, containedElement) {
	if (_getMemoryVariable("videoOn", containedElement)) return;
	const video = shadowRoot.querySelector("video#video"); 
	try {
		const stream = await navigator.mediaDevices.getUserMedia({video: true});
		video.srcObject = stream; _setMemoryVariable("videoOn", containedElement, true);
	} catch (err) {
		_showError(await i18n.get("NoCamera", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
		LOG.error(`Unable to access the camera: ${err}`);
	}
}

function _stopVideo(shadowRoot, containedElement) {
	if (!_getMemoryVariable("videoOn", containedElement)) return;
	const video = shadowRoot.querySelector("video#video");
	if (video.srcObject) for (const track of video.srcObject.getTracks()) if (track.readyState == "live") track.stop();
	delete video.srcObject; _setMemoryVariable("videoOn", containedElement, false);
}

function _showError(error) {
	monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/error.html`, true, false,
		{error}, "dialog", [], _=> monkshu_env.components['dialog-box'].hideDialog("dialog"));
}

const _getMemoryVariable = (varName, element) => telemeet_join.getMemoryByContainedElement(element)[varName];
const _setMemoryVariable = (varName, element, value) => telemeet_join.getMemoryByContainedElement(element)[varName] = value;
const _toggleIcon = (element, icons) => { if (element.src == icons[0]) element.src = icons[1]; else element.src = icons[0]; }

const trueWebComponentMode = false;	// making this false renders the component without using Shadow DOM
export const telemeet_join = {trueWebComponentMode, elementConnected, elementRendered, toggleVideo, toggleMike, 
	toggleScreenshare, joinRoom, exitMeeting};
monkshu_component.register("telemeet-join", `${APP_CONSTANTS.APP_PATH}/components/telemeet-join/telemeet-join.html`, telemeet_join);