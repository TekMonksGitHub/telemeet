/* 
 * (C) 2015 TekMonks. All rights reserved.
 * See enclosed LICENSE file.
 */
const util = require("util");
const bcryptjs = require("bcryptjs");
const db = require(`${APP_CONSTANTS.LIB_DIR}/db.js`);
const getUserHash = async text => await (util.promisify(bcryptjs.hash))(text, 12);

exports.register = async (id, name, org, pwph, totpSecret, role, approved) => {
	const existsID = await exports.existsID(id);
	if (existsID.result) return({result:false}); 
	const pwphHashed = await getUserHash(pwph);

	return {result: await db.runCmd("INSERT INTO users (id, name, org, pwph, totpsec, role, approved) VALUES (?,?,?,?,?,?,?)", 
		[id, name, org, pwphHashed, totpSecret, role, approved?1:0])};
}

exports.delete = async id => {
	const existsID = await exports.existsID(id);
	if (!existsID.result) return({result:false}); 

	return {result: await db.runCmd("DELETE FROM users where id = ?", [id])};
}

exports.update = async (oldid, id, name, org, pwph, totpSecret, role, approved) => {
	const pwphHashed = await getUserHash(pwph);
	return {result: await db.runCmd("UPDATE users SET id=?, name=?, org=?, pwph=?, totpsec=?, role = ?, approved = ? WHERE id=?", 
		[id, name, org, pwphHashed, totpSecret, role, approved?1:0, oldid])};
}

exports.checkPWPH = async (id, pwph) => {
	const idEntry = await exports.existsID(id); if (!idEntry.result) return {result: false}; else delete idEntry.result;
	return {result: await (util.promisify(bcryptjs.compare))(pwph, idEntry.pwph), ...idEntry}; 
}

exports.getTOTPSec = exports.existsID = async id => {
	const rows = await db.getQuery("SELECT * FROM users WHERE id = ? COLLATE NOCASE", [id]);
	if (rows && rows.length) return {result: true, ...(rows[0])}; else return {result: false};
}

exports.changepwph = async (id, pwph) => {
	const pwphHashed = await getUserHash(pwph);
	return {result: await db.runCmd("UPDATE users SET pwph = ? WHERE id = ? COLLATE NOCASE", [pwphHashed, id])};
}

exports.getUsersForOrg = async org => {
	const users = await db.getQuery("SELECT id, name, org, role, approved FROM users WHERE org = ? COLLATE NOCASE", [org]);
	if (users && users.length) return {result: true, users}; else return {result: false};
}

exports.approve = async id => {
	return {result: await db.runCmd("UPDATE users SET approved=1 WHERE id=?", [id])};
}