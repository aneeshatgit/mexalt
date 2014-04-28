
/**
 * Module dependencies
 */




var express = require('express'),
  routes = require('./routes'),
  api = require('./routes/api'),
  upload = require('./routes/upload'),
  sms = require('./routes/sms'),
  http = require('http'),
  path = require('path');

var Firebase = require('firebase');
var boundsRef = new Firebase('https://versapp.firebaseio.com/bounds');
var cellSitesRef = new Firebase('https://versapp.firebaseio.com/bounds');
//myRootRef.set("hello world!");  


var app = module.exports = express();

var arr = [];


/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
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


//var soap = require('soap')
app.post('/upload', upload.uploader);
app.post('/sendsms', sms.smser);//require('./routes/sms')(req, res, soap));



/**
 * Start Server
 */

var server = http.createServer(app).listen(app.get('port'), function () {
  	console.log('Express server listening on port ' + app.get('port'));
});
