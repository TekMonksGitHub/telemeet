/**
 * Returns the list of currently active conference rooms. 
 * (C) 2020 TekMonks. All rights reserved.
 */
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);

exports.doService = async jsonReq => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
    const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const rooms = []; for (const key in telemeetRooms) 
        if (telemeetRooms[key].moderator == jsonReq.id) rooms.push(telemeetRooms[key]); 
        else rooms.push(utils.clone(telemeetRooms[key], ["password"]));

    return {result: true, rooms};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id);