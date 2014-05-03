exports.sendgroupalert = function(req, res){
	//covert the sms list and voice list to comma separated values
	var smsList = req.body.smsList;
	var voiceList = req.body.voiceList;
	var smsStr = "";
	var voiceStr = "";
	console.log("JSON.stringify(req.body)->"+ JSON.stringify(req.body));
	
	for (var m in smsList) {
		if(smsList[m]!=null){
			for (var i = 0; i < smsList[m].length; i++) {
				console.log("smsList[m][i].contact->" + smsList[m][i].contact);
				if(smsStr=="") {
					smsStr = smsStr + smsList[m][i].contact;
				} else {
					smsStr = smsStr + ", " + smsList[m][i].contact;
				}
			}
		}
	}

	console.log("smsStr ->" + smsStr);

	for (var n in voiceList) {
		if(voiceList[n]!=null) {
			for (var j = 0; j < voiceList[n].length; j++) {
				if(voiceStr=="") {
					voiceStr = voiceStr + voiceList[n][j].contact;
				} else {
					voiceStr = voiceStr + ", " + voiceList[n][j].contact;
				}
			}
		}
	}

	//call smser module with num list and message and then do the same for voice.
	if(smsStr!=""){
		require('./delivery').smser(smsStr, req.body.message);	
	}
	if(voiceStr!="") {
		require('./delivery').voice(voiceStr, req.body.message);	
	}
	res.send({status: true});
}

exports.sendradioalert = function(req, res) {
	//call voice sending module
	require('./delivery').voice(req.body.numbers, req.body.message)
	res.send({status: true});
}