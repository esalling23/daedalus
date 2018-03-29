var request = require('request');
var fs = require('fs');

module.exports = function(controller) {
  
  controller.randomText = function(callback) {
    
    // find text etc.
    var stream = request.get('https://cdn.glitch.com/487e8c1f-40ed-47f8-9ca1-dfd7fceb6332%2FNeuralNetworks.txt?1519746866563')
    .on('response', function(response) {
      console.log(response.statusCode) // 200
      console.log(response.headers['content-type']) // 'image/png'
    }).pipe(fs.createWriteStream("randomText.txt"));

    stream.on("finish", function(data) {
      fs.readFile('randomText.txt', 'utf8', function(err, data) { 
        if (err) 
          throw err;
        else {
          var randSent = (Math.floor(Math.random() * 50888));
          var falseString = data.substring(data.indexOf("[New Line]", randSent) + 12, data.indexOf("[New Line]", (data.indexOf("[New Line]", randSent) + 20)));
          falseString.replace(/[^\x00-\x7F]/g, "");
          console.log(falseString);
          callback(falseString);
        }
      });
    });
    
    
  }
  
};