var debug = require('debug')('botkit:onboarding');
var fs = require("fs");
var _ = require("underscore");

const { WebClient } = require('@slack/client');

var channels = ["gamelog", "theLabyrinth", "map"], 
    mapChannel,
    globalChannels = [], 
    globalMembers = [],
    creator,
    memberCount;

function isUser(member) {
  console.log(member.name, "is the member being checked");
  if (member.is_bot || member.name == process.env.botName || member.name == "slackbot")
    return false;
  else
    return true;
}

module.exports = function(controller) {
  
    controller.on('onboard', function(bot, team, auth) {
            
      const token = auth.access_token;

      var web = new WebClient(token);
      controller.storage.teams.get(team.id, function (error, team) {
       web.users.list().then((res) => {
                
         if (!team.users) team.users = [];
          console.log(res);
         
          _.each(res.members, function(user) {
            var thisUser = _.findWhere(team.users, { userId: user.id });
            if (isUser(user) && !thisUser) {
              
              team.users.push({ userId: user.id, name: user.name });
                          
                bot.api.im.open({user: user.id}, function(err, direct_message) { 
                  creator = bot.config.createdBy;
                  console.log(creator, "created this group and added the bot");

                  if (err) {
                    debug('Error sending onboarding message:', err);
                  } else {
                    console.log(user.id);
                    controller.studio.runTrigger(bot, 'welcome', user.id, direct_message.channel.id, direct_message).catch(function(err) {
                      debug('Error: encountered an error loading onboarding script from Botkit Studio:', err);
                    });
                  }
                });

            }
            
            team.oauth_token = auth.access_token;
            
            controller.storage.teams.save(team, function(err, saved) {

              console.log(saved, " we onboarded this team");
            });
            
          });    
                   
       }).catch((err) => { console.log(err) }); // End users.list call

    
    });
  
  });

}

          
      
//       var channelCreate = function channelCreate(name) {
        
//         // Set a timeout so we don't hit our slack request limits
//         // Since we know we need to wait 1 sec for each user
//         // We will use the total expected wait time for our delay
//         // setTimeout(function() {
//           // Join the channels

//           return web.channels.create(name).then((res) => {
//             // console.log("created labyrinth channel: " + JSON.stringify(res.channel));            
//             return res.channel;

//           }).catch((err) => { console.log(err) }); // End channels.join call 

//         // }, 1000 * memberCount + 1); // End channel timeout

//       }; // End channel create
      
//       var channelJoin = function channelJoin(params) {
        
//         // Set a timeout for 1 sec each so that we don't exceed our Slack Api limits
//         // setTimeout(function() {
//           var member = params[1]["id"].toString();
//           var channel = params[0]["id"].toString();
//           console.log(member, "is the member that will join " + channel);

//           // check if user is bot before adding
//           // TODO check if user is already in channel
//           if (member) {
//             // var member = member["id"];
            
//             web.channels.info(channel).then(channelData => {
//               // console.log(channelData);
//               if (channelData) {
//                 // console.log(params[1], isUser(params[1]));
                
//                 if (isUser(params[1])) {
                  
//                   // Invite each user to the labyrinth chat channel
//                   return web.channels.invite(channel, member)
//                     .then(res => {
//                       // console.log(res, "is the channel res");
//                       return res;
//                     }).catch((err) => { console.log(err) });
                  
//                 }
//               }
//             }).catch(err => console.log(err));

            
//           }

//         // }, 1000 * (j+1));
        
//       };// End channel Join
      
      
