/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {loginmanager} from "./loginmanager.mjs";
import {session} from "/framework/js/session.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

async function changeStatus(status) {
    const req = {id: session.get(APP_CONSTANTS.USERID), status};
    const resp = await apiman.rest(APP_CONSTANTS.API_STATUS, "POST", req, true, false);
    if (!(resp && resp.result)) LOG.error("Status update failed");
}

async function changePassword(_element) {
    monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/changepass.html`, true, true, {}, "dialog", ["p1","p2"], async result=>{
        const done = await loginmanager.changepassword(session.get(APP_CONSTANTS.USERID), result.p1);
        if (!done) monkshu_env.components['dialog-box'].error("dialog", 
            await i18n.get("PWCHANGEFAILED", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
        else monkshu_env.components['dialog-box'].hideDialog("dialog");
    });
}

async function showOTPQRCode(_element) {
    const id = session.get(APP_CONSTANTS.USERID).toString(); const title = await i18n.get("Title", session.get($$.MONKSHU_CONSTANTS.LANG_ID));
    const qrcode = await apiman.rest(APP_CONSTANTS.API_GETQRCODE, "GET", {id, provider: title}, true, false); if (!qrcode || !qrcode.result) return;
    monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/changephone.html`, true, true, {img:qrcode.img}, "dialog", ["otpcode"], async result=>{
        const otpValidates = await apiman.rest(APP_CONSTANTS.API_VALIDATE_TOTP, "GET", {totpsec: qrcode.totpsec, otp:result.otpcode, id}, true, false);
        if (!otpValidates||!otpValidates.result) monkshu_env.components['dialog-box'].error("dialog", 
            await i18n.get("PHONECHANGEFAILED", session.get($$.MONKSHU_CONSTANTS.LANG_ID)));
        else monkshu_env.components['dialog-box'].hideDialog("dialog");
    });
}

export const main = {changeStatus, changePassword, showOTPQRCode};