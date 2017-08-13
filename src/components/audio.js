
var Howl = require("howler").Howl;

function create(context) {
    
    var vars, settings, currentAmbience, currentMusic, currentSound;
    
    function init() {
        
        vars = context.getComponent("vars");
        settings = context.getComponent("settings");
        
        context.on("run_node", onRunNode);
        context.on("vars_resume", onResume);
        context.on("clear_state", stopAudio);
        context.on("update_setting", onUpdateSetting);
    }
    
    function destroy() {
        
        context.removeListener("run_node", onRunNode);
        context.removeListener("vars_resume", onResume);
        context.removeListener("clear_state", stopAudio);
        context.removeListener("update_setting", onUpdateSetting);
        
        vars = null;
        settings = null;
        currentAmbience = null;
        currentMusic = null;
        currentSound = null;
    }
    
    function onUpdateSetting(name) {
        if (name === "soundVolume" && currentSound) {
            currentSound.volume(settings.get("soundVolume") / 100);
        }
        else if (name === "ambienceVolume" && currentAmbience) {
            currentAmbience.volume(settings.get("ambienceVolume") / 100);
        }
        else if (name === "musicVolume" && currentMusic) {
            currentMusic.volume(settings.get("musicVolume") / 100);
        }
    }
    
    function onRunNode(node) {
        
        var data = node.data;
        
        if (data.audio === false) {
            stopAudio();
        }
        
        if (data.sound) {
            playSound(data.sound);
        }
        else {
            stopSound();
        }
        
        if (data.ambience) {
            playAmbience(data.ambience);
        }
        else if (data.ambience === false) {
            stopAmbience();
        }
        
        if (data.music) {
            playMusic(data.music);
        }
        else if (data.music === false) {
            stopMusic();
        }
    }
    
    function onResume() {
        
        if (vars.get("_currentSound")) {
            playSound(unserializeAudioPath(vars.get("_currentSound")));
        }
        
        if (vars.get("_currentAmbience")) {
            playAmbience(unserializeAudioPath(vars.get("_currentAmbience")));
        }
        
        if (vars.get("_currentMusic")) {
            playMusic(unserializeAudioPath(vars.get("_currentMusic")));
        }
    }
    
    function stopAudio() {
        stopSound();
        stopAmbience();
        stopMusic();
    }
    
    function stopSound() {
        
        if (currentSound) {
            currentSound.unload();
        }
        
        vars.remove("_currentSound");
        currentSound = undefined;
    }
    
    function stopAmbience() {
        
        if (currentAmbience) {
            currentAmbience.unload();
        }
        
        vars.remove("_currentAmbience");
        currentAmbience = undefined;
    }
    
    function stopMusic() {
        
        if (currentMusic) {
            currentMusic.unload();
        }
        
        vars.remove("_currentMusic");
        currentMusic = undefined;
    }
    
    function playSound(path) {
        
        vars.set("_currentSound", serializeAudioPath(path));
        
        currentSound = playTrack(path, settings.get("soundVolume"), false, currentSound);
    }
    
    function playAmbience(path) {
        
        var serialized = serializeAudioPath(path);
        
        if (currentAmbience && vars.get("_currentAmbience") === serialized) {
            return;
        }
        
        vars.set("_currentAmbience", serialized);
        
        currentAmbience = playTrack(path, settings.get("ambienceVolume"), true, currentAmbience);
    }
    
    function playMusic(path) {
        
        var serialized = serializeAudioPath(path);
        
        if (currentMusic && vars.get("_currentMusic") === serialized) {
            return;
        }
        
        vars.set("_currentMusic", serialized);
        currentMusic = playTrack(path, settings.get("musicVolume"), true, currentMusic);
    }
    
    function playTrack(path, volume, loop, current) {
        
        var paths = getAudioPaths(path), audio;
        
        audio = new Howl({
            urls: paths,
            volume: volume / 100,
            loop: loop === true ? true : false
        });
        
        if (current) {
            current.unload();
        }
        
        audio.play();
        
        return audio;
    }
    
    function getAudioPaths(path) {
        
        var paths = [], base;
        
        if (Array.isArray(path)) {
            
            path = path.slice();
            base = path.shift();
            
            path.forEach(function (type) {
                paths.push(base + "." + type);
            });
        }
        else {
            paths.push(path);
        }
        
        return paths;
    }
    
    function serializeAudioPath(path) {
        return JSON.stringify(path);
    }
    
    function unserializeAudioPath(path) {
        return JSON.parse(path);
    }
    
    return {
        init: init,
        destroy: destroy,
        serializeAudioPath: serializeAudioPath,
        unserializeAudioPath: unserializeAudioPath,
        getAudioPaths: getAudioPaths,
        playTrack: playTrack,
        playAmbience: playAmbience,
        playMusic: playMusic,
        playSound: playSound,
        stopAudio: stopAudio,
        stopAmbience: stopAmbience,
        stopMusic: stopMusic,
        stopSound: stopSound
    };
}

module.exports = create;
