/**
 * Setup AV devices - helper script. 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */

const DIALOG = monkshu_env.components["dialog-box"], SELECTOR_SPEAKER = "select#speaker", MAX_RECORD_TIME = 60000,
    SELECTOR_MIKE = "select#microphone", SELECTOR_CAM = "select#camera", VIDEO_INOUT = "video#testvideo", 
    RECORD_BUTTON = "span#recordvideo", STOP_RECORD_BUTTON = "span#stoprecording", PLAY_BUTTON = "span#playrecording",
    STOP_PLAY_BUTTON = "span#stopplayrecording", VIDEO_HELP = "span#testvideohelp", AUDIO_OUT = "audio#testaudio",
    AUDIO_PLAY_BUTTON = "span#playspeakers", AUDIO_STOP_BUTTON = "span#stopplayspeakers";

async function init(_hostID) {
    navigator.mediaDevices.getUserMedia({ audio: true });
}

async function startrecording(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement), env = _getEnv(containedElement)
    const videoIn = shadowRoot.querySelector(VIDEO_INOUT), videoHelp = shadowRoot.querySelector(VIDEO_HELP);
    const recordButton = shadowRoot.querySelector(RECORD_BUTTON), stoprecordingButton = shadowRoot.querySelector(STOP_RECORD_BUTTON);

    try {
        const stream = await restartAVTracks(containedElement); if (!stream) return;        // no stream to record
        recordButton.style.display = "none"; stoprecordingButton.style.display = "inline";  // flip buttons
        videoHelp.style.display = "none"; videoIn.style.display = "block";                  // hide help start video
        const mediaRecorder = new MediaRecorder(stream, {mimeType: "video/webm"}); env.mediaRecorder = mediaRecorder;
        mediaRecorder.addEventListener("dataavailable", event => {
            if (event.data.size > 0) {
                const recorderdVideo = new Blob([event.data], {"type" : "video/webm"});
                const newVideo = document.createElement("video"); newVideo.id = videoIn.id;
                newVideo.setAttribute("src", window.URL.createObjectURL(recorderdVideo)); newVideo.style.display = "block";
                stopAVTracks(containedElement); const parent = videoIn.parentNode; parent.replaceChild(newVideo, videoIn);  // to play new media this seems the only way - new video element. 
            }
        });
        mediaRecorder.start(); env.recording = true; setTimeout(_=>{if (env.recording) stoprecording(containedElement)}, MAX_RECORD_TIME);
    } catch (err) {
        LOG.error(err.toString());
    }
}

function stoprecording(containedElement) {
    const env = _getEnv(containedElement); if (!env.recording) return; // nothing is being recorded
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    env.mediaRecorder.stop(); env.recording = false; 
    const recordButton = shadowRoot.querySelector(RECORD_BUTTON), stoprecordingButton = shadowRoot.querySelector(STOP_RECORD_BUTTON);
    recordButton.style.display = "inline"; stoprecordingButton.style.display = "none"; 
}

async function playrecording(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const videoOut = shadowRoot.querySelector(VIDEO_INOUT), videoHelp = shadowRoot.querySelector(VIDEO_HELP); 
    videoOut.style.display = "block"; videoHelp.style.display = "none";
    try {
        const selectedAudioOut = shadowRoot.querySelector(SELECTOR_SPEAKER); 
        if (videoOut.setSinkId) await videoOut.setSinkId(_getDevID(selectedAudioOut));  // android chrome won't allow this
        const playButton = shadowRoot.querySelector(PLAY_BUTTON), stopPlayButton = shadowRoot.querySelector(STOP_PLAY_BUTTON);
        playButton.style.display = "none"; videoOut.currentTime = 0; videoOut.muted = false; videoOut.volume = 0.5; 
        videoOut.play(); videoOut.addEventListener("ended", _=> stopplayrecording(containedElement)); stopPlayButton.style.display = "inline"; 
    } catch (err) {
        LOG.error(err.toString());
    }
}

