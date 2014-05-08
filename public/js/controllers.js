'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('AppCtrl', function ($scope, $http) {
  }).
  controller('amController', function ($scope, $http, commonMethods, dataMethods, $routeParams) {
    var inId = $routeParams.id;
    var inName = $routeParams.name;

    $scope.waitFlag = true; 

    //this is the status variable to save status updates:
    $scope.statusList = [];

    //declare map object for the scope
    $scope.mapForScope;
    //declare a variable to hold ref to polygon and cell sites drawn. 
    //this will be used to clear polygon or cell sites.
    var boundsPoly = new google.maps.Polygon({
      strokeColor: '#2E2EFE',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#2E2EFE',
      fillOpacity: 0.1,
    });

    var polygonOnMap = new google.maps.Polygon({
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#F78181',
      fillOpacity: 0.1,
    });

    var markersOnMap = [];

    $scope.drawText = "Habilitar Dibujar"
    $scope.doneDrawText = "Borrar Región"
    
    $scope.enableDraw = false;
    $scope.doneDrawingVal = false; 
    

    //get the bounds (structure: root/bounds/ (0: lat, lng | 1: lat, lng)
    $scope.boundsArr = [];
    $scope.boundsLoaded = false;
    var boundsUrl = "https://versapp.firebaseio.com/bounds"
    dataMethods.getAngularPromise(boundsUrl, $scope, 'boundsArr').then(function(){
      if ($scope.boundsArr.length>0) {
        $scope.boundsLoaded = true;
        renderBounds(); 
      } else {
        $scope.boundsLoaded = false;
      }
    });

    //get the map coordinates
    $scope.mapCenter = null;
    var centerUrl = "https://versapp.firebaseio.com/mapcenter";
    dataMethods.getAngularPromise(centerUrl, $scope, 'mapCenter').then(function(){
      if($scope.mapCenter.lat != undefined && $scope.mapCenter.lng !=undefined){
        commonMethods.changeMapCenter($scope.mapForScope, $scope.mapCenter.lat, $scope.mapCenter.lng);
      }
    });

    //list of alerts
    $scope.alertsArr = {};
    var alertsUrl = "https://versapp.firebaseio.com/alerts"
    $scope.msisdnList=[];
    dataMethods.getAngularPromise(alertsUrl, $scope, "alertsArr").then(function(){
      $scope.waitFlag = false; 
      if(inId!=undefined && inName!=undefined) {
        $scope.selectAlert(inId, inName);
      }
      //close loading dialog
      //get phone number list in case alert has to be sent. this is proxy for smpp integration
      if($scope.msisdnList==undefined || $scope.msisdnList.length==0){
        var purl = "https://versapp.firebaseio.com/msisdnlist";
        dataMethods.getAngularPromise(purl, $scope, 'msisdnList',[]);
      }


    });





    //function to add a new alert
    $scope.statusList=[];
    $scope.addAlert = function(ev) {
      var ts = commonMethods.getCurrentTime(true);
      //UI
      $scope.selectAlert(ts, $scope.alertName);

      $scope.statusList=[];
      $scope.statusList.push({title: commonMethods.getCurrentTime()+": New Alert Created", desc: "New alert created with name:"+ $scope.alertName});

      $scope.alertsArr[ts] = {name: $scope.alertName};
      $scope.alertsArr[ts]["details"] =  {statusList: $scope.statusList};
    }

    //delete alert
    $scope.deleteAlert = function(key, ev) {
      if($scope.selectedRows[0]==key){
        $scope.selectedRows = [];
      }
      delete $scope.alertsArr[key];
    }


    //function to mention what happens when you select an alert.
    $scope.selectedRows = [];
    $scope.selectAlert = function(id, name, ev) {
      $scope.selectedRows = [];
      $scope.selectedRows.push(id);
      $scope.selectedRows.push(name);

      //$scope.alertCoordinates = [];
      displayAlertDetails();
    }


    $scope.visibleTab = "map";

    $scope.tabClick = function(tab, ev) {
      $scope.visibleTab = tab;
    }





    $scope.validPolygon = false;
    //if bounds exist, then render it.
    function renderBounds() {
      if($scope.boundsLoaded) {
        //first render polygon by calling a service method
        boundsPoly = commonMethods.renderPolygon($scope.boundsArr, $scope.mapForScope);

        google.maps.event.addListener(boundsPoly, 'click', function(e) {
          if($scope.mapDataLoaded && $scope.enableDraw && !$scope.doneDrawingVal){
            var coord = polygonOnMap.getPath();
            coord.push(e.latLng);
            polygonOnMap.setMap(null);
            polygonOnMap.setPath(coord);
            polygonOnMap.setMap($scope.mapForScope);
            polygonOnMap.getPath().length > 2 ? $scope.validPolygon = true : $scope.validPolygon = false;
            $scope.$apply();
          }
        });


        $scope.mapDataLoaded = true;
      }
    }

    $scope.mapClearCalled = 0;
    function clearMap() {
      $scope.mapClearCalled++;
      //clear the alert polygon
      polygonOnMap.setPath([]);
      polygonOnMap.setMap(null);
      $scope.towerCoords = [];
      $scope.towerCoordsLoaded = false;
      //clear tower information and stop watching tower updates.
      var len = stopWatchArr.length;

      for (var i = 0; i < len; i++) {
       stopWatchArr[i](); 
      }
      stopWatchArr = [];

      var len2 = daArr.length
      for (var j = 0; j < len2; j++) {
       daArr[j](); 
      }
      daArr = [];



      //clear markers on the map.
      if(markersOnMap!=undefined && markersOnMap.markers!=undefined){
        for(var i in markersOnMap.markers) {
          markersOnMap.markers[i].setMap(null);
        }
      }

      markersOnMap=[];

    }


    //if enable draw button is clicked.
    $scope.toggleDrawing = function(ev) {
      commonMethods.toggleDrawing($scope);
    };

    //if lock drawing button is clicked.
    $scope.doneDrawing = function(ev) {
      
      if($scope.doneDrawingVal){
        //clear drawing.
        clearMap();
      } else {
        //lock region and get tower information for the region.
        fetchTowerInformation();
        
      }

      //change UI button status.
      commonMethods.doneDrawing($scope, "Bloquear Región", "Borrar Región");

    };

    //populate map with towers which are in the range indicated by polygon on Map.
    $scope.towerCoords = [];
    $scope.towerCoordsLoaded = false;
    $scope.cellSitesLoaded = false;
    function fetchTowerInformation() {
      //$scope.cellSitesArr = [];
      $scope.towerCoordsLoaded = false;
      
      var cellsitesUrl = "https://versapp.firebaseio.com/cellsiteslite"
      if(!$scope.cellSitesLoaded){
        dataMethods.getAngularPromise(cellsitesUrl, $scope, "cellSitesArr").then(function(){
          getTowersInPolygon();
        });
      } else {
        getTowersInPolygon();
      }

    }

    function getTowersInPolygon() {
      var len = $scope.cellSitesArr.length;
      if (len>0) {
        $scope.cellSitesLoaded = true;
        for (var i = 0; i < len; i++) {
          var latLng = new google.maps.LatLng($scope.cellSitesArr[i].lat, $scope.cellSitesArr[i].lng);
          if(google.maps.geometry.poly.isLocationOnEdge(latLng, polygonOnMap, 0.1) || google.maps.geometry.poly.containsLocation(latLng, polygonOnMap)){
            var mLen;
            if($scope.cellSitesArr[i]['length']==null || $scope.cellSitesArr[i]['length']==0) {
              mLen=0;
            } else {
              mLen = $scope.cellSitesArr[i]['length'];
            }
            $scope.towerCoords.push({lat: latLng.lat(), lng: latLng.lng(), cgi: $scope.cellSitesArr[i].cgi, len: mLen});
          }
        }
        $scope.towerCoordsLoaded = true;
        markersOnMap = commonMethods.renderCells($scope.towerCoords, $scope.mapForScope);
      } else {
        $scope.cellSitesLoaded = false;
      }     
    }

    var stopWatchArr = [];
    var daArr = [];
    $scope.$watch('towerCoordsLoaded', function(flag){
      if(flag){
        var len = $scope.towerCoords.length;
        var cellArr = [];
        //here we will add watches for each cell
        for (var i = 0; i < len; i++) {
          var url = "https://versapp.firebaseio.com/cellsites/"+$scope.towerCoords[i].cgi;
          var si = "cdata"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
          eval('dataMethods.getAngularPromise(url, $scope, si).then(function(disassociate){ daArr.push(disassociate); })');
          eval("stopWatchArr.push($scope.$watch('"+si+"', cb))");
        }
      }
    });
    var markersOnMap = [];
    function cb(nv) {
      if(nv!=undefined && nv.cgi!=undefined && nv.length!=undefined && nv.msisdns!=undefined){
        //console.log('Time: '+commonMethods.getCurrentTime()+' new value: ' + nv.length);
        if (markersOnMap.length==0) {
          markersOnMap = commonMethods.renderCells($scope.towerCoords, $scope.mapForScope);  
        }
        markersOnMap = commonMethods.updateCell(markersOnMap, nv.cgi, nv.length, nv.msisdns, $scope.mapForScope);
      }
        
    }




    //now, we will write functionality to save the alert
    $scope.showModal = false;
    $scope.modalMessage = "";
    $scope.smsContent={};
    $scope.saveAlert = function(ev){
      var arr = polygonOnMap.getPath().getArray();
      var len = arr.length;
      var newArr = [];
      var obj = {};
      var code = commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      for (var i = 0; i < len; i++) {
        newArr.push({lat: arr[i].lat(), lng: arr[i].lng()});
      }
      $scope.smsContent = {Default: $scope.smsContent['Default'], EN: $scope.smsContent['EN'], FR: $scope.smsContent['FR'], DE: $scope.smsContent['DE'], NO: $scope.smsContent['NO'], SE: $scope.smsContent['SE']};
      obj = {latlng: newArr, smsContent: $scope.smsContent, statusList: $scope.statusList, historyList: $scope.historyList};

      var alertUrl = "https://versapp.firebaseio.com/alerts/"+$scope.selectedRows[0];

      var vname = "ac"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      dataMethods.getAngularPromise(alertUrl, $scope, vname).then(function(){
        eval("$scope."+vname+"['details'] = obj;"); 
        eval("$scope."+vname+"['code'] = code;"); 
      });


      
      var statusTitleStr = commonMethods.getCurrentTime() + ": Alerta guardada.";
      var statusDescStr = "<b>Coordenadas:</b> <ul>"
      for (var i = 0; i < len; i++) {
        statusDescStr = statusDescStr.concat("<li>Lat:"+newArr[i].lat+", Lng: "+newArr[i].lng+"</li>");
      }
      statusDescStr = statusDescStr.concat("</ul><br>");

      var msg="";
      if($scope.smsContent.Default!=undefined){
        msg = $scope.smsContent.Default;
      }
      statusDescStr = statusDescStr.concat("<b>Contenido del mensaje:</b><ul><li>"+msg+"</li></ul>");

      $scope.statusList.push({title: statusTitleStr,  desc: statusDescStr});

      $scope.modalMessage = "Alerta guardada!";
      $scope.showModal = true;
    }



    //display alert details
    function displayAlertDetails() {
      $scope.towerCoordsLoaded = false;
      var alertUrl = "https://versapp.firebaseio.com/alerts/"+$scope.selectedRows[0];
      var vname = "ac"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      dataMethods.getAngularPromise(alertUrl, $scope, vname).then(function(){
        clearMap();
        var len = 0;
        eval("if($scope."+vname+"['details']!=undefined && $scope."+vname+"['details']['latlng']!=undefined) { len = $scope."+vname+"['details']['latlng'].length }");
        if(len>0){
          eval("commonMethods.renderPolygon($scope."+vname+"['details']['latlng'], $scope.mapForScope, polygonOnMap)");
          $scope.doneDrawingVal = false;
          commonMethods.doneDrawing($scope, "Bloquear Región", "Borrar Región");
          fetchTowerInformation();
        }
        eval("if($scope."+vname+"['details']!=undefined) { $scope.smsContent = {}; for (var k in $scope."+vname+"['details']['smsContent']) { $scope.smsContent[k] = $scope."+vname+"['details']['smsContent'][k]}}");
        eval("if($scope."+vname+"['details']!=undefined) {$scope.statusList = $scope."+vname+"['details']['statusList']; if($scope.statusList==undefined) {$scope.statusList=[];} }");
      });
    }


    //functionality to decide status of alert send button.
    $scope.$watchCollection('towerCoords', function(){
      checkValidity();
    })

    $scope.$watch('smsContent.Default', function(){
      checkValidity();
    });

    function checkValidity() {
      if ($scope.towerCoords!=undefined && $scope.towerCoords.length > 2 && $scope.smsContent.Default!=undefined && $scope.smsContent.Default.trim()!='') {
        $scope.alertSendButtonDisabled = false;         
      } else {
        $scope.alertSendButtonDisabled = true;
      }
    }


    //functionality for sending and alert goes here.
    $scope.sendAlert = function (ev){
      var phoneArr = [];
      var len = $scope.towerCoords.length;
      var watchArr = [];

      $scope.promiseCount = 0;


      for (var i = 0; i < len; i++) {
        var url = "https://versapp.firebaseio.com/cellsites/"+$scope.towerCoords[i].cgi;
        var vname = "var"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
        dataMethods.getAngularPromise(url, $scope, vname).then(function(){
          $scope.promiseCount++;
        });
        watchArr.push($scope.$watch(vname, function(nv){
          if(nv!=undefined && nv['msisdns']!=undefined && nv['msisdns'].length>0){
            phoneArr = phoneArr.concat(nv['msisdns']);
          }
          if(nv!=undefined && nv['permanentmsisdns']!=undefined && nv['permanentmsisdns'].length){
            phoneArr = phoneArr.concat(nv['permanentmsisdns']);  
          }
        }));
      }
      var uw = $scope.$watch('promiseCount', function(nv) {
        if (nv == len) {
          for (var j=0; j< len; j++){
            watchArr[j]();
          }

          var pLen = phoneArr.length;
          var msg="";
          for(var k=0; k< pLen; k++) {
            //send alert only when opt-in is true
            if(phoneArr[k]!=undefined && $scope.msisdnList[phoneArr[k]]!=undefined && $scope.msisdnList[phoneArr[k]]['profile']!=undefined && $scope.msisdnList[phoneArr[k]]['messages']!=undefined){
              if($scope.msisdnList[phoneArr[k]]['profile']['oi'] == true){
                if($scope.smsContent[$scope.msisdnList[phoneArr[k]]['profile']['lang']]==undefined || $scope.smsContent[$scope.msisdnList[phoneArr[k]]['profile']['lang']].trim()==""){
                  $scope.msisdnList[phoneArr[k]]['messages'].push({message: $scope.smsContent['Default'], time: commonMethods.getCurrentTime()});
                } else {
                  $scope.msisdnList[phoneArr[k]]['messages'].push({message: $scope.smsContent[$scope.msisdnList[phoneArr[k]]['profile']['lang']], time: commonMethods.getCurrentTime()});
                }
              }
            }
          }

          var coord = polygonOnMap.getPath().getArray();
          var polyLen = coord.length;
          var statusTitleStr = commonMethods.getCurrentTime() + ": Alerta enviada.";

          var statusDescStr = "<b>Contenido del Mensaje:</b> <ul><li>"+$scope.smsContent.Default+"</li></ul>";
          


          statusDescStr = statusDescStr.concat("<b>Coordenadas:</b><ul>");
          for (var l = 0; l < polyLen; l++) {
            statusDescStr = statusDescStr.concat("<li>Lat:"+coord[l].lat()+", Lng: "+coord[l].lng()+"</li>");
          }
          statusDescStr = statusDescStr.concat("</ul><br>");

          statusDescStr = statusDescStr.concat("<b>Conjunto de torres de telefonía móvil participantes en la transmisión de esta alerta:</b><ul>");

          var cLen = $scope.towerCoords.length;
          for (var m = 0; m < cLen; m++) {
            statusDescStr = statusDescStr.concat("<li>cgi:"+$scope.towerCoords[m].cgi+"</li>");
          }

          statusDescStr = statusDescStr.concat("</ul>");

          statusDescStr = statusDescStr.concat("<b>MSISDNs en el ámbito:</b><ul>");

          var mLen = phoneArr.length;
          for (var n = 0; n < mLen; n++) {
            statusDescStr = statusDescStr.concat("<li>"+phoneArr[n]+"</li>");
          }

          statusDescStr = statusDescStr.concat("</ul>");

          $scope.statusList.push({title: statusTitleStr,  desc: statusDescStr});



          var alertUrl = "https://versapp.firebaseio.com/alerts/"+$scope.selectedRows[0];

          var vname = "ac"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
          dataMethods.getAngularPromise(alertUrl, $scope, vname).then(function(){
            eval("$scope."+vname+"['details']['statusList'] = $scope.statusList;"); 
          });

          //remove watch.
          uw();
        }
      });

      //send alert to real subscribers
      //fetch the subscriber numbers from firebase.
      var sUrl = "https://versapp.firebaseio.com/subscribers"
      $scope.subscribersArr = {};
      dataMethods.getAngularPromise(sUrl, $scope, 'subscribersArr').then(function(){
        var subCellNumbers = {};
        for (var s in $scope.subscribersArr) {
          if (subCellNumbers[$scope.subscribersArr[s]["cgi"]]==null) {
            subCellNumbers[$scope.subscribersArr[s]["cgi"]] = [];
            subCellNumbers[$scope.subscribersArr[s]["cgi"]].push(s);
          } else {
            subCellNumbers[$scope.subscribersArr[s]["cgi"]].push(s);
          }
        }

        var numberString = "";
        var tLen = $scope.towerCoords.length;
        for (var t = 0; t < tLen; t++) {
          if(subCellNumbers[$scope.towerCoords[t].cgi]!=null){
            for(var z=0; z<subCellNumbers[$scope.towerCoords[t].cgi].length; z++){
              numberString = numberString + subCellNumbers[$scope.towerCoords[t].cgi][z] + ",";  
            }
          }
        }
        numberString = numberString.substring(0, numberString.length - 1);


        //grab the message: $scope.smsContent['Default']

        //call http post service to call the soap request to send sms.
        var data = {numbers: numberString, message: $scope.smsContent['Default']}
        $http.post('/sendsms', data).success(function(){
          console.log('success');
        }).error(function(){
          console.log('error');
        })

        $scope.modalMessage = "Alert sending is triggered. Check status tab to view status of alert!";
        $scope.showModal = true;        
      });
    }





  }).
  controller('cdController', function ($scope, $http, commonMethods, dataMethods, $timeout) {
    $scope.waitFlag = true; 
    //declare map object for the scope
    $scope.mapForScope;
    //declare a variable to hold ref to polygon and cell sites drawn. 
    //this will be used to clear polygon or cell sites.
    var polygonOnMap = new google.maps.Polygon({
      strokeColor: '#2E2EFE',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#2E2EFE',
      fillOpacity: 0.1,
    });

    var markersOnMap = [];

    $scope.drawText = "Permitir Dibujo"
    $scope.doneDrawText = "Bloquear Dibujo"
    
    $scope.enableDraw = false;
    $scope.doneDrawingVal = false; 
    

    //get the bounds (structure: root/bounds/ (0: lat, lng | 1: lat, lng)
    $scope.boundsArr = [];
    $scope.boundsLoaded = false;
    var boundsUrl = "https://versapp.firebaseio.com/bounds"
    dataMethods.getAngularPromise(boundsUrl, $scope, 'boundsArr').then(function(){
      if ($scope.boundsArr.length>0) {
        $scope.boundsLoaded = true;
        renderBoundsAndCellSites(); 
      } else {
        $scope.boundsLoaded = false;
        //close wait dialog
        $scope.waitFlag = false;
      }
    });

    //get cell sites (structure: root/cellsites/ (0: lat, lng, phonesList, length | 1: lat, lng, phonesList, length)
    $scope.cellSitesArr = [];
    $scope.cellSitesLoaded = false;
    var cellsitesUrl = "https://versapp.firebaseio.com/cellsites"
    dataMethods.getAngularPromise(cellsitesUrl, $scope, "cellSitesArr").then(function(){
      if ($scope.cellSitesArr.length>0) {
        $scope.cellSitesLoaded = true;
        renderBoundsAndCellSites();
      } else {
        $scope.cellSitesLoaded = false;
        //close wait dialog
        $scope.waitFlag = false;
      }
    });



    //this variable will be used to control the behaviour of control buttons below the map. 
    $scope.mapDataLoaded = false;


    //get the MSISDN range
    $scope.msisdnStart = "";
    $scope.msisdnEnd = "";
    $scope.msisdnRangeArr = [];
    $scope.msisdnRangeLoaded = false;
    var msisdnRangeUrl = "https://versapp.firebaseio.com/msisdnrange"
    dataMethods.getAngularPromise(msisdnRangeUrl, $scope, 'msisdnRangeArr').then(function(){
      if ($scope.msisdnRangeArr.length>0) {
        $scope.msisdnRangeLoaded = true;
        $scope.msisdnStart = $scope.msisdnRangeArr[0].start;
        $scope.msisdnEnd = $scope.msisdnRangeArr[0].end;
      } else {
        $scope.msisdnRangeLoaded = false;
      }
    });


    //get the map center coordinates.
    $scope.centerLoaded = false;
    $scope.mapCenter= null;
    var centerUrl = "https://versapp.firebaseio.com/mapcenter";
    dataMethods.getAngularPromise(centerUrl, $scope, 'mapCenter').then(function(){
      if($scope.mapCenter.lat != undefined && $scope.mapCenter.lng !=undefined){
        $scope.centerLoaded = true;
        $scope.centerLat = $scope.mapCenter.lat;
        $scope.centerLng = $scope.mapCenter.lng;
        commonMethods.changeMapCenter($scope.mapForScope, $scope.centerLat, $scope.centerLng);
      } else {
        $scope.centerLoaded = false;
      }
    });

    //save map center
    $scope.submitMapCenter = function(e) {
      validateMapCenterInput();

      if ($scope.centerErrors.length>0) {
        //if errors exist do nothing.
        return;
      } else {
        //persist center to datastore.
        $scope.mapCenter = {lat: $scope.centerLat, lng: $scope.centerLng};

        $scope.centerLoaded = true;

        //change map center
        commonMethods.changeMapCenter($scope.mapForScope, $scope.centerLat, $scope.centerLng);
      }
    }  


    $scope.editMapCenter = function(e) {
      $scope.centerLoaded = false;
    }
    
    //validate map center input.
    function validateMapCenterInput() {
      $scope.centerErrors = [];
      //both strings are numbers
      var n = Number($scope.centerLat);
      if(!(String(n) === $scope.centerLat && n>-90 && n<90)) {
        $scope.centerErrors.push("Latitude should be between -90 and +90");
      }

      var m = Number($scope.centerLng);
      if(!(String(m) === $scope.centerLng && m>-180 && m<180)) {
        $scope.centerErrors.push("Longitude should be between -180 and +180")
      }
    }      




    //if bounds and cell sites (both) exist, then render it.
    function renderBoundsAndCellSites() {
      if($scope.cellSitesLoaded && $scope.boundsLoaded) {
        //first render polygon by calling a service method
        polygonOnMap = commonMethods.renderPolygon($scope.boundsArr, $scope.mapForScope);

        //the render cell sites by calling a service methods
        markersOnMap = commonMethods.renderCells($scope.cellSitesArr, $scope.mapForScope);

        $scope.mapDataLoaded = true;
        $scope.enableDraw = false; 
        $scope.doneDrawingVal = true;
      }
    }




    //else give provision to define
    $scope.validPolygon = false;
    $scope.$watch('mapForScope', function(){
      if($scope.mapForScope!=undefined){
        google.maps.event.addListener($scope.mapForScope, 'click', function(e) {
          if(!$scope.mapDataLoaded && $scope.enableDraw && !$scope.doneDrawingVal){
            var coord = polygonOnMap.getPath();
            coord.push(e.latLng);
            polygonOnMap.setMap(null);
            polygonOnMap.setPath(coord);
            polygonOnMap.setMap($scope.mapForScope);
            polygonOnMap.getPath().length > 2 ? $scope.validPolygon = true : $scope.validPolygon = false;
            $scope.$apply();
          }
        });
      }
    });



    //if user wants to edit existing definition.
    $scope.editBounds = function (ev) {
      //text of toggle buttons based on the state.
      $scope.drawText = "Habilitar Dibujar"
      $scope.doneDrawText = "Bloquear Región"

      //these are values to indicate the toggle state of the enable and lock drawing buttons. 
      $scope.doneDrawingVal = false;
      $scope.enableDraw = false;
      $scope.mapDataLoaded = false;


      if(polygonOnMap!=undefined){
        polygonOnMap.setPath([]);
        polygonOnMap.setMap(null);
        $scope.boundsLoaded = false;
      }

      if(markersOnMap!=undefined){
        for(var i in markersOnMap.markers) {
          markersOnMap.markers[i].setMap(null);
        }
        $scope.cellSitesLoaded = false;
      }
    };


    //if enable draw button is clicked.
    $scope.toggleDrawing = function(ev) {
      commonMethods.toggleDrawing($scope);
    };

    //if lock drawing button is clicked.
    $scope.doneDrawing = function(ev) {
      commonMethods.doneDrawing($scope);    
    };




    $scope.cellSitesLiteArr=[];
    $scope.saveBoundsAndTowers = function(ev) {

      //cell sites are updated
      var sites = loadCellTowers();
      


      //create a proxy to store only lat lng info
      var xurl = "https://versapp.firebaseio.com/cellsiteslite";
      dataMethods.getAngularPromise(xurl, $scope, "cellSitesLiteArr",[]).then(function(){
        //update the cellsites information to datastore.
        $scope.cellSitesLiteArr = sites;
        $scope.cellSitesArr = sites;
      });

      $scope.waitFlag = true;
      $timeout(function() { cellSitesSaved(); }, 2000).then(function(){ $scope.waitFlag = false; });
      function cellSitesSaved(){
        //then bounds are updated.
        var arr = polygonOnMap.getPath().getArray();
        var len = arr.length;
        var newArr = [];
        for (var i =0; i < len; i++) {
          newArr.push({lat: arr[i].lat(), lng: arr[i].lng()});
        }

        //update bounds info to persistence.
        $scope.boundsArr = newArr;

        polygonOnMap.setMap(null);
        $scope.cellSitesLoaded = true;
        $scope.boundsLoaded = true;
        renderBoundsAndCellSites();
      }
    }

    function loadCellTowers() {

      var tDist = 75000;

      var y = polygonOnMap.getPath().getArray();
      var polyBound = commonMethods.getPolyBounds(polygonOnMap.getPath().getArray());

      var west = polyBound.west;
      var south = polyBound.south;
      var north = polyBound.north;
      var east = polyBound.east;

      var towerLocArr = [];
      var cgi = 0; 

      //north iteration
      //first go west to east then one level up
      for (var stn=west; (google.maps.geometry.spherical.computeHeading(stn, north)>=-90 && google.maps.geometry.spherical.computeHeading(stn, north)<=90); stn = google.maps.geometry.spherical.computeOffset(stn, tDist, 0)){
        for (var wte=stn; google.maps.geometry.spherical.computeHeading(wte, east)>0; wte = google.maps.geometry.spherical.computeOffset(wte, tDist, 90)){
          towerLocArr = checkContainment(wte, polygonOnMap, towerLocArr, towerLocArr.length);
        }
      }
      
      for (var stn=google.maps.geometry.spherical.computeOffset(west, tDist, 180); (google.maps.geometry.spherical.computeHeading(stn, south)<=-90 || google.maps.geometry.spherical.computeHeading(stn, south)>=90); stn = google.maps.geometry.spherical.computeOffset(stn, tDist, 180)){
        for (var wte=stn; google.maps.geometry.spherical.computeHeading(wte, east)>0; wte = google.maps.geometry.spherical.computeOffset(wte, tDist, 90)){
          towerLocArr = checkContainment(wte, polygonOnMap, towerLocArr, towerLocArr.length);
        }
      }
      return towerLocArr;
    }  


    //check if inside polygon and add marker
    function checkContainment(wte, boundPolygon, towerLocArr, cgi) {
      if(google.maps.geometry.poly.containsLocation(wte, boundPolygon)) {
        var id = towerLocArr.length;
        towerLocArr.push({lat: wte.lat(), lng: wte.lng(), cgi: id});
      } 
      return towerLocArr;
    }    

    

    //if MSISDN range exists, then show in read mode
    $scope.editNumberSeries = function(ev) {
      $scope.msisdnRangeLoaded = false;
    }

    //else give provision to define. 
    $scope.submitNumberSeries = function(ev){
      validateInput();

      if ($scope.subErrors.length>0) {
        //if errors exist do nothing.
        return;
      } else {
        $scope.msisdnRangeArr[0] = {start: $scope.msisdnStart, end: $scope.msisdnEnd};

        $scope.msisdnRangeLoaded = true;

        //create list of MSISDNs
        createMsisdnList();
      }
    }  
    
    //validate number series input.
    function validateInput() {
      $scope.subErrors = [];
      //both strings are numbers
      var n = Number($scope.msisdnStart);
      if(!(String(n) === $scope.msisdnStart && n>999999999 && n<10000000000)) {
        $scope.subErrors.push("El comienzo de un rango de MSISDNs debe ser un número de 10 cifras.")
      }

      var m = Number($scope.msisdnEnd);
      if(!(String(m) === $scope.msisdnEnd && n>999999999 && n<10000000000)) {
        $scope.subErrors.push("El fin de un rango de MSISDNs debe ser un número de 10 cifras.")
      }


      //start number is less than end number
      if(n>m) {
        $scope.subErrors.push("El MSISDN de comienzo de un rango de MSISDNs debe ser menor que el MSISDN final.") 
      }
    }      


    //create a variable for msisdn list;
    $scope.msisdnListArr = [];
    function createMsisdnList() {
      var msisdnListUrl = "https://versapp.firebaseio.com/msisdnlist";
      var arr = {};
      for (var i = $scope.msisdnStart; i<=$scope.msisdnEnd; i++) {
          arr[i] = {};
          arr[i]["messages"]=[];
          arr[i]["messages"].push({message: "Bienvenido! Su móvil está conectado a la red.", time: commonMethods.getCurrentTime()});
          arr[i]["loc"] = [];
          arr[i]["loc"].push({cgi: "0", time: commonMethods.getCurrentTime()});
          arr[i]["profile"] = {oi: true, lang: "Default", validNum: true};
          //arr[i].push({message: "Welcome! Your mobile is latched on to the network.", time: getCurrentTime()});
      }
      
      var len = $scope.cellSitesArr.length;
      for (var j=0; j<len; j++){
        $scope.cellSitesArr[j].msisdns=[];  
        $scope.cellSitesArr[j].length = 0;
      }
      
      dataMethods.getAngularPromise(msisdnListUrl, $scope, "msisdnListArr").then(function(){
        $scope.msisdnListArr = arr;
      });


    }

    $scope.clearMap = function(ev) {
      polygonOnMap.setPath([]);
      polygonOnMap.setMap(null);
    }




    $scope.$watch('cellSitesLoaded', function(flag){
      if(flag){
        var len = $scope.cellSitesArr.length;
        var cellArr = [];
        //here we will add watches for each cell
        for (var i = 0; i < len; i++) {
          //eval("$scope.cdata"+i+"= 0");
          var url = "https://versapp.firebaseio.com/cellsites/"+i+"";
          var si = "cdata"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000)+commonMethods.getRandomInt(0,100)+commonMethods.getRandomInt(0,10);
          eval('dataMethods.getAngularPromise(url, $scope, si).then(function(){  })');
          eval("$scope.$watch('"+si+"', cb)");
        }
      }
    });
    
    function cb(nv) {
      $scope.waitFlag = false; 
      if(nv!=undefined && nv.cgi!=undefined && nv.length!=undefined && $scope.boundsLoaded){
        //console.log('Time: '+commonMethods.getCurrentTime()+' new value: ' + nv.length);
        if (markersOnMap.length==0) {
          markersOnMap = commonMethods.renderCells($scope.cellSitesArr, $scope.mapForScope);  
        }
        var subs = nv.msisdns;
        if(subs==undefined) {
          subs=[];
        }
        markersOnMap = commonMethods.updateCell(markersOnMap, nv.cgi, nv.length, subs, $scope.mapForScope);
      }
    }

  }).
  controller('vamController', function ($scope, dataMethods, commonMethods) {
    // write Ctrl here
    $scope.shocations = false;
    $scope.noMessages = false;
    $scope.noLocUpdates = false;
    $scope.msisdnProxy = "";
    $scope.msgCount=0;
    $scope.wArr = [];
    $scope.getMessage = function(ev) {
      if($scope.wArr.length>0) {
        $scope.wArr.pop()();
      }
      $scope.msisdnProxy = $scope.msisdn;
      var msgUrl = "https://versapp.firebaseio.com/msisdnlist/"+$scope.msisdn+"/messages";
      var vname = "ml"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      eval("$scope."+vname+" = [];");
      dataMethods.getAngularPromise(msgUrl, $scope, vname, []).then(function(){
        var e = false;
        eval("e = ($scope."+vname+"!=undefined && $scope."+vname+".length>0);");
        if(e) {
          $scope.showMessages = true;
          $scope.showLocations = false;
          $scope.noMessages = false;
        } else {
          $scope.noMessages = true;
        }
      });

      
      $scope.wArr.push($scope.$watchCollection(vname, function(nv, ov){
        eval("$scope.msgList = $scope."+vname);
        if(nv!=undefined && nv.length>0){
          $scope.msgCount++;
        }
      }));
    }

    $scope.wArrLoc = [];
    $scope.getLocation = function(ev) {
      if($scope.wArrLoc.length>0) {
        $scope.wArrLoc.pop()();
      }
      $scope.msisdnProxy = $scope.msisdn;
      var locUrl = "https://versapp.firebaseio.com/msisdnlist/"+$scope.msisdn+"/loc";
      var vname2 = "loc"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      eval("$scope."+vname2+" = [];");
      dataMethods.getAngularPromise(locUrl, $scope, vname2).then(function(){
        var f = false;
        eval("f = ($scope."+vname2+"!=undefined && $scope."+vname2+".length>0);");
        if(f) {
          $scope.showMessages = false;
          $scope.showLocations = true;
          $scope.noLocUpdates = false;  
        } else {
          $scope.noLocUpdates = true;  
        }
      });
      
      $scope.wArrLoc.push($scope.$watchCollection(vname2, function(){
        eval("$scope.locList = $scope."+vname2);
      }));
    }

  }).
  controller('simController', function ($scope, dataMethods, commonMethods, $timeout) {
    //text for simulate button
    $scope.simulationStateText = "Comienzo Simulación";
    $scope.simulationState = false;

    var msisdnReady = false;
    var cellSitesReady = false;
    //get msisdn list 
    var msisdnListUrl = "https://versapp.firebaseio.com/msisdnlist";
    $scope.msisdnListArr=[];
    dataMethods.getAngularPromise(msisdnListUrl, $scope, "msisdnListArr").then(function(){
      msisdnReady = true;
    });

    //get cell sites
    var cellsitesUrl = "https://versapp.firebaseio.com/cellsites";
    var subsUrl = "https://versapp.firebaseio.com/subscribers";
    $scope.subscribersArr = {};
    dataMethods.getAngularPromise(subsUrl, $scope, "subscribersArr")
    $scope.cellSitesArr=[];
    var noOfCells = 0;
    dataMethods.getAngularPromise(cellsitesUrl, $scope, "cellSitesArr").then(function(){
      cellSitesReady = true;
      noOfCells = $scope.cellSitesArr.length;
    });

    $scope.simulationInterval = 30;
    //iterate through msisdn and randomly assign a cell site.
    function startSimulation() {
      if ($scope.simulationState && msisdnReady && cellSitesReady){
        triggerLocationChange();
        $scope.simPro = $timeout(function() { startSimulation() }, $scope.simulationInterval*1000);
      } else {
        if($scope.simPro!=undefined) {
          $timeout.cancel($scope.simPro);
        }
      }

    }
    
    $scope.simulationLogText = "A la espera de comenzar la simulación…";

    function triggerLocationChange() {
      console.log('starting location change');
      //clear all cgis with previous MSISDN entries.
      //identify subscribers cells
      var subCellNumbers = {};
      for (var s in $scope.subscribersArr) {
        if (subCellNumbers[$scope.subscribersArr[s]["cgi"]]==null) {
          subCellNumbers[$scope.subscribersArr[s]["cgi"]] = [];
          subCellNumbers[$scope.subscribersArr[s]["cgi"]].push(s);
        } else {
          subCellNumbers[$scope.subscribersArr[s]["cgi"]].push(s);
        }
      }

      for (var j = 0; j< noOfCells; j++) {
        $scope.cellSitesArr[j]["msisdns"] = [];
        $scope.cellSitesArr[j]["length"] = 0;
        
        //this code added to handle real subscribers
        if(subCellNumbers[j]!=null){
          $scope.cellSitesArr[j]["msisdns"] = subCellNumbers[j];
          $scope.cellSitesArr[j]["length"]=$scope.cellSitesArr[j]["msisdns"].length;
        }
      }

      //randomly assign each msisdn to a cell id
      for (var i in $scope.msisdnListArr) {
        var c = commonMethods.getRandomInt(0, noOfCells-1);
        var ts = commonMethods.getCurrentTime();
        $scope.simulationLogText=$scope.simulationLogText.concat(ts+': El MSISDN: '+i+' está siendo asignada a la celda: ' + c+"\n");
        $scope.msisdnListArr[i]["loc"].push({cgi: ""+c, time: ts});
        $scope.cellSitesArr[c]["msisdns"].push(i);
        $scope.simulationLogText=$scope.simulationLogText.concat(ts+': La celda '+c+' ahora contiene estos MSISDNs: ' + $scope.cellSitesArr[c]["msisdns"]+"\n");
        $scope.cellSitesArr[c]["length"]=$scope.cellSitesArr[c]["msisdns"].length;
        $scope.cellSitesArr[c]["cgi"]=c;
      }
    }


    $scope.setSimulationState =function (ev) {
      if($scope.simulationState) {
        $scope.simulationState = false;
        $scope.simulationStateText = "Comienzo Simulación";
      } else {
        $scope.simulationState = true;
        $scope.simulationStateText = "Detener la Simulación";
      }
    }
    $scope.editMode = false;
    $scope.editSimSettings = function(ev) {
      $scope.editMode = true;
    }
    $scope.errors = "";
    $scope.saveSimSettings = function(ev) {
      if(parseInt($scope.simulationInterval)>=30) {
        $scope.errors = "";
        $scope.editMode = false;  
      } else {
        $scope.errors = "El Valor del Intervalo de Simulación debe ser por lo menos 30 segs.";
      }
      
    }

    $scope.$watch('simulationState', function() {
      if ($scope.simulationState && msisdnReady && cellSitesReady){
        startSimulation();
      } 
    });



  }).
  controller('pmController', function ($scope, dataMethods, commonMethods) {
    // write Ctrl here
    $scope.profileExists = false;
    $scope.modalMessage = "Profile saved successfully!";

    var url = "https://versapp.firebaseio.com/msisdnlist/"

    var cUrl = "https://versapp.firebaseio.com/cellsiteslite"
    dataMethods.getAngularPromise(cUrl, $scope, 'cellSitesLiteArr');

    var lUrl = "https://versapp.firebaseio.com/languageoptions/"
    dataMethods.getAngularPromise(lUrl, $scope, 'langOptions');

    $scope.mapCenter = null;
    var centerUrl = "https://versapp.firebaseio.com/mapcenter";
    dataMethods.getAngularPromise(centerUrl, $scope, 'mapCenter');

    

    $scope.changeSelect = function(val){
      $scope.lange=val;
    }
    $scope.changeCheckbox = function(val){
      $scope.oiValue=val;
    }
    var loadedLat, loadedLng; 
    $scope.getProfile = function(ev) {
      $scope.getClicked = true;
      $scope.profileExists = true;
      $scope.msisdnProxy = $scope.msisdn;
      var vname = "pf"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      eval("$scope."+vname+"={};");
      dataMethods.getAngularPromise(url+$scope.msisdn+"/profile", $scope, vname, {}).then(function(){
        var e = false;
        eval("e = $scope."+vname+"!=undefined && $scope."+vname+".validNum == true;");
        if(e) {
          $scope.profileExists = true;
          eval("$scope.oiValue = $scope."+vname+".oi;");
          eval("$scope.lange = $scope."+vname+".lang;");
          eval("$scope.lat = $scope."+vname+".lat || '';");
          eval("$scope.lng = $scope."+vname+".lng || '';");
          eval("$scope.interestCgi = $scope."+vname+".interestCgi;");
          loadedLat = $scope.lat;
          loadedLng = $scope.lng;
          $scope.latlng = "";
          if($scope.lat!="" && $scope.lng!="") {
            $scope.latlng = $scope.lat + ", " +  $scope.lng; 
          }

        } else {
          $scope.profileExists = false;
        }
      });
    }

    $scope.showModal = false;

    $scope.saveProfile = function(ev) {
      var minCgi;
      if($scope.lat!=undefined && $scope.lat!="" && $scope.lng!=undefined && $scope.lng!="" && ($scope.lat!=loadedLat || $scope.lng!=loadedLng || $scope.interestCgi==undefined || $scope.interestCgi=="")) {
        var csLoc = $scope.cellSitesLiteArr;
        var len = csLoc.length;
        
        var minLoc = {};
        var nextLoc = {};
        var minLocDis = 0;
        var nextLocDis = 0;
        for (var i = 0; i < len; i++) {
          if(i==0){
            minLoc = csLoc[i];
            minLocDis = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(csLoc[i].lat, csLoc[i].lng), new google.maps.LatLng($scope.lat, $scope.lng))
          }

          nextLoc  = csLoc[i];
          nextLocDis = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(csLoc[i].lat, csLoc[i].lng), new google.maps.LatLng($scope.lat, $scope.lng))

          if(nextLocDis<minLocDis) {
            minLoc = nextLoc;
            minLocDis = nextLocDis;
            minCgi = minLoc.cgi;
          }
        }

        if(minCgi!=undefined && minCgi!=$scope.interestCgi) {
          if($scope.interestCgi!=undefined){
            var eUrl = "https://versapp.firebaseio.com/cellsites/"+$scope.interestCgi+"/permanentmsisdns";
            var ename = "e"+commonMethods.getCurrentTime(true) + commonMethods.getRandomInt(0,1000);
            eval("$scope."+ename+"=[]");
            dataMethods.getAngularPromise(eUrl, $scope, ename,[]).then(function(){
              eval("$scope."+ename+".splice($scope."+ename+".indexOf($scope.interestCgi),1)");
            });
          }


          var csUrl = "https://versapp.firebaseio.com/cellsites/"+minCgi+"/permanentmsisdns";
          var vname2 = "p"+commonMethods.getCurrentTime(true) + commonMethods.getRandomInt(0,1000);
          eval("$scope."+vname2+"=[]");
          console.log('mingcgi->'+ minCgi);
          dataMethods.getAngularPromise(csUrl, $scope, vname2,[]).then(function(){
            eval("if($scope."+vname2+".indexOf($scope.msisdnProxy)==-1) { $scope."+vname2+".push($scope.msisdnProxy) }");
          });



        }
      }


      var vname = "pf"+commonMethods.getCurrentTime(true)+commonMethods.getRandomInt(0,1000);
      eval("$scope."+vname+"={};");
      dataMethods.getAngularPromise(url+$scope.msisdnProxy+"/profile", $scope, vname, {}).then(function(){
        var cStr=", interestCgi: $scope.interestCgi";
        if(minCgi!=undefined) {
          cStr = ", interestCgi: minCgi";
          $scope.interestCgi = minCgi;
        }
        var evalStr = "$scope."+vname+"={oi: $scope.oiValue, lang: $scope.lange, lat: $scope.lat, lng: $scope.lng, validNum: true"+cStr+"};";
        eval(evalStr);
        eval("console.log('val oi->'+$scope."+vname+".oi);");
        eval("console.log('val lang->'+$scope."+vname+".lange);");
        eval("console.log('val lat->'+$scope."+vname+".lat);");
        eval("console.log('val lng->'+$scope."+vname+".lng);");
        eval("console.log('val intcgi->'+$scope."+vname+".interestCgi);");
      });



      $scope.showModal = true;

    }

    $scope.saveInterestPoint = function(ev) {
      $scope.showMapModal = false;
      $scope.lat = $scope.latProxy;
      $scope.lng = $scope.lngProxy;
      $scope.latlng = $scope.lat + ", " +  $scope.lng;
    }

    $scope.lat = "";
    $scope.lng = "";
    $scope.boundsArr=[];

    var marker = new MarkerWithLabel({
      labelClass: "interest-label", // the CSS class for the label
      labelStyle: {opacity: 0.75}            
    });      

    var boundsPoly = new google.maps.Polygon({
      strokeColor: '#2E2EFE',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#2E2EFE',
      fillOpacity: 0.1,
    });


    $scope.showMap = function(ev) {

      //get the bounds (structure: root/bounds/ (0: lat, lng | 1: lat, lng)
      var boundsUrl = "https://versapp.firebaseio.com/bounds"
      if($scope.boundsArr.length==0) {
        dataMethods.getAngularPromise(boundsUrl, $scope, 'boundsArr', []).then(function(){
          if ($scope.boundsArr.length>0) {
            renderBounds(); 
          }
        });
      } else {
        renderBounds();
      }


      //set the map center
      if($scope.mapCenter.lat != undefined && $scope.mapCenter.lng !=undefined){
        commonMethods.changeMapCenter($scope.mapForScope, $scope.mapCenter.lat, $scope.mapCenter.lng);
      }
      
      $scope.showMapModal=true;


      function renderBounds() {

        //first render polygon by calling a service method
        boundsPoly.setMap(null);
        boundsPoly = commonMethods.renderPolygon($scope.boundsArr, $scope.mapForScope, boundsPoly);

        marker.setMap(null);
        if($scope.lat!=undefined && $scope.lat!="" && $scope.lng!=undefined && $scope.lng!="") {
          var ll = new google.maps.LatLng($scope.lat, $scope.lng);
          marker.setPosition(ll);
          marker.labelContent=$scope.lat+", "+$scope.lng;
          marker.setMap($scope.mapForScope);
        }

        google.maps.event.addListener(boundsPoly, 'click', function(e) {
          marker.setMap(null);
          marker.setPosition(e.latLng);
          marker.labelContent=e.latLng.lat()+", "+e.latLng.lng();
          marker.setMap($scope.mapForScope);
          $scope.latProxy = e.latLng.lat();
          $scope.lngProxy = e.latLng.lng();
        });
      }
    }
  }).
  
  //this is the controller to monitor incidents reported by mobile app.
  controller('imController', function ($scope, dataMethods, commonMethods, $timeout, $location) {
    //get all incidents which are active.
    var incUrl = "https://versapp.firebaseio.com/incidents"
    $scope.incidents={};
    
    //console.log('$scope.mapForScope-->'+$scope.mapForScope);
    
    var markersOnMap = {markers: {}, inc: {}, oms: {}, info: {}};
    $scope.mapForScope;
    $scope.mapCenter = null;
    $scope.incStatusValues=[];
    var svUrl = "https://versapp.firebaseio.com/incstatusvalues";
    dataMethods.getAngularPromise(svUrl, $scope, 'incStatusValues');

    dataMethods.getAngularPromise(incUrl, $scope, 'incidents').then(function(){
      var o = new OverlappingMarkerSpiderfier($scope.mapForScope, {keepSpiderfied: true});
      markersOnMap.oms = o;
      var info = new google.maps.InfoWindow();
      markersOnMap.info = info;
      //get the map coordinates
      var centerUrl = "https://versapp.firebaseio.com/mapcenter";
      dataMethods.getAngularPromise(centerUrl, $scope, 'mapCenter').then(function(){
        if($scope.mapCenter.lat != undefined && $scope.mapCenter.lng !=undefined){
          commonMethods.changeMapCenter($scope.mapForScope, $scope.mapCenter.lat, $scope.mapCenter.lng);
        }
      });



      console.log('incidents recieved...');
    }); 

    $scope.newIncCount = 0;
    //watch for new incidents and add marker if new incidents are available.
    $scope.$watch('incidents', function(nv, ov){
      
      $scope.newIncCount++;
      var newInc = {};

      for(var k in nv){
        if(ov[k]==undefined) {
          newInc[k] = nv[k];
        }
      }


      for(var l in ov){
        if(nv[l]==undefined) {
          newInc[l] = ov[l];
        }
      }
      
      for (var j in newInc){
        if(newInc[j].lat!=undefined && newInc[j].lng!=undefined){
          if($scope.newIncCount>2) {
            markersOnMap = renderIncidentMarker(newInc[j], markersOnMap, true);
          } else {
            markersOnMap = renderIncidentMarker(newInc[j], markersOnMap);  
          }
        }
        console.log('new incident reported...');
      }
    });

    $scope.changeStatus = function(id, incStatus){
      console.log("new status->"+ incStatus);
      $scope.incidents[id].status = incStatus;
      updateMarkerArr();
    };

    $scope.createAlert = function(e, id){
      console.log("creating alert");
      //check if lat lng is within bounds

      //create alert in backend
      var ts = commonMethods.getCurrentTime(true);
      var alertUrl = "https://versapp.firebaseio.com/alerts/"+ts;
      $scope.newAlert={};
      dataMethods.getAngularPromise(alertUrl, $scope, 'newAlert').then(function(){
        //get polygon based on lat lng
        var iPoint = new google.maps.LatLng($scope.incidents[id].lat, $scope.incidents[id].lng);
        var alertPoly = [];
        var iRange = $scope.incidents[id].range;
        if(iRange ==undefined) {
          iRange = 20000;
        } else {
          iRange = iRange*1000;
        }
        var firstPoint = google.maps.geometry.spherical.computeOffset(google.maps.geometry.spherical.computeOffset(iPoint, iRange, 0), iRange, 90); 
        var secondPoint = google.maps.geometry.spherical.computeOffset(firstPoint, iRange*2, 180);
        var thirdPoint = google.maps.geometry.spherical.computeOffset(secondPoint, iRange*2, 270);
        var fourthPoint = google.maps.geometry.spherical.computeOffset(thirdPoint, iRange*2, 0);
        
        //create alert components one by one.
        //first alert polygon.
        alertPoly.push({lat: firstPoint.lat(), lng: firstPoint.lng()});
        alertPoly.push({lat: secondPoint.lat(), lng: secondPoint.lng()});
        alertPoly.push({lat: thirdPoint.lat(), lng: thirdPoint.lng()});
        alertPoly.push({lat: fourthPoint.lat(), lng: fourthPoint.lng()});

        //next alert name
        var alertName = "For Inc Id: " + id; 

        //next sms content
        var sms = $scope.incidents[id].description;

        //next status list
        var statusList = [];
        statusList.push({title: commonMethods.getCurrentTime()+": Nueva alerta creada", desc: "Nueva alerta creada con nombre:"+ alertName});

        $scope.newAlert = {details: {latlng: alertPoly, smsContent: {Default: sms}, statusList: statusList}, name: alertName};
        $location.path('/am/'+ts+'/'+alertName);
      });






      
      //$scope.incidents[id].status = incStatus;
    };

    $scope.newHtml=null;
    $scope.changeHtml=0;
    function renderIncidentMarker(inc, markersArr, newFlag){
      var marker = new MarkerWithLabel({
        position: new google.maps.LatLng(inc.lat, inc.lng),
        map: $scope.mapForScope,
        labelContent: inc.category,
        draggable: true,
        raiseOnDrag: true,
        labelClass: "incLabels", // the CSS class for the label
        labelStyle: {opacity: 0.75},
        id: inc.incId            
      });

      if (newFlag) {
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png')        
      }


      markersArr.markers[inc.incId]=marker;
      markersArr.inc[inc.incId]=inc;

      

      markersArr.oms.addListener('click', function(marker, event) {
        $scope.infoIncId = marker.id
        $scope.infoIncSummary = markersArr.inc[marker.id].summary;
        $scope.infoIncDescription = markersArr.inc[marker.id].description;
        $scope.infoIncName = markersArr.inc[marker.id].name;
        $scope.infoIncPhone = markersArr.inc[marker.id].phone;
        $scope.infoIncEmail = markersArr.inc[marker.id].email;
        $scope.infoIncReportTime = markersArr.inc[marker.id].reportTime;
        $scope.infoImg1 = markersArr.inc[marker.id].img1;
        $scope.infoImg2 = markersArr.inc[marker.id].img2;
        $scope.infoImg3 = markersArr.inc[marker.id].img3;
        $scope.incStatus = markersArr.inc[marker.id].status;
        $scope.infoIncRange = markersArr.inc[marker.id].range;
        $scope.$apply();
        $scope.changeHtml++;

        markersArr.info.setContent($scope.newHtml);
        markersArr.info.open($scope.mapForScope, marker);
      });
      

      markersArr.oms.addListener('unspiderfy', function(markers) {
        markersArr.info.close();
      });



      markersArr.oms.addMarker(marker);

      return markersArr;
    }


    function updateMarkerArr(){
      var mar = markersOnMap.markers;

      if($scope.allVisible) {
        for (var i in mar) {
          mar[i].setMap($scope.mapForScope);
        }
        return;
      }

      mapSetting($scope.newVisible, "New");
      mapSetting($scope.verifyingVisible, "Verifying");
      mapSetting($scope.alertedVisible, "Alerted");
      mapSetting($scope.archivedVisible, "Archived");
    }

    function mapSetting(val, status){
      var inc = markersOnMap.inc;
      var m = markersOnMap.markers;

      if(!val) {
        for (var i in inc) {
          if(inc[i].status==status){
            m[i].setMap(null);
          }
        }
      }
      if(val) {
        for (var i in inc) {
          if(inc[i].status==status){
            m[i].setMap($scope.mapForScope);
          }
        }
      }
    }

    function checkForNoFilters(){
      if($scope.allVisible!=true && $scope.newVisible!=true && $scope.verifyingVisible!=true && $scope.alertedVisible!=true && $scope.archivedVisible!=true){
        $scope.allVisible=true;
      } 
    }

    //watches for filters
    $scope.$watch('allVisible', function(nv, ov){
      if(nv!=true){
        checkForNoFilters();
      } 
      updateMarkerArr();
    });
    
    //watches for filters
    $scope.$watch('newVisible', function(nv, ov){
      if(nv!=true){
        checkForNoFilters();
      } 
      updateMarkerArr();
    });
    
    //watches for filters
    $scope.$watch('verifyingVisible', function(nv, ov){
      if(nv!=true){
        checkForNoFilters();
      } 
      updateMarkerArr();
    });
    
    //watches for filters
    $scope.$watch('alertedVisible', function(nv, ov){
      if(nv!=true){
        checkForNoFilters();
      } 
      updateMarkerArr();
    });
    
    //watches for filters
    $scope.$watch('archivedVisible', function(nv, ov){
      if(nv!=true){
        checkForNoFilters();
      } 
      updateMarkerArr();
    });
    
  }).


  controller('asController', function ($scope, dataMethods, commonMethods) {
    
    var subUrl = "https://versapp.firebaseio.com/subscribers/";
    var cellsUrl = "https://versapp.firebaseio.com/cellsites/";
    $scope.subscibersArr = {};
    $scope.cellsites = {};
    dataMethods.getAngularPromise(subUrl, $scope, "subscibersArr");
    dataMethods.getAngularPromise(cellsUrl, $scope, "cellsites");
    
    $scope.addSubscriber = function() {
      if(checkNum() && checkCgi()) {
        $scope.subscibersArr[$scope.subNum]= {num: $scope.subNum, cgi: $scope.cgi};
        if($scope.cellsites[""+$scope.cgi]["msisdns"]==null){
          $scope.cellsites[""+$scope.cgi]["msisdns"]=[];
          $scope.cellsites[""+$scope.cgi]["msisdns"].push($scope.subNum);
        } else {
          $scope.cellsites[""+$scope.cgi]["msisdns"].push($scope.subNum);  
        }
        $scope.cellsites[""+$scope.cgi]["length"]=$scope.cellsites[""+$scope.cgi]["msisdns"].length;
      }
    }

    $scope.deleteSubscriber = function(num, cgi) {
      delete $scope.subscibersArr[num];
      var arr = $scope.cellsites[cgi]["msisdns"];
      var idx = arr.indexOf(num);
      if (idx>-1) {
        arr.splice(idx,1);
      }
      $scope.cellsites[cgi]["msisdns"] = arr;
      $scope.cellsites[cgi]["length"] = $scope.cellsites[cgi]["msisdns"].length;
    }

    function checkNum() {
      var numRx = new RegExp("[0-9]{8,16}");
      if(numRx.test($scope.subNum)){
        $scope.numError = "";
        return true;
      } else {
        $scope.numError = "Número de teléfono no válido";
        return false;
      }
    }

    function checkCgi() {
      var max = 0;
      for (var i in $scope.cellsites) {
        var pi = parseInt(i);
        if (pi>max){
          max = pi;
        }
      }
      if ($scope.cgi > 0 && $scope.cgi <= max){
        $scope.cgiError = "";
        return true;
      } else {
        $scope.cgiError = "ID de celda no válido";
        return false;
      }
    }

  }).

  controller('drController', function ($scope, dataMethods, commonMethods) {
    $scope.mapCenter = null;
    $scope.selectedRows = [];
    var centerUrl = "https://versapp.firebaseio.com/mapcenter";
    dataMethods.getAngularPromise(centerUrl, $scope, 'mapCenter').then(function(){
      if($scope.mapCenter.lat != undefined && $scope.mapCenter.lng !=undefined){
        commonMethods.changeMapCenter($scope.mapForScope, $scope.mapCenter.lat, $scope.mapCenter.lng);
      }
    });

    $scope.deleteRadio = function(key) {
      if($scope.selectedRows[0]==key){
        $scope.selectedRows = [];
        $scope.radioDetailsShown = false;
      }
      delete $scope.radioArr[key];
    }
    
    $scope.selectRadio = function(id, name) {
      $scope.selectedRows = [];
      $scope.selectedRows.push(id);
      $scope.selectedRows.push(name);

      displayRadioDetails();
    }

    $scope.addStation = function() {
      var ts = commonMethods.getCurrentTime(true);
      //UI
      $scope.selectRadio(ts, $scope.rsName);
      $scope.radioArr[ts] = {name: $scope.rsName};
      $scope.rsName = "";
    }

    //save radio station details.
    $scope.saveStationDetails = function() {
      var details = {lat: $scope.lat, lng: $scope.lng, coords: $scope.coords, phoneNumber: $scope.phoneNumber};

      $scope.radioArr[$scope.selectedRows[0]].details = details;

      //display message stating station has been saved.
      $scope.notifyHide = false;
    }

    //list of radio stations
    $scope.radioArr = {};
    var radioUrl = "https://versapp.firebaseio.com/radio";
    dataMethods.getAngularPromise(radioUrl, $scope, "radioArr");

    var radioIcon = "images/radio.png"
    
    $scope.$watch('mapForScope', function(nv){
      map = nv;
      if($scope.mapForScope!=undefined){
        google.maps.event.addListener($scope.mapForScope, 'click', function(e) {
          if(marker!=null) {
            marker.setMap(null);
          }

          marker = new google.maps.Marker({
            position: e.latLng,
            map: map,
            title: $scope.selectedRows[1],
            icon: radioIcon
          });

          $scope.lat = Math.round(e.latLng.lat()*1000)/1000;
          $scope.lng = Math.round(e.latLng.lng()*1000)/1000
          $scope.coords = $scope.lat + ", " + $scope.lng;

          $scope.$apply();
        });
      }
    });


    var map, marker, circle;
    function displayRadioDetails() {
      //clear the existing values
      $scope.lat = null;
      $scope.lng = null;
      $scope.coords = "";
      $scope.phoneNumber = "";

      //hide any notifications.
      $scope.notifyHide = true;

      //unhide the div for details
      $scope.radioDetailsShown = true;
      //put marker on map based on lat lng
      if(marker!=null) {
        marker.setMap(null);
      }

      if($scope.radioArr[$scope.selectedRows[0]]!=null) {
        $scope.lat = $scope.radioArr[$scope.selectedRows[0]].details.lat;
        $scope.lng = $scope.radioArr[$scope.selectedRows[0]].details.lng;
        $scope.phoneNumber = $scope.radioArr[$scope.selectedRows[0]].details.phoneNumber;
        $scope.coords = $scope.radioArr[$scope.selectedRows[0]].details.coords;
      }

      if($scope.lat!=null && $scope.lng!=null) {
        marker = new google.maps.Marker({
          position: new google.maps.LatLng($scope.lat,$scope.lng),
          map: map,
          title: $scope.selectedRows[1],
          icon: radioIcon
        });
      }
    }
    
  }).
  controller('dgController', function ($scope, dataMethods, commonMethods) {
    //get the groups from firebase
    $scope.groupArr = {};
    var groupUrl = "https://versapp.firebaseio.com/group";
    dataMethods.getAngularPromise(groupUrl, $scope, "groupArr");

    //add new group function
    $scope.addGroup = function() {
      var ts = commonMethods.getCurrentTime(true);
      //UI
      $scope.selectGroup(ts, $scope.groupName);
      $scope.groupArr[ts] = {name: $scope.groupName};
      $scope.groupName = "";
    }

    $scope.deleteGroup = function(key) {
      if($scope.selectedRows[0]==key){
        $scope.selectedRows = [];
        $scope.showGroupDetails = false;
      }
      delete $scope.groupArr[key];
    }


    $scope.deleteGroupItem = function(idx) {
      $scope.groupItemsArr.splice(idx, 1);
      $scope.groupArr[$scope.selectedRows[0]].members = $scope.groupItemsArr; 
    }


    //select group function
    $scope.selectGroup = function(id, name) {
      $scope.selectedRows = [];
      $scope.selectedRows.push(id);
      $scope.selectedRows.push(name);

      displayGroupDetails();
    }

    function displayGroupDetails() {
      //unhide the div corresponding to details
      $scope.showGroupDetails = true;

      //initialize group items arr.
      if($scope.groupArr[$scope.selectedRows[0]]!=null){
        $scope.groupItemsArr = $scope.groupArr[$scope.selectedRows[0]].members;
      }
      if($scope.groupItemsArr == null) {
        $scope.groupItemsArr = [];
      }
    }


    //function to add group members
    $scope.addGroupItem = function() {
      if($scope.groupItemsArr==null || $scope.groupItemsArr.length==0) {
        $scope.groupItemsArr=[];
      }
      $scope.groupItemsArr.push({name: $scope.groupItem.name, contact: $scope.groupItem.contact});

      //persist to firebase
      $scope.groupArr[$scope.selectedRows[0]].members = $scope.groupItemsArr;
      $scope.groupItem.name = "";      
      $scope.groupItem.contact = "";      
    }

  }).
  controller('sgaController', function ($scope, dataMethods, commonMethods, $http) {
    //get the groups from firebase
    $scope.groupArr = {};
    var groupUrl = "https://versapp.firebaseio.com/group";
    dataMethods.getAngularPromise(groupUrl, $scope, "groupArr");

    var smsList = {};
    var voiceList = {};
    $scope.smsCount = 0;
    $scope.voiceCount = 0;
    $scope.alert = "";
    $scope.sms = {};
    $scope.voice = {};


    $scope.log = "";
    var groupLogUrl = "https://versapp.firebaseio.com/grouplog"
    $scope.groupLog = {};
    dataMethods.getAngularPromise(groupLogUrl, $scope, "groupLog").then(function() {
      createLog();
    });

    function createLog() {
      $scope.log = "";
      for (var n in $scope.groupLog) {
        $scope.log = $scope.log + n + ": " + $scope.groupLog[n] + "\n";
      }
    }


    
    var selectedGroups = [];
    $scope.createSmsAlertList = function(sms, key) {
      if(sms) {
        //add members to sms alert list
        smsList[key] = $scope.groupArr[key].members;
        if(selectedGroups.indexOf($scope.groupArr[key].name)==-1){
          selectedGroups.push($scope.groupArr[key].name);  
        }
        
        if(smsList[key]!=null) {
          $scope.smsCount = $scope.smsCount + smsList[key].length;  
        }
      } else {
        //remove members to sms alert list
        if(selectedGroups.indexOf($scope.groupArr[key].name)!=-1){
          selectedGroups.splice(selectedGroups.indexOf($scope.groupArr[key].name), 1);  
        }

        if(smsList[key]!=null) {
          $scope.smsCount = $scope.smsCount - smsList[key].length;  
        }
        smsList[key] = null;
      }
    }

    $scope.createVoiceAlertList = function(voice, key) {
      if(voice) {
        //add members to sms alert list
        voiceList[key] = $scope.groupArr[key].members;
        if(selectedGroups.indexOf($scope.groupArr[key].name)==-1){
          selectedGroups.push($scope.groupArr[key].name);  
        }


        if(voiceList[key]!=null) {
          $scope.voiceCount = $scope.voiceCount + voiceList[key].length;  
        }
      } else {
        //remove members to sms alert list
        if(selectedGroups.indexOf($scope.groupArr[key].name)!=-1){
          selectedGroups.splice(selectedGroups.indexOf($scope.groupArr[key].name), 1);  
        }


        if(voiceList[key]!=null) {
          $scope.voiceCount = $scope.voiceCount - voiceList[key].length;  
        }
        voiceList[key] = null;
      }
    }

    $scope.sendGroupAlert = function() {
      var data = {smsList: smsList, voiceList: voiceList, message: $scope.alert};

      var groups = "";
      for (var i =0; i< selectedGroups.length; i++) {
        if (groups=="") {
          groups = groups + selectedGroups[i];
        } else {
          groups = groups + ", " + selectedGroups[i];
        }
      }

      //post request to send sms and voice to sms list and voice list
      $http.post('/sendgroupalert', data).success(function(){
        $scope.groupLog[commonMethods.getCurrentTime()] = "Se envió una alerta grupal a los siguientes grupos: " + groups;
        createLog();
        console.log('success');
      }).error(function(){
        console.log('error');
      })
      //update status log

    }

  }).
  controller('sraController', function ($scope, dataMethods, commonMethods, $http) {
    $scope.mapCenter = null;
    var centerUrl = "https://versapp.firebaseio.com/mapcenter";
    dataMethods.getAngularPromise(centerUrl, $scope, 'mapCenter').then(function(){
      if($scope.mapCenter.lat != undefined && $scope.mapCenter.lng !=undefined){
        commonMethods.changeMapCenter($scope.mapForScope, $scope.mapCenter.lat, $scope.mapCenter.lng);
      }
    });

    $scope.alert = "";
    $scope.log = "";
    var radioLogUrl = "https://versapp.firebaseio.com/radiolog"
    $scope.radiolog = {};
    dataMethods.getAngularPromise(radioLogUrl, $scope, "radiolog").then(function() {
      createLog();
    });

    function createLog() {
      $scope.log = "";
      for (var n in $scope.radiolog) {
        $scope.log = $scope.log + n + ": " + $scope.radiolog[n] + "\n";
      }
    }
    
    var polygonCoords = [];
    var polygon = new google.maps.Polygon();
    var circleCoords = {};
    var selectCircle = new google.maps.Circle();


    //to enable / disable the send button.
    $scope.numOfCircles = 0;

    var radioIcon = "images/radio.png"
    //initialize map with radio stations. 
    $scope.radioArr = {};
    var selectedStations = [];
    var radioUrl = "https://versapp.firebaseio.com/radio";


    $scope.clearArea = function() {
      $scope.numOfCircles = 0;
      polygonCoords = [];
      polygon.setMap(null);
      for (var j in circleCoords) {
        circleCoords[j].setMap(null);  
      }
      circleCoords = {};
    }

    $scope.sendRadioAlert = function() {
      //form the number string
      var num = "";
      var stations = "";
      for (var m in circleCoords) {
        if (circleCoords!=null) {
          if(num=="") {
            num = num + $scope.radioArr[m].details.phoneNumber;
            stations = stations + $scope.radioArr[m].name;
          } else {
            num = num + ", " + $scope.radioArr[m].details.phoneNumber;
            stations = stations + ", " + $scope.radioArr[m].name;
          }
        }
      }

      var data = {message: $scope.alert, numbers: num};
      $http.post('/sendradioalert', data).success(function(d){
        $scope.radiolog[commonMethods.getCurrentTime()] = "Se envió un mensaje de alerta a las siguientes emisoras de radio: " + stations;
        createLog();
      }).error(function(d){
        console.log('error');
      })
    }


    $scope.$watch('mapForScope', function(nv) {
      if(nv==null) {
        return;
      }
      dataMethods.getAngularPromise(radioUrl, $scope, "radioArr").then(function() {
        //render the map with radio stations
        for (var i in $scope.radioArr) {
          var details = $scope.radioArr[i].details;
          if(details!=null && details.lat!=null && details.lng!=null){
            var tower = new google.maps.LatLng(details.lat, details.lng);
            var marker = new google.maps.Marker({
                position: tower,
                map: nv,
                title: $scope.radioArr[i].name, 
                icon: radioIcon
            });
          } 
        }
      });

      google.maps.event.addListener($scope.mapForScope, 'click', function(e) {
        var ll = e.latLng;
        polygonCoords.push(ll);
        polygon.setMap(null);
        polygon = new google.maps.Polygon({
          paths: polygonCoords,
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map: $scope.mapForScope
        });

        //check if any radio station is inside.
        for (var i in $scope.radioArr) {
          var details = $scope.radioArr[i].details;
          if(details!=null && details.lat!=null && details.lng!=null){
            var tc = new google.maps.LatLng(details.lat, details.lng); 
            if(google.maps.geometry.poly.containsLocation(tc, polygon)){
              //this tower is inside - make special mark
              selectCircle = new google.maps.Circle({
                center: tc,
                map: $scope.mapForScope,
                radius: 20000,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: commonMethods.getRandomColor(),
                fillOpacity: 0.35,
              });
              $scope.circleSelected = true;
              $scope.numOfCircles++;
              $scope.$apply();
              circleCoords[i] = selectCircle;

            } else {
              if(circleCoords[i]!=null) {
                circleCoords[i].setMap(null);
                $scope.numOfCircles--;
                $scope.$apply();
                circleCoords[i]=null;
              }
            }
          }
        }
      });
    });
  }).
  controller('dtController', function ($scope, dataMethods, commonMethods) {
    //get the tvs from firebase
    $scope.tvArr = {};
    var tvUrl = "https://versapp.firebaseio.com/tv";
    dataMethods.getAngularPromise(tvUrl, $scope, "tvArr");

    //add new group function
    $scope.addTv = function() {
      var ts = commonMethods.getCurrentTime(true);
      $scope.tvArr[ts] = {name: $scope.tvName, source: $scope.source};
    }    

    $scope.deleteTv = function(key) {
      delete $scope.tvArr[key];
    }


  }).
  controller('staController', function ($scope, dataMethods, commonMethods) {
    $scope.selected = {};
    $scope.numOfTvs = 0;

    //get the tvs from firebase
    $scope.tvArr = {};
    var tvUrl = "https://versapp.firebaseio.com/tv";
    dataMethods.getAngularPromise(tvUrl, $scope, "tvArr");



    $scope.log = "";
    var tvLogUrl = "https://versapp.firebaseio.com/tvlog"
    $scope.tvlog = {};
    dataMethods.getAngularPromise(tvLogUrl, $scope, "tvlog").then(function() {
      createLog();
    });

    function createLog() {
      $scope.log = "";
      for (var n in $scope.tvlog) {
        $scope.log = $scope.log + n + ": " + $scope.tvlog[n] + "\n";
      }
    }



    var tvList = {};
    $scope.createTvAlertList = function(tv, key) {
      if(tv) {
        tvList[key] = $scope.tvArr[key].name;
        $scope.numOfTvs++;
      } else {
        tvList[key] = null;
        $scope.numOfTvs--;
      }
    }

    $scope.sendTVAlert = function() {
      var chosenTvs = ""
      for (var i in tvList) {
        if(tvList[i]!=null){
          $scope.tvArr[i].message = $scope.alert;
          if(chosenTvs=="") {
            chosenTvs = chosenTvs + $scope.tvArr[i].name;
          } else {
            chosenTvs = chosenTvs + ", " + $scope.tvArr[i].name;
          }
        }
      }

      if(chosenTvs!=""){
        $scope.tvlog[commonMethods.getCurrentTime()] = "Se envió un mensaje de alerta a los siguientes operadores de TV: " + chosenTvs;
        createLog();
      }

    }

  }).
  controller('tvvController', function ($scope, dataMethods, commonMethods, $routeParams, $timeout) {
    var tvId = $routeParams.id;

    $scope.showMessage = false;

    //get the tvs from firebase
    $scope.tv = {};
    var tvUrl = "https://versapp.firebaseio.com/tv/"+tvId;
    dataMethods.getAngularPromise(tvUrl, $scope, "tv").then(function() {
      $scope.source = $scope.tv.source;  
    });

    var msgUrl = "https://versapp.firebaseio.com/tv/"+tvId+"/message";
    $scope.message = "";
    dataMethods.getAngularPromise(msgUrl, $scope, "message")

    $scope.$watch("message", function(nv) {
      if(nv!=null && nv!="") {
        $scope.showMessage = true;
        $timeout(function() { hideMessage(); }, 30000);
      }
    });

    function hideMessage() {
      $scope.showMessage = false;
      $scope.$apply();
      $scope.message = "";
    }
    
  }).
  controller('tvlController', function ($scope, dataMethods, commonMethods) {
    $scope.tvArr = {};
    var tvUrl = "https://versapp.firebaseio.com/tv";
    dataMethods.getAngularPromise(tvUrl, $scope, "tvArr");
  });