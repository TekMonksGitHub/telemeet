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
	apiman.registerAPIKeys(APP_CONSTANTS.API_KEYS, APP_CONSTANTS.KEY_HEADER);
	const decodedURL = new URL(router.decodeURL(window.location.href));

	if (decodedURL.href.startsWith(APP_CONSTANTS.INDEX_HTML)) {
		const params = decodedURL.searchParams; const test = params.get("join");
		if (test || test == "") router.loadPage(`${APP_CONSTANTS.LOGIN_ROOM_HTML}?room=${test}&name=${params.get("name")||""}&pass=${params.get("pass")||""}`);
	}

	if (securityguard.isAllowed(decodedURL.href)) router.loadPage(decodedURL.href);
	else router.loadPage(APP_CONSTANTS.REGISTER_HTML);
}

export const application = {init, main};