/**
 * Controls the firewall module.
 * 
 * (C) 2020 TekMonks. All rights reserved.
 * See enclosed LICENSE file.
 */

const net = require("net");
const crypt = require(`${CONSTANTS.LIBDIR}/crypt.js`);

module.exports.sendFirewallMessage = function sendFirewallMessage(host, port, fromip, toport, key, allow=false) {
    return new Promise((resolve, _) => {
        const msg = `${allow?"allow":"disallow"},${fromip}${toport==null||"all"?"":","+toport}`;

        let responseReceived = false;

        const socket = net.connect({port, host, timeout:20000}, _ => socket.write(crypt.encrypt(JSON.stringify(msg), key)));

        const errorHandler = err => {LOG.error(`Error in firewall control: ${err}`); resolve(false);}

        socket.on("error", errorHandler);

        socket.on("timeout", _=>{errorHandler("Timed out."); socket.end(); socket.destroy();});

        socket.on("close", _=>{if (!responseReceived) errorHandler("Failed, got no response.")});

        socket.on("data", chunk => {
            try {
                responseReceived = true;
                const response = JSON.parse(crypt.decrypt(chunk.toString("utf8"), key)); 
                if (response == "true") console.log("Firewall operation succeeded.")
                else console.log("Firewall operation failed.")
                resolve(response == "true");
            } catch (err) {errorHandler(err);}
            socket.end(); socket.destroy();
        });
    });
}