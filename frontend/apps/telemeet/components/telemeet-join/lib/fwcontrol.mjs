/**
 * Firewall controller. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const API_FWCONTROL = APP_CONSTANTS.API_PATH+"/fwcontrol", FW_HEARTBEATINTERVAL = 1000;

async function operateFirewall(operation, id, sessionMemory) {
	if (operation == "disallow") _stopBackendHeartbeats(sessionMemory);	// this will auto close the firewall after heartbeat timeout, as we open it in heartbeat mode
	const req = {id, operation, ip:await _getPublicIP(), mode:"heartbeat_mode"};
	const result = await apiman.rest(API_FWCONTROL, "POST", req, true, false);
	if (result && result.result && operation == "allow") _startBackendHeartbeats(id, sessionMemory);
	return result?result.result:false;
}

function _stopBackendHeartbeats(sessionMemory) {
	if (sessionMemory.heartbeatTimer) { for (const timer of sessionMemory.heartbeatTimer) clearInterval(timer); sessionMemory.heartbeatTimer = []; }
}

function _startBackendHeartbeats(id, sessionMemory) {
	_stopBackendHeartbeats(sessionMemory); sessionMemory.heartbeatTimer = sessionMemory.heartbeatTimer || [];
	sessionMemory.heartbeatTimer.push(setInterval(operateFirewall, FW_HEARTBEATINTERVAL, "keepopen", id, sessionMemory));
}

async function _getPublicIP() {
	let data = await $$.requireText("https://www.cloudflare.com/cdn-cgi/trace"); 
	data = data.replace(/[\r\n]+/g, '","').replace(/\=+/g, '":"'); 
	data = '{"' + data.slice(0, data.lastIndexOf('","')) + '"}';
	data = JSON.parse(data);
	return data.ip;
}

export const fwcontrol = {operateFirewall};