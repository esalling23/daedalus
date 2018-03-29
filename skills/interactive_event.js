const _ = require("underscore");
const request = require("request");
const openurl = require('openurl');
// const opn = require('opn');
const { WebClient } = require('@slack/client');

// Delete messages
function deleteMsg(message, channel, bot) {
	bot.api.chat.delete({ts: message, channel: channel}, function(err, message) {
    console.log("deleted: ", message);
  });
}

module.exports = function(controller) {
  
  // for choose/confirm 
  // Temporary storage
  var choiceSelect = [];
  
  controller.on('interactive_message_callback', function(bot, event) {
    
    console.log(event.actions[0].name, "is the interactive message callback event");
    

    // Choose a menu option
    if (event.actions[0].name.match(/^choose(.*)$/)) {
      // console.log(event.attachment_id);
        var reply = event.original_message;
      
        // Grab the "value" field from the selected option
        var value = event.actions[0].selected_options[0].value;
        var choice;
      
      console.log(value);
      
        var actions = reply.attachments[0].actions;

        // for each attachment option
        for (var i = 0; i < actions.length; i ++) {
          // check if the attachment option value equals the selected value
          // NO TWO VALUES CAN BE THE SAME
          if (actions[i].options) {
            for (var j = 0; j < actions[i].options.length; j++) {
              
              if (actions[i].options[j].value == value) {
                  // set the choice to the text of the matching option
                  choice = actions[i].options[j].text;
              }
              
            }
            
          }
          
        }
      
      console.log(choice);

        // Take the original message attachment
        var menuAttachment = reply.attachments[0].actions[0];
        // Change the menu text to be the chosen option
        menuAttachment.text = choice;
        // Set the attachment to the altered object
        reply.attachments[0].actions[0] = menuAttachment;

        // If this user does not already have a choice stored
        if (!_.findWhere(choiceSelect, { user: event.user })) {
          
          if (event.actions[0].name.includes("multi")) {
            console.log(event.actions[0].name);
            
            var key = parseInt(event.actions[0].name.match(/\d+/));
            console.log(key);
            var val = {};
            var choiceMulti = {};
            
            val[key] = value;
            choiceMulti[key] = choice;
            
            choice = choiceMulti;
            value = val;
          }
          
          // console.log("we are adding this choice");
            // Create object to hold this selection
            // Selection is "valid" or the solution/key if the value is "correct"
            // Any other value will be incorrect 
            // NO TWO VALUES CAN BE THE SAME
            choiceSelect.push({
              user: event.user,
              choice: choice, 
              value: value,
              callback: event.callback_id
            });

        } else { // User has choice stored

          // console.log("we are updating this choice");
          // Update stored choice with new choice, valid bool, and callback_id
          choiceSelect = _.map(choiceSelect, function(item) {
              if (item.user == event.user) {
                item.callback = event.callback_id;
                
                if (event.actions[0].name.includes("multi")) {
                  
                  if (typeof item.choice == "string")
                    item.choice = {};
                  
                  if (typeof item.value == "string")
                    item.value = {};
                  
                  var key = parseInt(event.actions[0].name.match(/\d+/));
                  console.log(key);

                  item.choice[key] = choice;
                  item.value[key] = value;
                  
                } else {
                  item.value = value;
                  item.choice = choice;
                }
                
                return item;
              }
              else return item;
            });

        }
      
      console.log(choiceSelect, "is the choice select");

     }
        
    // Confirm menu choice
    if (event.actions[0].name.match(/^confirm$/)) {

        var reply = event.original_message;
        // data object for puzzle attempt event
        var data = {};
        console.log(choiceSelect, event.user);

        console.log("user confirmed " + JSON.stringify(_.findWhere(choiceSelect, { user: event.user })));

        // Locate the saved choice based on the user key
        var confirmedChoice = _.findWhere(choiceSelect, { user: event.user });
        var script;

        controller.storage.teams.get(event.team.id).then((res) => {
          // console.log(res);
          var thread;
          
          
          // Set the puzzle, answer, and if the answer is correct
          // This data will be sent to the puzzle_attempt event for saving to storage
          data.confirmed = confirmedChoice;
          
          console.log(data.confirmed);

          controller.studio.get(bot, data.confirmed.value, event.user, event.channel).then((script) => {
            
            var thread = determineThread(script, res);
            var vars = {};
            // console.log(thread, res.currentState);
            // console.log(res.events);
            
            
            if (!thread)
              thread = 'default';
            
             if (data.confirmed.value == "egg_table") {
              vars.egg = true;
              vars.user = event.user;
              vars.team = event.team.id;
             }
             
             controller.makeCard(bot, event, data.confirmed.value, thread, vars, function(card) {
                // console.log(card);

                // replace the original button message with a new one
                bot.replyInteractive(event, card);

            });

          });

        });

     }
    
    if (event.actions[0].name.match(/^tag/)) {
      var confirmedChoice = _.findWhere(choiceSelect, { user: event.user });
      
      console.log(event);
      console.log(confirmedChoice);
            
      controller.trigger("image_tag_submit", [{
        bot: bot,
        message: event, 
        url: event.original_message.attachments[0].image_url, 
        location: confirmedChoice.value
      }]);
    }

    // user submitted a code
    if (event.actions[0].name.match(/^code(.*)/)) {
      
      // console.log(event);
      
      var reply = event.original_message;
      
      var options = {};
      var code = [];
            
      _.each(reply.attachments, function(attachment) {
        _.each(attachment.actions, function(action) {

          if (event.actions[0].name.includes('safe') || event.actions[0].name.includes('tamagotchi_door')) {
            console.log("confirming safe/door enter code");
            var confirmedChoice = _.findWhere(choiceSelect, { user: event.user });
            var callback_id = event.callback_id.replace("_code", "");
            
            options.code = confirmedChoice.choice;
            
            options.codeType = callback_id;
            
          } else if (event.actions[0].name.includes('buttons')) {

            if (action.name == "color") {
              var color;
              switch (action.style) {
                case 'danger':
                  color = 'red';
                  break;
                case '':
                case 'default':
                  color = 'grey';
                  break;
                case 'primary':
                  color = 'green';
                  break;
              }
              code.push(color);
              console.log(code);

            } 
            
            options.codeType = 'buttons';
            options.code = code;
            
          } else if (event.actions[0].name.includes('bookshelf')) {
              var confirmedChoice = _.findWhere(choiceSelect, { user: event.user });

              console.log(confirmedChoice, "in the bookshelf");
              
              options.code = [];
              _.each(Object.values(confirmedChoice.choice), function(value) {
                options.code.push(parseInt(value));
              });
              options.codeType = 'bookshelf';
          }
          
        });
      });
      
      console.log(options.code, options.codeType);
      
      options.event = event;
      options.team = event.team.id;
      options.bot = bot;
      
      console.log("code has been entered");
      
      controller.trigger("code_entered", [options]);
      
    }
    
    // button color change
    if (event.actions[0].name.match(/^color/)) {

      console.log(event);
      var callback_id = event.callback_id;
      var reply = event.original_message;
      // we need to change this button's color homie
      _.each(reply.attachments, function(attachment) {
        _.map(attachment.actions, function(action) {
          // console.log(action);
          if (action.value == event.actions[0].value) {
            switch (action.style) {
              case 'danger': 
                action.style = 'primary';
                break;

              case 'primary':
                action.style = '';
                break;

              case '':
              case 'default':
                action.style = 'danger';
                break;
            }
          }
            return action;
        });
      });

      bot.api.chat.update({
        channel: event.channel, 
        ts: reply.ts, 
        attachments: reply.attachments
      }, function(err, updated) { 
        
        if (callback_id == "three_color_buttons") {
          // console.log(event.team.id);
          
          controller.storage.teams.get(event.team.id, function (error, team) {
            // console.log(error, team);
            var thisUser = _.findWhere(team.users, { userId: event.user });
            thisUser.startBtns = [];
            _.each(updated.message.attachments[0].actions, function(btn) {
              thisUser.startBtns.push(btn.style);
            });
                        
            team.users = _.map(team.users, function(user) {
              if (user.userId == thisUser.userId) 
                return thisUser;
              else 
                return user;
            });
            
            controller.storage.teams.save(team, function(err, saved) {
              
              console.log(saved.users, " we saved these users");
               controller.trigger("count_colors", [bot, event, saved.users]);
            });

          });
        };
      });
    
      
    }
    
    // button text change
    if (event.actions[0].name.match(/^text/)) {
      console.log(event);

      // we need to change this button's color homie
      
      _.map(reply.message.attachments[0].actions, function(action) {
          if (action.value != 'paused') {
            var num = parseInt(action.text);
            if (num >= 3) 
              action.text = "1"
            else 
              action.text = num + 1;
          }
          
          return action;
      });

      // console.log(response.message.attachments[0].actions);
      bot.api.chat.update({
        channel: reply.channel, 
        ts: reply.ts, 
        attachments: reply.message.attachments
      }, function(err, updated) { console.log(err, updated)});
      
      
    }
    
    if (event.actions[0].name.match(/^start/)) {
      
      var options = {
        bot: bot, 
        message: event, 
        forced: false, 
        team: event.team
      };
      
      options.player = true;
      controller.trigger('generation_event', [options]);
      
      controller.studio.runTrigger(bot, 'start', event.user, event.channel, event).catch(function(err) {
          console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
      });
      
    }
    
    if (event.actions[0].name.match(/^dilemma/)) {
      
      controller.trigger("prisoners_selection", [bot, event]);
      
    }
    
//     if (event.actions[0].name.match(/^egg/)) {
      
//       var type = event.actions[0].value;
//       var url = 'https://tamagotchi-production.glitch.me/pickup/' + type + '/' + event.user + '/' + event.team.id;
      
//       request.get(url, function(err, res, body) {
//         console.log(body);
//         if (body == "success") {
//           request.get('https://tamagotchi-production.glitch.me/start', function(err, res, body) {
            
//             console.log(body);
//           });
//           // opn(, { app: 'chrome' }).catch(err => console.log(err));
//         } else {
//           controller.makeCard(bot, event, "egg_table", body, {}, function(card) {
//             // replace the original button message with a new one
//             bot.replyInteractive(event, card);
          
//           });
//         }
//       });
      
//     }
    
    // user says something
    if (event.actions[0].name.match(/^say/)) {
      
      var value = event.actions[0].value;
      var script;
      
      console.log(value);
      
      controller.studio.getScripts().then((list) => {
        // console.log(list, " we are listing the list" );

        for (var i = 0; i < list.length; i++) {
          // console.log(value, list[i].name);
          // Locate the script based on its name
          if (list[i].name == value)
            script = list[i];

        }
        
        console.log(script);
      
        controller.storage.teams.get(event.team.id).then((res) => {
                    
          var thread;
          
          controller.studio.get(bot, script.name, event.user, event.channel).then((currentScript) => {
            
            var thread = determineThread(currentScript, res);
            var vars = {};
            
            if (!thread)
              thread = 'default';
            
            if (value == "safe" && res.events.includes("safe"))
              thread = "repeat";
            
            if (value == "egg_table") {
              vars.egg = true;
              vars.user = event.user;
              vars.team = event.team.id;
            }
            
            controller.makeCard(bot, event, script.name, thread, vars, function(card) {
              console.log(card);
              // replace the original button message with a new one
              bot.replyInteractive(event, card);

            });
            
          });

        });
        
      });
      
    }
    
    
  });
  
}

var determineThread = function(script, team) {
  
  console.log(team.events, team.currentState);
  var thread;
  
  _.each(script.threads, function(t, v) {

    if (!thread || v.includes("combo")) {
      if (v.split("_").length > 1) {
        // console.log(v);

        if (v.includes("combo")) {
          console.log("this is a combo thread");
          if (team.events) {
            
            _.each(team.events, function(event) {
              console.log(v, event);
              console.log(v.includes(event));
              console.log(v.split("_")[2].includes(team.currentState));
              
              if (v.includes(event) && v.split("_")[2].includes(team.currentState)) 
                thread = v;
              
            });
            
          }
          
        } else if (v.includes("state")) {
          console.log("this is a state thread");
          
          if (team.currentState != 'default') {
            
            if (v.split("_")[1].includes(team.currentState)) 
              thread = v;
            
          }
          
        } else if (v.includes("event")) {
          console.log("this is an event thread");
          console.log(team.events);
          
          if (team.events) {
            
            _.each(team.events, function(event) {
              console.log(v, event);
              console.log(v.includes(event));
              
              if (v.includes(event)) 
                thread = v;
              
            });
            
          }
          
        }

      }
    }

  });
  
  return thread;
  
}