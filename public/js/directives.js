'use strict';

/* Directives */

angular.module('myApp.directives', []).
  directive('appVersion', function (version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }).
  directive('showModal', function (version) {
    return function(scope, elm, attrs) {
      elm.modal({
        show: true,
        backdrop: false
      })
    };
  }).
  directive('helloMaps', function ($timeout) {
	  return {
 	    link: function (scope, elem, attrs) {
		    
 	    	//render a basic map
		    var mapOptions, map;
		    var latitude = attrs.latitude;
		    var longitude = attrs.longitude, 

		    latitude = latitude && parseFloat(latitude, 10) || 43.074688;
		    longitude = longitude && parseFloat(longitude, 10) || -89.384294;

		    mapOptions = {
		      zoom: parseInt(attrs.zoom) || 8,
		      center: new google.maps.LatLng(latitude, longitude)
		    };
		    map = new google.maps.Map(elem[0], mapOptions);

		    scope.mapForScope = map;


        scope.$watch('selectedRows.length', function(){
          $timeout(function(){ resizeMap(); }, 100);
        });

        scope.$watch('showMapModal', function(nv){
          if(nv){
            $timeout(function(){ resizeMap(); }, 500); 
          }
        });


        function resizeMap() {
          var center = map.getCenter(); 
          google.maps.event.trigger(map, 'resize'); 
          map.setCenter(center);           
        }
		}
	}
  }).
  directive('adjustScroll', function() {
      return {
        link: function(scope, element, attr) {
          scope.$watch('simulationLogText', function() {
            element[0].scrollTop = element[0].scrollHeight;  
          });
        }
      };
  }).
  directive('modalShowTrigger', function() {
      return {
        link: function(scope, element, attr) {
          scope.$watch('showModal', function(nv) {
            if(nv){
              $(element[0]).modal({show: true, backdrop: "static"});
            } 
          });
        }
      };
  }).
  directive('mapModalShowTrigger', function() {
      return {
        link: function(scope, element, attr) {
          scope.$watch('showMapModal', function(nv) {
            if(nv){
              $(element[0]).modal({show: true, backdrop: "static"});
            } 
          });
        }
      };
  }).
  directive('accordionControl', function($timeout) {
      return {
        link: function(scope, element, attr) {
          scope.$watchCollection('statusList', function(){
            $(element[0]).find('.collapse').collapse();
            $(element[0]).find('.accordion-toggle').click(function() {
              var id = $(this).attr('collapse-click');
              $(element[0]).find($('#'+id)).collapse('toggle');
            })
          })
        }
      };
  }).
  directive('htmlText', function() {
      return {
        link: function(scope, element, attr) {
          scope.$watchCollection('statusList', function(){
            $(element[0]).html(scope.statusList.slice().reverse()[parseInt(attr.htmlText)].desc);
          });
        }
      };
  }).
  directive('navPillsActivation', function($location, commonMethods) {
      return {
        link: function(scope, element, attr) {
          $(element[0]).find("a").each(function(){
            $(this).parent().removeClass('active');
            if($(this).attr('selection')==commonMethods.selectedLink) {
              $(this).parent().addClass('active');
            }
          });

          scope.$on('$locationChangeStart', function(next, current) { 
            var path = $location.path();
            var h = path.replace("/","");
            if((path.split("/").length - 1) > 1) {
              h = 'am';
            }

            commonMethods.selectedLink = h;
          });
        }
      };
  }).
  directive('tooltipControl', function() {
      return {
        link: function(scope, element, attr) {
          var htmlProp = attr.tooltipHtml;
          var placeProp = attr.tooltipPos;
          if (htmlProp==undefined){
            htmlProp = false;
          } 
          if (placeProp==undefined){
            placeProp = 'auto';
          }
          $(element[0]).tooltip({title: attr.tooltipControl, placement: placeProp, html: htmlProp});
        }
      };
  }).
  directive('audioPlay', function() {
      return {
        link: function(scope, element, attr) {
          scope.$watchCollection('msgList', function(nv){
            if(nv!=undefined && nv.length>0){
              element[0].play();    
            }
          });
        }
      };
  }).
  directive('pleaseWait', function() {
      return {
        link: function(scope, element, attr) {
          scope.$watch('waitFlag', function(nv){
            if(nv){
              $(element[0]).modal({show: true, backdrop: "static"});
            } else {
              $(element[0]).modal('hide');
            }
          });
        }
      };
  }).
  directive('infoControl', function($compile) {
      return {
        link: function(scope, element, attr) {
          scope.$watch('changeHtml', function(nv){
              var html = $(element[0]).html();
              scope.newHtml = $compile(html)(scope)[0];
          });
        }
      };
  });




