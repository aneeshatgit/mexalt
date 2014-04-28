'use strict';

// Declare app level module which depends on filters, and services

angular.module('myApp', [
  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'firebase'
]).
config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/am', {
      templateUrl: 'partials/createalert',
      controller: 'amController'
    }).
    when('/am/:id/:name', {
      templateUrl: 'partials/createalert',
      controller: 'amController'
    }).
    when('/cd', {
      templateUrl: 'partials/settings',
      controller: 'cdController'
    }).
    when('/vam', {
      templateUrl: 'partials/viewalert',
      controller: 'vamController'
    }).
    when('/sim', {
      templateUrl: 'partials/simulate',
      controller: 'simController'
    }).
    when('/pm', {
      templateUrl: 'partials/profiler',
      controller: 'pmController'
    }).
    when('/im', {
      templateUrl: 'partials/incmonitor',
      controller: 'imController'
    }).
    when('/as', {
      templateUrl: 'partials/addsubs',
      controller: 'asController'
    }).
    otherwise({
      redirectTo: '/am'
    });

  $locationProvider.html5Mode(true);
});
