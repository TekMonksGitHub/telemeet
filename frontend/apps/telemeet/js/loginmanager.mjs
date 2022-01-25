/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {application} from "./application.mjs";
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

let currTimeout, logoutListeners = [];

async function signin(id, pass, otp) {
    const pwph = `${id} ${pass}`;
    logoutListeners = [];   // reset listeners on sign in
        
    const resp = await apiman.rest(APP_CONSTANTS.API_LOGIN, "POST", {pwph, otp, id}, false, true);
    if (resp && resp.result) {
        session.set(APP_CONSTANTS.USERID, resp.id); 
        session.set(APP_CONSTANTS.USERNAME, resp.name);
        session.set(APP_CONSTANTS.USERORG, resp.org);
        session.set("__org_telemeet_cuser_pass", pass);
        securityguard.setCurrentRole(resp.role);
        return true;
    } else {LOG.error(`Login failed for ${id}`); return false;}
}

const reset = id => apiman.rest(APP_CONSTANTS.API_RESET, "GET", {id, lang: i18n.getSessionLang()});

async function registerOrUpdate(old_id, name, id, pass, org, totpSecret, totpCode, role, approved) {
    const pwph = `${id} ${pass||session.get("__org_telemeet_cuser_pass")}`;

    const req = {old_id, name, id, pwph, org, totpSecret, totpCode, role, approved}; 
    const resp = await apiman.rest(old_id?APP_CONSTANTS.API_UPDATE:APP_CONSTANTS.API_REGISTER, "POST", req, old_id?true:false, true);
    if (resp && resp.result) {
        session.set(APP_CONSTANTS.USERID, id); 
        session.set(APP_CONSTANTS.USERNAME, name);
        session.set(APP_CONSTANTS.USERORG, org);
        session.set("__org_telemeet_cuser_pass", pass);
        securityguard.setCurrentRole(resp.role);
        return true;
    } else {LOG.error(`${old_id?"Update":"Registration"} failed for ${id}`); return false;}
}

async function changepassword(id, pass) {
    const pwph = `${id} ${pass}`;
        
    const resp = await apiman.rest(APP_CONSTANTS.API_CHANGEPW, "POST", {id, pwph}, true, false);
    if (resp && resp.result) return true;
    else {LOG.error(`Password change failed for ${id}`); return false;}
}

const addLogoutListener = listener => logoutListeners.push(listener);

async function logout(dueToTimeout) {
    for (const listener of logoutListeners) await listener();

    const savedLang = session.get($$.MONKSHU_CONSTANTS.LANG_ID);
    _stopAutoLogoutTimer(); session.destroy(); 
    securityguard.setCurrentRole(APP_CONSTANTS.GUEST_ROLE);
    session.set($$.MONKSHU_CONSTANTS.LANG_ID, savedLang);
    
    if (dueToTimeout) application.main(APP_CONSTANTS.ERROR_HTML, {error: await i18n.get("Timeout_Error"), 
        button: await i18n.get("Relogin"), link: router.encodeURL(APP_CONSTANTS.LOGIN_HTML)}); 
    else application.main(APP_CONSTANTS.LOGIN_HTML);
}

async function checkResetSecurity() {
    const pageData = await router.getPageData(router.getCurrentURL()); 
    if (!pageData.url.e || pageData.url.e == "" || !pageData.url.t || pageData.url.e == "") router.doIndexNavigation();
}

const getSessionUser = _ => { return {id: session.get(APP_CONSTANTS.USERID), name: session.get(APP_CONSTANTS.USERNAME),
    org: session.get(APP_CONSTANTS.USERORG)} }

async function getProfileData(id, time) {
    const resp = await apiman.rest(APP_CONSTANTS.API_GETPROFILE, "GET", {id, time}, false, true);
    if (resp && resp.result) return resp; else return null;
}

function startAutoLogoutTimer() { return;
    if (!session.get(APP_CONSTANTS.USERID)) return; // no one is logged in
    
    const events = ["load", "mousemove", "mousedown", "click", "scroll", "keypress"];
    const resetTimer = _=> {_stopAutoLogoutTimer(); currTimeout = setTimeout(_=>logout(true), APP_CONSTANTS.TIMEOUT);}
    for (const event of events) {document.addEventListener(event, resetTimer);}
    resetTimer();   // start the timing
}

const interceptPageLoad = _ => router.addOnLoadPage("*", startAutoLogoutTimer); 

const _stopAutoLogoutTimer = _ => { if (currTimeout) {clearTimeout(currTimeout); currTimeout = null;} }

export const loginmanager = {signin, reset, registerOrUpdate, logout, changepassword, startAutoLogoutTimer, 
    addLogoutListener, getProfileData, checkResetSecurity, getSessionUser, interceptPageLoad}