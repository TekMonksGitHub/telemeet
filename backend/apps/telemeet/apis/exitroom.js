/**
 * Executes a request to exit a room given its password or if 
 * the one entering is the moderator.
 * (C) 2020 TekMonks. All rights reserved.
 */

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY)||{}; 
	const roomID = jsonReq.room.toUpperCase();
	const result = telemeetRooms[roomID] && telemeetRooms[roomID].participants[jsonReq.id] &&
		(telemeetRooms[roomID].moderator == jsonReq.id || telemeetRooms[roomID].password == jsonReq.pass);
	const reason = result ? null : (telemeetRooms[roomID] ? 
		((telemeetRooms[roomID].moderator == jsonReq.id || telemeetRooms[roomID].password == jsonReq.pass)?"NO_MODERATOR":"BAD_PASSWORD"):"NO_ROOM");
	
	LOG.debug(`Result of request to exit room -> ${jsonReq.room} for id -> ${jsonReq.id} is -> ${result}, failure reason (if any) is: ${reason}`);
	if (!result) return {result, reason};
	
	telemeetRooms[roomID].participants[jsonReq.id].count--;
	if (telemeetRooms[roomID].participants[jsonReq.id].count == 0) {
		if (jsonReq.id == telemeetRooms[roomID].moderator) delete telemeetRooms[roomID].startTime;
		delete telemeetRooms[roomID].participants[jsonReq.id]
	}
	DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, telemeetRooms);  

	return {result, reason, isModerator: telemeetRooms[roomID] ? jsonReq.id == telemeetRooms[roomID].moderator : false}; 
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && (jsonReq.id||jsonReq.pass));