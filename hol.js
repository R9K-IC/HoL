//TODO: Automatically reacquire most recent message to understand reacts to that message.

var Discord = require('discord.io');
var util = require('./util/util');
var commands = require('./cmds/cmds');
var cache = require('./cache/cache');

const reactInterval = 1500;
const roleInterval = 3000;

try {
	var auth = require("./auth/auth.json");
} catch (e){
	console.log("No auth.JSON file.\n"+e.stack);
	process.exit();
}

var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});

var timersSet = {};
var weeklyToggle = true;

var roleWaitlist = [];
var currentWatchedMessage = 593953712209264650;
var waitingForWeeklyMessageID = false;

/* Statics */
const NO_RESPONSE = "NO_RESPONSE";
const ADD = "ADD";
const REM = "REM";

/* Bitwise flags */
const FLAGS = {NONE: 0, SPAM: 1, PING: 2, EMBD: 4, PICT: 8, PM: 16, SELF: 32}

/* Function input requests */
const PERMS = {NONE: 0, UID: 1, CHID: 2, MSGID: 4, BOT: 8}

bot.on("ready", function(event){
	console.log("Connected!");
	console.log("Logged in as: ");
	console.log(bot.username + " - (" + bot.id + ")");
	handleRoles(roleInterval);
	setNextWeeklyTimer();
});

bot.on("message", function(user, userID, channelID, message, event){
	console.log(timersSet);
	if(waitingForWeeklyMessageID && event.d.author.id == bot.id){ currentWatchedMessage = event.d.id; waitingForWeeklyMessageID = false; reactSpectrum(channelID, event.d.id, Object.assign([], cache.emojiCache), reactInterval); }
	if(event.d.author.bot){ return; }
	var msg = message.toLowerCase(), re = /(?:\[\[(.*?)\]\])/gmi, re2 = /(?:([^\n\r,]+))/gmi, cmds = [], temp1, temp2;

	while((temp1 = re.exec(message)) != null){
		console.log("\n==== New Message ====\n" + user + " - " + userID + "\nin " + channelID + "\n" + message + "\n----------\n" + temp1[1]);
		cmds = [];
		while((temp2 = re2.exec(temp1[1])) != null){ cmds.push(temp2[1]); }
		
		//Hardcoded cause I don't give a shit enough to completely reformat how I originally made the bot that this is using the skeleton of to make this elegant.
		if(userID == 157212139344494592 && cmds[0].toLowerCase() == 'reset'){ setupWeeklyMessage(); }
		if(userID == 142927389574299648 && cmds[0].toLowerCase() == 'reset'){ setupWeeklyMessage(); }
		if(userID == 142927389574299648 && cmds[0].toLowerCase() == 'resetnuke'){ setupWeeklyMessage(1); }
		
		if(userID == 142927389574299648 && cmds[0].toLowerCase() == 'autoreseton'){ weeklyToggle = true; util.reactToMessage({channelID: channelID, messageID: event.d.id, reaction: ':Blob_Atk:578824811057381386', bot: bot}); }
		if(userID == 142927389574299648 && cmds[0].toLowerCase() == 'autoresetoff'){ weeklyToggle = false; util.reactToMessage({channelID: channelID, messageID: event.d.id, reaction: ':Blob_Atk:578824811057381386', bot: bot}); }
		
		var funcComm = commands.functionResponseCache[cmds[0].toLowerCase()];
		if(funcComm){
			if(!(funcComm.flags & FLAGS.SPAM) || !util.isNoSpamChannel(channelID)){
				var param = { 	cmds: cmds,
								userID:		PERMS.UID	& funcComm.permissions	? userID	: null,
								channelID:	PERMS.CHID	& funcComm.permissions	? channelID	: null,
								messageID:	PERMS.MSGID	& funcComm.permissions	? event.d.id: null,
								bot:		PERMS.BOT	& funcComm.permissions	? bot		: null,
								callback:	FLAGS.EMBD	& funcComm.flags		? sendEmbed	: null,
								cmdsArr:	FLAGS.SELF	& funcComm.flags		? commands.functionResponseCache : null }	
				var response = ((funcComm.flags & FLAGS.PING) ? util.pingUser(userID) : "") + funcComm.func(param);
				if(!(funcComm.flags & FLAGS.EMBD) && response != NO_RESPONSE){ sendMessages((funcComm.flags & FLAGS.PM) ? userID : channelID, [response]); }
			} else { console.log("Spam command: \"" + cmds[0] + "\" blocked in channel - " + channelID); }
		}
	}
});

bot.on("messageUpdate", function(event){});
bot.on("presence", function(user, userID, status, game, event){});

