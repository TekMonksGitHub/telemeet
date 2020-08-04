/* 
 * (C) 2015 TekMonks. All rights reserved.
 */
const totp = require(`${__dirname}/lib/totp.js`);
const userid = require(`${__dirname}/lib/userid.js`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	LOG.debug("Got register request for ID: " + jsonReq.id);

	if (!totp.verifyTOTP(jsonReq.totpSecret, jsonReq.totpCode)) {
		LOG.error(`Unable to register: ${jsonReq.name}, wrong totp code`);
		return CONSTANTS.FALSE_RESULT;
	}

	const result = await userid.register(jsonReq.id, jsonReq.name, jsonReq.org, jsonReq.pwph, jsonReq.totpSecret);

	if (result.result) LOG.info(`User registered and logged in: ${jsonReq.name}`); else LOG.error(`Unable to register: ${jsonReq.name}, DB error`);

	return {result: result.result};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.pwph && jsonReq.id && jsonReq.name && jsonReq.org && jsonReq.totpSecret && jsonReq.totpCode);
