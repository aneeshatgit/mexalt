var config = {}

config.session_secret = 'asdfsaASDJGA9ejhas93masdnnalZEDOJwiidnsp';
config.mongo_dev_string = 'mongodb://localhost/cdmdb';
config.mongo_prod_string = 'mongodb://localhost/cdmdb';

//sms parameters
config.smsWsdl = 'https://secure.ums.no/soap/sms/2.1/sms.asmx?wsdl';
config.umsCompany = 'UMSINDIA';
config.umsDepartment = 'POC';
config.umsPassword = 'xfghfg45g';
config.smsfrom = 'UMSIND';


//voice paramters
config.vw = 'https://secure.ums.no/soap/voice/2.0/Voice.asmx?wsdl';
config.voiceCompany = 'umspas';
config.voiceDepartment = 'ux-gas';
config.voicePassword = '4EvubeBa';
config.sendingName = 'test';
config.profileName = 'IndiaVoiceNodeMsgProfile1audio';
config.configProfileName = 'IndiaVoiceNodeCfg1Try';
config.from = '004747471213';


//captcha
config.publicKey = '6LexxuwSAAAAABZ_12w2QqweTTZgEXBVpdawhk2f';
config.privateKey = '6LexxuwSAAAAAHrAulnM4ssbbrdtWNk9H8Z8EmED';



module.exports = config;