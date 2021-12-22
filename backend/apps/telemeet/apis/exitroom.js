/**
 * Executes a request to exit a room given its password or if 
 * the one entering is the moderator.
 * (C) 2020 TekMonks. All rights reserved.
 */

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	if (jsonReq.fromRoomCleaner) LOG.info(`Room cleaner sent exit room request for room -> ${jsonReq.room} for id -> ${jsonReq.id} session ID ${jsonReq.sessionID}`);
	
	const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY)||{}; 
	const roomID = jsonReq.room.toUpperCase();
	const result = (telemeetRooms[roomID] && telemeetRooms[roomID].participants[jsonReq.id] != null);
	const reason = result ? null : (telemeetRooms[roomID] ? "NO_SUCH_PARTICIPANT":"NO_ROOM");
	
	LOG.debug(`Result of request to exit room -> ${jsonReq.room} for id -> ${jsonReq.id} session ID ${jsonReq.sessionID} is -> ${result}, failure reason (if any) is: ${reason}`);
	if (!result) return {result, reason};
	
	_reduceSessions(telemeetRooms, roomID, jsonReq.id, jsonReq.sessionID); 

	return {result, reason, isModerator: jsonReq.id == telemeetRooms[roomID].moderator}; 
}

function _reduceSessions(telemeetRooms, roomID, participantID, sessionID) {
	let modified = false;
	if (telemeetRooms[roomID].participants[participantID].sessions[sessionID]) 
		{delete telemeetRooms[roomID].participants[participantID].sessions[sessionID]; modified = true;}

	if (Object.keys(telemeetRooms[roomID].participants[participantID].sessions).length == 0) {
		if (participantID == telemeetRooms[roomID].moderator) delete telemeetRooms[roomID].startTime;
		delete telemeetRooms[roomID].participants[participantID]
		modified = true;
	}

	if (modified) DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, telemeetRooms);  
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.id && jsonReq.sessionID);