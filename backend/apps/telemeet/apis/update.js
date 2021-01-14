/* 
 * (C) 2015 TekMonks. All rights reserved.
 */
const totp = require(`${__dirname}/lib/totp.js`);
const userid = require(`${__dirname}/lib/userid.js`);
const crypt = require(`${CONSTANTS.LIBDIR}/crypt.js`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	const old_id = crypt.decrypt(jsonReq.old_id);

	LOG.debug("Got update request for ID: " + old_id);

	if (jsonReq.totpSecret && !totp.verifyTOTP(jsonReq.totpSecret, jsonReq.totpCode)) {
		LOG.error(`Unable to update: ${jsonReq.name}, ID: ${old_id}, wrong totp code`);
		return CONSTANTS.FALSE_RESULT;
	}

	if (old_id.toLowerCase() != jsonReq.id.toLowerCase()) {	// prevent account takeovers
		const checkExists = await userid.existsID(jsonReq.id); if (checkExists && checkExists.result) {
			LOG.error(`${jsonReq.name}, ID: ${old_id} tried to update their email to another registered user, blocked.`);
			return CONSTANTS.FALSE_RESULT;
		} else LOG.info(`${jsonReq.name}, ID: ${old_id} is changing their ID to ${jsonReq.id}`);
	}

	const result = await userid.update(old_id, jsonReq.id, jsonReq.name, jsonReq.org, jsonReq.pwph, jsonReq.totpSecret);

	if (result.result) LOG.info(`User updated and logged in: ${jsonReq.name}, ID: ${old_id}`); else LOG.error(`Unable to update: ${jsonReq.name}, ID: ${old_id}, DB error`);

	return {result: result.result};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.old_id && jsonReq.pwph && jsonReq.id && jsonReq.name && jsonReq.org);
