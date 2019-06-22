/* Statics */
const NO_RESPONSE = "NO_RESPONSE";

var util = require('../util/util');
var auth = require("../auth/auth.json");

/* Bitwise flags */
const FLAGS = {NONE: 0, SPAM: 1, PING: 2, EMBD: 4, PICT: 8, PM: 16, SELF: 32}

/* Function input requests */
const PERMS = {NONE: 0, UID: 1, CHID: 2, MSGID: 4, BOT: 8}

module.exports = {
	/* Response Cache as a catch-all for commands in brackets. */
	functionResponseCache: {
		"help": {
			usage: "[[help]]",
			desc: "-Shows all available commands & usage.",
			permissions: PERMS.UID,
			flags: FLAGS.SELF | FLAGS.EMBD | FLAGS.PM,
			func: function(_msg) {
				if(!this.savedResponse){ this.savedResponse = this.generateHelpResponse(_msg.cmdsArr); }
				for(var i = 0; i < this.savedResponse.length; i++){ _msg.callback(_msg.userID, this.savedResponse[i]); }
			},
			generateHelpResponse: function(_cmds){
				var messages = []
				
				var res = {
					color: 9997003,
					title: 'Inline Commands',
					fields: []
				}
				
				for(var cmd in _cmds){ res.fields.push({name: _cmds[cmd].usage, value: _cmds[cmd].desc}); }
				messages.push(res);
				return messages;
			},
			savedResponse: null
		},
		"playing": {
			usage: "[[playing,<game>]]",
			desc: "-Sets the game the bot is currently playing, if your name starts with Arch and ends with aic (and the bot likes you).",
			permissions: PERMS.UID | PERMS.BOT,
			flags: FLAGS.NONE,
			func: function(_msg) {
				if(_msg.userID == 157212139344494592){
					_msg.bot.setPresence({game : {name : _msg.cmds[1]}});
				}
				
				return NO_RESPONSE;
			}
		},
		"info":{
			usage: "[[info]]",
			desc: "-Bot information.",
			permissions: PERMS.NONE,
			flags: FLAGS.NONE,
			func: function(_msg){
				return this.infoResponse.content;
			},
			infoResponse: {
				content: "```\nHoL bot by Archaic.\nLast Updated: 06-22-2019\nver. 1.00\n```"
			}
		},
		"changelog":{
			usage: "[[changelog]]",
			desc: "-Bot changelog.",
			permissions: PERMS.NONE,
			flags: FLAGS.NONE,
			func: function(_msg){
				return this.changelogResponse.content;
			},
			changelogResponse: {
				content: "```\nver. 1.00:\t06-22-2019\n\tInitial Version.\n" +
							"```"
			}
		}
	}
};
