/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {application} from "./application.mjs";
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

let currTimeout; let logoutListeners = [];

async function signin(id, pass, otp) {
    const pwph = `${id} ${pass}`;
    logoutListeners = [];   // reset listeners on sign in
        
    return new Promise(async (resolve, _reject) => {
        await $$.require(`${APP_CONSTANTS.APP_PATH}/3p/bcrypt.js`);
        dcodeIO.bcrypt.hash(pwph, APP_CONSTANTS.BCRYPT_SALT, async (_err, hash) => {
            const resp = await apiman.rest(APP_CONSTANTS.API_LOGIN, "POST", {pwph: hash, otp}, false, true);
            if (resp && resp.result) {
                session.set(APP_CONSTANTS.USERID, resp.id); 
                session.set(APP_CONSTANTS.USERNAME, resp.name);
                session.set(APP_CONSTANTS.USERORG, resp.org);
                securityguard.setCurrentRole(APP_CONSTANTS.USER_ROLE);
                startAutoLogoutTimer();
                resolve(true);
            } else {LOG.error(`Login failed for ${id}`); resolve(false);}
        });
    });
}

const reset = id => apiman.rest(APP_CONSTANTS.API_RESET, "POST", {id, lang: session.get($$.MONKSHU_CONSTANTS.LANG_ID)});

async function registerOrUpdate(old_id, name, id, pass, org, totpSecret, totpCode) {
    const pwph = `${id} ${pass}`;

    return new Promise(async (resolve, _reject) => {
        await $$.require(`${APP_CONSTANTS.APP_PATH}/3p/bcrypt.js`);
        dcodeIO.bcrypt.hash(pwph, APP_CONSTANTS.BCRYPT_SALT, async (_err, hash) => {
            const req = {name, id, pwph: hash, org, totpSecret, totpCode}; if (old_id) req.old_id = old_id;
            const resp = await apiman.rest(old_id?APP_CONSTANTS.API_UPDATE:APP_CONSTANTS.API_REGISTER, "POST", req, old_id?true:false, true);
            if (resp && resp.result) {
                session.set(APP_CONSTANTS.USERID, id); 
                session.set(APP_CONSTANTS.USERNAME, name);
                session.set(APP_CONSTANTS.USERORG, org);
                securityguard.setCurrentRole(APP_CONSTANTS.USER_ROLE);
                startAutoLogoutTimer();
                resolve(true);
            } else {LOG.error(`${old_id?"Update":"Registration"} failed for ${id}`); resolve(false);}
        });
    });
}

async function changepassword(id, pass) {
    const pwph = `${id} ${pass}`;
        
    return new Promise(async (resolve, _reject) => {
        await $$.require(`${APP_CONSTANTS.APP_PATH}/3p/bcrypt.js`);
        dcodeIO.bcrypt.hash(pwph, APP_CONSTANTS.BCRYPT_SALT, async (_err, hash) => {
            const req = {id}; req[APP_CONSTANTS.PWPH] = hash;
            const resp = await apiman.rest(APP_CONSTANTS.API_CHANGEPW, "POST", req, true, false);
            if (resp && resp.result) resolve(true);
            else {LOG.error(`Password change failed for ${id}`); resolve(false);}
        });
    });
}

const addLogoutListener = listener => logoutListeners.push(listener);

async function logout(dueToTimeout) {
    for (const listener of logoutListeners) await listener();

    const savedLang = session.get($$.MONKSHU_CONSTANTS.LANG_ID);
    _stoptAutoLogoutTimer(); session.destroy(); 
    securityguard.setCurrentRole(APP_CONSTANTS.GUEST_ROLE);
    session.set($$.MONKSHU_CONSTANTS.LANG_ID, savedLang);
    
    if (dueToTimeout) application.main(APP_CONSTANTS.ERROR_HTML, {error: await i18n.get("Timeout_Error"), 
        button: await i18n.get("Relogin"), link: router.encodeURL(APP_CONSTANTS.LOGIN_HTML)}); 
    else application.main(APP_CONSTANTS.LOGIN_HTML);
}

async function getProfileData(id) {
    const resp = await apiman.rest(APP_CONSTANTS.API_GETPROFILE, "GET", {id}, false, true);
    if (resp && resp.result) return resp; else return null;
}

function startAutoLogoutTimer() {
    router.addOnLoadPage(startAutoLogoutTimer);

    if (!session.get(APP_CONSTANTS.USERID)) return; // not logged in
    
    const events = ["load", "mousemove", "mousedown", "click", "scroll", "keypress"];
    const resetTimer = _=> {_stoptAutoLogoutTimer(); currTimeout = setTimeout(_=>logout(true), APP_CONSTANTS.TIMEOUT);}
    for (const event of events) {document.addEventListener(event, resetTimer);}
    resetTimer();   // start the timing
}

async function checkResetSecurity() {
    const id = (await router.getPageData(router.getCurrentURL())).url.e;
    if (!id || id == "") router.doIndexNavigation();
}

function _stoptAutoLogoutTimer() {
    if (currTimeout) {clearTimeout(currTimeout); currTimeout = null;}
}

export const loginmanager = {signin, reset, registerOrUpdate, logout, changepassword, startAutoLogoutTimer, addLogoutListener, getProfileData, checkResetSecurity}