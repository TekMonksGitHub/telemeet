/* 
 * (C) 2020 TekMonks. All rights reserved.
 */

const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);
const fwControl = require(`${APP_CONSTANTS.LIB_DIR}/mirrorFWController.js`);

exports.doService = async (jsonReq, servObject) => {
    if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;} 
    
    if (jsonReq.operation == "allow") return {result: await _openFW(jsonReq, servObject)};
    else return {result: await _closeFW(jsonReq, servObject)};
}

async function _openFW(jsonReq, servObject) {
    const clientIP = jsonReq.ip || servObject.req.connection.remoteAddress;
    const ipCheck = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.IP_FW_MAPPINGS_KEY)||{};
    if (ipCheck[jsonReq.id] == clientIP) return true;  // already open

    // client's IP has changed, close old firewall rule
    if (ipCheck[jsonReq.id]) await fwControl.sendFirewallMessage(telemeet.host, telemeet.fwPort, clientIP, null, telemeet.key, false);
    delete ipCheck[jsonReq.id];

    // open the firewall for the client IP
    const result = await fwControl.sendFirewallMessage(telemeet.host, telemeet.fwPort, clientIP, null, telemeet.key, true);
    ipCheck[jsonReq.id] = clientIP;
    DISTRIBUTED_MEMORY.set(APP_CONSTANTS.IP_FW_MAPPINGS_KEY, ipCheck);

    LOG.info(`Firewall open result for IP ${clientIP} and ID ${jsonReq.id} is ${result}`);

    return result;
}

async function _closeFW(jsonReq, servObject) {    
    const clientIP = jsonReq.ip || servObject.req.connection.remoteAddress;
    const ipCheck = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.IP_FW_MAPPINGS_KEY) || {};
    if (!ipCheck[jsonReq.id]) return true;  // already closed

    // close the firewall for the client IP
    const result = await fwControl.sendFirewallMessage(telemeet.host, telemeet.fwPort, clientIP, null, telemeet.key, false);
    delete ipCheck[jsonReq.id];
    DISTRIBUTED_MEMORY.set(APP_CONSTANTS.IP_FW_MAPPINGS_KEY, ipCheck);

    LOG.info(`Firewall close result for IP ${clientIP} and ID ${jsonReq.id} is ${result}`);

    return result;
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.operation);
