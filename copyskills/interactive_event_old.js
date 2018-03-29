var _ = require("underscore");

// find galaxy
function findGalaxy(controller, teamId, num) {
  var galaxy;
  
  return controller.storage.teams.get(teamId, function(err, team) {
    
    // console.log(err, team);
    var thesePuzzles = _.pluck(team.puzzles, "roomId");
    var thisPuzzle = thesePuzzles.indexOf(num.toString());
    
    // console.log(team.puzzles[thisPuzzle].galaxy);
    
    if (thisPuzzle >= 0) 
      galaxy = team.puzzles[thisPuzzle].galaxy;
  
    console.log(galaxy, "is the galaxy");
    return galaxy;
  });
  

};

// find the puzzle based on team and puzzle room name
function findPuzzle(controller, teamId, num) {
  // console.log(puzzle);
  var found;
  controller.storage.teams.get(teamId, function(err, team) {
    // console.log(team.puzzles, "are the team puzzles")
    // console.log(_.findWhere(team.puzzles, { roomId: num }), "is the current puzzle");
    found = _.findWhere(team.puzzles, { room: num });
    console.log(found);
      return found;

  });

};

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
    
    // console.log(event, "is the interactive message callback event");

    // User "says" something via button 
    if (event.actions[0].name.match(/^say$/)) { 
      
      var reply = event.original_message;
      var puzzleName;
      var locked;
      
      var currentRoom = findGalaxy(controller, event.team.id, event.callback_id.match(/\d+/));
          currentRoom += "_Room_" + event.callback_id.match(/\d+/);
      
      console.log("the user said:", event.actions[0].value);
      
      if (event.actions[0].value.match(/\d+/)) {
            
        var num = event.text.match(/\d+/)[0];
        var galaxy;
        findGalaxy(controller, event.team.id, num).then(res => { 
          console.log(res, "is hte res");
        }); 
        console.log(galaxy);

        // Set puzzleName and locked based on button values
        if (event.text.includes("_open")) {
          puzzleName = "Room_" + num;
          puzzleName = galaxy + "_" + puzzleName;
          locked = false;
        } else {
          locked = true;
          puzzleName = galaxy + "_Room_" + num;
        }

        console.log("puzzle locked: " + locked);
        console.log("puzzle name: " + puzzleName);

        // Find the puzzle the user is about to open
        var puzzle = findPuzzle(controller, event.team.id, puzzleName);
        
        if (!puzzle.locked || !locked) {
                
          // console.log(puzzleName, " puzzle is not locked");

          var teleporting = "Teleporting you to " + puzzle.room.replace("_", " ");;
          // This door has been unlocked, so let's tell them
          bot.reply(event, teleporting, (err, response) => {

            // We should wait...
            setTimeout(function() {
              
                var vars = {
                  sameScript: true
                };

                controller.makeCard(bot, event, puzzle.room, "default", vars, function(card) {
                  console.log(card);

                  // replace the original button message with a new one
                  bot.replyInteractive(event, card);
                  
                  // Delete "This door is unlocked..." message
                  deleteMsg(response.ts, response.channel, bot);

                });
              
            }, 1000);

          });

        } else {
          
          console.log(event.original_message);
                          
          var thread = puzzle.galaxy.replace("_", " ")
                      + ": Room " 
                      + event.actions[0].value.match(/\d+/)
                      + " Key";

          bot.reply(event, "You step up to the door...", (err, response) => {
            // Wait some length of time (1000 = 1 sec)
             setTimeout(function() {
                var vars = {
                  sameScript: true
                };

                controller.makeCard(bot, event, currentRoom, thread, vars, function(card) {
                    console.log("we switched to the same script but a different thread");

                    // replace the original button message with a new one
                    bot.replyInteractive(event, card);

                    // Delete "You step up..." message
                    deleteMsg(response.ts, response.channel, bot);

                });
             }, 1000);

          });

        }

      } else {
        
        controller.studio.getScripts().then((list) => {
          var script;
          // console.log(list, " we are listing the list" );
          // script = _.findWhere(list, { triggers: confirmedChoice.callback });
          for (var i = 0; i < list.length; i++) {
            // Locate the script based on its triggers
            // If script is listening for the value of the button clicked, that's our script
            if (list[i].triggers.includes(event.actions[0].value)) {
              script = list[i];
            }
          } 
          
          var vars = {
            sameDoor: false
          };
        
          controller.makeCard(bot, event, script, "default", vars, function(card) {
            console.log(card);
            // replace the original button message with a new one
            bot.replyInteractive(event, card);

          });
          
        });
      
        
      }
      
      
      
    }
    
    // Choose a menu option
    if (event.actions[0].name.match(/^choose$/)) {

        var reply = event.original_message;
      
        // Grab the "value" field from the selected option
        var value = event.actions[0].selected_options[0].value;
        var choice;

        // for each attachment option
        for (var i = 0; i < reply.attachments[0].actions[0].options.length; i ++) {
          // check if the attachment option value equals the selected value
          // NO TWO VALUES CAN BE THE SAME
          if (reply.attachments[0].actions[0].options[i].value == value) {
              // set the choice to the text of the matching option
              choice = reply.attachments[0].actions[0].options[i].text;
          }
        }

        // Take the original message attachment
        var menuAttachment = reply.attachments[0].actions[0];
        // Change the menu text to be the chosen option
        menuAttachment.text = choice;
        // Set the attachment to the altered object
        reply.attachments[0].actions[0] = menuAttachment;

        // If this user does not already have a choice stored
        if (!_.findWhere(choiceSelect, { user: event.user })) {
          // console.log("we are adding this choice");
            // Create object to hold this selection
            // Selection is "valid" or the solution/key if the value is "correct"
            // Any other value will be incorrect 
            // NO TWO VALUES CAN BE THE SAME
            choiceSelect.push({
              user: event.user,
              choice: choice, 
              valid: value == "correct" ? true : false, 
              callback: event.callback_id
            });

        } else { // User has choice stored

          // console.log("we are updating this choice");
          // Update stored choice with new choice, valid bool, and callback_id
          choiceSelect = _.map(choiceSelect, function(item) {
            if (item.user == event.user) {
              item.choice = choice;
              item.valid = value == "correct" ? true : false;
              item.callback = event.callback_id;
              return item;
            }
            else return item;
          });
        }

     }
        
        // Confirm menu choice
        if (event.actions[0].name.match(/^confirm$/)) {
          
            var reply = event.original_message;
            // data object for puzzle attempt event
            var data = {};
          
            // console.log("user confirmed " + JSON.stringify(_.findWhere(choiceSelect, { user: message.user })));
          
            // Locate the saved choice based on the user key
            var confirmedChoice = _.findWhere(choiceSelect, { user: event.user });
            var script;
            var start;
          
            // Set the puzzle, answer, and if the answer is correct
            // This data will be sent to the puzzle_attempt event for saving to storage
            data.puzzle = findGalaxy(controller, event.team.id, confirmedChoice.callback.match(/\d+/)[0]) + "_Room_" + confirmedChoice.callback.match(/\d+/)[0];
            data.answer = confirmedChoice;
            data.correct = confirmedChoice.valid;
          
            // Trigger an attempt of opening the door
            controller.trigger("puzzle_attempt", [bot, event, data]);

            controller.studio.getScripts().then((list) => {
              // console.log(list, " we are listing the list" );
              // script = _.findWhere(list, { triggers: confirmedChoice.callback });
              for (var i = 0; i < list.length; i++) {
                console.log(list[i].triggers);
                // Locate the script based on its name
                if (list[i].name == data.puzzle) {
                  script = list[i];
                } 
                
                _.each(list[i].triggers, function(trigger) {
                  if (trigger.pattern == "enter")
                    start = list[i];
                });
              }

              // If the confirmed choice is valid...
              if (confirmedChoice.valid) {
                console.log("correct!", data.puzzle);

                // Run the trigger for the menu callback_id
                // This runs a trigger for botkit studio based on the MENU attachment callback_id
                // Triggers a script that is listening for this callback_id
                bot.reply(event, "Nice! You unlocked that door.", (err, response) => {
                  // Wait some length of time (1000 = 1 sec)
                   setTimeout(function() {
                    // Send them to the script
                     var vars = {
                       sameDoor: false
                     };
                     console.log(event, "is the event data we wanna send");

                    controller.makeCard(bot, event, data.puzzle, "default", vars, function(card) {
                      console.log(card, "this is the card data");

                       // replace the original button message with a new one
                       bot.replyInteractive(event, card);
                      
                      // Delete "Nice!..." message
                      deleteMsg(response.ts, response.channel, bot);

                    });
                     
                   }, 1000); 
                });

              } else { // If the choice is NOT valid
                // Tell the user they were wrong
                console.log("wrong", event);
                bot.reply(event, "Wrong. Sending you back to the beginning.", (err, response) => {
                  // Wait some length of time (1000 = 1 sec)
                   setTimeout(function() {
                     var vars = {
                       sameDoor: false
                     };
                     // Send them back to the beginning
                     controller.makeCard(bot, event, start.name, "default", vars, function(card) {
                        console.log(card);

                        // replace the original button message with a new one
                        bot.replyInteractive(event, card);
                       
                        // Delete "Wrong..." message
                        deleteMsg(response.ts, response.channel, bot);

                    });
                   }, 1000); 
                });

              }


            });
  
              
            
  
         }
    
    if (event.actions[0].name.match(/^number$/)) { 
      var reply = event.original_message;
      
      console.log(event, " a button was clicked");
      console.log(reply.attachments[0]);
      
      _.map(reply.attachments[0].actions, function(action) {
        if (action.id == event.attachment_id)
          action.value = "paused";
        
        return action;
      });
      
      bot.api.chat.update({
          channel: event.channel, 
          ts: reply.ts, 
          attachments: reply.attachments
        }, function(err, updated) { console.log(updated.message.attachments, "is the after update"); });
      
    }
        
    
  });
  
}