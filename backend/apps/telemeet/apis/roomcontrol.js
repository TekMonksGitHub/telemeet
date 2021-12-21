/**
 * Controls the room heartbeats. 
 * 
 * (C) 2020 TekMonks. All rights reserved.
 */

const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);

exports.doService = async (jsonReq, servObject) => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;} 

    const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY)||{}; 
    const roomID = jsonReq.room.toUpperCase();
	const result = telemeetRooms[roomID] && telemeetRooms[roomID].participants[jsonReq.id] != null;
    const ip = utils.getClientIP(servObject.req);

    LOG.info(`Room beat result for ID ${jsonReq.id} and session ID ${jsonReq.sessionID} from IP ${ip} is ${result}`);
    if (!result) return CONSTANTS.FALSE_RESULT;

    if (telemeetRooms[roomID].participants[jsonReq.id].sessions[jsonReq.sessionID].lastHeartbeat)
        telemeetRooms[roomID].participants[jsonReq.id].sessions[jsonReq.sessionID].lastHeartbeat = Date.now();
    else telemeetRooms[roomID].participants[jsonReq.id].sessions[jsonReq.sessionID] = {lastHeartbeat: Date.now()};

    return CONSTANTS.TRUE_RESULT;
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.sessionID && jsonReq.room);
