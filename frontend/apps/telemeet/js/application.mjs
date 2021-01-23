/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
 
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const init = async _ => {
	window.APP_CONSTANTS = (await import ("./constants.mjs")).APP_CONSTANTS;
	window.LOG = (await import ("/framework/js/log.mjs")).LOG;
	if (!session.get($$.MONKSHU_CONSTANTS.LANG_ID)) session.set($$.MONKSHU_CONSTANTS.LANG_ID, "en");
	securityguard.setPermissionsMap(APP_CONSTANTS.PERMISSIONS_MAP);
	securityguard.setCurrentRole(securityguard.getCurrentRole() || APP_CONSTANTS.GUEST_ROLE);
}

const main = async _ => {
	apiman.registerAPIKeys(APP_CONSTANTS.API_KEYS, APP_CONSTANTS.KEY_HEADER); await _addPageLoadInterceptors();
	const decodedURL = new URL(router.decodeURL(window.location.href)), justURL = decodedURL.href.split("?")[0];

	if (justURL == APP_CONSTANTS.INDEX_HTML) {
		const params = decodedURL.searchParams; const test = params.get("join");
		if (test || test == "") router.loadPage(`${APP_CONSTANTS.LOGIN_ROOM_HTML}?room=${test}&name=${params.get("name")||""}&pass=${params.get("pass")||""}`);
		else router.loadPage(APP_CONSTANTS.REGISTER_HTML);
	} else if (securityguard.isAllowed(justURL)) {
		if (decodedURL.toString() == router.getLastSessionURL().toString()) router.reload();
		else router.loadPage(decodedURL.href);
	} else router.loadPage(APP_CONSTANTS.REGISTER_HTML);
}

async function _addPageLoadInterceptors() {
	const interceptors = await(await fetch(`${APP_CONSTANTS.APP_PATH}/conf/pageLoadInterceptors.json`)).json();
	for (const interceptor of interceptors) {
		const modulePath = interceptor.module, functionName = interceptor.function;
		let module = await import(`${APP_CONSTANTS.APP_PATH}/${modulePath}`); module = module[Object.keys(module)[0]];
		(module[functionName])();
	}
}


export const application = {init, main};