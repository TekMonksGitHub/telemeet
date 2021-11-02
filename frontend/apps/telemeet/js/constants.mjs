/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 */
const FRONTEND = "http://localhost:8080";
const BACKEND = "http://localhost:9090";
const APP_NAME = "telemeet";
const APP_PATH = `${FRONTEND}/apps/${APP_NAME}`;
const API_PATH = `${BACKEND}/apps/${APP_NAME}`;
const COMPONENTS_PATH = `${FRONTEND}/apps/${APP_NAME}/components`;

export const APP_CONSTANTS = {
    FRONTEND, BACKEND, APP_PATH, APP_NAME, COMPONENTS_PATH,
    INDEX_HTML: APP_PATH+"/index.html",
    MAIN_HTML: APP_PATH+"/main.html",
    LOGIN_HTML: APP_PATH+"/login.html",
    REGISTER_HTML: APP_PATH+"/register.html",
    LOGIN_ROOM_HTML: APP_PATH+"/loginroom.html",
    ERROR_HTML: APP_PATH+"/error.html",
    MANAGE_HTML: APP_PATH+"/manage.html",

    DIALOGS_PATH: APP_PATH+"/dialogs",

    SESSION_NOTE_ID: "com_monkshu_ts",

    FW_HEARTBEATINTERVAL: 1000,

    // Login constants
    MIN_PASS_LENGTH: 8,
    API_LOGIN: API_PATH+"/login",
    API_RESET: API_PATH+"/reset",
    API_REGISTER: API_PATH+"/register",
    API_UPDATE: API_PATH+"/updateuser",
    API_ENTERROOM: API_PATH+"/enterroom",
    API_STATUS: API_PATH+"/setstatus",
    API_CHANGEPW: API_PATH+"/changepassword",
    API_CREATEROOM: API_PATH+"/createroom",
    API_DELETEROOM: API_PATH+"/deleteroom",
    API_FWCONTROL: API_PATH+"/fwcontrol",
    API_VALIDATE_TOTP: API_PATH+"/validatetotp",
    API_GETTOTPSEC: API_PATH+"/gettotpsec",
    API_GETPROFILE: API_PATH+"/getprofile",
    BCRYPT_SALT: "$2a$10$VFyiln/PpFyZc.ABoi4ppf",
    USERID: "userid",
    PWPH: "pwph",
    TIMEOUT: 600000,
    USERNAME: "username",
    USERORG: "userorg",
    USER_ROLE: "user",
    GUEST_ROLE: "guest",
    ADMIN_ROLE: "admin",
    PERMISSIONS_MAP: {
        user:[window.location.origin, APP_PATH+"/index.html", APP_PATH+"/error.html", APP_PATH+"/main.html", APP_PATH+"/reset.html", APP_PATH+"/register.html", APP_PATH+"/loginroom.html", APP_PATH+"/login.html", $$.MONKSHU_CONSTANTS.ERROR_HTML], 
        admin:[window.location.origin, APP_PATH+"/index.html", APP_PATH+"/error.html", APP_PATH+"/main.html", APP_PATH+"/reset.html", APP_PATH+"/register.html", APP_PATH+"/loginroom.html", APP_PATH+"/login.html", APP_PATH+"/manage.html", $$.MONKSHU_CONSTANTS.ERROR_HTML],
        guest:[window.location.origin, APP_PATH+"/index.html", APP_PATH+"/error.html", APP_PATH+"/reset.html", APP_PATH+"/register.html", APP_PATH+"/login.html", APP_PATH+"/loginroom.html", $$.MONKSHU_CONSTANTS.ERROR_HTML]
    },
    API_KEYS: {"*":"fheiwu98237hjief8923ydewjidw834284hwqdnejwr79389"},
    KEY_HEADER: "X-API-Key"
}