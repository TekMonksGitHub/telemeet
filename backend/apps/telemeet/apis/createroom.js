/* 
 * (C) 2020 TekMonks. All rights reserved.
 */

const enterroom = require(`${__dirname}/enterroom.js`);
const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

exports.doService = async jsonReq => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const roomsModified = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const roomID = jsonReq.room.toUpperCase();
    if (Object.keys(roomsModified).includes(roomID)) return await enterroom.doService(jsonReq);   // exists

    roomsModified[roomID] = {password: jsonReq.pass, moderator: jsonReq.id};
    LOG.debug(`Room created, ${jsonReq.room}, by user ${jsonReq.id}`);

    // why? because only set will propogate it globally. that's how the distributed memory works
    DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, roomsModified);  

    return {result: true, isModerator: true, url: `${telemeet.url}/${jsonReq.room}`};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.pass && jsonReq.id);
