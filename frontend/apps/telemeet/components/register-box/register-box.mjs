/** 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 * 
 * Helps with profile registration as well as resets
 */
import {base32} from "./3p/base32.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";
import { APP_CONSTANTS } from "../../js/constants.mjs";

async function elementConnected(element) {
	const data = {};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;

	const memory = register_box.getMemory(element.id);
	memory.totpKey = _getTOTPRandomKey(); data.totpQRCodeData = await _getTOTPQRCode(memory.totpKey);
	data.AuthenticatorMsg = await i18n.get(element.getAttribute("type") == "reset"?"ResetAuthenticatorMsg":"DownloadAuthenticatorMsg");
	data.Password = await i18n.get(element.getAttribute("type") == "reset"?"NewPassword":"Password");
	data.PasswordAgain = await i18n.get(element.getAttribute("type") == "reset"?"NewPasswordAgain":"PasswordAgain");
	data.Submit = await i18n.get(element.getAttribute("type") == "reset"?"Modify":"Register");
	if (element.getAttribute("email") && element.getAttribute("type") == "reset") 
		await _checkAndFillAccountProfile(data, element.getAttribute("email"));

	if (element.id) {
		if (!register_box.datas) register_box.datas = {}; register_box.datas[element.id] = data;
	} else register_box.data = data;
}

async function initialRender(element) {
	if (element.getAttribute("type") != "reset") return;

	// for profile updates OTP is optional
	const otpInput = register_box.getShadowRootByHostId(element.getAttribute("id")).querySelector("input#otp");
	otpInput.removeAttribute("required"); otpInput.removeAttribute("minlength"); otpInput.removeAttribute("oninvalid");
}

async function registerOrUpdate(element) {	
	const id_old = register_box.getHostElement(element).getAttribute("email");
	const shadowRoot = register_box.getShadowRootByContainedElement(element); 
	const memory = register_box.getMemoryByContainedElement(element);

	if (!_doPasswordsMatch(shadowRoot)) {shadowRoot.querySelector("span#error").style.display = "inline"; return;}

	const nameSelector = shadowRoot.querySelector("input#name"); const name = nameSelector.value;
	const idSelector = shadowRoot.querySelector("input#id"); const id = idSelector.value;
	const passSelector = shadowRoot.querySelector("input#pass"); const pass = passSelector.value;
	const orgSelector = shadowRoot.querySelector("input#org"); const org = orgSelector.value;
	const totpCodeSelector = shadowRoot.querySelector("input#otp"); const totpCode = totpCodeSelector.value && totpCodeSelector.value != ""?totpCodeSelector.value:null;
	const routeOnSuccess = register_box.getHostElement(element).getAttribute("routeOnSuccess");
	
	if (!await loginmanager.registerOrUpdate(id_old, name, id, pass, org, totpCode?memory.totpKey:null, totpCode)) shadowRoot.querySelector("span#error").style.display = "inline";
	else router.loadPage(routeOnSuccess, {showDialog: {message: await i18n.get(id_old?"ResetSuccess":"RegisterSuccess")}});
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
	const title = await i18n.get("Title");

	await $$.require("./components/register-box/3p/qrcode.min.js");
	return new Promise(resolve => QRCode.toDataURL(
		`otpauth://totp/${title}?secret=${key}&issuer=TekMonks&algorithm=sha1&digits=6&period=30`, (_, data_url) => resolve(data_url)));
}

async function _checkAndFillAccountProfile(data, email, shadowRoot) {
	const profileData = await loginmanager.getProfileData(email);
	if (!profileData || !profileData.id) router.router.doIndexNavigation();	// bad profile or hack attempt
	else Object.assign(data, profileData);
}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM
export const register_box = {registerOrUpdate, trueWebComponentMode, elementConnected, initialRender}
monkshu_component.register("register-box", `${APP_CONSTANTS.APP_PATH}/components/register-box/register-box.html`, register_box);