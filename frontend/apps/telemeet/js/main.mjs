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

const TELEMEET_ID = "telemeet", ALL_ROOMS_CARDROLL = "allrooms", MY_ROOMS_CARDROLL = "myrooms";
const dialog = _ => monkshu_env.components['dialog-box'];
let telemeetJoin;

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
    const _random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    if ((!room) || room.length==0) {_showMessage(await i18n.get("NoRoom")); return;}
    if ((!pass) || room.length==0) {_showMessage(await i18n.get("NoPass")); return;}
    if (await window.monkshu_env.components["telemeet-join"].createRoom(room, pass, 
        `${APP_CONSTANTS.APP_PATH}/img/meeting${_random(1,APP_CONSTANTS.NUM_ROOM_IMAGES)}.jpg`, 
        session.get(APP_CONSTANTS.USERID))) { _reloadRoomLists(); return true; } else return false;
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
    await _getConfirmation(await i18n.get("SureWantToDeleteRoom"));
    const telemeet = window.monkshu_env.components["telemeet-join"];
    if ((await telemeet.deleteRoom(room, session.get(APP_CONSTANTS.USERID))).result) _reloadRoomLists();
    else _showMessage(await i18n.get("RoomDeletionFailed"));
}

async function linkShareRoom(room, password) {
    const roomLink = `${APP_CONSTANTS.JOIN_HTML}?data=${btoa(`${room}:${password}`)}`; 
    await $$.copyTextToClipboard(roomLink);
}

async function emailShareRoom(room, password) {
    const roomLink = `${APP_CONSTANTS.JOIN_HTML}?data=${btoa(`${room}:${password}`)}`; 
    const emailBody = encodeURIComponent(await i18n.get("RoomLinkEmailBody") + roomLink);
    window.location.href = `mailto:?subject=${await i18n.get("RoomLinkEmailSubject")}&body=${emailBody}`; 
}

async function editRoom(oldroom, oldpassword, oldimage) {
    const imagelist = []; for (let i = 0; i < APP_CONSTANTS.NUM_ROOM_IMAGES; i++) imagelist.push(`${APP_CONSTANTS.APP_PATH}/img/meeting${i+1}.jpg`);
    const {newroom, newpassword, newimage} = await dialog().showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/editroom.html`, 
        true, true, {oldroom, imagelist: JSON.stringify(imagelist), oldpassword, oldimage}, "dialog", 
        ["newroom", "newpassword", "newimage"]); dialog().hideDialog("dialog");

    const telemeet = window.monkshu_env.components["telemeet-join"];
    const result = await telemeet.editRoom(oldroom, newroom, newpassword, newimage, session.get(APP_CONSTANTS.USERID)); 
    if (result.result) {_reloadRoomLists(); return true;}
    else {_showMessage(await i18n.get(result.reason == "ROOMEXISTS" ? "RoomEditFailedExists" : "RoomEditFailedCheckLogs")); return false;}
}

function showLoginMessages() {
    const data = router.getCurrentPageData();
    if (data.showDialog) { _showMessage(data.showdialog().message); delete data.showDialog; router.setCurrentPageData(data); }
}

async function interceptPageLoadAndData(){
    telemeetJoin = (await import(`${APP_CONSTANTS.COMPONENTS_PATH}/telemeet-join/telemeet-join.mjs`)).telemeet_join;

    router.addOnLoadPage(APP_CONSTANTS.MAIN_HTML, _ => {    // refresh list of rooms at regular intervals
        const old_timer = session.get("__telemeet_pagelist_refresh_timer");
        if (old_timer) clearTimeout(old_timer); const newTimer = setInterval(_reloadRoomLists, APP_CONSTANTS.ROOM_REFRESH_INTERVAL);
        session.set("__telemeet_pagelist_refresh_timer", newTimer);
        loginmanager.addLogoutListener(_=>{ // clear refreshing list of rooms on logout
            const old_timer = session.get("__telemeet_pagelist_refresh_timer");
            if (old_timer) clearTimeout(old_timer);
        });
    });

    router.addOnLoadPageData(APP_CONSTANTS.MAIN_HTML, async data => {   // set the list of rooms
        const {allRooms, myRooms} = await _getRoomsLists();
        data.allroomsList = encodeURIComponent(JSON.stringify(allRooms)); 
        data.myroomsList = encodeURIComponent(JSON.stringify(myRooms));
        if (securityguard.getCurrentRole()==APP_CONSTANTS.ADMIN_ROLE) data.admin = true; 
    });
}

async function _reloadRoomLists() {
    const cardRoll = window.monkshu_env.components["card-roll"];
    const {allRooms, myRooms} = await _getRoomsLists();
    const allroomsCardRoll = cardRoll.getHostElementByID(ALL_ROOMS_CARDROLL);
    const myroomsCardRoll = cardRoll.getHostElementByID(MY_ROOMS_CARDROLL);

    allroomsCardRoll.value = JSON.stringify(allRooms); myroomsCardRoll.value = JSON.stringify(myRooms);
}

async function _getTOTPQRCode(key) {
	const title = await i18n.get("Title");
	await $$.require("./js/3p/qrcode.min.js");
	return new Promise(resolve => QRCode.toDataURL(
	    `otpauth://totp/${title}?secret=${key}&issuer=TekMonks&algorithm=sha1&digits=6&period=30`, (_, data_url) => resolve(data_url)));
}

