const _ = require("underscore");
const request = require("request");
const fs = require('fs');
const { WebClient } = require('@slack/client');
const token = process.env.slackToken;
const web = new WebClient(token);

module.exports = function(controller) {
  var choiceTimer = 60;  
  var Timer;
  var bannedForTime = false;
  controller.on("prisoners_onboard", function(bot, message) {

    var id = message.team.id ? message.team.id : message.team
    // add everyone to a picture-counting channel 
    controller.storage.teams.get(id, function(err, team) {
      
      var token = team.oauth_token;

      var web = new WebClient(token); 
      
      // console.log(_.pluck(team.users, 'userId'), message.user);
      
      web.groups.create("prisoning").then((channel, err) => {
        console.log(channel, err);

        var channelId = channel.group.id;
        
        console.log(team.users);

        var data = _.filter(team.users, function(user) {
          // console.log(user.id, message.user);
          if (user.userId != message.user)
            return user;
        });
        
        data = _.map(data, function(user) {
          return [ web, bot, user.userId, channelId, team.users.indexOf(user) ];
        });
        
        data.push([ web, bot, team.bot.user_id, channelId, 1 ])
        
        console.log(data.length);
                        
        var mapPromises = data.map(channelJoin);
    
        var results = Promise.all(mapPromises);

        results.then(members => {
          console.log("completed promises");
          
          setTimeout(function() {
            _.each(team.users, function(user) {
              console.log(user);
              setTimeout(function() {
                controller.studio.get(bot, "prisoners_dilemma", user.userId, channelId).then(convo => {
                  convo.activate(); 
                }).catch(err => {
                  console.log('Error: encountered an error loading script from Botkit Studio:', err);
                });
              }, 1000 * (team.users.indexOf(user) + 1));
              
            });
          }, 1000 * data.length + 1);
        });
        
        
      });
    });
  });
  
  
  var channelJoin = function(params) {

    if (!params) return;
   // Set a timeout for 1 sec each so that we don't exceed our Slack Api limits
    var bot = params[1];
    var web = params[0];

    var member = params[2].toString();
    var channel = params[3].toString();
    
    setTimeout(function() {
      // check if user is bot before adding
      // TODO check if user is already in channel
      if (member) {

        web.groups.info(channel).then(channelData => {
          // console.log(channelData.group, " this current channel");
          
          if (channelData && channelData.group.members.indexOf(member) < 0) {
            // Invite each user to the labyrinth chat channel
            return web.groups.invite(channel, member)
              .then(res => {
                return member;
              
              }).catch((err) => { console.log(" cannot invite due to error: ", err) });

          } else return;
        }).catch(err => console.log(" cannot get info due to error: ", err));


      }

    }, 1000 * (params[4] + 1));

  }; // End channel Join
  
  controller.on('user_channel_join, user_group_join', function(bot, message) {
      choiceTimer = 60;
      Timer = setInterval (function () {
        if(choiceTimer > 0) {
          choiceTimer -= 1;
          console.log(choiceTimer);
        }
        else if(!bannedForTime){
        bot.startConversation(message, function(err, convo){
          convo.say({
            username: "Daedalus",
            channel: "C7V493SA3",
            ephemeral: true,
            text: "Sorry, but you were eliminated from the game. You won't get any prize money."
          });
        });
          bannedForTime = true;
          console.log("Done");
          clearInterval(Timer);
        }
      }, 1000);
  });
}