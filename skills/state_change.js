const _ = require("underscore");
const fs = require('fs');
const request = require('request');


// Script for generation event
// Pulls scripts with a certain tag for team puzzle data 
    
var team, 
    user, 
    channel;

module.exports = function(controller) {
  
  controller.on("state_change", function(options) {
    
    // console.log(options.bot, "in the state change");
    var res = options.team;
    var code = options.key.code;

    // safety check
    if (!res.events) res.events = [];
    if (!res.codesEntered) res.codesEntered = [];
    // safety check
    if (!res.currentState) {
      res.currentState = "default";
    }
    
    var thread = 'correct';

    if (options.codeType == 'buttons')
      thread += '_' + code;
    
    // Has the player already entered this code?
    if (res.codesEntered.includes(code) && options.codeType != 'bookshelf') {
      var vars = {};
      
      if (options.codeType == 'buttons') vars.recap = thread;
      
      controller.makeCard(options.bot, options.event, options.codeType, 'repeat', vars, function(card) {
        // replace the original button message with a new one
        options.bot.replyInteractive(options.event, card);

      });
      
    } else {
      
      if (options.codeType != 'bookshelf')
        res.codesEntered.push(code);
      
//       console.log(options.key);
//       console.log(res.currentState, "is the current team state");
//       console.log(res.events, "is the current team events");

      if (code == 'orb' || code == 'random' || code == 'safe') {
        
        if (!res.events.includes(code))
            res.events.push(code);
        
      } else {
        res.currentState = findState(res.currentState, code);
      }

      controller.storage.teams.save(res).then((updated) => {

        // console.log("We saved this new team state", updated);
        var vars = {};

        console.log(thread + "is the thread we are going to in the " + options.codeType + " script");

        controller.makeCard(options.bot, options.event, options.codeType, thread, vars, function(card) {
          // console.log(card, "is the card from the state change");
          

          // replace the original button message with a new one
          options.bot.replyInteractive(options.event, card);

        });

      }); 
    }

    
  }); // End on event
}

var repeatButtons = function() {
  
}

var findState = function(currentState, event) {
      var newState;
  
      switch(currentState.toLowerCase()) {

        // everything is normal
        case 'default':
          
          switch(event) {
                
            case 'safari':
              
              // safari video state
              newState = "a"
              
              break;
              
            case 'hole':
              
              // hole state
              newState = "b"
              console.log(newState);
              break;
            
            case 'glyph':
              
              // abstract painting glyph state
              newState = "c"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;

        // video
        case 'a':
          
          switch(event) {
              
            case 'hole':
              
              newState = "e"
              
              break;
              
            case 'glyph':
              
              newState = "d"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // hole
        case 'b':
          
          switch(event) {
              
            case 'safari':
              // hole and video
              newState = "e"
              
              break;
              
            case 'glyph':
              // hole and glyph
              newState = "f"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
        
        // glyph
        case 'c':
          
          switch(event) {
              
            case 'safari':
              
              newState = "d"
              
              break;
              
            case 'hole':
              
              newState = "f"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // video and glyph
        case 'd':
          
          switch(event) {
              
            case 'hole':
              // everything
              newState = "g"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // hole and video
        case 'e':
          
          switch(event) {
              
            case 'glyph':
              // everything
              newState = "g"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // hole and glyph
        case 'f':
          
          switch(event) {
              
            case 'safari':
              
              // everything
              newState = "g"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;

      }
  
  return newState;
  
}