/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {base32} from "./3p/base32.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

async function elementConnected(element) {
	const data = {};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;

	const memory = register_box.getMemory(element.id);
	memory.totpKey = _getTOTPRandomKey(); data.totpQRCodeData = await _getTOTPQRCode(memory.totpKey);
	
	if (element.id) {
		if (!register_box.datas) register_box.datas = {}; register_box.datas[element.id] = data;
	} else register_box.data = data;
}

async function register(element) {	
	const shadowRoot = register_box.getShadowRootByContainedElement(element); 
	const memory = register_box.getMemoryByContainedElement(element);

	if (!_doPasswordsMatch(shadowRoot)) {shadowRoot.querySelector("span#error").style.display = "inline"; return;}

	const nameSelector = shadowRoot.querySelector("input#name"); const name = nameSelector.value;
	const idSelector = shadowRoot.querySelector("input#id"); const id = idSelector.value;
	const passSelector = shadowRoot.querySelector("input#pass"); const pass = passSelector.value;
	const orgSelector = shadowRoot.querySelector("input#org"); const org = orgSelector.value;
	const totpCodeSelector = shadowRoot.querySelector("input#otp"); const totpCode = totpCodeSelector.value;
	const routeOnSuccess = register_box.getHostElement(element).getAttribute("routeOnSuccess");
	
	if (!await loginmanager.register(name, id, pass, org, memory.totpKey, totpCode)) shadowRoot.querySelector("span#error").style.display = "inline";
	else router.loadPage(routeOnSuccess);
}

function _doPasswordsMatch(shadowRoot) {
	const passSelector = shadowRoot.querySelectorAll("input#pass");
	return passSelector[0].value == passSelector[1].value;
}

function _getTOTPRandomKey() {
	const randomBytes = window.crypto.getRandomValues(new Uint8Array(20));
	const key = base32.encode(randomBytes, "RFC3548"); return key;
}

async function _getTOTPQRCode(key) {
	const title = await i18n.get("Title", session.get($$.MONKSHU_CONSTANTS.LANG_ID));

	await $$.require("./components/register-box/3p/qrcode.min.js");
	return new Promise(resolve => QRCode.toDataURL(
		`otpauth://totp/${title}?secret=${key}&issuer=TekMonks&algorithm=sha1&digits=6&period=30`, (_, data_url) => resolve(data_url)));
}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM
export const register_box = {register, trueWebComponentMode, elementConnected}
monkshu_component.register("register-box", `${APP_CONSTANTS.APP_PATH}/components/register-box/register-box.html`, register_box);