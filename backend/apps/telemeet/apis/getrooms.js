/**
 * Returns the list of currently active conference rooms. 
 * (C) 2020 TekMonks. All rights reserved.
 */
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);

exports.doService = async _jsonReq => {
    const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY) || {};

    const rooms = []; for (const key in telemeetRooms) rooms.push(utils.clone(telemeetRooms[key], ["password"]));

    return {result: true, rooms};
}
