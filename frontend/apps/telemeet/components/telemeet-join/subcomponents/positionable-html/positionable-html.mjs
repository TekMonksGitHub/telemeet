/** 
 * Positionable HTML component. Needs X, Y locations to position.
 * The data element will provide standard router data, e.g. URL etc
 * plus component_path, and host_id by default to the HTML being
 * rendered.
 * 
 * Useful to show html content based on user clicks, at the click's
 * location.
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "/framework/js/util.mjs";
import {router} from "/framework/js/router.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta);

/**
 * Element was rendered
 * @param element Host element
 */
async function elementRendered(element) {
	const data = positionable_html.getData(element.id), shadowRoot = positionable_html.getShadowRootByHost(element);
	if (data?.htmlContent) {	// run any contained JS scripts
		const domHTMLContent = new DOMParser().parseFromString(data.htmlContent, "text/html").documentElement;
		router.runShadowJSScripts(domHTMLContent, shadowRoot);
	}
}

/**
 * Shows the component.
 * @param hostID The host ID of the context-menu element which should be used to display this html
 * @param contentOrURL HTML string or path to the HTML to display. If path is provided it must be a URL object.
 * @param x The X coordinates (pageX) where to display
 * @param y The Y coordinates (pageY) where to display
 * @param adjustX Any adjustment to make for X coordinates (e.g. shift right by 5px or -5px). Default: 0.
 * @param adjustY Any adjustment to make for Y coordinates (e.g. shift top by 5px or -5px). Default: 0.
 * @param data Any additional data to pass to the HTML renderer. Default: {}.
 * @param isTop Component rises up, that is the bottom is positioned where the click was, instead of bottom. Default: false.
 */
async function show(hostID, contentOrURL, x, y, adjustX=0, adjustY=0, data={}, isTop=false) {
	const isContent = typeof contentOrURL == "string", dataForRouter = {component_path: COMPONENT_PATH, host_id: hostID, ...data};
	const contentObject = {htmlContent: isContent ? await router.expandPageData(contentOrURL, undefined, dataForRouter) : 
		await router.loadHTML(contentOrURL, dataForRouter)};

	const signX = adjustX.toString().trim().startsWith("-") ? "-":"+",  signY = adjustY.toString().trim().startsWith("-") ? "-":"+",
		appendUnitsX = typeof(adjustX) == "number" ? "px":adjustX.trim().substring(parseInt(adjustX).toString().length), 
		appendUnitsY = typeof(adjustY) == "number" ? "px":adjustY.trim().substring(parseInt(adjustY).toString().length),
		positioner = positionable_html.getShadowRootByHostId(hostID).querySelector("div#positioner"), 
		positionerRect = positioner.getBoundingClientRect(), 
		yAdjusted = `calc(${isTop?"100vh -":"0px +"} ${y}px - ${positionerRect.y}px ${signY} ${Math.abs(parseInt(adjustY))+appendUnitsY||"0px"})`, 
		xAdjusted = `calc(${x}px - ${positionerRect.x}px ${signX} ${Math.abs(parseInt(adjustX))+appendUnitsX||"0px"})`;
		
	const host = positionable_html.getHostElementByID(hostID);
	const styleBody = `<style>${host.getAttribute("styleBody")||""}\ndiv#content {${isTop?"bottom:":"top:"}${yAdjusted}; left:${xAdjusted}; border-width:1px}\n${data?.styleBody||""}</style>`;
	const dataForComponent = {...contentObject, styleBody};
	
	positionable_html.bindData(dataForComponent, hostID); 
	positionable_html.getMemory(hostID).isShowing = true;
}

/**
 * Hides the element content
 * @param hostID The host ID of the element.
 */
async function hide(hostID) {
	const data = {}; await positionable_html.bindData(data, hostID); 
	positionable_html.getMemory(hostID).isShowing = false;
}

/** @return true if component is showing, false otherwise */
const isShowing = hostID => positionable_html.getMemory(hostID).isShowing == true;

// convert this all into a WebComponent so we can use it
export const positionable_html = {trueWebComponentMode: true, show, isShowing, hide, elementRendered}
monkshu_component.register("positionable-html", `${COMPONENT_PATH}/positionable-html.html`, positionable_html);