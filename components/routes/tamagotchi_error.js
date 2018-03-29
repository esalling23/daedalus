const { WebClient } = require('@slack/client');
const _ = require("underscore");

module.exports = function(webserver, controller) {
  
  webserver.post('/tamagotchi_error', function(req, res) {
    console.log(req.body);
    
    controller.storage.teams.get(req.body.team, function(err, team) {
      var bot = controller.spawn(team.bot);
      var message;
      
      var token = team.oauth_token;

      var web = new WebClient(team.bot.token);
      
      // console.log(web, token);
      
      web.im.list().then(function(response) {
        // console.log(response);
        var thisChannel = _.findWhere(response.ims, { user: req.body.user });
        console.log(thisChannel, " is the direct message channel");
        web.im.history(thisChannel.id).then(function(res) {
          // console.log(res);
          message = res.messages[0];
          message.channel = thisChannel.id;
          message.user = req.body.user;
          // console.log(message, bot);
          
          controller.makeCard(bot, message, 'egg_table_error', req.body.thread, {}, function(card) {
            console.log(card);
            // bot.replyInteractive(message, card);
            bot.api.chat.update({
              ts: message.ts, 
              channel: message.channel, 
              attachments: card.attachments
            }, function(err, updated) {
              console.log(err, updated);
            });
          });
          
          // controller.makeCard(bot, 'egg_table', req.body.status, thisChannel.id, message, )
          
        }).catch(err => console.log(err));
      }).catch(err => console.log(err));
      
      // controller.makeCard(
    });
    
  });
}