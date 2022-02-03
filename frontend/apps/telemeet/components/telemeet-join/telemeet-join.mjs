/**
 * WebRTC meeting component. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {webrtc} from "./lib/webrtc.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {util} from "/framework/js/util.mjs";
import {fwcontrol} from "./lib/fwcontrol.mjs";
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";
import {context_menu} from "./subcomponents/context-menu/context-menu.mjs";
import {dialog_box as DIALOG} from "./subcomponents/dialog-box/dialog-box.mjs";
import {roomconnectionmanager as roomman} from "./lib/roomconnectionmanager.mjs";
import {positionable_html} from "./subcomponents/positionable-html/positionable-html.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta), DIALOGS_PATH = `${COMPONENT_PATH}/dialogs`;
const API_ENTERROOM = APP_CONSTANTS.API_PATH+"/enterroom", API_CREATEROOM = APP_CONSTANTS.API_PATH+"/createroom", 
	API_EDITROOM = APP_CONSTANTS.API_PATH+"/editroom", API_DELETEROOM = APP_CONSTANTS.API_PATH+"/deleteroom", 
	API_EXITROOM = APP_CONSTANTS.API_PATH+"/exitroom", API_GETROOMS = APP_CONSTANTS.API_PATH+"/getrooms", 
	DIV_TELEMEET = "div#telemeet", HOSTID_CONTEXT_MENU = "contextmenu", HOSTID_POSTIONABLE_HTML = "positionablehtml";
let conf, mediaQueryStart, mediaQueryEnd;


async function elementConnected(host) {
	conf = await $$.requireJSON(`${COMPONENT_PATH}/conf/config.json`); 
	mediaQueryStart = `<style>@media only screen and (max-width: ${conf.mobileBreakpoint}) {`; mediaQueryEnd = "}</style>";
	const data = {}; 

	if (host.getAttribute("styleBody")) data.styleBody = `<style>${await telemeet_join.getAttrValue(host, "styleBody")}</style>`;
	data.componentpath = COMPONENT_PATH;
	data.name = host.getAttribute("name")||"";
	data.room = host.getAttribute("room")||"";
	data.pass = host.getAttribute("pass")||"";
	data["show-joiner-dialog"] = host.getAttribute("showJoinerDialog")?.toLowerCase() == "true" ? "true" : undefined;
	if (!data["show-joiner-dialog"]) data.styleBody = (data.styleBody||"")+"<style>div#videodiv{height: 100%}</style>";
	data.MOBILE_MEDIA_QUERY_START = mediaQueryStart; data.MOBILE_MEDIA_QUERY_END = mediaQueryEnd;

	telemeet_join.setDataByHost(host, data);

	const sessionMemory = telemeet_join.getSessionMemory(host.id); 
	if (sessionMemory.videoOn == undefined) sessionMemory.videoOn = true; 
	if (sessionMemory.mikeOn == undefined) sessionMemory.mikeOn = true;
}

async function elementRendered(element) {  
	const shadowRoot = telemeet_join.getShadowRootByHost(element), containedElement = shadowRoot.querySelector(DIV_TELEMEET);
	if (_getSessionMemoryVariable("videoOn", containedElement)) _startVideo(shadowRoot, containedElement);	// cam controls auto show when video starts
	else {_stopVideo(shadowRoot, containedElement); shadowRoot.querySelector("span#camcontrol").classList.add("visible");}	// show cam controls allow user to start cam etc. 
	if (_getSessionMemoryVariable("mikeOn", containedElement)) _startMike(shadowRoot); else _stopMike(shadowRoot);
}

async function toggleVideo(element, isFromMeet) {
	const iconToggleArray = [`${COMPONENT_PATH}/img/camera.svg`, `${COMPONENT_PATH}/img/nocamera.svg`];
	if (isFromMeet) { _toggleIcon(element, iconToggleArray); _executeMeetCommand(element, "toggleVideo"); return; }
	else {
		const videoOn = !_getSessionMemoryVariable("videoOn", element), shadowRoot = telemeet_join.getShadowRootByContainedElement(element);	// toggle it
		if (videoOn) _startVideo(shadowRoot, element); else _stopVideo(shadowRoot, element);
		_setSessionMemoryVariable("videoOn", element, videoOn);
	}
}

async function toggleMike(element, isFromMeet) {
	const iconToggleArray = [`${COMPONENT_PATH}/img/mike.svg`, `${COMPONENT_PATH}/img/nomike.svg`];
	if (isFromMeet) { _toggleIcon(element, iconToggleArray); _executeMeetCommand(element, "toggleAudio"); return; }
	else {
		const mikeOn = !_getSessionMemoryVariable("mikeOn", element), shadowRoot = telemeet_join.getShadowRootByContainedElement(element);	// toggle it
		if (mikeOn) _startMike(shadowRoot); else _stopMike(shadowRoot);
		_setSessionMemoryVariable("mikeOn", element, mikeOn);
	}
}

const exitMeeting = element => _executeMeetCommand(element, "exitMeeting");
const toggleScreenshare = element => _executeMeetCommand(element, "toggleShareScreen");
const toggleRaisehand = element => _executeMeetCommand(element, "toggleRaiseHand");
const toggleTileVsFilmstrip = element => _executeMeetCommand(element, "toggleTileVsFilmstrip");
const changeBackground = element => _executeMeetCommand(element, "changeBackground");

async function createRoom(roomName, roomPass, roomImage, id) {	
	if (roomName.trim() == "") {_showError(await i18n.get("NoRoom")); return;}
	if (roomPass.trim() == "") {_showError(await i18n.get("NoPass")); return;}

	const req = {room: roomName, pass: roomPass, image: roomImage, id};
	const result = await apiman.rest(API_CREATEROOM, "POST", req, true, false);

	if (result && !result.result) {_showError(await i18n.get(
		result.reason=="ROOMEXISTS"?"RoomExistsError":"RoomBadIDError")); return false; }// backend refused
	else if (!result) {_showError(await i18n.get("GenericBackendError")); return false;}
	return true;
}

function joinRoomFromTelemeetInternal(element) {
	const host = telemeet_join.getHostElement(element), shadowRoot = telemeet_join.getShadowRootByHost(host);
	const name = shadowRoot.querySelector("input#name").value, roomPass = shadowRoot.querySelector("input#roompass").value;
	const roomName = shadowRoot.querySelector("input#room").value, id = name;
	joinRoom(host, roomName, roomPass, id, name);
}

async function joinRoom(hostElement, roomName, roomPass, id, name) {	
	if (roomName.trim() == "") {_showError(await i18n.get("NoRoom")); return;};

	const sessionID = self.crypto.randomUUID(), req = {room: roomName, pass: roomPass, id, name, sessionID};
	const result = await apiman.rest(API_ENTERROOM, "GET", req, false, true);
	if (result && !result.result) {	// backend refused
		_showError(await i18n.get(result.reason=="NO_ROOM"?"RoomNotCreatedError":(result.reason=="NO_MODERATOR"?
			"RoomNotOpenError":"RoomPasswordError")));
		return;
	}

	const sessionMemory = telemeet_join.getSessionMemory(hostElement.id);
	if (result && await fwcontrol.operateFirewall("allow", id, sessionMemory)) {	// open firewall and join the room add listeners to delete it on close and logouts
		roomman.startSendingConnectionActiveBeats(roomName, id, sessionID, conf);	// send heartbeats to keep the room alive
		_resetRoomUI();

		const shadowRoot = telemeet_join.getShadowRootByHost(hostElement), divTelemeet = shadowRoot.querySelector(DIV_TELEMEET);
		let roomClosed = false;	_setRoom(divTelemeet, roomName); // room is open now
		let meetingInfoTimer; const exitListener = async (_roomName, callFromLogout) => {	
			if (roomClosed) return;	else roomClosed = true; // return if already closed, else close it
			const exitResult = await apiman.rest(API_EXITROOM, "POST", req, true);	// exit the room
			if (!exitResult || !exitResult.result) LOG.warn(`Room exit failed for ${id} due to ${exitResult.reason}`);
			roomman.stopSendingConnectionActiveBeats(sessionID);	// no need anymore of this
			divTelemeet.classList.remove("visible"); // stop showing the telemeet div
			if (meetingInfoTimer) {clearInterval(meetingInfoTimer); meetingInfoTimer = undefined;}	// stop updating meeting info
			fwcontrol.operateFirewall("disallow", id, sessionMemory); 	// stop firewall*/
			if (sessionMemory.videoOn && (!callFromLogout)) _startVideo(shadowRoot, divTelemeet); 	// restart local video if needed
		}; 
		loginmanager.addLogoutListener(_=>exitListener(roomName, true));

		const memory = _getRoomMemory(divTelemeet, true), spanControls = shadowRoot.querySelector("span#controls"), 
			spanMeetinginfo = shadowRoot.querySelector("span#meetinginfo");
		webrtc.addRoomExitListener(exitListener, memory); 
		webrtc.addRoomEntryListener(_=>{	
			_stopVideo(shadowRoot, divTelemeet, true); 	// stop local video
			DIALOG.hideDialog("telemeetdialog"); divTelemeet.classList.add("visible"); 	// show telemeet div
			spanControls.classList.add("animate"); spanControls.style.opacity = "1";	// animate controls
			spanMeetinginfo.classList.add("animate"); spanMeetinginfo.style.opacity = "1";	// animate meeting info
			meetingInfoTimer = util.setIntervalImmediately(_=>spanMeetinginfo.innerHTML = 			// start showing meeting info
				`${roomName} - ${((Date.now() - result.startTime)/(1000*60)).toFixed(1)} minutes`, conf.meetingDurationUpdateInterval);
		}, memory);
		webrtc.addScreenShareListener(shareOn => shadowRoot.querySelector("img#screensharecontrol").src = 
			`${COMPONENT_PATH}/img/${shareOn?"":"no"}screenshare.svg`, memory);
		webrtc.addSelfRaiseHandListener(handUp => shadowRoot.querySelector("img#raisehandcontrol").src = 
			`${COMPONENT_PATH}/img/${handUp?"":"no"}raisehand.svg`, memory);
		webrtc.addTileVsFilmstripListener(tileView => shadowRoot.querySelector("img#tilevsfilmstripcontrol").src = 
			`${COMPONENT_PATH}/img/${tileView?"filmstrip":"tile"}.svg`, memory);
		webrtc.addNotificationListener(message=>_showWebRTCNotification(message, divTelemeet), memory);
		webrtc.addChatListener(message=>_handleWebRTCChats(message, divTelemeet), memory);

		webrtc.openTelemeet(result.url, roomPass, !result.isModerator, result.isModerator, 
			name, id, sessionMemory.videoOn, sessionMemory.mikeOn, divTelemeet, memory, 
			_getSessionMemoryVariable("avDevices", divTelemeet), conf);

		DIALOG.showDialog(`${DIALOGS_PATH}/waiting.html`, false, false, {componentpath: COMPONENT_PATH, 
			message: await i18n.get("ConferenceLoading")}, "telemeetdialog");
	} else _showError(await i18n.get("InternalError", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
}

async function meetSettings(element, fromMeet) {
	const data = await webrtc.getMediaDevices(); 
	if (!data) {_showError(await i18n.get("MediaDevicesFailed")); return;}; 
	data.componentpath = COMPONENT_PATH; data.hostID = "telemeetdialog"; data.themename = fromMeet?"dark":"light";
	data.MOBILE_MEDIA_QUERY_START = `<style>@media only screen and (max-width: ${conf.mobileBreakpoint}) {`;
	data.MOBILE_MEDIA_QUERY_END = "}</style>";

	const memory = _getRoomMemory(element), exitListener = _ => { DIALOG.hideDialog("telemeetdialog"); 
		webrtc.removeRoomExitListener(exitListener, memory); };
	if (fromMeet) webrtc.addRoomExitListener(exitListener, memory);
	const retVals = await DIALOG.showDialog(`${DIALOGS_PATH}/setupav.html`, 
		false, false, data, "telemeetdialog", ["speaker", "microphone", "camera"]);
	if (fromMeet) webrtc.removeRoomExitListener(exitListener, memory);

	DIALOG.hideDialog("telemeetdialog"); 
	const _devStrToObj = deviceString => { return {label: deviceString.split(",")[0], id: deviceString.split(",")[1]} };
	const devices = {speaker: _devStrToObj(retVals.speaker), microphone: _devStrToObj(retVals.microphone), camera: _devStrToObj(retVals.camera)};
	if (fromMeet) {_executeMeetCommand(element, "setAVDevices", devices); _setSessionMemoryVariable("avDevices", element, devices)}
	else _setSessionMemoryVariable("avDevices", element, devices);
}

async function showChat(element, event, dontClose) {
	if (positionable_html.isShowing(HOSTID_POSTIONABLE_HTML) && (!dontClose)) {
		_getRoomMemory(element).chatUnsentMessage = positionable_html.getShadowRootByHostId(HOSTID_POSTIONABLE_HTML).querySelector("textarea#message").value;
		positionable_html.hide(HOSTID_POSTIONABLE_HTML); delete _getRoomMemory(element).showChatParams; return;
	}
	_getRoomMemory(element).showChatParams = [element, event];	// save in case we get new chats while chat is open
	
	const chatHTML = await $$.requireText(`${DIALOGS_PATH}/chat.html`);
	const chats = _getRoomMemory(element).chats || {items: [{subject: await i18n.get("NoChats"), 
		message: await i18n.get("NoNewChats"), isNew: false}]};
	const unsentMessage = _getRoomMemory(element).chatUnsentMessage || "";
	await positionable_html.show(HOSTID_POSTIONABLE_HTML, chatHTML, event.x, event.y, "-20vw", "1em", 
		{...util.clone(chats), unsentMessage, hostTelemeetJoinID: telemeet_join.getHostElementID(element), 
			component_path: COMPONENT_PATH, MOBILE_MEDIA_QUERY_START: mediaQueryStart, 
			MOBILE_MEDIA_QUERY_END: mediaQueryEnd}, true);
	for (const chat of chats.items) chat.isNew = false;	// all so far are now shown and no longer new
	telemeet_join.getShadowRootByContainedElement(element).querySelector("img#chatcontrol").src = `${COMPONENT_PATH}/img/nochat.svg`;
	const chatsDiv = positionable_html.getShadowRootByHostId(HOSTID_POSTIONABLE_HTML).querySelector("div#chats");
	chatsDiv.scrollTop = chatsDiv.scrollHeight;	// scroll the chats to the bottom by default
}

function sendChatMessage(message, hostID) {
	const containedElement = telemeet_join.getShadowRootByHostId(hostID).querySelector("div#telemeet");
	_executeMeetCommand(containedElement, "sendMeetingMessage", message);
	return true;
}

async function showNotifications(element, event) {
	if (context_menu.isOpen(HOSTID_CONTEXT_MENU)) {context_menu.hideMenu(HOSTID_CONTEXT_MENU); return;}
	
	const notificationsHTML = await $$.requireText(`${DIALOGS_PATH}/notifications.html`);
	const notifications = _getRoomMemory(element).notifications || {items: [{subject: await i18n.get("NoNotifications"), 
		message: await i18n.get("NoNewNotifications"), isNew: false}]};
	context_menu.showMenu(HOSTID_CONTEXT_MENU, notificationsHTML, event.x, event.y, "-20vw", "1em", 
		{...util.clone(notifications), MOBILE_MEDIA_QUERY_START: mediaQueryStart, MOBILE_MEDIA_QUERY_END: mediaQueryEnd}, 
		true, true, true);
	for (const notification of notifications.items) notification.isNew = false;	// all so far are now shown and no longer new
	telemeet_join.getShadowRootByContainedElement(element).querySelector("img#notificationscontrol").src = 
		`${COMPONENT_PATH}/img/nonotifications.svg`;
}

function deleteRoom(room, id) {
	LOG.info(`Deleting room ${room} due to moderator deletion request.`);
	return apiman.rest(API_DELETEROOM, "POST", {room, id}, true, false);
}

function editRoom(oldroom, newroom, newpassword, newimage, id) {
	LOG.info(`Editing room ${oldroom} due to moderator request.`);
	return apiman.rest(API_EDITROOM, "POST", {oldroom, room: newroom, pass: newpassword, image: newimage, id}, 
		true, false);
}

const getRooms = id => apiman.rest(API_GETROOMS, "GET", {id}, true);

async function _startVideo(shadowRoot, containedElement) {
	shadowRoot.querySelector("img#camicon").src = `${COMPONENT_PATH}/img/camera.svg`;
	shadowRoot.querySelector("img#camcontrol").src = `${COMPONENT_PATH}/img/camera.svg`; 
	const video = shadowRoot.querySelector("video#video"); 
	try {
		const stream = await navigator.mediaDevices.getUserMedia({video: true});
		video.srcObject = stream; _setSessionMemoryVariable("videoOn", containedElement, true);
	} catch (err) { _showError(await i18n.get("NoCamera")); LOG.error(`Unable to access the camera: ${err}`); }
}

function _stopVideo(shadowRoot, containedElement, dontSwitchIcons) {
	if (!dontSwitchIcons) {
		shadowRoot.querySelector("img#camicon").src = `${COMPONENT_PATH}/img/nocamera.svg`;
		shadowRoot.querySelector("img#camcontrol").src = `${COMPONENT_PATH}/img/nocamera.svg`; 
	}
	const video = shadowRoot.querySelector("video#video");
	if (video.srcObject) for (const track of video.srcObject.getTracks()) if (track.readyState == "live") track.stop();
	delete video.srcObject; _setSessionMemoryVariable("videoOn", containedElement, false);
}

async function _startMike(shadowRoot) {
	shadowRoot.querySelector("img#mikeicon").src = `${COMPONENT_PATH}/img/mike.svg`;
	shadowRoot.querySelector("img#mikecontrol").src = `${COMPONENT_PATH}/img/mike.svg`; 
}

function _stopMike(shadowRoot) {
	shadowRoot.querySelector("img#mikeicon").src = `${COMPONENT_PATH}/img/nomike.svg`;
	shadowRoot.querySelector("img#mikecontrol").src = `${COMPONENT_PATH}/img/nomike.svg`;
}

const _showError = error => DIALOG.showDialog(`${DIALOGS_PATH}/error.html`, true, false, {error}, 
	"telemeetdialog", [], _=> DIALOG.hideDialog("telemeetdialog"));

function _resetRoomUI() {
	if (positionable_html.isShowing(HOSTID_POSTIONABLE_HTML)) positionable_html.hide(HOSTID_POSTIONABLE_HTML);
}

async function _showWebRTCNotification(message, containedElement) {
	let subject; switch (message.type) {
		case "camera": subject = await i18n.get("CameraSubject"); break;
		case "microphone": subject = await i18n.get("MicrophoneSubject"); break;
		case "browser": subject = await i18n.get("BrowserSubject"); break;
		case "meeting": subject = await i18n.get("MeetingSubject"); break;
		case "webrtcError": subject = await i18n.get("GeneralErrorSubject"); break;
		default: subject = await i18n.get("MeetingSubject"); break;
	}; subject += " - "+new Date().toLocaleString();
	if (!_getRoomMemory(containedElement).notifications) _getRoomMemory(containedElement).notifications = {items:[]};
	_getRoomMemory(containedElement).notifications.items.unshift({subject, message: message.message, isNew: true});
	telemeet_join.getShadowRootByContainedElement(containedElement).querySelector("img#notificationscontrol").src = 
		`${COMPONENT_PATH}/img/notifications.svg`;
}

async function _handleWebRTCChats(message, containedElement) {
	const subject = message.fromName+" - "+new Date().toLocaleString();
	if (!_getRoomMemory(containedElement).chats) _getRoomMemory(containedElement).chats = {items:[]};
	_getRoomMemory(containedElement).chats.items.push({subject, message: message.message, isNew: true});
	telemeet_join.getShadowRootByContainedElement(containedElement).querySelector("img#chatcontrol").src = `${COMPONENT_PATH}/img/chat.svg`;
	if (positionable_html.isShowing(HOSTID_POSTIONABLE_HTML)) showChat(..._getRoomMemory(containedElement).showChatParams, true);
}

const _executeMeetCommand = (containedElement, command, params) => webrtc[command](_getRoomMemory(containedElement), params);
const _getSessionMemoryVariable = (varName, element) => telemeet_join.getSessionMemoryByContainedElement(element)[varName];
const _setSessionMemoryVariable = (varName, element, value) => telemeet_join.getSessionMemoryByContainedElement(element)[varName] = value;
const _toggleIcon = (element, icons) => { if (element.src == icons[0]) element.src = icons[1]; else element.src = icons[0]; }
const _getRoomMemory = (containedElement, reset) => { const room = _getRoom(containedElement), 
	mem = telemeet_join.getMemoryByContainedElement(containedElement); if (!mem[room] || reset) mem[room] = {}; return mem[room]; }
const _getRoom = containedElement => {const shadowRoot = telemeet_join.getShadowRootByContainedElement(containedElement);
	return shadowRoot.querySelector(DIV_TELEMEET).dataset.room;}
const _setRoom = (containedElement, room) => {const shadowRoot = telemeet_join.getShadowRootByContainedElement(containedElement);
	return shadowRoot.querySelector(DIV_TELEMEET).dataset.room = room;}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM
export const telemeet_join = {trueWebComponentMode, elementConnected, elementRendered, toggleVideo, toggleMike, 
	toggleScreenshare, toggleRaisehand, toggleTileVsFilmstrip, createRoom, getRooms, meetSettings, showNotifications, 
	exitMeeting, changeBackground, deleteRoom, editRoom, joinRoom, joinRoomFromTelemeetInternal, showChat, sendChatMessage};
monkshu_component.register("telemeet-join", `${APP_CONSTANTS.APP_PATH}/components/telemeet-join/telemeet-join.html`, telemeet_join);