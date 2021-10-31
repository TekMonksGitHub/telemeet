/**
 * Deletes a conference room. 
 * (C) 2020 TekMonks. All rights reserved.
 */

exports.doService = async jsonReq => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const roomsModified = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const roomID = jsonReq.room.toUpperCase();
    if (roomsModified[roomID] && roomsModified[roomID].password == jsonReq.pass && roomsModified[roomID].moderator == jsonReq.id) {
        delete roomsModified[roomID]; 
        DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, roomsModified);
        LOG.debug(`Room deleted, ${jsonReq.room}, by user ${jsonReq.id}`);
        return CONSTANTS.TRUE_RESULT;
    } else return CONSTANTS.FALSE_RESULT;
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.pass && jsonReq.id);
