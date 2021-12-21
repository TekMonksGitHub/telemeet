/**
 * Cleans the rooms - Clears out participants who are no longer active
 * (C) 2020 TekMonks. All rights reserved.
 */

const exitroom = require(`${APP_CONSTANTS.API_DIR}/exitroom.js`);
const telemeet = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);

function init() {
    setInterval(_=>{
        const telemeetRooms = DISTRIBUTED_MEMORY.get(APP_CONSTANTS.ROOMSKEY)||{}; 

        for (const roomID in telemeetRooms) for (const participantID in telemeetRooms[roomID].participants) 
            for (const sessionID in telemeetRooms[roomID].participants[participantID].sessions) 
                if ((!telemeetRooms[roomID].participants[participantID].sessions[sessionID].lastHeartbeat) || 
                    Date.now() - telemeetRooms[roomID].participants[participantID].sessions[sessionID].lastHeartbeat > telemeet.room_cleaner_max_wait)
                exitroom.doService({room: roomID, id: participantID, sessionID, fromRoomCleaner: true});   // participant has exited
    }, telemeet.room_cleaner_check_frequency)
}

module.exports = {init};