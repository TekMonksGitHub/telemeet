/** 
 * Returns true or false depending on whether we should
 * enable remote logging.
 * (C) 2020 TekMonks. All rights reserved.
 */

const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

exports.doService = async _jsonReq => {return {result: true, remote_log: telemeet.remote_log};}