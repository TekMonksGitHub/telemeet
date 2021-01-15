/* 
 * (C) 2020 TekMonks. All rights reserved.
 */
const totp = require(`${APP_CONSTANTS.LIB_DIR}/totp.js`);
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);
const qrcodeToDataURLAsync = require("util").promisify(require("qrcode").toDataURL);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	LOG.debug("Got QR Code request for ID: " + jsonReq.id);

	const result = await userid.getTOTPSec(jsonReq.id); const totpsec = result.result?result.totpsec:null;
	if (totpsec) {
        const img = await qrcodeToDataURLAsync(totp.getTOTPURL(jsonReq.provider, totpsec));
        return {result: true, totpsec, img};
    } else {LOG.error(`Bad ID or DB error, given ID: ${jsonReq.id}`); return CONSTANTS.FALSE_RESULT;}
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.provider);