/** 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed license file.
 * 
 * Helps with profile registration as well as resets
 */
import {base32} from "./3p/base32.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {util} from "/framework/js/util.mjs";
import {router} from "/framework/js/router.mjs";
import {loginmanager} from "../../js/loginmanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta);
let conf;

async function elementConnected(element) {
	conf = await $$.requireJSON(`${COMPONENT_PATH}/conf/config.json`);
	const data = {};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;

	const memory = register_box.getMemory(element.id), type = element.getAttribute("type");
	memory.totpKey = _getTOTPRandomKey(); data.totpQRCodeData = await _getTOTPQRCode(memory.totpKey); memory.type = type;
	data.AuthenticatorMsg = await i18n.get(type == "reset"?"ResetAuthenticatorMsg":"DownloadAuthenticatorMsg");
	data.Password = await i18n.get(type == "reset"?"NewPassword":"Password");
	data.PasswordAgain = await i18n.get(type == "reset"?"NewPasswordAgain":"PasswordAgain");
	data.Submit = await i18n.get(type == "reset"?"Modify" : type=="initial" ? "SignIn" : "Register");
	data.minlength = element.getAttribute("minlength"); data.initial = type == "initial"?true:undefined;
	data.reset = type == "reset"?true:undefined;
	if (element.getAttribute("email") && element.getAttribute("time") && (type == "reset" || type == "initial")) 
		await _checkAndFillAccountProfile(data, element.getAttribute("email"), element.getAttribute("time"));
	data.MOBILE_MEDIA_QUERY_START = `<style>@media only screen and (max-width: ${conf.mobileBreakpoint}) {`;
	data.MOBILE_MEDIA_QUERY_END = "}</style>";

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
	const shadowRoot = register_box.getShadowRootByContainedElement(element); if (!_validateForm(shadowRoot)) return;
	const memory = register_box.getMemoryByContainedElement(element);

	const nameSelector = shadowRoot.querySelector("input#name"); const name = nameSelector.value;
	const idSelector = shadowRoot.querySelector("input#id"); const id = idSelector.value;
	const id_old = register_box.getHostElement(element).getAttribute("email") ? shadowRoot.querySelector("input#oldid").value : undefined;
	const passSelector = shadowRoot.querySelector("password-box#pass1"); const pass = passSelector.value;
	const orgSelector = shadowRoot.querySelector("input#org"); const org = orgSelector.value;
	const totpCodeSelector = shadowRoot.querySelector("input#otp"); const totpCode = totpCodeSelector.value && totpCodeSelector.value != ""?totpCodeSelector.value:null;
	const routeOnSuccess = register_box.getHostElement(element).getAttribute("routeOnSuccess");
	const dataOnSuccess = JSON.parse(register_box.getHostElement(element).getAttribute("dataOnSuccess")||"{}");

	if (!await loginmanager.registerOrUpdate(id_old, name, id, pass, org, totpCode?memory.totpKey:null, totpCode)) 
		shadowRoot.querySelector("span#error").style.display = "inline"; 
	else router.loadPage(routeOnSuccess, dataOnSuccess);
}

function _validateForm(shadowRoot) {
	const name = shadowRoot.querySelector("input#name"), id = shadowRoot.querySelector("input#id"),
		pass1 = shadowRoot.querySelector("password-box#pass1"), pass2 = shadowRoot.querySelector("password-box#pass2"),
		org = shadowRoot.querySelector("input#org"), otp = shadowRoot.querySelector("input#otp"); 

	if (!name.checkValidity()) {name.reportValidity(); return false;}
	if (!id.checkValidity()) {id.reportValidity(); return false;}
	if (!pass1.checkValidity()) {pass1.reportValidity(); return false;}
	if (!pass2.checkValidity()) {pass2.reportValidity(); return false;}
	if (!org.checkValidity()) {org.reportValidity(); return false;}
	if (!otp.checkValidity()) {otp.reportValidity(); return false;}
	if (!_doPasswordsMatch(shadowRoot)) {shadowRoot.querySelector("span#error").style.display = "inline"; return false;}

	return true;
}

function _doPasswordsMatch(shadowRoot) {
	const pass1 = shadowRoot.querySelector("password-box#pass1"), pass2 = shadowRoot.querySelector("password-box#pass2")
	return pass1.value == pass2.value;
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

async function _checkAndFillAccountProfile(data, email, time) {
	const profileData = await loginmanager.getProfileData(email, time);
	if (!profileData || !profileData.id) router.doIndexNavigation();	// bad profile or hack attempt
	else Object.assign(data, profileData);
}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM
export const register_box = {registerOrUpdate, trueWebComponentMode, elementConnected, initialRender}
monkshu_component.register("register-box", `${APP_CONSTANTS.APP_PATH}/components/register-box/register-box.html`, register_box);