bot.on("any", function(event){
	try{
		if(event.d.user_id == bot.id || event.d.guild_id != cache.GID || event.d.message_id != currentWatchedMessage){ return; }
		var roleParams = {roleID: cache.roleCache[cache.emojiHash[event.d.emoji.id]], serverID: cache.GID, userID: event.d.user_id};
	}
	catch (e){
		return;
	}
	
	if(event.t == 'MESSAGE_REACTION_ADD'){
		console.log(event);
		roleParams['type'] = ADD;
		roleWaitlist.push(roleParams);
	}
	else if(event.t == 'MESSAGE_REACTION_REMOVE'){
		console.log(event);
		roleParams['type'] = REM;
		roleWaitlist.push(roleParams);
	}
});

bot.on("disconnect", function(){
	console.log("Bot disconnected");
	bot.connect();
});

function setNextWeeklyTimer(){
	var cT = new Date(), nT = new Date();
	nT.setUTCMilliseconds(0); nT.setUTCSeconds(0); nT.setUTCMinutes(0); nT.setUTCHours(0);
	nT.setUTCDate(cT.getUTCDate() - cT.getUTCDay() + 7 + 5);
	if(!timersSet[nT]){
		console.log(nT - cT);
		setTimeout(function(){
			if(weeklyToggle){ setupWeeklyMessage(1); }
			else{ setNextWeeklyTimer(); }
		}, nT - cT);
		timersSet[nT] = 1;
	}
}

function setupWeeklyMessage(nuke){
	if(nuke){ removeRolesFromAll(); waitForNuke(cache.announceChannel, [cache.weeklyMessage]); }
	else{
		sendMessages(cache.announceChannel, [cache.weeklyMessage]);
		waitingForWeeklyMessageID = true;
		setNextWeeklyTimer();
	}
}

function waitForNuke(cID, messageArr){
	interval = 200;
	function _waitForNuke(){
		setTimeout(function(){
			if(roleWaitlist[0]){
				_waitForNuke();
			}
			else{
				sendMessages(cID, messageArr);
				waitingForWeeklyMessageID = true;
				setNextWeeklyTimer();
			}
		}, interval);
	}
	_waitForNuke();
}

function removeRolesFromAll(){
	members = util.getMembers({bot: bot, GID: cache.GID})
	for(mem in members){
		roles = bot.servers[cache.GID].members[members[mem]].roles
		for(role in roles){
			if(cache.roleSearch[roles[role]]){
				roleWaitlist.push({ roleID: roles[role], serverID: cache.GID, userID: members[mem], 'type': REM })
			}
		}
	}
}

function reactSpectrum(cID, mID, emojArr, interval){
	function _reactSpectrum(){
		setTimeout(function(){
			if(emojArr[0]){
				util.reactToMessage({channelID: cID, messageID: mID, reaction: emojArr.shift(), bot: bot});
				_reactSpectrum();
			}
		}, interval);
	}
	_reactSpectrum();
}

function handleRoles(interval){
	function _handleRoles(){
		setTimeout(function(){
			if(roleWaitlist[0]){
				if(roleWaitlist[0]['type'] == ADD){
					console.log('Adding:',roleWaitlist[0])
					bot.addToRole(roleWaitlist.shift())
				}
				else{
					console.log('Removing:',roleWaitlist[0])
					bot.removeFromRole(roleWaitlist.shift())
				}
			}
			_handleRoles();
		}, interval);
	}
	_handleRoles();
}

function sendMessages(ID, messageArr, interval) {
	var resArr = [], len = messageArr.length;
	var callback = typeof(arguments[2]) === 'function' ?  arguments[2] :  arguments[3];
	if (typeof(interval) !== 'number') interval = 50;

	function _sendMessages() {
		setTimeout(function() {
			if (messageArr[0]) {
				bot.sendMessage({
					to: ID,
					message: messageArr.shift()
				}, function(err, res) {
					resArr.push(err || res);
					if (resArr.length === len) if (typeof(callback) === 'function') callback(resArr);
				});
				_sendMessages();
			}
		}, interval);
	}
	_sendMessages();
}

function sendFiles(channelID, fileArr, interval) {
	var resArr = [], len = fileArr.length;
	var callback = typeof(arguments[2]) === 'function' ? arguments[2] : arguments[3];
	if (typeof(interval) !== 'number') interval = 50;

	function _sendFiles() {
		setTimeout(function() {
			if (fileArr[0]) {
				bot.uploadFile({
					to: channelID,
					file: fileArr.shift()
				}, function(err, res) {
					resArr.push(err || res);
					if (resArr.length === len) if (typeof(callback) === 'function') callback(resArr);
				});
				_sendFiles();
			}
		}, interval);
	}
	_sendFiles();
}

function sendEmbed(ID, _embed){
	bot.sendMessage({
		to: ID,
		embed: _embed
	});
}
