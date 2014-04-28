exports.smser = function(req, res){
	var soap = require('soap');
	var url = 'https://secure.ums.no/soap/sms/2.1/sms.asmx?wsdl';
	var args = {umsCompany: 'UMSINDIA',
				umsDepartment: 'POC',
				umsPassword: 'xfghfg45g',
				to: req.body.numbers,
				from: 'UMSIND',
				text: req.body.message}
	soap.createClient(url, function(err, client) {
	  client.doSendSMSSimple(args, function(err, result) {
	      if(err) {
	      	res.send({status: false});
	      }
	      console.log(result);
       	  res.send({status: true});

	  });
	});

}
