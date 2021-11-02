/** 
 * A user manager component. Needs corresponding backend api.
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */
import {util} from "/framework/js/util.mjs";
import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import "./subcomponents/dialog-box/dialog-box.mjs";
import "./subcomponents/context-menu/context-menu.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const CONTEXT_MENU_ID = "usermanagerContextMenu", API_GETORGUSERS = "getorgusers", API_DELETEUSER = "deleteuser",
	API_APPROVEUSER = "approveuser", API_EDITUSER = "updateuser",MODULE_PATH = util.getModulePath(import.meta);

let conf;

async function elementConnected(element) {
	conf = await $$.requireJSON(`${MODULE_PATH}/conf/usermanager.json`);
	let data = {componenturl: MODULE_PATH, CONTEXT_MENU_ID};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;
	const usersResult = await apiman.rest(`${element.getAttribute("backendurl")}/${API_GETORGUSERS}`, "GET", 
		{org: element.getAttribute("org")}, true);
	if (!usersResult.result) {LOG.error("Can't fetch the list of users for the org, API returned false.");}
	else data.users = usersResult.users;
	
	user_manager.setDataByHost(element, data);
}

async function userMenuClicked(event, element, name, id, _org, role, approved) {
	const CONTEXT_MENU = window.monkshu_env.components["context-menu"];
	const menus = {}; menus[await i18n.get("Edit")] = _=>_editUser(name, id, role, approved, element); 
	menus[await i18n.get("Delete")] = _ => _deleteUser(name, id, element);
	if (approved == 0) menus[await i18n.get("Approve")] = _=>_approveUser(name, id, element);
	CONTEXT_MENU.showMenu(CONTEXT_MENU_ID, menus, event.pageX, event.pageY, 2, 2);
}

async function _editUser(name, id, role, approved, element) {
	const roles = []; for (const thisrole of conf.roles) roles.push({label:await i18n.get(thisrole), value: thisrole, selected: thisrole==role?true:undefined});
	monkshu_env.components['dialog-box'].showDialog(`${MODULE_PATH}/dialogs/editprofile.html`, true, true, 
			{name, id, role, approved:approved==1?true:undefined, roles}, "dialog", 
			["name", "id", "role", "approved", "old_id"], async ret => {
		
		if (ret.approved.toLowerCase() == "true") ret.approved = true; else ret.approved = false;
		const backendURL = user_manager.getHostElement(element).getAttribute("backendurl");
		const editResult = await apiman.rest(`${backendURL}/${API_EDITUSER}`, "POST", ret, true);
		if (!editResult?.result) {
			const err = router.getMustache().render(await i18n.get("EditError"), {name, id}); 
			LOG.error(err); monkshu_env.components['dialog-box'].error("dialog", err);
		} else {
			monkshu_env.components['dialog-box'].hideDialog("dialog");
			user_manager.reload(user_manager.getHostElementID(element));
		}
	});
}

async function _deleteUser(name, id, element) {
	_execOnConfirm(router.getMustache().render(await i18n.get("ConfirmUserDelete"), {name, id}), async _ =>{
		const backendURL = user_manager.getHostElement(element).getAttribute("backendurl");
		const deleteResult = await apiman.rest(`${backendURL}/${API_DELETEUSER}`, "GET", {name, id}, true);
		if (!deleteResult?.result) {const err = router.getMustache().render(await i18n.get("DeleteError"), {name, id}); LOG.error(err); _showError(err);}
		else user_manager.reload(user_manager.getHostElementID(element));
	});
}

async function _approveUser(name, id, element) {
	const backendURL = user_manager.getHostElement(element).getAttribute("backendurl");
	const approveResult = await apiman.rest(`${backendURL}/${API_APPROVEUSER}`, "GET", {id}, true);
	if (!approveResult?.result) {
		const err = router.getMustache().render(await i18n.get("ApproveError"), {name, id}); 
		LOG.error(err); _showError(err);
	} else { 
		await _showMessage(router.getMustache().render(await i18n.get("Approved"), {name, id})); 
		user_manager.reload(user_manager.getHostElementID(element)); 
	}
}

const _showError = async error => { await monkshu_env.components['dialog-box'].showDialog(`${MODULE_PATH}/dialogs/error.html`, 
	true, false, {error}, "dialog", []); monkshu_env.components['dialog-box'].hideDialog("dialog"); }
const _showMessage = async message => { await monkshu_env.components['dialog-box'].showDialog(`${MODULE_PATH}/dialogs/message.html`, 
	true, false, {message}, "dialog", []); monkshu_env.components['dialog-box'].hideDialog("dialog"); }
const _execOnConfirm = (message, cb) => monkshu_env.components['dialog-box'].showDialog(`${MODULE_PATH}/dialogs/message.html`, 
	true, true, {message}, "dialog", [], _=>{monkshu_env.components['dialog-box'].hideDialog("dialog"); cb();});

export const user_manager = {trueWebComponentMode: true, elementConnected, userMenuClicked}
monkshu_component.register("user-manager", `${APP_CONSTANTS.APP_PATH}/components/user-manager/user-manager.html`, user_manager);