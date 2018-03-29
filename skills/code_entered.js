const _ = require("underscore");
const fs = require('fs');
const request = require('request');
var sort = require("sorted-object");

const correctButtonCodes = {
  safari: ['grey', 'green', 'red', 'grey', 'red', 'green'],
  random: ['grey','red','green', 'grey', 'green', 'red'],
  hole: ['green', 'red', 'red', 'red', 'grey', 'green'], 
  glyph: ['grey', 'green', 'grey', 'grey', 'grey', 'grey'],
  orb: ['red', 'red', 'grey', 'red', 'grey', 'grey']
}

const correctBookCombos = {
  0: [parseInt(process.env.book), parseInt(process.env.page), parseInt(process.env.line)]
};

const correctSafeCode = {
  0: process.env.safe_code.split("-")[0],
  1: process.env.safe_code.split("-")[1],
  2: process.env.safe_code.split("-")[2]
};

const correctArisCode = {
  0: process.env.aris_code.split("-")[0],
  1: process.env.aris_code.split("-")[1],
  2: process.env.aris_code.split("-")[2]
};


module.exports = function(controller) {
  
  controller.on("code_entered", function(params) {
    
    console.log(params.codeType, "is the cody type in the code_entered");
    var bot = params.bot;
    controller.storage.teams.get(params.team).then(res => {
      
      var correctCodes;
      var code;
      
      console.log(params.codeType, params.code);
      
      if (params.codeType == 'safe') {
        correctCodes = correctSafeCode;
        code = checkCodeObject(params.code, correctCodes);
      } else {
        if (params.codeType == 'bookshelf')
          correctCodes = correctBookCombos;
        else 
          correctCodes = correctButtonCodes;
        
        code = checkCodeArray(params.code, correctCodes);
      }
      
      console.log(code, "is the code");
      
      
      if (code.correct == true) {
        
        params.key = code;
        params.team = res;
        
        controller.trigger("state_change", [params]);

        console.log(params);

        if (code.code == 'safari')
          controller.trigger("image_counter_onboard", [bot, params.event]);

        
      } else {
                    
         var vars = {
           sameScript: false
         };
        
        if (params.codeType == 'bookshelf') {
          
          controller.randomText(function(text) {
            
            vars.randomText = text;
            
            controller.makeCard(bot, params.event, params.codeType, 'random', vars, function(card) {
                console.log(card, "is the card for the wrong entered code");

                // replace the original button message with a new one
                bot.replyInteractive(params.event, card);

             });
            
          });
        } else {
         controller.makeCard(bot, params.event, params.codeType, 'wrong', vars, function(card) {
            console.log(card, "is the card for the wrong entered code");

            // replace the original button message with a new one
            bot.replyInteractive(params.event, card);

         });
        }
      }
            
      
    });
  
    
  }); // End on event
  
  
  var checkCodeArray = function(code, correctCodes) {
    // check if correct
    for (var key in correctCodes) {
      console.log(correctCodes[key], code);
      console.log(JSON.stringify(correctCodes[key]), JSON.stringify(code));

      if (JSON.stringify(correctCodes[key]) == JSON.stringify(code)) {

          console.log("correct");
          console.log(correctCodes[key], key);

          return { correct: true, code: key };
      } 

    }

    return { correct: false };

  }
  
  
  var checkCodeObject = function(code, correctCode) {
    
    var count = 0;
    
    code = sort(code);
    correctCode = sort(correctCode);
    
    // check if correct
    for (var key in correctCode) {
      console.log("Correct key: " + key + ", value: " + correctCode[key]);
      console.log("Entered key: " + key + ", value: " + code[key]);

      if (correctCode[key] == code[key]) {

        count ++;
        console.log("correct");
        
        if ( count == Object.keys(correctCode).length ) {
           return { correct: true, code: 'safe' };
        }

      }

    }
    
    return { correct: false, code: 'safe' };
    
  }
  
}