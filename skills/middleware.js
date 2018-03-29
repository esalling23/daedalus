const _ = require("underscore");
// const gm = require("gm");
const http = require('http');
const fs = require('fs');
const request = require('request');
const { WebClient } = require('@slack/client');

var acceptedTypes = ['jpg', 'jpeg', 'png'];

module.exports = function(controller) {

    controller.middleware.receive.use(function(bot, message, next) {
    
//         // do something...
        // console.log('RCVD:', message);
        if (message.file) {
          if (acceptedTypes.indexOf(message.file.filetype) > -1) {
            var messId = message.team.id ? message.team.id : message.team;
            controller.storage.teams.get(messId, function(err, team){
              // console.log(messId, "is the team id");
              // console.log(team, "is the team");
              if(team.image_channel_id == message.channel) {
                controller.trigger("image_counter_upload", [{ bot:bot, message:message }]);
              }
            });
          }
          
        }
        next();
    
    });
    
    
    controller.middleware.send.use(function(bot, message, next) {
    
        // do something...
        // console.log('SEND:', message);
      
        if (message.type == "feedback") {
          controller.storage.teams.get(bot.config.id, function(err, team) {
            var token = team.oauth_token;

            var web = new WebClient(token);
            
            if (!team.image_feedback) team.image_feedback = {};

            setTimeout(function() {
              web.groups.history(message.channel).then(res => {
                var thisMsg = _.findWhere(res.messages, { text: message.text });
                thisMsg.channel = message.channel;

                team.image_feedback[message.location] = thisMsg;
                controller.storage.teams.save(team, function(err, saved) { console.log(team.image_feedback[message.location], "saved") });
              });
            }, 1000);
          });
        }
      
        next();
    
    });

}