async function _getRoomsLists() {
    const allRoomsHTML = await $$.requireText("./pages/allrooms.html"), 
        myRoomsHTML = await $$.requireText("./pages/myrooms.html"), 
        createRoomHTML = await $$.requireText("./pages/createroom.html"),
        noMeetingsHTML = await $$.requireText("./pages/nomeetings.html"), 
        defaultRoomImage = `${APP_CONSTANTS.APP_PATH}/img/meeting1.jpg`;

    const allroomsCards = [], myroomsCards = [router.getMustache().render(createRoomHTML, {APP_CONSTANTS, 
        i18n: await i18n.getI18NObject()})];
    const roomsResult = await telemeetJoin.getRooms(session.get(APP_CONSTANTS.USERID).toString());
    if (roomsResult?.result) for (const room of roomsResult.rooms) { 
        //room.startTime = Date.now();    // remove - only for design testing.       
        if (room.startTime) allroomsCards.push(router.getMustache().render(allRoomsHTML, {room: room.name, 
            moderator: room.moderator, joinText: await i18n.get("Join"), moderatorName: room.moderatorName,
            startTime: new Date(room.startTime).toLocaleString(i18n.getSessionLang()), image: (room.image||defaultRoomImage),
            APP_CONSTANTS}));   // active rooms only

        if (room.moderator == session.get(APP_CONSTANTS.USERID).toString()) myroomsCards.push(
            router.getMustache().render(myRoomsHTML, {room: room.name, moderator: room.moderator, 
                joinText: await i18n.get("Start"), creationTime: new Date(room.creationtime).toLocaleString(i18n.getSessionLang()),
                password: room.password, image: (room.image||defaultRoomImage), APP_CONSTANTS}));
    } else LOG.error("Get rooms call failed.");
    if (allroomsCards.length == 0) allroomsCards.push(router.getMustache().render(noMeetingsHTML, {APP_CONSTANTS}));
    return {allRooms: allroomsCards, myRooms: myroomsCards};
}

const _showMessage = message => dialog().showMessage(`${APP_CONSTANTS.DIALOGS_PATH}/message.html`, {message}, "dialog");
const _getConfirmation = async message => {
    await dialog().showDialog(`${APP_CONSTANTS.DIALOGS_PATH}/message.html`, true, true, {message}, 
        "dialog", []); dialog().hideDialog("dialog");
}

export const main = {changeStatus, changePassword, showOTPQRCode, showLoginMessages, changeProfile, 
    interceptPageLoadAndData, joinRoom, createRoom, deleteRoom, linkShareRoom, emailShareRoom, editRoom};