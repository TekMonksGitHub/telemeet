/**
 * WebRTC library controller. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {util} from "/framework/js/util.mjs";

const MODULE_PATH = util.getModulePath(import.meta);

async function openTelemeet(url, roomPass, isGuest, isModerator, userName, userEmail, videoOn, mikeOn, parentNode, memory) {
    const hostURL = new URL(url), roomName = hostURL.pathname.replace(/^\/+/,"");
	await $$.require(`${MODULE_PATH}/../3p/external_api.js`);
	const meetAPI = new JitsiMeetExternalAPI(hostURL.host, {
		roomName, width: "100%", height: "100%", parentNode, noSSL: false,
		configOverwrite: { 
			startWithVideoMuted: !videoOn, 
			startWithAudioMuted: !mikeOn, 
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
        userInfo: { email: userEmail, displayName: userName}
	});
	const _roomExited = _ => {
		parentNode.removeChild(util.getChildrenByTagName(parentNode, "iframe")[0]);	// remove the iframe
		meetAPI.dispose(); 
        for (const roomExitListener of memory.roomExitListeners||[]) roomExitListener(isGuest, isModerator, roomName, roomPass);
	}; meetAPI.addEventListener("videoConferenceLeft", _roomExited);
	meetAPI.addEventListener("screenSharingStatusChanged", status => {
        for (const screenShareListener of memory.screenShareListeners||[]) screenShareListener(status.on);
    }); 

	// show telemeet, and stop local video - as it hits performance otherwise
	memory.meetAPI = meetAPI; 
    for (const roomEntryListener of memory.roomEntryListeners) roomEntryListener(isGuest, isModerator, roomName, roomPass);
}

const addRoomEntryListener = (listener, memory) => memory.roomEntryListeners ?
    memory.roomEntryListeners.push(listener) : memory.roomEntryListeners=[listener];

const addRoomExitListener = (listener, memory) => memory.roomExitListeners ?
    memory.roomExitListeners.push(listener) : memory.roomExitListeners=[listener];

const addScreenShareListener = (listener, memory) => memory.screenShareListeners ?
    memory.screenShareListeners.push(listener) : memory.screenShareListeners=[listener];

const toggleAudio = memory => _executeMeetCommand(memory, "toggleAudio");
const toggleVideo = memory => _executeMeetCommand(memory, "toggleVideo");
const toggleShareScreen = memory => _executeMeetCommand(memory, "toggleShareScreen");
const exitMeeting = memory => {_executeMeetCommand(memory, "hangup"); delete memory.meetAPI;}

function _executeMeetCommand(memory, command, params) {
    if (memory.meetAPI) memory.meetAPI.executeCommand(command, ...(params||[]));
}

export const webrtc = {openTelemeet, addRoomEntryListener, addRoomExitListener, addScreenShareListener, 
    toggleAudio, toggleVideo, toggleShareScreen, exitMeeting};