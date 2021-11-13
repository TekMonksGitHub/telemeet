/**
 * Creates a new conference room. 
 * (C) 2020 TekMonks. All rights reserved.
 */
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const enterroom = require(`${APP_CONSTANTS.API_DIR}/enterroom.js`);
const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

exports.doService = async jsonReq => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const roomID = jsonReq.room.toUpperCase();
    if (Object.keys(telemeetRooms).includes(roomID)) return await enterroom.doService(jsonReq);   // exists

    telemeetRooms[roomID] = {password: jsonReq.pass, moderator: jsonReq.id, creationtime: Date.now(), name: jsonReq.room};
    LOG.debug(`Room created, ${jsonReq.room}, by user ${jsonReq.id} at ${utils.getDateTime()}`);

    // why? because only set will propogate it globally. that's how the distributed memory works
    DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, telemeetRooms);  

    return {result: true, isModerator: true, url: `${telemeet.url}/${jsonReq.room}`};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.pass && jsonReq.id);
