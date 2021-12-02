/**
 * Deletes a conference room. 
 * (C) 2020 TekMonks. All rights reserved.
 */

exports.doService = async jsonReq => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const roomID = jsonReq.room.toUpperCase();
    if (telemeetRooms[roomID] && telemeetRooms[roomID].moderator == jsonReq.id) {
        delete telemeetRooms[roomID]; 
        DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, telemeetRooms);
        LOG.debug(`Room deleted, ${jsonReq.room}, by user ${jsonReq.id}`);
        return CONSTANTS.TRUE_RESULT;
    } else return CONSTANTS.FALSE_RESULT;
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.id);
