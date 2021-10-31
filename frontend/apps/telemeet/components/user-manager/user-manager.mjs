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
	MODULE_PATH = util.getModulePath(import.meta);

async function elementConnected(element) {
	let data = {componenturl: MODULE_PATH, CONTEXT_MENU_ID};

	if (element.getAttribute("styleBody")) data.styleBody = `<style>${element.getAttribute("styleBody")}</style>`;
	const usersResult = await apiman.rest(`${element.getAttribute("backendurl")}/${API_GETORGUSERS}`, "GET", 
		{org: element.getAttribute("org")}, true);
	if (!usersResult.result) {LOG.error("Can't fetch the list of users for the org, API returned false.");}
	else data.users = usersResult.users;
	
	user_manager.setDataByHost(element, data);
}

async function userMenuClicked(event, element, id) {
	const CONTEXT_MENU = window.monkshu_env.components["context-menu"];
	const menus = {}; menus[await i18n.get("Edit")] = _=>_editUser(id); menus[await i18n.get("Delete")] = _ => _deleteUser(id, element);
	CONTEXT_MENU.showMenu(CONTEXT_MENU_ID, menus, event.pageX, event.pageY, 2, 2);
}

async function _deleteUser(id, element) {
	const backendURL = user_manager.getHostElement(element).getAttribute("backendurl");
	const deleteResult = await apiman.rest(`${backendURL}/${API_DELETEUSER}`, "GET", {id}, true);
	if (!deleteResult?.result) {const err = router.getMustache().render(await i18n.get("DeleteError"), {id}); LOG.error(err); _showError(err);}
	else user_manager.reload(user_manager.getHostElementID(element));
}

const _showError = error => monkshu_env.components['dialog-box'].showDialog(`${MODULE_PATH}/subcomponents/dialog-box/templates/error.html`, 
	true, false, {error}, "dialog", [], _=> monkshu_env.components['dialog-box'].hideDialog("dialog"));

export const user_manager = {trueWebComponentMode: true, elementConnected, userMenuClicked}
monkshu_component.register("user-manager", `${APP_CONSTANTS.APP_PATH}/components/user-manager/user-manager.html`, user_manager);