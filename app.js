
/**
 * Module dependencies
 */




var express = require('express'),
  routes = require('./routes'),
  api = require('./routes/api'),
  upload = require('./routes/upload'),
  sms = require('./routes/sms'),
  core = require('./routes/core'),
  http = require('http'),
  path = require('path'),
  i18n = require('i18n');

var Firebase = require('firebase');
var boundsRef = new Firebase('https://versapp.firebaseio.com/bounds');
var cellSitesRef = new Firebase('https://versapp.firebaseio.com/bounds');
//myRootRef.set("hello world!");  


var app = module.exports = express();

var arr = [];

i18n.configure({
    locales: ['en', 'es', 'nor'],
    cookie: 'localeCookie',
    directory: './views/locales',
    defaultLocale: 'en'
  });


/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(i18n.init);
app.use(app.router);

// development only
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
}

// production only
if (app.get('env') === 'production') {
  // TODO
};


/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API
app.get('/api/name', api.name);


// redirect all others to the index (HTML5 history)
app.get('*', routes.index);



app.post('/upload', upload.uploader);
app.post('/sendsms', sms.smser);
app.post('/sendgroupalert', core.sendgroupalert);
app.post('/sendradioalert', core.sendradioalert);


app.post('/setLocale', function(req, res) {
  console.log('lang: '+ JSON.stringify(req.body));
  var locale = req.body.lang;
  res.cookie('localeCookie', locale, { httpOnly: false });
  res.send(200);
});



/**
 * Start Server
 */

var server = http.createServer(app).listen(app.get('port'), function () {
  	console.log('Express server listening on port ' + app.get('port'));
});
