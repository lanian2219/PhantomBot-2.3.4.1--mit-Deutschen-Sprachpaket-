/**
 * hostHandler.js
 *
 * Register and announce (un)host events.
 * Optionally supports rewarding points for a follow (Only every 6 hours!)
 */
(function() {
    var hostReward = $.getSetIniDbNumber('settings', 'hostReward', 200),
        hostMessage = $.getSetIniDbString('settings', 'hostMessage', $.lang.get('hosthandler.host.message')),
        autoHostMessage = $.getSetIniDbString('settings', 'autoHostMessage', $.lang.get('hosthandler.autohost.message')),
        hostHistory = $.getSetIniDbBoolean('settings', 'hostHistory', false),
        hostTimeout = 216e5, // 6 hours = 6 * 60 * 60 * 1000
        hostList = {},
        announceHosts = false;

    /**
     * Reloads the script variables for when the user edits stuff on the panel 
     *
     * @function updateHost
     */
    function updateHost() {
        hostReward = $.getIniDbNumber('settings', 'hostReward');
        hostMessage = $.getIniDbString('settings', 'hostMessage');
        autoHostMessage = $.getIniDbString('settings', 'autoHostMessage');
        hostHistory = $.getIniDbBoolean('settings', 'hostHistory');
    };

    /**
     * Gets the host start event from the core.
     *
     * @event twitchHostsInitialized
     */
    $.bind('twitchHostsInitialized', function(event) {
        /** is the module enabled? */
        if (!$.bot.isModuleEnabled('./handlers/hostHandler.js')) {
            return;
        }

        $.consoleLn(">> Enabling hosts announcements");
        $.log.event('Host announcements enabled');
        announceHosts = true;
    });

    /**
     * Gets the autohost event from the core.
     *
     * @event twitchAutoHosted
     */
    $.bind('twitchAutoHosted', function(event) {
        /** is the module enabled? */
        if (!$.bot.isModuleEnabled('./handlers/hostHandler.js')) {
            return;
        }

        /** Are we allowed to announce hosts? */
        if (!announceHosts) {
            return;
        }

        var hoster = $.username.resolve(event.getHoster()),
            now = $.systemTime(),
            msg = autoHostMessage,
            jsonObject = {};

        /** Does the bot know this guy hosted? */
        if (hostList[hoster]) {
            /** Has this guy been hosting for a while now? */
            if (hostList[hoster].hostTime > now) {
                return;
            }
            hostList[hoster].hostTime = now + hostTimeout;
        } else {
            /** This guy never hosted, add him to a array. */
            hostList[hoster] = {
                hostTime: now + hostTimeout
            };
        }

        /** Replace the tags in the host message */
        msg = msg.replace('(name)', hoster);
        $.say(msg.replace('/w', ' /w'));
    });

    /**
     * Gets the host event from the core.
     *
     * @event twitchHosted
     */
    $.bind('twitchHosted', function(event) {
        /** is the module enabled? */
        if (!$.bot.isModuleEnabled('./handlers/hostHandler.js')) {
            return;
        }

        var hoster = $.username.resolve(event.getHoster()),
            now = $.systemTime(),
            msg = hostMessage,
            jsonObject = {};

        /** Are we allowed to announce hosts? */
        if (!announceHosts) {
            return;
        }

        $.writeToFile(hoster, "./addons/hostHandler/latestHost.txt", false);

        /** Does the bot know this guy hosted? */
        if (hostList[hoster]) {
            /** Has this guy been hosting for a while now? */
            if (hostList[hoster].hostTime > now) {
                return;
            }
            hostList[hoster].hostTime = now + hostTimeout;
        } else {
            /** This guy never hosted, add him to a array. */
            hostList[hoster] = {
                hostTime: now + hostTimeout
            };
        }

        /** Replace the tags in the host message */
        msg = msg.replace('(name)', hoster);
        msg = msg.replace('(reward)', hostReward.toString());
        $.say(msg.replace('/w', ' /w'));

        /** is there a host reward set? */
        if (hostReward > 0) {
            /** Give the hoster points */
            $.inidb.incr('points', hoster.toLowerCase(), hostReward);
        }

        /** is the host history enabled? */
        if ($.getIniDbBoolean('settings', 'hostHistory', false)) {
            jsonObject = { 'host' : String(hoster), 'time' : now, 'viewers' : 0 }; // Add viewers as placeholder.
            $.inidb.set('hosthistory', hoster + '_' + now, JSON.stringify(jsonObject));
        }
    });

    /**
     * Gets the command event from the core
     *
     * @event command
     */
    $.bind('command', function(event) {
        var sender = event.getSender(),
            command = event.getCommand(),
            args = event.getArgs(),
            argsString = event.getArguments(),
            action = parseInt(args[0]);

        /**
         * Set a reward for when someone hosts the channel.
         *
         * @commandpath hostreward [amount] - Set the amount of points to reward when a channel starts hosting
         */
        if (command.equalsIgnoreCase('hostreward')) {
            if (!parseInt(action) || isNaN(action)) {
                $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.set.hostreward.usage', $.pointNameMultiple));
                return;
            }

            $.inidb.set('settings', 'hostReward', action);
            hostReward = parseInt(action);
            $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.set.hostreward.success', $.getPointsString(action)));
            $.log.event(sender + ' changed the host reward to ' + action);
        }

        /**
         * Set a message for when someone hosts the channel
         *
         * @commandpath hostmessage [message] - Set a message given when a channel hosts
         */
        if (command.equalsIgnoreCase('hostmessage')) {
            if (args.length < 1) {
                $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.set.hostmessage.usage'));
                return;
            }

            hostMessage = argsString;
            $.inidb.set('settings', 'hostMessage', hostMessage);
            $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.set.hostmessage.success'));
            $.log.event(sender + ' changed the host message to ' + hostMessage);
        }

        /**
         * Set a message for when someone autohosts the channel
         *
         * @commandpath autohostmessage [message] - Set a message given when a channel autohosts
         */
        if (command.equalsIgnoreCase('autohostmessage')) {
            if (args.length < 1) {
                $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.set.autohostmessage.usage'));
                return;
            }

            autoHostMessage = argsString;
            $.inidb.set('settings', 'autoHostMessage', autoHostMessage);
            $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.set.autohostmessage.success'));
            $.log.event(sender + ' changed the autohost message to ' + autoHostMessage);
        }

        /**
         * unhost the channel.
         *
         * @commandpath unhost - Send the /unhost command to Twitch
         */
        if (command.equalsIgnoreCase('unhost')) {
            $.say('.unhost');
        }

        /**
         * Host a channel
         *
         * @commandpath host [channel] - Send the /host command to Twitch
         */
        if (command.equalsIgnoreCase('host')) {
            if (args.length < 1) {
                $.say($.whisperPrefix(sender) + $.lang.get('hosthandler.host.usage'));
                return;
            }
            var target = args[0].toLowerCase();

            $.say('.host ' + target);
            $.log.event(sender + ' hosted channel ' + target);
        }

        /**
         * Check how many people are currently hosting the channel.
         *
         * @commandpath hostcount - Announce the number of other channels hosting this channel [DEPRECATED]
         */
        if (command.equalsIgnoreCase('hostcount')) {
            $.say($.lang.get('hosthandler.deprecated'));
        }

        /**
         * Give a list of the current hosters.
         *
         * @commandpath hostlist - Announce a list of other channels hosting this channel [DEPRECATED]
         */
        if (command.equalsIgnoreCase('hostlist')) {
            $.say($.lang.get('hosthandler.deprecated'));
        }

        /**
         * Toggle the host history.
         *
         * @commandpath hosthistory [on/off] - Enable/disable collection of host history data for the Panel.
         */
        if (command.equalsIgnoreCase('hosthistory')) {
            if (args.length < 1) {
                $.say($.whisperPrefix(sender) + $.lang.get('hosthistory.usage', $.getIniDbBoolean('settings', 'hostHistory') ? "An" : "Aus"));
                return;
            }
            if (action.equalsIgnoreCase('on')) {
                $.setIniDbBoolean('settings', 'hostHistory', true);
                $.say($.whisperPrefix(sender) + $.lang.get('hosthistory.change', $.getIniDbBoolean('settings', 'hostHistory') ? "An" : "Aus"));
            } else if (action.equalsIgnoreCase('off')) {
                $.setIniDbBoolean('settings', 'hostHistory', false);
                $.say($.whisperPrefix(sender) + $.lang.get('hosthistory.change', $.getIniDbBoolean('settings', 'hostHistory') ? "An" : "Aus"));
            } else {
                $.say($.whisperPrefix(sender) + $.lang.get('hosthistory.usage', $.getIniDbBoolean('settings', 'hostHistory') ? "An" : "Aus"));
                return;
            }
        }
    });

    /**
     * Loads commands once the bot is fully loaded
     *
     * @event initReady
     */
    $.bind('initReady', function() {
        if ($.bot.isModuleEnabled('./handlers/hostHandler.js')) {
            $.registerChatCommand('./handlers/hostHandler.js', 'hostmessage', 1);
            $.registerChatCommand('./handlers/hostHandler.js', 'autohostmessage', 1);
            $.registerChatCommand('./handlers/hostHandler.js', 'hostreward', 1);
            $.registerChatCommand('./handlers/hostHandler.js', 'unhost', 1);
            $.registerChatCommand('./handlers/hostHandler.js', 'host', 1);
            $.registerChatCommand('./handlers/hostHandler.js', 'hostcount');
            $.registerChatCommand('./handlers/hostHandler.js', 'hostlist');
            $.registerChatCommand('./handlers/hostHandler.js', 'hosthistory', 1);
        }
    });

    $.updateHost = updateHost;
})();
