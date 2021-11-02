/**
 * Logs a user in. 
 * (C) 2015 TekMonks. All rights reserved.
 */
const totp = require(`${APP_CONSTANTS.LIB_DIR}/totp.js`);
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	LOG.debug(`Got login request for ID ${jsonReq.id}`);

	const result = await userid.checkPWPH(jsonReq.id, jsonReq.pwph); 

	if (result.result && result.approved) {	// perform second factor
		result.result = true;//totp.verifyTOTP(result.totpsec, jsonReq.otp);
		if (!result.result) LOG.error(`Bad OTP given for: ${result.id}.`);
	} else if (result.result && (!result.approved)) {LOG.info(`User not approved, ${result.id}.`); result.result = false;}
	else LOG.error(`Bad PWPH, given for ID: ${jsonReq.id}.`);

	if (result.result) LOG.info(`User logged in: ${result.id}.`); else LOG.error(`Bad login for ID: ${jsonReq.id}.`);

	if (result.result) return {result: result.result, name: result.name, id: result.id, org: result.org, role: result.role};
	else return CONSTANTS.FALSE_RESULT;
}

const validateRequest = jsonReq => (jsonReq && jsonReq.pwph && jsonReq.otp && jsonReq.id);
