const _ = require("underscore");

module.exports = function(controller) {
  
  controller.on("prisoners_selection", function(bot, event) {
    var choice = event.actions[0].value;
    
    controller.storage.teams.get(event.team, function(err, team) {
      if (!team.sharingUsers) team.sharingUsers = [];
      if (!team.stealingUsers) team.stealingUsers = [];
      if (!team.blockingUsers) team.blockingUsers = [];
      if (!team.decisionCount) team.decisionCount = 0;
      if (!team.successCount) team.successCount = 0;

      team.decisionCount++;

      if(choice == "share") {
        team.sharingUsers.push(event.user);
      }
      else if (choice == "steal") {
        team.stealingUsers.push(event.user);
      }
      else if (choice == "block") {
        team.blockingUsers.push(event.user); 
      }
      
      var usersToKick = [];
      var thread = "";
      var script = "prisoners_dilemma";

      if (team.decisionCount == team.users.length) {
        if((team.blockingUsers.length > 0 && team.stealingUsers.length > 0) || team.stealingUsers.length == team.users.length) {
          thread = "steal_kick";
          usersToKick.concat(team.stealingUsers);
        } 
        
        if(team.blockingUsers.length > 0 && team.stealingUsers.length <= 0) {
          thread = "block_kick";
          usersToKick.concat(team.blockingUsers);
        }
        
        if(team.blockingUsers.length <= 0 && team.stealingUsers.length > 0) {
          thread = "share_kick";
          usersToKick.concat(team.sharingUsers);
        }
        
        kickUsers(usersToKick);

        if(team.blockingUsers.length <= 0 && team.stealingUsers.length <= 0) {
          team.successCount++;
          if (team.successCount == 0) 
            thread = "default";
          else 
            thread = "success_" + team.successCount;
          script = "prisoners_success";
        }
        
        if (team.successCount == 2)
          team.successCount = 0;
        
        team.decisionCount == 0;
        team.sharingUsers = [];
        team.stealingUsers = [];
        team.blockingUsers = [];
      
        controller.storage.teams.save(team, function(err, saved) {
          controller.makeCard(bot, event, script, thread, {}, function(card) {
            bot.replyInteractive(event, card);

            kickUsers(usersToKick);

            setTimeout(function() {
              controller.makeCard(bot, event, "prisoners_dilemma", "follow_up", {}, function(card) {
                bot.replyInteractive(event, card);
              });
            }, 1000);
          });
        });

      }
    });
    
    
    var kickUsers = function(arr) {
      _.each(arr, function(user) {
          bot.api.channels.kick({
            token: event.team.oauth_token,
            channel: event.channel,
            user: user
          });
      });
    }
  });
 
}


  
      // if(event.team.decisionCount == 3) {
      //     if((event.team.blockCount > 0 && event.team.stealCount > 0) || event.team.stealCount == 3) {
      //       controller.makeCard(bot, event, "prisoners_dilemma", "steal_kick", {}, function(card) {
      //         bot.replyInteractive(event, card);
      //       });
      //         console.log("All Stealing Players Banned");
      //         _.each(event.team.stealingUsers, function(thief) {
      //             bot.api.groups.kick({
      //               token: event.team.oauth_token,
      //               channel: event.channel,
      //               user: thief
      //             });
      //         });
      //     }
      //     if(event.team.blockCount > 0 && event.team.stealCount == 0) {
      //         controller.studio.runTrigger(bot, 'block_kick', event.user, event.channel, event).catch(function(err) {
      //           console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //         });
      //         console.log("All Blocking Players Banned");
      //         _.each(event.team.blockingUsers, function(blocker) {
      //             bot.api.channels.kick({
      //             token: event.team.oauth_token,
      //             channel: event.channel,
      //             user: blocker
      //             });
      //         })
      //     }
      //     if(event.team.blockCount == 0 && event.team.stealCount > 0) {
      //         controller.studio.runTrigger(bot, 'share_kick', event.user, event.channel, event).catch(function(err) {
      //           console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //         });
      //         console.log("All Sharing Players Banned");
      //         _.each(event.team.sharingUsers, function(giver) {
      //             bot.api.channels.kick({
      //             token: event.team.oauth_token,
      //             channel: event.channel,
      //             user: giver
      //             });
      //         })
      //     }
      //     if(event.team.blockCount == 0 && event.team.stealCount == 0) {
      //         if(event.team.successCount == 0) {
      //           controller.studio.runTrigger(bot, 'share_success', event.user, event.channel, event).catch(function(err) {
      //             console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //           });
      //           controller.studio.runTrigger(bot, 'prisoners_dilemma', event.user, event.channel, event).catch(function(err) {
      //             console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //           });
      //           console.log("Successful Shares: 1. You all agreed to share the prize. To confirm, select “Share” again. You must all share three times in a row to split the prize evenly. You may also change your selection now.");
      //           event.team.successCount++;
      //         }
      //         if(event.team.successCount == 1) {
      //           controller.studio.runTrigger(bot, 'share_success', 'success_2', event.user, event.channel, event).catch(function(err) {
      //             console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //           });
      //           controller.studio.runTrigger(bot, 'prisoners_dilemma', event.user, event.channel, event).catch(function(err) {
      //             console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //           });
      //           console.log("Successful Shares: 2. You all agreed to share the prize. To confirm, select “Share” again. You must all share three times in a row to split the prize evenly. You may also change your selection now.");
      //           event.team.successCount++;
      //         }
      //         if(event.team.successCount == 2) {
      //           controller.studio.runTrigger(bot, 'share_success', 'success_3', event.user, event.channel, event).catch(function(err) {
      //             console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      //           });
      //           console.log("You all get an equal share of the prize!");
      //           event.team.successCount = 0;
      //         }
      //     }
      //     event.team.blockCount == 0;
      //     event.team.stealCount == 0;
      //     event.team.shareCount == 0;
      // }