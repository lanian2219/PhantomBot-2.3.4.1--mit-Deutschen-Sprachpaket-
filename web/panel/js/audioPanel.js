/*
 * Copyright (C) 2016 phantombot.tv
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* 
 * @author IllusionaryOne
 */

/*
 * audioPanel.js
 * Drives the Audio Panel
 */
(function() {

    /**
     * Sounds Object
     *
     * name is used by Ion.Sound to find files to play.
     * desc is used to generate the buttons for the audio panel.
     */
    var announceInChat = false,
        playlists = [],
        sounds = [];

    /**
     * @function onMessage
     */
    function onMessage(message) {
        var msgObject,
            html = '',
            keyword = '';

        try {
            msgObject = JSON.parse(message.data);
        } catch (ex) {
            return;
        }

        if (panelHasQuery(msgObject)) {
            if (panelCheckQuery(msgObject, 'audio_ytpMaxReqs')) {
                $('#ytpMaxReqsInput').attr('placeholder', msgObject['results']['songRequestsMaxParallel']);
            }
            if (panelCheckQuery(msgObject, 'audio_ytpMaxLength')) {
                $('#ytpMaxLengthInput').attr('placeholder', msgObject['results']['songRequestsMaxSecondsforVideo']);
            }
            if (panelCheckQuery(msgObject, 'audio_ytpDJName')) {
                $('#ytpDJNameInput').attr('placeholder', msgObject['results']['playlistDJname']);
            }
            if (panelCheckQuery(msgObject, 'audio_panel_hook')) {
                logMsg('Will Play: ' + msgObject['audio_panel_hook']);
            }
        }

        if (msgObject['audio_panel_hook'] !== undefined) {
            playIonSound(msgObject['audio_panel_hook']);
        }

        if (panelCheckQuery(msgObject, 'audio_songblacklist')) {
            if (msgObject['results'].length === 0) {
                $('#ytplayerBSong').html('<i>Es sind keine Lieder auf der schwarzen Liste.</i>');
                return;
            }
            var html = '<table>';
            for (var idx in msgObject['results']) {
                 var name = msgObject['results'][idx]['key'];
                html += '<tr style="textList">' +
                        '    <td style="vertical-align: middle: width: 50%">' + name + '</td>' +
                        '    <td style="width: 1%">' +
                        '        <button type="button" class="btn btn-default btn-xs" id="deleteBSong_' + name + '" onclick="$.deleteBSong(\'' + name + '\')"><i class="fa fa-trash" /> </button>' +
                        '    </td>' +
                        '</tr>';
            }
            html += '</table>';
            $('#ytplayerBSong').html(html);
            handleInputFocus();
        }

        if (panelCheckQuery(msgObject, 'audio_hook')) {
            var html = "<table>";
            sounds.splice(0);

            for (var idx in msgObject['results']) {

                sounds.push({name: msgObject['results'][idx]['key'], desc: msgObject['results'][idx]['value']});

                html += "<tr class=\"textList\">" +
                    "    <td style=\"width: 5%\">" +
                    "        <div id=\"deleteAudio_" + msgObject['results'][idx]['key'] + "\" type=\"button\" class=\"btn btn-default btn-xs\" " +
                    "             onclick=\"$.deleteAudio('" + msgObject['results'][idx]['key'] + "')\"><i class=\"fa fa-trash\" />" +
                    "        </div>" +
                    "    </td>" +
                    "    <td>" + msgObject['results'][idx]['value'] + "</td>" +
                    "</tr>";
            }
            html += "</table>";
            $('#audioHooks').html(html);
            handleInputFocus();

            setTimeout(function () {
                $(document).ready(function() {
                    ion.sound({
                        sounds: sounds,
                        path: "/panel/js/ion-sound/sounds/",
                        preload: true,
                        volume: 1.0,
                        ready_callback: ionSoundLoaded,
                        ended_callback: clearIonSoundPlaying 
                    });
                    sendAudioHooksToCore();
                });
            }, 2000);
        }

        if (panelCheckQuery(msgObject, 'audio_ytplaylists')) {
            if (msgObject['results'].length === 0) {
                return;
            }

            playlists.splice(0);

            for (var idx in msgObject['results']) {
                playlists.push(msgObject['results'][idx]['value']);
            } 
        }

        if (panelCheckQuery(msgObject, 'audio_ytptoggle1')) {
            if (msgObject['results']['announceInChat'] == "true") {
                announceInChat = "true";
            }
            if (msgObject['results']['announceInChat'] == "false") {
                announceInChat = "false";
            }
        }

        if (panelCheckQuery(msgObject, 'audio_userblacklist')) {
            if (msgObject['results'].length === 0) {
                $('#ytplayerBUser').html('<i>Keine Benutzer auf der schwarzen Liste.</i>');
                return;
            }
            html = '<table>';
            for (var idx in msgObject['results']) {
                 var name = msgObject['results'][idx]['key'];
                html += '<tr style="textList">' +
                        '    <td style="vertical-align: middle: width: 50%">' + name + '</td>' +
                        '    <td style="width: 1%">' +
                        '        <button type="button" class="btn btn-default btn-xs" id="deleteUser_' + name + '" onclick="$.deleteUser(\'' + name + '\')"><i class="fa fa-trash" /> </button>' +
                        '    </td>' +
                        '</tr>';
            }
            html += '</table>';
            $('#ytplayerBUser').html(html);
            handleInputFocus();
        }
    }

    /**
     * @function sendAudioHooksToCore
     */
    function sendAudioHooksToCore() {
        var jsonObject = {};
        jsonObject["audio_hooks"] = sounds;
        connection.send(JSON.stringify(jsonObject));
    }

    /**
     * @function doQuery
     */
    function doQuery(message) {
        sendDBQuery('audio_ytpMaxReqs', 'ytSettings', 'songRequestsMaxParallel');
        sendDBQuery('audio_ytpMaxLength', 'ytSettings', 'songRequestsMaxSecondsforVideo');
        sendDBQuery('audio_ytptoggle1', 'ytSettings', 'announceInChat');
        sendDBQuery('audio_ytpDJName', 'ytSettings', 'playlistDJname');
        sendDBKeys('audio_songblacklist', 'ytpBlacklistedSong');
        sendDBKeys('audio_userblacklist', 'ytpBlacklist');
        sendDBKeys('audio_ytplaylists', 'ytPanelPlaylist');
        sendDBKeys('audio_hook', 'audio_hooks');
    }

    /** 
     * @function addSound
     */
    function addSound() {
        var name = $('#soundImput').val();
        var desc = $('#soundImputDesc').val();

        if (name.length && desc.length != 0) {
            sendDBUpdate('audio_hook_add', 'audio_hooks', name, desc);
        }

        $('#soundImput').val('');
        $('#soundImputDesc').val('');
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
    };

    /** 
     * @function addSound
     */
    function deleteAudio(audio) {
        if (audio.length != 0) {
            $("#deleteAudio_" + audio).html("<i style=\"color: #6136b1\" class=\"fa fa-spinner fa-spin\" />");
            sendDBDelete('deleteAudio_' + audio, 'audio_hooks', audio);
        }
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME * 2);
    };

    /** 
     * @function deleteBSong
     * @param {String} song
     */
    function deleteBSong(song) {
        $("#deleteBSong_" + song).html("<i style=\"color: #6136b1\" class=\"fa fa-spinner fa-spin\" />");
        sendDBDelete("audio_bsong_" + song, "ytpBlacklistedSong", song);
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
    };

    /** 
     * @function blacklistSong
     */
    function blacklistSong() {
        var song = $("#songBlacklist").val();
        if (song.length != 0) {
            sendDBUpdate("audio_song_" + song, "ytpBlacklistedSong", song.toLowerCase(), 'true');
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        }
        setTimeout(function() { $("#songBlacklist").val(''); }, TIMEOUT_WAIT_TIME);
    };

    /** 
     * @function deleteUser
     * @param {String} user
     */
    function deleteUser(user) {
        $("#deleteBUser_" + user).html("<i style=\"color: #6136b1\" class=\"fa fa-spinner fa-spin\" />");
        sendDBDelete("audio_user_" + user, "ytpBlacklist", user);
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
    };

    /** 
     * @function blacklistUser
     */
    function blacklistUser() {
        var user = $("#userBlacklist").val();
        if (user.length != 0) {
            sendDBUpdate("audio_user_" + user, "ytpBlacklist", user.toLowerCase(), 'true');
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        }
        setTimeout(function() { $("#userBlacklist").val(''); }, TIMEOUT_WAIT_TIME);
    };

    /**
     * @function loadAudioPanel
     */
    function loadAudioPanel() {
        $("#audioPanelButtons").html('');
        for (var idx in sounds) {
            $("#audioPanelButtons").append("<button type=\"button\" class=\"soundButton\"" +
                                           "onclick=\"$.playIonSound('" + sounds[idx]['name'] + "');\">" +
                                           sounds[idx]['desc'] + "</button>");
        }
    }

    /**
     * @function ionSoundLoaded
     */
    function ionSoundLoaded() {
        $("#ionSoundLoaded").html("<span style=\"float: right\" class=\"greenPill-sm\">Bereit</span>");
        loadAudioPanel();
    }

    /**
     * @function playIonSound
     * @param {String} name
     */
    function playIonSound(name)
    {
        $("#ionSoundPlaying").fadeIn(400);
        ion.sound.play(name);
    }

    /**
     * @function clearIonSoundPlaying
     */
    function clearIonSoundPlaying() {
        $("#ionSoundPlaying").fadeOut(400);
    }

    /**
     * @function toggleYouTubePlayer
     */
    function toggleYouTubePlayer() {
        if ($("#youTubePlayerIframe").is(":visible")) {
            $("#youTubePlayerIframe").fadeOut(1000);
        } else {
            $("#youTubePlayerIframe").fadeIn(1000);
        }
    }

    /**
     * @function toggleYouTubePlayerPause
     */
    function toggleYouTubePlayerPause() {
        sendCommand('ytp pause');
    }

    /**
     * @function toggleYouTubePlayerRequests
     */
    function toggleYouTubePlayerRequests() {
        sendCommand('ytp togglerequests');
    }

    /**
     * @function toggleYouTubePlayerNotify
     */
    function toggleYouTubePlayerNotify() {
        if (announceInChat == "true") {
            sendDBUpdate('audio_setting', 'ytSettings', 'announceInChat', "false");
        } else {
            sendDBUpdate('audio_setting', 'ytSettings', 'announceInChat', "true");
        }
        setTimeout(function() { doQuery(); sendCommand('reloadyt'); }, TIMEOUT_WAIT_TIME * 2);
    }

    /**
     * @function setYouTubePlayerDJName
     */
    function setYouTubePlayerDJName() {
        var value = $('#ytpDJNameInput').val();
        if (value.length > 0) {
            $('#ytpDJNameInput').val('Updating...');
            sendDBUpdate('audio_setting', 'ytSettings', 'playlistDJname', value);
            setTimeout(function() { doQuery(); $('#ytpDJNameInput').val(''); sendCommand('reloadyt'); }, TIMEOUT_WAIT_TIME * 2);
        }
    }

    /**
     * @function setYouTubePlayerMaxReqs
     */
    function setYouTubePlayerMaxReqs() {
        var value = $('#ytpMaxReqsInput').val();
        if (value.length > 0) {
            $('#ytpMaxReqsInput').val('');
            $('#ytpMaxReqsInput').attr('placeholder', value);
            sendDBUpdate('audio_setting', 'ytSettings', 'songRequestsMaxParallel', value);
            sendCommand('reloadyt');
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME * 2);
        }
    }

    /**
     * @function setYouTubePlayerMaxLength
     */
    function setYouTubePlayerMaxLength() {
        var value = $('#ytpMaxLengthInput').val();
        if (value.length > 0) {
            $('#ytpMaxLengthInput').val('');
            $('#ytpMaxLengthInput').attr('placeholder', value);
            sendDBUpdate('audio_setting', 'ytSettings', 'songRequestsMaxSecondsforVideo', value);
            sendCommand('reloadyt');
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME * 2);
        }
    }

    /**
     * @function loadYtplaylist
     */
    function loadYtplaylist() {
        var value = $('#playlistImput').val();
        if (value.length > 0) {
            $('#playlistImput').val('Lade...');
            sendCommand('playlist playlistloadpanel ' + value);
            setTimeout(function() { doQuery(); $('#playlistImput').val(''); }, TIMEOUT_WAIT_TIME * 4);
        }
    }

    /**
     * @function fillYouTubePlayerIframe
     */
    function fillYouTubePlayerIframe() {
        $('#youTubePlayerIframe').html('<iframe id="youTubePlayer" frameborder="0" scrolling="auto" height="400" width="680"'+
                                       '        src="' + getProtocol() + url[0] + ':' + (getPanelPort() + 1) + '/ytplayer?start_paused">');
    }

    /**
     * @function launchYouTubePlayer
     */
    function launchYouTubePlayer() {
        window.open(getProtocol() + url[0] + ':' + (getPanelPort() + 1) + '/ytplayer', 'PhantomBot YouTube Player',
                    'menubar=no,resizeable=yes,scrollbars=yes,status=no,toolbar=no,height=700,width=900,location=no' );
    }

    /**
     * function drawYouTubePlayer
     */
    function drawYouTubePlayer() {
        if (YOUTUBE_IFRAME === true) {
            fillYouTubePlayerIframe();
            $('#youTubeLauncher').html('<button type="button" class="btn btn-primary inline pull-left" onclick="$.toggleYouTubePlayer()">Verstecke/Zeige YouTube Player</button>' +
                                       '<button type="button" class="btn btn-primary inline pull-left" onclick="$.toggleYouTubePlayerPause()">Pause An/Aus</button>');
        }
    }

    // Import the HTML file for this panel.
    $("#audioPanel").load("/panel/audio.html");

    // Load the DB items for this panel, wait to ensure that we are connected.
    var interval = setInterval(function() {
        if (TABS_INITIALIZED) {
            drawYouTubePlayer();
        }
        if (isConnected && TABS_INITIALIZED) {
            doQuery();
            clearInterval(interval);
        }
    }, INITIAL_WAIT_TIME);

    // Query the DB every 30 seconds for updates.
    setInterval(function() {
        var active = $('#tabs').tabs('option', 'active');
        if (active == 17 && isConnected && !isInputFocus()) {
            newPanelAlert('Aktualisiere Audio-Daten...', 'success', 1000);
            doQuery();
        }
    }, 3e4);

    // Export to HTML
    $.audioOnMessage = onMessage;
    $.audioDoQuery = doQuery;

    // Export functions to HTML.
    $.playIonSound = playIonSound;
    $.toggleYouTubePlayer = toggleYouTubePlayer;
    $.toggleYouTubePlayerPause = toggleYouTubePlayerPause;
    $.toggleYouTubePlayerNotify = toggleYouTubePlayerNotify;
    $.toggleYouTubePlayerRequests = toggleYouTubePlayerRequests;
    $.setYouTubePlayerDJName = setYouTubePlayerDJName;
    $.setYouTubePlayerMaxReqs = setYouTubePlayerMaxReqs;
    $.setYouTubePlayerMaxLength = setYouTubePlayerMaxLength;
    $.fillYouTubePlayerIframe = fillYouTubePlayerIframe;
    $.launchYouTubePlayer = launchYouTubePlayer;
    $.deleteBSong = deleteBSong;
    $.blacklistSong = blacklistSong;
    $.blacklistUser = blacklistUser;
    $.deleteUser = deleteUser;
    $.playlists = playlists;
    $.loadYtplaylist = loadYtplaylist;
    $.addSound = addSound;
    $.deleteAudio = deleteAudio;
})();
