/** 
 * Sets user's status in the backend DB and memory.
 * (C) 2020 TekMonks. All rights reserved.
 */

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	DISTRIBUTED_MEMORY.set(jsonReq.id, jsonReq.status);
	return CONSTANTS.TRUE_RESULT; 
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.status);
