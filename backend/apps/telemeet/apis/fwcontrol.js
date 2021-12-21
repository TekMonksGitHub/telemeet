/**
 * Controls the firewall on the mirror. Uses SFW mode, so a close request
 * is not needed, as firewall will auto close on TCP/IP session disconnect.
 * 
 * (C) 2020 TekMonks. All rights reserved.
 */

const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const crypt = require(`${CONSTANTS.LIBDIR}/crypt.js`);
const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);
const fwControl = require(`${APP_CONSTANTS.LIB_DIR}/mirrorFWController.js`);

const key = crypt.decrypt(telemeet.fwKey);

exports.doService = async (jsonReq, servObject) => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;} 

    if (!telemeet.fwEnabled) return CONSTANTS.TRUE_RESULT;  // no firewall operation required
 
    const clientIP = jsonReq.ip || utils.getClientIP(servObject.req);

    // operate the firewall for the client IP
    const result = await fwControl.sendFirewallMessage(telemeet.fwHost, telemeet.fwPort, clientIP, null, jsonReq.mode, 
        jsonReq.operation, key);

    LOG.info(`Firewall ${jsonReq.operation} result for IP ${clientIP} and ID ${jsonReq.id} is ${result}`);

    return {result};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.operation);
