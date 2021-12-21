/**
 * Executes a request to enter a room given its password or if 
 * the one entering is the moderator.
 * (C) 2020 TekMonks. All rights reserved.
 */

const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY)||{}; 
	const roomID = jsonReq.room.toUpperCase();
	const result = telemeetRooms[roomID] && (telemeetRooms[roomID].moderator == jsonReq.id || 
		(telemeetRooms[roomID].password == jsonReq.pass && telemeetRooms[roomID].startTime != null));
	const reason = result ? null : (telemeetRooms[roomID] ? (telemeetRooms[roomID].startTime?"BAD_PASSWORD":"NO_MODERATOR") : "NO_ROOM");
	LOG.debug(`Result of request to enter room -> ${jsonReq.room} for id -> ${jsonReq.id} is -> ${result}, failure reason (if any) is: ${reason}`);
	if (!result) return {result: false, reason};

	if (jsonReq.id == telemeetRooms[roomID].moderator) telemeetRooms[roomID].startTime = Date.now();

	if (!telemeetRooms[roomID].participants[jsonReq.id]) telemeetRooms[roomID].participants[jsonReq.id] = 
		{name: jsonReq.name, id: jsonReq.id, timeOfEntry: Date.now(), sessions: {}};
	telemeetRooms[roomID].participants[jsonReq.id].sessions[jsonReq.sessionID] = {lastHeartbeat: Date.now()};

	DISTRIBUTED_MEMORY.set(APP_CONSTANTS.ROOMSKEY, telemeetRooms);  

	return {result, reason, isModerator: jsonReq.id == telemeetRooms[roomID].moderator, 
		url: `${telemeet.url}/${jsonReq.room}`, startTime: telemeetRooms[roomID].startTime, 
		totalSessions: Object.keys(telemeetRooms[roomID].participants[jsonReq.id].sessions).length}; 
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.id && jsonReq.name && jsonReq.sessionID);
