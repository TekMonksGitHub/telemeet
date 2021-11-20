/**
 * Setup AV devices - helper script. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */

const DIALOG = monkshu_env.components["dialog-box"], SELECTOR_SPEAKER = "select#speaker", RECORD_TIME = 10000,
    SELECTOR_MIKE = "select#microphone", SELECTOR_CAM = "select#camera", VIDEO_INOUT = "video#testvideo";

async function init(_hostID) {}

async function testAVSetup(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const selectedAudioIn = shadowRoot.querySelector(SELECTOR_MIKE);
    const selectedVideoIn = shadowRoot.querySelector(SELECTOR_CAM);
    const videoIn = shadowRoot.querySelector(VIDEO_INOUT);
    const constraints = { audio: {deviceId: {exact: selectedAudioIn.value }}, video: {deviceId: {exact: selectedVideoIn.value }} };

    try {
        const stream = await window.navigator.mediaDevices.getUserMedia(constraints);
        videoIn.srcObject = stream; videoIn.volume = 0.0; videoIn.play();
        const mediaRecorder = new MediaRecorder(stream, {mimeType: "video/webm"});
        mediaRecorder.addEventListener("dataavailable", event => {
            if (event.data.size > 0) {
                const recorderdVideo = new Blob([event.data], { "type" : "video/webm" });
                const newVideo = document.createElement("video"); newVideo.id = videoIn.id;
                newVideo.setAttribute("src", window.URL.createObjectURL(recorderdVideo)); 
                const parent = videoIn.parentNode; parent.replaceChild(newVideo, videoIn);  // to play new media this seems the only way - new video element. 
                newVideo.currentTime = 0; newVideo.volume = 0.5; newVideo.play();
            }
        });
        mediaRecorder.start(); setTimeout(_ => {stopAVTracks(containedElement); mediaRecorder.stop();}, RECORD_TIME);
    } catch (err) {
        LOG.error(err);
    }
}

function stopAVTracks(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const videoInOut = shadowRoot.querySelector(VIDEO_INOUT);

    videoInOut.pause(); if (videoInOut.srcObject) for (const track of videoInOut.srcObject.getTracks()) {
        track.stop(); videoInOut.srcObject.removeTrack(track); }
}

export const setupav = {init, testAVSetup, stopAVTracks};