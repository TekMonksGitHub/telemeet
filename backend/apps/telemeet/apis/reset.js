/**
 * (C) 2021 TekMonks. All rights reserved.
 */
const mustache = require('mustache');
const crypt = require(`${CONSTANTS.LIBDIR}/crypt.js`);
const mailer = require(`${APP_CONSTANTS.LIB_DIR}/mailer.js`);
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);
const conf = require(`${APP_CONSTANTS.CONF_DIR}/telemeet.json`);
const template = require(`${APP_CONSTANTS.CONF_DIR}/email.json`);

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
    LOG.debug("Got reset profile request for ID: " + jsonReq.id);

    const checkExists = await userid.existsID(jsonReq.id); if (!checkExists || !checkExists.result) {
        LOG.error(`Reset request was rejected, ID doesn't exist: ${jsonReq.id}`);
        return CONSTANTS.FALSE_RESULT;
    }
    
    const cryptID = crypt.encrypt(jsonReq.id), cryptTime = crypt.encrypt(Date.now().toString()), 
        reset_url = conf.base_url + Buffer.from(`${conf.reset_url}?e=${cryptID}&t=${cryptTime}`).toString("base64"),
        button_code_pre = mustache.render(template.button_code_pre, {reset_url}), button_code_post = mustache.render(template.button_code_post, {reset_url}),
        email_title = mustache.render(template[`${jsonReq.lang}_title`], {name: checkExists.name, org: checkExists.org, reset_url}),
        email_html = mustache.render(template[`${jsonReq.lang}_email_html`], {name: checkExists.name, org: checkExists.org, button_code_pre, button_code_post}),
        email_text = mustache.render(template[`${jsonReq.lang}_email_text`], {name: checkExists.name, org: checkExists.org, reset_url});

	const result = await mailer.email(jsonReq.id, email_title, email_html, email_text);

	if (result) LOG.info(`Reset instructions emailed to ID: ${jsonReq.id}`); else LOG.error(`Unable email reset instructions for ID: ${jsonReq.id} mailer error`);

	return {result};
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.lang);
