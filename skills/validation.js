var _ = require("underscore");


module.exports = function(controller) {
  
//   // First find all of the script names
//   controller.studio.getScripts().then(list => {
//     var puzzles = _.reject(list, function(puzzle) {
//       return !_.contains(puzzle.tags, "escape");
//     });

//     var names = _.pluck(puzzles, "name");
//     // console.log(puzzles, names);
    

//     var mapPromises = names.map(validate);
    
//     var results = Promise.all(mapPromises);

//     results.then(puzzleArray => {
//       // console.log(puzzleArray);
//     });
//   });
  

  var validate = function(name) {
    
//     // console.log(name, "validation");
        
    controller.studio.validate(name, 'user_response', function(convo, next) {
      // console.log(convo.transcript[1].team);
        var bot = convo.context.bot;
        var user = convo.context.user;
        var channel = convo.context.channel;
        var response = convo.extractResponse('user_response');
        var team = convo.transcript[1].team.id ? convo.transcript[1].team.id : convo.transcript[1].team;
             
        next();
            
    });
  };
      
}