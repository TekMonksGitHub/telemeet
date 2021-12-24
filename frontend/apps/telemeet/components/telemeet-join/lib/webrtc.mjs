/**
 * WebRTC library controller. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {util} from "/framework/js/util.mjs";

const MODULE_PATH = util.getModulePath(import.meta);

async function openTelemeet(url, roomPass, isGuest, isModerator, userName, userEmail, videoOn, mikeOn, 
		parentNode, memory, avDevices) {

	const hostURL = new URL(url), roomName = hostURL.pathname.replace(/^\/+/,"");
	let mappedDevices; if (avDevices) mappedDevices = { audioInput: avDevices.microphone.label,
		audioOutput: avDevices.speaker.label, videoInput: avDevices.camera.label };

	await $$.require(`${MODULE_PATH}/../3p/external_api.js`);
	const meetAPI = new JitsiMeetExternalAPI(hostURL.host, {
		roomName, width: "100%", height: "100%", parentNode, noSSL: false,
		configOverwrite: { 
			startWithVideoMuted: !videoOn, 
			startWithAudioMuted: !mikeOn, 
			remoteVideoMenu: {disableKick: true, disableGrantModerator: true},
			conferenceInfo: {alwaysVisible: [], autoHide: []},
			notifications: [],
			hideParticipantsStats: true,
			disableShowMoreStats: true,
			apiLogLevels: ["warn", "log", "error", "info", "debug"]
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
		remoteVideoMenu: {},
        userInfo: {email: userEmail, displayName: userName},
		devices: mappedDevices
	});
	const _roomExited = _ => {
		const meetIFRame = util.getChildrenByTagName(parentNode, "iframe")[0]; 
		if (meetIFRame) parentNode.removeChild(meetIFRame);	meetAPI.dispose(); delete memory.meetAPI;
		for (const roomExitListener of memory.roomExitListeners||[]) roomExitListener(roomName);
	}; meetAPI.addEventListener("videoConferenceLeft", _roomExited);
	meetAPI.addEventListener("screenSharingStatusChanged", status => {
		for (const screenShareListener of memory.screenShareListeners||[]) screenShareListener(status.on);
	}); 
	meetAPI.addEventListener("raiseHandUpdated", status => {
		for (const raiseHandListener of memory.raiseHandListeners||[]) raiseHandListener(status.handRaised?true:false, status.id);
	}); 
	meetAPI.addEventListener("videoConferenceJoined", _confInfo => {
		for (const roomEntryListener of memory.roomEntryListeners) roomEntryListener(isGuest, isModerator, roomName, roomPass);
	});
	meetAPI.addEventListener("tileViewChanged", status => {
		for (const tileVsFilmstripListener of memory.tileVsFilmstripListeners) tileVsFilmstripListener(status.enabled);
	});
	meetAPI.addEventListener("log", logObject => { if (logObject.logLevel == "warn" || logObject.logLevel == "error") 
		LOG[logObject.logLevel](`[WEB_RTC] ${logObject.args}`) });
	_subscribeNotifications(meetAPI, memory);

	memory.meetAPI = meetAPI;
}

async function getMediaDevices() {
	try {
		_closeStream(await navigator.mediaDevices.getUserMedia({ audio: true, video: true }));	// get permissions
		const retObj = {speakers:[], cameras: [], microphones: []};
		const deviceInfos = await navigator.mediaDevices.enumerateDevices();
		for (const deviceInfo of deviceInfos) 
			if (deviceInfo.kind == "videoinput") retObj.cameras.push(deviceInfo);
			else if (deviceInfo.kind == "audioinput") retObj.microphones.push(deviceInfo);
			else if (deviceInfo.kind == "audiooutput") retObj.speakers.push(deviceInfo);
			else LOG.error(`Unknown AV device encountered ${JSON.stringify(deviceInfo)}`);
		return retObj;
	} catch (err) { LOG.error("Error getting AV device list "+err); return null; }
}

const addRoomEntryListener = (listener, memory) => memory.roomEntryListeners ?
	memory.roomEntryListeners.push(listener) : memory.roomEntryListeners=[listener];
const addRoomExitListener = (listener, memory) => memory.roomExitListeners ?
	memory.roomExitListeners.push(listener) : memory.roomExitListeners=[listener];
const removeRoomExitListener = (listener, memory) => { if (memory.roomExitListeners && memory.roomExitListeners.indexOf(listener) != -1)
	memory.roomExitListeners.splice(memory.roomExitListeners.indexOf(listener),1); }
const addScreenShareListener = (listener, memory) => memory.screenShareListeners ?
	memory.screenShareListeners.push(listener) : memory.screenShareListeners=[listener];
const addRaiseHandListener = (listener, memory) => memory.raiseHandListeners ?
	memory.raiseHandListeners.push(listener) : memory.raiseHandListeners=[listener];
const addTileVsFilmstripListener = (listener, memory) => memory.tileVsFilmstripListeners ?
	memory.tileVsFilmstripListeners.push(listener) : memory.tileVsFilmstripListeners=[listener];
const addNotificationListener = (listener, memory) => memory.notificationListeners ?
	memory.notificationListeners.push(listener) : memory.notificationListeners=[listener];

const toggleAudio = memory => _executeMeetCommand(memory, "toggleAudio");
const toggleVideo = memory => _executeMeetCommand(memory, "toggleVideo");
const toggleShareScreen = memory => _executeMeetCommand(memory, "toggleShareScreen");
const toggleRaiseHand = memory => _executeMeetCommand(memory, "toggleRaiseHand");
const toggleTileVsFilmstrip = memory => _executeMeetCommand(memory, "toggleTileView");
const changeBackground = memory => _executeMeetCommand(memory, "toggleVirtualBackgroundDialog");
const exitMeeting = memory => {_executeMeetCommand(memory, "hangup"); delete memory.meetAPI;}
const setAVDevices = (memory, devices) => {
	_executeMeetCommand(memory, "setAudioInputDevice", [devices.microphone.label,devices.microphone.id]);
	_executeMeetCommand(memory, "setAudioOutputDevice", [devices.speaker.label,devices.speaker.id]);
	_executeMeetCommand(memory, "setVideoInputDevice", [devices.camera.label,devices.camera.id]);
}

async function _executeMeetCommand(memory, command, params) {
	if (memory.meetAPI[command]) return await memory.meetAPI[command](...(params||[]));	// it is a function call
	else if (memory.meetAPI) memory.meetAPI.executeCommand(command, ...(params||[])); // it is a command
}

function _closeStream(stream) { for (const track of stream.getTracks()) {track.stop(); stream.removeTrack(track);} }

function _subscribeNotifications(meetAPI, memory) {
	const _dispatchEvent = message => {for (const notificationListener of memory.notificationListeners) notificationListener(message)};

	meetAPI.addEventListener("cameraError", event => _dispatchEvent({message: event.message, type: "camera"}));
	meetAPI.addEventListener("browserSupported", async event => {
		if (!event.supported) _dispatchEvent({message: await i18n.get("UnsupportedBrowser"), type: "browser"}) });
	meetAPI.addEventListener("errorOccurred", event => _dispatchEvent({message: event.message, type: "webrtcError"}));
	meetAPI.addEventListener("micError", event => _dispatchEvent({message: event.message, type: "microphone"}));
	meetAPI.addEventListener("dominantSpeakerChanged", async event => _dispatchEvent({
		message: meetAPI.getDisplayName(event.id)+" "+await i18n.get("NowTheSpeaker"), type: "meeting"}));
	meetAPI.addEventListener("raiseHandUpdated", async event => {if (event.handRaised!=0) _dispatchEvent({
		message: meetAPI.getDisplayName(event.id)+" "+await i18n.get("HasRaisedHand"), type: "meeting"}) });
}

export const webrtc = {openTelemeet, addRoomEntryListener, addRoomExitListener, removeRoomExitListener, 
	addScreenShareListener, addRaiseHandListener, addTileVsFilmstripListener, toggleAudio, toggleVideo, 
	toggleShareScreen, toggleRaiseHand, toggleTileVsFilmstrip, exitMeeting, changeBackground, getMediaDevices, 
	setAVDevices, addNotificationListener};