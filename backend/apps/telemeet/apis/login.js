/* 
 * (C) 2015 TekMonks. All rights reserved.
 */
const totp = require(`${APP_CONSTANTS.LIB_DIR}/totp.js`);
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	LOG.debug("Got login request for pwph: " + jsonReq.pwph);

	const result = await userid.login(jsonReq.pwph);
	if (result.result) {	// perform second factor
		result.result = totp.verifyTOTP(result.totpsec, jsonReq.otp);
		if (!result.result) LOG.error(`Bad OTP given for: ${result.id}`);
	} else LOG.error(`Bad PWPH, given: ${jsonReq.pwph}, for ID: ${jsonReq.id}`);

	if (result.result) LOG.info(`User logged in: ${result.id}`); else LOG.error(`Bad login for ID: ${jsonReq.id}`);

	return {result: result.result, name: result.name, id: result.id, org: result.org};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.pwph && jsonReq.otp && jsonReq.id);