function stopplayrecording(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const videoOut = shadowRoot.querySelector(VIDEO_INOUT), videoHelp = shadowRoot.querySelector(VIDEO_HELP);
    const playButton = shadowRoot.querySelector(PLAY_BUTTON), stopPlayButton = shadowRoot.querySelector(STOP_PLAY_BUTTON);
    playButton.style.display = "inline"; videoOut.pause();  videoOut.currentTime = 0; stopPlayButton.style.display = "none";
    videoHelp.style.display = "flex"; videoOut.style.display = "none"; 
}

function stopAVTracks(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const videoInOut = shadowRoot.querySelector(VIDEO_INOUT);

    videoInOut.pause(); if (videoInOut.srcObject) for (const track of videoInOut.srcObject.getTracks()) {
        track.stop(); videoInOut.srcObject.removeTrack(track); }
}

async function restartAVTracks(containedElement) {
    stopAVTracks(containedElement);

    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const selectedAudioIn = shadowRoot.querySelector(SELECTOR_MIKE);
    const selectedVideoIn = shadowRoot.querySelector(SELECTOR_CAM);
    const videoIn = shadowRoot.querySelector(VIDEO_INOUT);
    const constraints = { audio: {deviceId: {exact: _getDevID(selectedAudioIn) }}, 
        video: {deviceId: {exact: _getDevID(selectedVideoIn) }} };

    try {
        const stream = await window.navigator.mediaDevices.getUserMedia(constraints);
        videoIn.srcObject = stream; videoIn.muted = true; videoIn.play(); 
        return stream;
    } catch (err) { 
        LOG.error(`Error opening AV devices. Error is ${err.toString()}, the constraints are ${JSON.stringify(constraints)}`); 
        LOG.error(`The audio device label,deviceID is ${selectedAudioIn.value}`); 
        LOG.error(`The video device label,deviceID is ${selectedVideoIn.value}`); 
        return null; 
    }
}

async function playspeakers(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const audioOut = shadowRoot.querySelector(AUDIO_OUT);
    const playButton = shadowRoot.querySelector(AUDIO_PLAY_BUTTON), stopPlayButton = shadowRoot.querySelector(AUDIO_STOP_BUTTON);
    const selectedAudioOut = shadowRoot.querySelector(SELECTOR_SPEAKER); 
    if (audioOut.setSinkId) await audioOut.setSinkId(_getDevID(selectedAudioOut));  // android chrome won't allow this
    playButton.style.display = "none"; audioOut.currentTime = 0; audioOut.volume = 0.5; audioOut.play(); stopPlayButton.style.display = "inline";
    audioOut.addEventListener("ended", _=> stopplayspeakers(containedElement)); 
}

function stopplayspeakers(containedElement) {
    const shadowRoot = DIALOG.getShadowRootByContainedElement(containedElement);
    const audioOut = shadowRoot.querySelector(AUDIO_OUT);
    const playButton = shadowRoot.querySelector(AUDIO_PLAY_BUTTON), stopPlayButton = shadowRoot.querySelector(AUDIO_STOP_BUTTON);
    playButton.style.display = "inline"; audioOut.pause(); audioOut.currentTime = 0; stopPlayButton.style.display = "none";
}

const _getEnv = containedElement => {
    if (DIALOG.getMemoryByContainedElement(containedElement).setupavEnv) DIALOG.getMemoryByContainedElement(containedElement).setupavEnv;
    else DIALOG.getMemoryByContainedElement(containedElement).setupavEnv = {}; return DIALOG.getMemoryByContainedElement(containedElement).setupavEnv;
}

const _getDevID = optionElement => optionElement.options[optionElement.selectedIndex].value.substring(
    optionElement.options[optionElement.selectedIndex].text.length+1);

export const setupav = {init, startrecording, stoprecording, playrecording, stopplayrecording, stopAVTracks, playspeakers,
    stopplayspeakers};