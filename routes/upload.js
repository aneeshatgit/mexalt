exports.uploader = function(req, res){
	var fs = require('fs');
  	var tempPath = req.files.image.path;
  	var newPath = "./public/pics/"+req.files.image.name;
    console.log("Uploading file...");
	fs.rename(tempPath, newPath, function(error){
     	if(error) throw error;
     	
     	fs.unlink(tempPath, function(){
     		if(error) throw error;
     		res.send("File uploaded to: " + newPath);
            console.log("File uploaded to: " + newPath);
     	});
     	
    });   

};