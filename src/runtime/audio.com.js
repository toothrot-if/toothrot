
function create(context) {
    
    var vars, settings, currentAmbience, currentMusic, currentSound, Howl;
    
    var audio = context.createInterface("audio", {
        serializePath: serializeAudioPath,
        unserializePath: unserializeAudioPath,
        getPaths: getAudioPaths,
        play: playTrack,
        stop: stopAudio
    });
    
    var ambience = context.createInterface("ambience", {
        play: playAmbience,
        stop: stopAmbience
    });
    
    var music = context.createInterface("music", {
        play: playMusic,
        stop: stopMusic
    });
    
    var sound = context.createInterface("sound", {
        play: playSound,
        stop: stopSound
    });
    
    var ifaces = [audio, ambience, music, sound];
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        Howl = getModule("howler").Howl;
        
        ifaces.forEach(context.connectInterface);
        
        vars = context.getInterface("vars", ["get", "set", "remove"]);
        settings = context.getInterface("settings", ["get"]);
        
        context.on("run_node", onRunNode);
        context.on("vars_resume", onResume);
        context.on("clear_state", audio.stop);
        context.on("update_setting", onUpdateSetting);
    }
    
    function destroy() {
        
        context.removeListener("run_node", onRunNode);
        context.removeListener("vars_resume", onResume);
        context.removeListener("clear_state", audio.stop);
        context.removeListener("update_setting", onUpdateSetting);
        
        ifaces.forEach(context.disconnectInterface);
        
        vars = null;
        audio = null;
        music = null;
        ambience = null;
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
            audio.stop();
        }
        
        if (data.sound) {
            sound.play(data.sound);
        }
        else {
            sound.stop();
        }
        
        if (data.ambience) {
            ambience.play(data.ambience);
        }
        else if (data.ambience === false) {
            ambience.stop();
        }
        
        if (data.music) {
            music.play(data.music);
        }
        else if (data.music === false) {
            music.stop();
        }
    }
    
    function onResume() {
        
        if (vars.get("_currentSound")) {
            sound.play(audio.unserializePath(vars.get("_currentSound")));
        }
        
        if (vars.get("_currentAmbience")) {
            ambience.play(audio.unserializePath(vars.get("_currentAmbience")));
        }
        
        if (vars.get("_currentMusic")) {
            music.play(audio.unserializePath(vars.get("_currentMusic")));
        }
    }
    
    function stopAudio() {
        sound.stop();
        ambience.stop();
        music.stop();
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
        
        vars.set("_currentSound", audio.serializePath(path));
        
        currentSound = audio.play(path, settings.get("soundVolume"), false, currentSound);
    }
    
    function playAmbience(path) {
        
        var serialized = audio.serializePath(path);
        
        if (currentAmbience && vars.get("_currentAmbience") === serialized) {
            return;
        }
        
        vars.set("_currentAmbience", serialized);
        
        currentAmbience = audio.play(path, settings.get("ambienceVolume"), true, currentAmbience);
    }
    
    function playMusic(path) {
        
        var serialized = audio.serializePath(path);
        
        if (currentMusic && vars.get("_currentMusic") === serialized) {
            return;
        }
        
        vars.set("_currentMusic", serialized);
        currentMusic = audio.play(path, settings.get("musicVolume"), true, currentMusic);
    }
    
    function playTrack(path, volume, loop, current) {
        
        var paths = audio.getPaths(path), track;
        
        track = new Howl({
            src: paths,
            volume: volume / 100,
            loop: loop === true ? true : false
        });
        
        if (current) {
            current.unload();
        }
        
        track.play();
        
        return track;
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
        destroy: destroy
    };
}

module.exports = {
    create: create
};
