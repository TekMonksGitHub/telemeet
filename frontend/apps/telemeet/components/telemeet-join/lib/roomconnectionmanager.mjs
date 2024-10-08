/**
 * Room connection controller. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const API_HBROOMCONTROL = APP_CONSTANTS.API_PATH+"/roomcontrol";

const timers = {};

function startSendingConnectionActiveBeats(room, id, sessionID, conf) {
    const newTimer = setInterval(async _=>await apiman.rest(API_HBROOMCONTROL, "POST", {room, id, sessionID}, true), 
        conf.roomHeartbeatInterval);
    timers[sessionID] = newTimer;
}

function stopSendingConnectionActiveBeats(sessionID) {
    if (timers[sessionID]) {
        clearInterval(timers[sessionID]);
        delete timers[sessionID];
    }
}

export const roomconnectionmanager = {startSendingConnectionActiveBeats, stopSendingConnectionActiveBeats};