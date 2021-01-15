/* 
 * (C) 2015 TekMonks. All rights reserved.
 */
const crypt = require(`${CONSTANTS.LIBDIR}/crypt.js`);
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
    const id = crypt.decrypt(jsonReq.id);
    if (!id.match(/^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/)) {
        LOG.error(`Validation failure for bad email: ${id}`); return CONSTANTS.FALSE_RESULT; }

	LOG.info("Got get profile request for ID: " + id);

	const result = await userid.existsID(id);

	if (result.result) LOG.info(`Sending data for ID: ${id}`); else LOG.error(`Unable to find: ${id}, DB error`);

	return result;
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id);
