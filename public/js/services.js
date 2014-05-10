'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', []).
  value('version', '0.1').
  factory('commonMethods', function(){
  	var factory = {};

    factory.getRandomColor = function() {
      var letters = '0123456789ABCDEF'.split('');
      var color = '#';
      for (var i = 0; i < 6; i++ ) {
          color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    }

  	factory.toggleDrawing = function(scope) {
      //ev.preventDefault();
      if(scope.enableDraw){
        scope.enableDraw = false;
        scope.drawText = "Habilitar selección" 
      } else {
        scope.enableDraw = true;
        scope.drawText = "Deshabilitar selección" 
      }
  	}

    factory.doneDrawing = function(scope, lockText, unLockText) {
     if(scope.doneDrawingVal){
      scope.doneDrawingVal = false;
      (lockText==undefined) ? scope.doneDrawText = "Bloquear selección" : scope.doneDrawText = lockText;
     } else {
      scope.doneDrawingVal = true;
      (unLockText==undefined) ? scope.doneDrawText = "Desbloquear selección" : scope.doneDrawText = unLockText;
     }
    };

    factory.getPolyBounds = function(poly) {
      var maxLat, minLat, maxLong, minLong;
      var north, south, east, west
      maxLat = poly[0].lat();
      north = south = east = west = poly[0];
      minLat = poly[0].lat();
      maxLong = poly[0].lng();
      minLong = poly[0].lng();
      for (var i = 0; i < poly.length; i++){
        if(poly[i].lat() > maxLat) {
          maxLat = poly[i].lat();
          north = poly[i];
        }
        if(poly[i].lat() < minLat) {
          minLat = poly[i].lat();
          south = poly[i];
        }
        if(poly[i].lng() > maxLong) {
          maxLong = poly[i].lng();
          east = poly[i];
        }
        if(poly[i].lng() < minLong) {
          minLong = poly[i].lng();
          west = poly[i];
        }
      }
      return {maxLat: maxLat, minLat: minLat, maxLong: maxLong, minLong: minLong, north: north, south: south, west: west, east: east};
    };


    factory.renderCellSites = function(cellsArr, map) {
      var googleCells = [];
      for (var i in cellsArr){
        if(parseInt(i)>0){
          var marker = new MarkerWithLabel({
            position: new google.maps.LatLng(cellsArr[i].lat, cellsArr[i].lng),
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2
            },
            map: map, 
            labelContent: i,
            labelClass: "labels", // the CSS class for the label
            labelStyle: {opacity: 0.75}            
            //title: cellsArr[i].cellId
          });      

          googleCells.push(marker);
        }
      }

      return googleCells;
    }

    factory.renderPolygon = function (coordinates, map, polygon) {
      var googleCoords = [];
      for (var i =0 ; i < coordinates.length; i++) {
        googleCoords.push(new google.maps.LatLng(coordinates[i].lat, coordinates[i].lng));
      }

      if(polygon==undefined) {
        var poly = new google.maps.Polygon({
          paths: googleCoords,
          strokeColor: '#2E2EFE',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#2E2EFE',
          fillOpacity: 0.1,
          map: map
        });      
      } else {
        var poly = polygon;
        poly.setPath(googleCoords);
        poly.setMap(map);
      }

      return poly;
    }

    factory.renderCells = function(coordinates, map, content) {
      var markers = {};
      var content = {};
      var info = new google.maps.InfoWindow();

      //var infoArr = [];
      for (var i = 0; i< coordinates.length; i++) {
        var marker = new MarkerWithLabel({
          position: new google.maps.LatLng(coordinates[i].lat, coordinates[i].lng),
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2
          },
          map: map, 
          labelContent: ""+0,
          labelClass: "labels", // the CSS class for the label
          labelStyle: {opacity: 0.75}            
        });

        if(coordinates[i].len==0) {
          marker.setMap(null);
        } else {
          marker.setMap(map);
        }


        content[coordinates[i].cgi]="Cell Id: "+coordinates[i].cgi+"<br>"+"<p>No subscribers at this site.</p>";
        
        google.maps.event.addListener(marker, 'click', (function(marker, i) {
            return function() {
              info.setContent(content[coordinates[i].cgi]);
              info.open(map, marker);
            }
        })(marker, i));


        markers[[coordinates[i].cgi]] = marker;
      }
      var markersAndInfo = {markers: markers, content: content};
      return markersAndInfo;
    }


    factory.updateCell = function(markersAndInfo, idx, newLabel, msisdns, map) {
      markersAndInfo.markers[idx].labelContent = newLabel;
      //markersAndInfo.markers[idx].setMap(map);

      var numStr="";
      var flag = false;
      for (var i = 0; i< msisdns.length; i++) {
        numStr = numStr + msisdns[i] + "<br>";
        flag = true;
      }


      flag ? markersAndInfo.content[idx] = "Cell Id: "+idx+"<br>"+ numStr : markersAndInfo.content[idx] = "Cell Id: "+idx+"<br>"+"<p>No abonados a este sitio.</p>";

      //if there are no msisdns in this cell. Hide this cell.
      if(msisdns.length==0) {
        markersAndInfo.markers[idx].setMap(null);  
      } else {
        markersAndInfo.markers[idx].setMap(map);  
      }
      


      return markersAndInfo;
    }



    //helper function to add zeroes to digits for get time function.
    function addZeroes(num, sig) {
      switch(sig) {
        case 3: 
          if(num < 100 && num >=10) {
            return "0" + num;
          } else if (num < 10) {
            return "00" + num;
          } else {
            return num;
          }
        case 2: 
          if(num<10) {
            return "0" + num;
          } else {
            return num;
          }
      }
    }

    //helper function to generate a random number between two numbers.
    factory.getRandomInt = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }    



    //this function gets the current time. 
    factory.getCurrentTime = function(dashFlag) {
      var dash = "";
      if (dashFlag==undefined){
        var dash = "-";
      }
      var now = new Date();
      var timeStr = "" + now.getFullYear() +dash+ addZeroes(now.getMonth() + 1, 2) +dash+ addZeroes(now.getDate(), 2) +dash+ addZeroes(now.getHours(), 2) +dash+ addZeroes(now.getMinutes(), 2) +dash+ addZeroes(now.getSeconds(), 2) +dash+ addZeroes(now.getMilliseconds(), 3);
      return timeStr;
    }    


    factory.renderBounds = function (bounds, map) {
      var googlePolyCoord = [];
      //create google lat long before rendering bounds.
      for (var i in bounds){
        if(parseInt(i)>=0){
          googlePolyCoord.push(new google.maps.LatLng(bounds[i].lat, bounds[i].lng));  
        }
      }

      var boundPolygon = new google.maps.Polygon({
        paths: googlePolyCoord,
        strokeColor: '#2E2EFE',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#2E2EFE',
        fillOpacity: 0.1,
        map: map
      });      

      return boundPolygon;

    };

    //common method to change the center of the map
    factory.changeMapCenter = function(map, lat, lng) {
      map.setCenter(new google.maps.LatLng(lat, lng));
    }


    

    return factory;


  }).
  factory('dataMethods', function(angularFireCollection, angularFire){
    var factory = {};

    factory.getAngularPromise = function(url, scope, si, type){
      return angularFire(new Firebase(url), scope, si, type)
    }


    //this method will be used to get the bounds data.
    factory.getBoundsData = function(scope, si) {
      var boundsRef = "https://versapp.firebaseio.com/bounds";
      return angularFire(new Firebase(boundsRef), scope, si);
    };


    factory.removeItem = function(arr, id) {
      arr.remove(id);
    }

    factory.updateItem = function(arr, id) {
      arr.update(id);
    }

    factory.addItem = function(arr, item) {
      arr.add(item);
    }

    factory.getCellSitesData = function(scope) {
      var cellSitesRef = "https://versapp.firebaseio.com/cellsites";
      var data = angularFireCollection(new Firebase(cellSitesRef));
      return data;
    }

    factory.getSubNumberRangeData = function(scope) {
      var subRangeRef = "https://versapp.firebaseio.com/subrange";
      var data = angularFireCollection(new Firebase(subRangeRef));
      return data;
    }

    factory.getMsisdns = function(scope) {
      var msisdnRef = "https://versapp.firebaseio.com/msisdns";
      var data = angularFireCollection(new Firebase(msisdnRef));
      return data;
    }

    factory.getMsisdnByCell = function(baseUrl) {
      var data = angularFireCollection(new Firebase(baseUrl));
      return data;
    }


    return factory;
  });
