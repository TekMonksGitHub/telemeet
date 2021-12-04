/** 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import {loginmanager} from "./loginmanager.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const API_GETROOMS = APP_CONSTANTS.API_PATH+"/getrooms", TELEMEET_ID = "telemeet", ALL_ROOMS_LIST_ID = "allroomslist",
    MY_ROOMS_LIST_ID = "myroomslist";
const dialog = _ => monkshu_env.components['dialog-box'];

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
    dialog().showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/changepass.html`, true, true, {}, "dialog", ["p1","p2"], async result=>{
        const done = await loginmanager.changepassword(session.get(APP_CONSTANTS.USERID), result.p1);
        if (!done) dialog().error("dialog", await i18n.get("PWCHANGEFAILED"));
        else { dialog().hideDialog("dialog"); _showMessage(await i18n.get("PWCHANGED")); }
    });
}

async function showOTPQRCode(_element) {
    const id = session.get(APP_CONSTANTS.USERID).toString(); 
    const totpSec = await apiman.rest(APP_CONSTANTS.API_GETTOTPSEC, "GET", {id}, true, false); if (!totpSec || !totpSec.result) return;
    const qrcode = await _getTOTPQRCode(totpSec.totpsec);
    dialog().showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/changephone.html`, true, true, {img:qrcode}, "dialog", ["otpcode"], async result => {
        const otpValidates = await apiman.rest(APP_CONSTANTS.API_VALIDATE_TOTP, "GET", {totpsec: totpSec.totpsec, otp:result.otpcode, id}, true, false);
        if (!otpValidates||!otpValidates.result) dialog().error("dialog", await i18n.get("PHONECHANGEFAILED"));
        else dialog().hideDialog("dialog");
    });
}

async function changeProfile(_element) {
    const sessionUser = loginmanager.getSessionUser();
    dialog().showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/resetprofile.html`, true, true, sessionUser, "dialog", 
            ["name", "id", "org"], async result => {
        
        if (await loginmanager.registerOrUpdate(sessionUser.id, result.name, result.id, null, result.org)) dialog().hideDialog("dialog");
        else dialog().error("dialog", await i18n.get("PROFILECHANGEFAILED"));
    });
}

async function createRoom(room, pass) {
    if ((!room) || room.length==0) {_showMessage(await i18n.get("NoRoom")); return;}
    if ((!pass) || room.length==0) {_showMessage(await i18n.get("NoPass")); return;}
    if (await window.monkshu_env.components["telemeet-join"].createRoom(room, pass, session.get(APP_CONSTANTS.USERID))) {
        _reloadRoomLists(); return true; } else return false;
}

async function joinRoom(room, moderator) {
    if ((!room) || room.length==0) {_showMessage(await i18n.get("NoRoom")); return;}
    const userID = session.get(APP_CONSTANTS.USERID).toString(); let pass; 
    if (userID.toLowerCase() != moderator.toLowerCase()) pass = (await dialog().showDialog(
        `${APP_CONSTANTS.DIALOGS_PATH}/meetingpass.html`, true, true, {}, "dialog", ["knock","pass"])).pass;

    const telemeet = window.monkshu_env.components["telemeet-join"]; telemeet.joinRoom(
        telemeet.getHostElementByID(TELEMEET_ID), room, pass, userID, session.get(APP_CONSTANTS.USERNAME));
}

async function deleteRoom(room) {
    await _showConfirm(await i18n.get("SureWantToDeleteRoom"));
    const telemeet = window.monkshu_env.components["telemeet-join"];
    if ((await telemeet.deleteRoom(room, session.get(APP_CONSTANTS.USERID))).result) _reloadRoomLists();
    else _showMessage(await i18n.get("RoomDeletionFailed"));
}

function showLoginMessages() {
    const data = router.getCurrentPageData();
    if (data.showDialog) { _showMessage(data.showdialog().message); delete data.showDialog; router.setCurrentPageData(data); }
}

function interceptPageLoadAndData(){
    router.addOnLoadPage(APP_CONSTANTS.MAIN_HTML, _ => {    // refresh list of rooms at regular intervals
        const old_timer = session.get("__telemeet_pagelist_refresh_timer");
        if (old_timer) clearTimeout(old_timer); const newTimer = setInterval(_reloadRoomLists, APP_CONSTANTS.ROOM_REFRESH_INTERVAL);
        session.set("__telemeet_pagelist_refresh_timer", newTimer);
    });

    router.addOnLoadPageData(APP_CONSTANTS.MAIN_HTML, async data => {   // set the list of rooms
        const {allRoomsCSV, myRoomsCSV} = await _getRoomsListAsCSV();
        data.pageData = encodeURIComponent(JSON.stringify({allRoomsList: encodeURIComponent(allRoomsCSV),
            myRoomsList: encodeURIComponent(JSON.stringify({myroomlist: encodeURIComponent(myRoomsCSV)}))}));
        if (securityguard.getCurrentRole()==APP_CONSTANTS.ADMIN_ROLE) data.admin = true; 
    });
}

async function _reloadRoomLists() {
    const sheetComponent = window.monkshu_env.components["spread-sheet"];
    const {allRoomsCSV, myRoomsCSV} = await _getRoomsListAsCSV();
    const allroomsList = sheetComponent.getHostElementByID(ALL_ROOMS_LIST_ID);
    const myroomslist = sheetComponent.getHostElementByID(MY_ROOMS_LIST_ID);

    allroomsList.value = allRoomsCSV; myroomslist.value = myRoomsCSV;
}

async function _getTOTPQRCode(key) {
	const title = await i18n.get("Title");
	await $$.require("./js/3p/qrcode.min.js");
	return new Promise(resolve => QRCode.toDataURL(
	    `otpauth://totp/${title}?secret=${key}&issuer=TekMonks&algorithm=sha1&digits=6&period=30`, (_, data_url) => resolve(data_url)));
}

async function _getRoomsListAsCSV() {
    const _escCSV = v => v.indexOf(",") != -1 ? `"${v}"`:v;
    const joinLinkHTML = await $$.requireText("./pages/joinlink.html"), deleteLinkHTML = await $$.requireText("./pages/deletelink.html")

    let allRoomsCSV = `${await i18n.get("AllRoomsTableHeader")}\r\n`, myRoomsCSV = `${await i18n.get("MyRoomsTableHeader")}\r\n`;
    const roomsResult = await apiman.rest(API_GETROOMS, "GET", {}, true);
    if (roomsResult.result) for (const room of roomsResult.rooms) {
        const joinLink = _escCSV(router.getMustache().render(joinLinkHTML, {room: room.name, 
            moderator: room.moderator, joinText: await i18n.get("Join")}));

        const allRoomsCSVLine = [_escCSV(room.name), _escCSV(`${room.moderatorName} &lt;${room.moderator}&gt;`), 
            _escCSV(new Date(room.creationtime).toLocaleTimeString(i18n.getSessionLang())), joinLink].join(",");
        allRoomsCSV += allRoomsCSVLine + "\r\n";

        if (room.moderator == session.get(APP_CONSTANTS.USERID).toString()) {
            const deleteLink = _escCSV(router.getMustache().render(deleteLinkHTML, {room: room.name, deleteText: await i18n.get("Delete")}));
            const myRoomsCSVLine = [_escCSV(room.name), _escCSV(new Date(room.creationtime).toLocaleTimeString(i18n.getSessionLang())), 
                deleteLink, joinLink].join(",");
            myRoomsCSV += myRoomsCSVLine + "\r\n";
        }
    } else LOG.error("Get rooms API failed.");
    return {allRoomsCSV, myRoomsCSV};
}

const _showMessage = message => dialog().showMessage(`${APP_CONSTANTS.DIALOGS_PATH}/message.html`, {message}, "dialog");
const _showConfirm = async message => {
    await dialog().showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/message.html`, true, true, {message}, 
        "dialog", []); dialog().hideDialog("dialog");
}

export const main = {changeStatus, changePassword, showOTPQRCode, showLoginMessages, changeProfile, 
    interceptPageLoadAndData, joinRoom, createRoom, deleteRoom};