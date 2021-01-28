/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import {loginmanager} from "./loginmanager.mjs";
import {session} from "/framework/js/session.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

async function changeStatus(status) {
    const req = {id: session.get(APP_CONSTANTS.USERID), status};
    const resp = await apiman.rest(APP_CONSTANTS.API_STATUS, "POST", req, true, false);
    if (!(resp && resp.result)) LOG.error("Status update failed");
    else switch (status) {
        case "Working": document.querySelector("#img").style.boxShadow = "1px 1px 20px -3px #41cf70"; break;
        case "Break": document.querySelector("#img").style.boxShadow = "1px 1px 20px -3px #bdbd00"; break;
        case "Offline": document.querySelector("#img").style.boxShadow = "1px 1px 20px -3px #cc0000"; break;
    }
}

async function changePassword(_element) {
    monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/changepass.html`, true, true, {}, "dialog", ["p1","p2"], async result=>{
        const done = await loginmanager.changepassword(session.get(APP_CONSTANTS.USERID), result.p1);
        if (!done) monkshu_env.components['dialog-box'].error("dialog", await i18n.get("PWCHANGEFAILED"));
        else monkshu_env.components['dialog-box'].hideDialog("dialog");
    });
}

async function showOTPQRCode(_element) {
    const id = session.get(APP_CONSTANTS.USERID).toString(); const title = await i18n.get("Title");
    const qrcode = await apiman.rest(APP_CONSTANTS.API_GETQRCODE, "GET", {id, provider: title}, true, false); if (!qrcode || !qrcode.result) return;
    monkshu_env.components['dialog-box'].showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/changephone.html`, true, true, {img:qrcode.img}, "dialog", ["otpcode"], async result=>{
        const otpValidates = await apiman.rest(APP_CONSTANTS.API_VALIDATE_TOTP, "GET", {totpsec: qrcode.totpsec, otp:result.otpcode, id}, true, false);
        if (!otpValidates||!otpValidates.result) monkshu_env.components['dialog-box'].error("dialog", await i18n.get("PHONECHANGEFAILED"));
        else monkshu_env.components['dialog-box'].hideDialog("dialog");
    });
}

function showLoginMessages() {
    const data = router.getCurrentPageData();
    if (data.showDialog) {
        monkshu_env.components['dialog-box'].showMessage(`${APP_CONSTANTS.DIALOGS_PATH}/message.html`, 
            {message:data.showDialog.message}, "dialog");
        delete data.showDialog; router.setCurrentPageData(data);
    }
}

export const main = {changeStatus, changePassword, showOTPQRCode, showLoginMessages};