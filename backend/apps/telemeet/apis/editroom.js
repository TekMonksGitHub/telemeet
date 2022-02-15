/**
 * Creates a new conference room. 
 * (C) 2020 TekMonks. All rights reserved.
 */
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);
const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

exports.doService = async jsonReq => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const roomID = jsonReq.room.toUpperCase(), oldroomID = jsonReq.oldroom.toUpperCase();
    if (Object.keys(telemeetRooms).includes(roomID) && (roomID != oldroomID)) return {result: false, reason: "ROOMEXISTS"};
    if (!Object.keys(telemeetRooms).includes(oldroomID)) return {result: false, reason: "OLDROOMNOTFOUND"};
    if (telemeetRooms[oldroomID].moderator != jsonReq.id) return {result: false, reason: "REQUESTORNOTMODERATOR"};

    telemeetRooms[roomID] = telemeetRooms[oldroomID]; telemeetRooms[roomID].password = jsonReq.pass; 
    telemeetRooms[roomID].name = jsonReq.room; telemeetRooms[roomID].image = jsonReq.image; delete telemeetRooms[oldroomID];
    LOG.debug(`Room edited ${jsonReq.oldroom} at ${utils.getDateTime()}, new name is ${jsonReq.name}.`);

    // why? because only set will propogate it globally. that's how the distributed memory works
    DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, telemeetRooms);  

    return {result: true, isModerator: true, url: `${telemeet.webrtc_url}/${jsonReq.room}`};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.pass && jsonReq.oldroom && jsonReq.id);
