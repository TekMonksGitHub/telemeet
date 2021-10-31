/**
 * Validates a request to enter a room given its password.
 * (C) 2020 TekMonks. All rights reserved.
 */

const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	const roomsObj = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY)||{}; 
	const roomID = jsonReq.room.toUpperCase();
	const result = roomsObj[roomID] && roomsObj[roomID].password == jsonReq.pass;
	const failureReason = result ? null : (roomsObj[roomID]?"BAD_PASSWORD":"NO_ROOM");
	LOG.debug(`Result of request to enter room -> ${jsonReq.room} for id -> ${jsonReq.id} is -> ${result}, failure reason (if any) is: ${failureReason}`);

	return {result, failureReason, isModerator: roomsObj[roomID] ? jsonReq.id == roomsObj[roomID].moderator : false, url: `${telemeet.url}/${jsonReq.room}`}; 
}

const validateRequest = jsonReq => (jsonReq && jsonReq.room && jsonReq.pass);
