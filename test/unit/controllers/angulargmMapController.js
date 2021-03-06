describe('angulargmMapController', function() {
  var scope, elm;
  var mapCtrl, mapCntr;

  beforeEach(function() {
    module('AngularGM');
  });


  beforeEach(inject(function($rootScope, $controller, angulargmContainer) {
    // set up scope
    scope = $rootScope.$new();
    scope.gmMapOptions = function() {
      return {
        center: new google.maps.LatLng(2, 3),
        zoom: 1,
        mapTypeId: google.maps.MapTypeId.TERRAIN
      };
    };
    scope.gmMapId = function() {
      return 'test';
    };

    // set up element
    elm = angular.element('<div gm-map-id="mapId" gm-center="center" gm-zoom="zoom" gm-bounds="bounds" gm-map-options="mapOptions">' +
                                '<div id="test"></div>' +
                              '</div');

    mapCtrl = $controller('angulargmMapController', {$scope: scope, $element: elm});
    mapCntr = angulargmContainer;
  }));


  afterEach(inject(function(angulargmContainer) {
    if (scope && scope.$destroy) {
      scope.$destroy();
    }
    angulargmContainer.removeMap('test');
  }));


  it('constructs the map using the provided map options', function() {
    expect(mapCtrl.dragging).toBeFalsy();
    expect(mapCtrl.center).toEqual(new google.maps.LatLng(2, 3));
    expect(mapCtrl.zoom).toEqual(1);
    var map = mapCntr.getMap(scope.gmMapId());
    expect(mapCtrl.bounds).toEqual(map.getBounds());
    expect(mapCtrl.mapTypeId).toEqual(google.maps.MapTypeId.TERRAIN);
  });


  it('constructs the map using defaults when there are no options', inject(function($rootScope, $controller, angulargmDefaults) {
    scope = $rootScope.$new();
    scope.gmMapOptions = function() { };
    scope.gmMapId = function() {
      return 'test2';
    };

    var elm2 = angular.element('<div gm-map-id="mapId" gm-center="center" gm-zoom="zoom" gm-bounds="bounds">' +
                                '<div id="test2"></div>' +
                              '</div');
    mapCtrl = $controller('angulargmMapController', {$scope: scope, $element: elm2});

    expect(mapCtrl.center).toEqual(angulargmDefaults.mapOptions.center);
    expect(mapCtrl.zoom).toEqual(angulargmDefaults.mapOptions.zoom);
  }));


  it('resets map on controller re-instantiation', inject(function($rootScope, $controller) {
    var map = mapCntr.getMap(scope.gmMapId());
    var scope2 = $rootScope.$new();
    var gmMapOptions = scope.gmMapOptions();
    var gmMapId = scope.gmMapId();
    scope2.gmMapOptions = function() { return gmMapOptions };
    scope2.gmMapId = function() { return gmMapId };

    // move map
    var newCenter = new google.maps.LatLng(gmMapOptions.center.lat() + 5,
      gmMapOptions.center.lng() + 5);
    map.setCenter(newCenter);
    map.setZoom(gmMapOptions.zoom + 2);
    map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
    expect(mapCtrl.center).toEqual(newCenter); // sanity check--we actually changed something

    // destroy scope
    scope.$destroy();

    // re-instantiate controller
    mapCtrl = $controller('angulargmMapController', {$scope: scope2, $element: elm});

    expect(mapCtrl.center).toEqual(gmMapOptions.center);
    expect(mapCtrl.zoom).toEqual(gmMapOptions.zoom);
    expect(map.getMapTypeId()).toEqual(gmMapOptions.mapTypeId);
  }));


  it('removes markers on scope destroy', function() {
    var mapId = scope.gmMapId();
    scope.$destroy();
    numMarkers = 0;
    mapCtrl.forEachMarker(function(marker) {
      numMarkers++;
    });
    expect(numMarkers).toEqual(0);
  });

  it('removes circles on scope destroy', function() {
    var mapId = scope.gmMapId();
    scope.$destroy();
    numCircles = 0;
    mapCtrl.forEachCircle(function(circle) {
      numCircles++;
    });
    expect(numCircles).toEqual(0);
  });


  it('adds listeners to the map', function() {
    var called = false;
    mapCtrl.addMapListener('center_changed', function() {
      called = true;
    });
    google.maps.event.trigger(mapCntr.getMap(scope.gmMapId()), 'center_changed');

    expect(called).toBeTruthy();
  });


  it('adds one time listeners to the map', function() {
    var callCount = 0;
    mapCtrl.addMapListenerOnce('center_changed', function() {
      callCount++;
    });
    // Does not get added to the listeners hash
    expect(mapCtrl._listeners.center_changed).not.toBeDefined();

    google.maps.event.trigger(mapCntr.getMap(scope.gmMapId()), 'center_changed');
    google.maps.event.trigger(mapCntr.getMap(scope.gmMapId()), 'center_changed');

    expect(callCount).toEqual(1);
  });

  it('keeps map listeners in a hash', function() {
    var listeners = mapCtrl._listeners;
    expect(listeners.click).toBeUndefined();
    expect(listeners.center_changed).toBeUndefined();

    mapCtrl.addMapListener('center_changed', function() {});
    mapCtrl.addMapListener('click', function() {});
    expect(listeners.click).not.toBeUndefined();
    expect(listeners.center_changed).not.toBeUndefined();
  });

  it('keeps multiple listeners on an event', function() {
    var aFunc = jasmine.createSpy('firstFunc');
    var anotherFunc = jasmine.createSpy('secondFunc');

    mapCtrl.addMapListener('click', aFunc);
    mapCtrl.addMapListener('click', anotherFunc);

    expect(angular.isArray(mapCtrl._listeners.click)).toBeTruthy();
    expect(mapCtrl._listeners.click.length).toEqual(2);

    mapCtrl.mapTrigger('click');
    expect(aFunc).toHaveBeenCalled();
    expect(anotherFunc).toHaveBeenCalled();
  });

  it('adds generic listeners', function() {
    var called = false;
    var object = {};
    mapCtrl.addListener(object, 'event', function() {
      called = true;
    });
    google.maps.event.trigger(object, 'event');

    expect(called).toBeTruthy();
  });


  it('adds generic one time listeners', function() {
    var callCount = 0;
    var object = {};
    mapCtrl.addListenerOnce(object, 'event', function() {
      callCount++;
    });
    google.maps.event.trigger(object, 'event');
    google.maps.event.trigger(object, 'event');

    expect(callCount).toEqual(1);
  });


  it('triggers map events', function() {
    var callCount = 0;
    mapCtrl.addMapListener('event', function() {
      callCount++;
    });
    mapCtrl.mapTrigger('event');

    expect(callCount).toEqual(1);
  });


  it('triggers generic events', function() {
    var callCount = 0;
    var object = {};
    mapCtrl.addListener(object, 'event', function() {
      callCount++;
    });
    mapCtrl.trigger(object, 'event');

    expect(callCount).toEqual(1);
  });

  describe('marker functions', function() {
    var position, positionSame, positionVeryClose, position2;
    var markerOptions, markerOptionsSame, markerOptionsVeryClose, markerOptions2;

    beforeEach(function() {
      position = new google.maps.LatLng(1, 2);
      positionSame = new google.maps.LatLng(1.0004, 2.0004);
      positionVeryClose = new google.maps.LatLng(1.0005, 2.0005);
      position2 = new google.maps.LatLng(3, 4);

      scope = 'scope';

      markerOptions = {
        position: position
      };
      markerOptionsSame = {
        position: positionSame
      };
      markerOptionsVeryClose = {
        position: positionVeryClose
      };
      markerOptions2 = {
        position: position2
      };

      mapCtrl.addMarker(scope, markerOptions);
    });

    describe('addMarker', function() {

      it('adds new markers to the map', function() {
        added = mapCtrl.addMarker(scope, markerOptions2);
        expect(added).toBeTruthy();
      });


      it('does not add markers already on the map', function() {
        var added = mapCtrl.addMarker(scope, markerOptions);
        expect(added).toBeFalsy();
      });


      it('adds markers which differ by at least 0.0005', function() {
        var added = mapCtrl.addMarker(scope, markerOptionsVeryClose);
        expect(added).toBeTruthy();
      });


      it('does not add markers which differ less than 0.0005', function() {
        var added = mapCtrl.addMarker(scope, markerOptionsSame);
        expect(added).toBeFalsy();
      });

    });


    describe('getMarker', function() {

      it('retrieves markers that are on the map', function() {
        var marker = mapCtrl.getMarker(scope, position.lat(), position.lng());
        expect(marker.getPosition()).toEqual(markerOptions.position);
      });


      it('returns null for marker not on the map', function() {
        var marker = mapCtrl.getMarker(scope, position2.lat(), position2.lng());
        expect(marker).toBeNull();
      });


      it('retrives markers given a lat and lng that are within 0.0005', function() {
        var marker = mapCtrl.getMarker(scope, positionSame.lat(), positionSame.lng());
        expect(marker.getPosition()).toEqual(markerOptions.position);
      });


      it('does not retrieve marker given lat and lng more than 0.0005 away', function() {
        var marker = mapCtrl.getMarker(scope, positionVeryClose.lat(), positionVeryClose.lng());
        expect(marker).toBeNull();
      });

    });


    describe('removeMarker', function() {

      it('removes markers from the map', function() {
        var removed = mapCtrl.removeMarker(scope, position.lat(), position.lng());
        expect(removed).toBeTruthy();
        expect(mapCtrl.getMarker(scope, position.lat(), position.lng())).toBeNull();
      });


      it('does not remove markers not on the map', function() {
        var removed = mapCtrl.removeMarker(scope, position2.lat(), position2.lng());
        expect(removed).toBeFalsy();
        expect(mapCtrl.getMarker(scope, position.lat(), position.lng())).not.toBeNull();
      });

    });


    it('can apply a function to each marker', function() {
      markers = [];
      mapCtrl.forEachMarker(function(marker) {
        markers.push(marker);
      });
      expect(markers.length).toEqual(1);
      expect(markers[0].getPosition()).toEqual(markerOptions.position);
    });


    it('does not apply a function to removed markers', function() {
      mapCtrl.removeMarker(scope, 1, 2);
      var called = false;
      mapCtrl.forEachMarker(function(marker) {
        called = true;
      });
      expect(called).toBeFalsy();
    });

  });

  describe('circle functions', function() {
    var center, centerSame, centerVeryClose, center2;
    var circleOptions, circleOptionsSame, circleOptionsVeryClose, circleOptions2;

    beforeEach(function() {
      center = new google.maps.LatLng(1, 2);
      centerSame = new google.maps.LatLng(1.0004, 2.0004);
      centerVeryClose = new google.maps.LatLng(1.0005, 2.0005);
      center2 = new google.maps.LatLng(3, 4);

      scope = 'scope';

      circleOptions = {
        center: center
      };
      circleOptionsSame = {
        center: centerSame
      };
      circleOptionsVeryClose = {
        center: centerVeryClose
      };
      circleOptions2 = {
        center: center2
      };

      mapCtrl.addCircle(scope, circleOptions);
    });

    describe('addCircle', function() {

      it('adds new circles to the map', function() {
        added = mapCtrl.addCircle(scope, circleOptions2);
        expect(added).toBeTruthy();
      });


      it('does not add circles already on the map', function() {
        var added = mapCtrl.addCircle(scope, circleOptions);
        expect(added).toBeFalsy();
      });


      it('adds circles which differ by at least 0.0005', function() {
        var added = mapCtrl.addCircle(scope, circleOptionsVeryClose);
        expect(added).toBeTruthy();
      });


      it('does not add circles which differ less than 0.0005', function() {
        var added = mapCtrl.addCircle(scope, circleOptionsSame);
        expect(added).toBeFalsy();
      });

    });


    describe('getCircle', function() {

      it('retrieves circles that are on the map', function() {
        var circle = mapCtrl.getCircle(scope, center.lat(), center.lng());
        expect(circle.getCenter()).toEqual(circleOptions.center);
      });


      it('returns null for circle not on the map', function() {
        var circle = mapCtrl.getCircle(scope, center2.lat(), center2.lng());
        expect(circle).toBeNull();
      });


      it('retrives circles given a lat and lng that are within 0.0005', function() {
        var circle = mapCtrl.getCircle(scope, centerSame.lat(), centerSame.lng());
        expect(circle.getCenter()).toEqual(circleOptions.center);
      });


      it('does not retrieve circle given lat and lng more than 0.0005 away', function() {
        var circle = mapCtrl.getCircle(scope, centerVeryClose.lat(), centerVeryClose.lng());
        expect(circle).toBeNull();
      });

    });


    describe('removeCircle', function() {

      it('removes circles from the map', function() {
        var removed = mapCtrl.removeCircle(scope, center.lat(), center.lng());
        expect(removed).toBeTruthy();
        expect(mapCtrl.getCircle(scope, center.lat(), center.lng())).toBeNull();
      });


      it('does not remove circles not on the map', function() {
        var removed = mapCtrl.removeCircle(scope, center2.lat(), center2.lng());
        expect(removed).toBeFalsy();
        expect(mapCtrl.getCircle(scope, center.lat(), center.lng())).not.toBeNull();
      });

    });


    it('can apply a function to each circle', function() {
      circles = [];
      mapCtrl.forEachCircle(function(circle) {
        circles.push(circle);
      });
      expect(circles.length).toEqual(1);
      expect(circles[0].getCenter()).toEqual(circleOptions.center);
    });


    it('does not apply a function to removed circles', function() {
      mapCtrl.removeCircle(scope, 1, 2);
      var called = false;
      mapCtrl.forEachCircle(function(circle) {
        called = true;
      });
      expect(called).toBeFalsy();
    });

  });
});
