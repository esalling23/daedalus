var _ = require('underscore');

var dataChannel;

const { WebClient } = require('@slack/client');

// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
const token = process.env.slackToken;

const web = new WebClient(token);

function findGalaxy(data, num) {

  var thesePuzzles = _.pluck(data, "roomId");
  // console.log(thesePuzzles);
  var thisPuzzle = thesePuzzles.indexOf(num.toString());
  console.log(thisPuzzle, data[thisPuzzle]);
  if (thisPuzzle >= 0) 
    return data[thisPuzzle].galaxy;
  else return 0;

};

module.exports = function(controller) {
    controller.on("count_colors", function (bot, event, users) {
      console.log(users);
      var redCount = 0;
      var greyCount = 0;
      var greenCount = 0;
      _.each(users, function(user) {
        _.each(user.startBtns, function(btn) {
          if (btn == "danger") {
            redCount++;
          } else if (btn == "primary") {
            greenCount++;
          } else {
            greyCount++;
          }
            // console.Log("RedCount:" + redCount);
            // console.Log(greenCount);
            // console.Log(greyCount);
        });
      });
    if(redCount >= 3 || greenCount >= 3 || greyCount >= 3) {
      console.log("we did it!");
      controller.studio.runTrigger(bot, 'input_nodes_1', event.user, event.channel, event).catch(function(err) {
        console.log(err);
      });
    }

    });
    // message sent in the labyrinth channel
    controller.on('ambient', function(bot, message) {
      
      var puzzleChat;
      web.channels.list().then((res) => {
          _.each(res.channels, function(channel) {
            if (channel.name == "labyrinthPuzzle")
              puzzleChat = channel;
          });
      });
      
      if (message.channel == puzzleChat.id) {
        // Message tagging event
        var theBot = bot;
      
        if (message.event.text.includes("#")) {
          // console.log(message.event.text.match(/#[a-z0-9_]+/g));
          controller.trigger('message_tagged', [bot, message, message.event.text.match(/#[a-z0-9_]+/g)]);
        } else {
          // trigger the tagging script in botkit studio
          controller.studio.runTrigger(bot, 'tagging', message.user, message.channel).catch(function(err) {
              bot.reply(message, 'I experienced an error with a request to Botkit Studio: ' + err);
          });
          
        }
      }
        

    });
    
    // Tagged a message
    controller.on('message_tagged', function(bot, message, tag) {
      
      // console.log(tag, message);
      
      // console.log(bot, "this bot is listening to taggs");
      // console.log(message, "this message is being tagged");
      var teamId = message.team.id ? message.team.id : message.team_id;
      var thisMessage = message;
      
        controller.storage.teams.get(teamId, function(err,team) {

          if (!team.puzzles) {
             bot.reply(thisMessage, "huh, looks like you haven't started working on that puzzle...are you using the right #tag?"); 
          }
          
          var puzzle = _.where(team.puzzles, { name: tag[0] });
          
          if (!puzzle.discussion) puzzle.discussion = [];
                    
          puzzle.discussion.push(thisMessage);
          
          // console.log(team.puzzles);
          
          console.storage.teams.save(team, function(err, id) {
            // console.log("team updated with tagged message");
          });

          if (err) {
            throw new Error(err);
          }

        });

    });
  
  // Choose a door
  controller.on('door_enter', function(bot, message) {
    // Store that a player approached the door
    
  });
  
  // Attempt a door
  controller.on('puzzle_attempt', function(bot, message, data) {
      
    // console.log(data);
    // Get the team id from the message
    var teamId = message.team.id ? message.team.id : message.team_id;

    // Find the team object
    controller.storage.teams.get(teamId, function(err,team) {

      // console.log("team: " + JSON.stringify(team));

      if (!team.puzzles) {
        // Just in case
        var options = {
          bot: bot, 
          message: message, 
          forced: false
        };
        controller.trigger("generate", [options]);
      }

      // Find this particular puzzle from the team's generated puzzle list
      var puzzle = _.findWhere(team.puzzles, { room: data.puzzle });

      if (data.correct) puzzle.locked = false;

      // Add a try to the puzzle
      puzzle.tries++;

      // Create the attempt object
      var attempt = {
        answer: data.answer,
        correct: data.correct
      };

      // Create the puzzle's attempts list on the puzzle object if none exists
      if (!puzzle.attempts) puzzle.attempts = [];

      // Add this puzzle attempt to the puzzle's attempts list
      puzzle.attempts.push(data);

      // Save this team
      controller.storage.teams.save(team, function(err, id) {
        controller.storage.teams.get(id, function(err, team) {
          console.log("this team is updated: ", team);
        });
      });

      if (err) {
        throw new Error(err);
      }

    });

  });
  
  // Map event for sending team the map link
  controller.on("map_event", function(options) {
    
    // bot, message, channel, team
    
    // console.log("map event message: " + JSON.stringify(options.message));
    // Based on the format of "message", set the teamId
    var teamId;

    teamId = (options.team) ? options.team.id : 
      ((options.message.team_id) ? options.message.team_id : 
          ((options.message.team.id) ? options.message.team.id : options.message.team));

    var mapLink = "/" + teamId + "/map";
    // console.log(mapLink, "is the map link for this team" );
    
    if (options.channel) {
      // console.log(options.channel, "is the map channel to post in");
      // Send this message to the specified channel
      options.bot.say({
        'channel': options.channel.id,
        'text': 'Follow this link for the team map',
        'attachments': [
            {
              "title": "Team Map",
              "title_link": process.env.domain + mapLink,
            }
         ]
      });
      
    } else if (options.message) {
    
      // Reply to the user
      options.bot.reply(options.message, {
        'text': 'Follow this link for the team map',
        'attachments': [
            {
              "title": "Team Map",
              "title_link": process.env.domain + mapLink,
            }
         ]
      });
      
    }
    
  });

  
  controller.on("generate_puzzle", function(options) {
    var bot = options.bot;
    var message = options.message;
    var puzzle_message = {
      "attachments": [
          {
              "text": "For this puzzle, put the colors in the right order",
              "callback_id": "number_puzzle",
              "color": "#3AA3E3",
              "attachment_type": "default",
              "actions": [
                  {
                      "name": "number",
                      "text": "1",
                      "type": "button"
                  },
                  {
                      "name": "number",
                      "text": "2",
                      "type": "button"
                  },
                  {
                      "name": "number",
                      "text": "3",
                      "type": "button"
                  }
              ]
          }
      ]
    }
    
    bot.reply(message, puzzle_message, function(err, response) {
      setInterval(function() {
        // console.log("hit the interval");

        _.map(response.message.attachments[0].actions, function(action) {
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
          channel: response.channel, 
          ts: response.ts, 
          attachments: response.message.attachments
        }, function(err, updated) { });
      }, 2000);
    });
    
    
    
    
    
  });
  
  
}
