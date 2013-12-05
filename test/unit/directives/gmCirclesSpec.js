describe('gmCircles', function() {
  var elm, scope, circlesScopeId, mapCtrl;
  var objToLatLng;
  var $timeout;

  beforeEach(function() {
    module('AngularGM');
  });

  beforeEach(inject(function($rootScope, $compile, _$timeout_, angulargmUtils) {
    // set up scopes
    scope = $rootScope.$new();
    scope.people = [
      {name: '0', lat: 1, lng: 2},
      {name: '3', lat: 4, lng: 5}
    ];
    scope.getOpts = function(person) {
      return {
        key: 'value',
        title: person.name
      };
    };
    scope.mapId = 'test';

    $timeout = _$timeout_;
    objToLatLng = angulargmUtils.objToLatLng;

    // compile angulargmCircles directive
    elm = angular.element('<gm-map gm-map-id="mapId" gm-center="center" gm-zoom="zoom" gm-bounds="bounds">' +
                            '<gm-circles ' +
                              'gm-objects="people"' +
                              'gm-get-lat-lng="{lat:object.lat,lng:object.lng}"' +
                              'gm-get-circle-options="getOpts(object)"' +
                              'gm-events="circleEvents"' +
                              'gm-on-click="selected = {person: object, circle: circle}"' +
                              'gm-on-center-changed="posChanged = {circle: circle}"' +
                              'gm-on-mouseover="mouseovered = {person: object, circle: circle}">' +
                            '</gm-circles>' +
                          '</gm-map>');

    $compile(elm)(scope);

    mapCtrl = elm.controller('gmMap');
    spyOn(mapCtrl, 'addCircle').andCallThrough();
    spyOn(mapCtrl, 'removeCircle').andCallThrough();
    spyOn(mapCtrl, 'removeCircleByHash').andCallThrough();
    spyOn(mapCtrl, 'trigger').andCallThrough();
    spyOn(mapCtrl, 'addListener').andCallThrough();

    circlesScopeId = elm.find('gm-circles').scope().$id;

    scope.$digest();
    $timeout.flush();
  }));


  it('requires the gmObjects attribute', inject(function($compile) {
    elm = angular.element('<gm-map gm-map-id="mapId" gm-center="center" gm-zoom="zoom" gm-bounds="bounds">' +
                            '<gm-circles ' +
                              'gm-get-lat-lng="{lat:object.lat,lng:object.lng}"' +
                              'gm-get-circle-options="getOpts(object)"' +
                              'gm-on-click="selected = {person: object, circle: circle}"' +
                              'gm-on-mouseover="mouseovered = {person: object, circle: circle}">' +
                            '</gm-circles>' +
                          '</gm-map>');

    scope = scope.$new();
    scope.mapId = 'test2';
    expect(angular.bind(this, $compile(elm), scope)).toThrow();
  }));


  it('requires the gmGetLatLng attribute', inject(function($compile) {
    elm = angular.element('<gm-map gm-map-id="mapId" gm-center="center" gm-zoom="zoom" gm-bounds="bounds">' +
                            '<gm-circles ' +
                              'gm-objects="people"' +
                              'gm-get-circle-options="getOpts(object)"' +
                              'gm-on-click="selected = {person: object, circle: circle}"' +
                              'gm-on-mouseover="mouseovered = {person: object, circle: circle}">' +
                            '</gm-circles>' +
                          '</gm-map>');

    scope = scope.$new();
    scope.mapId = 'test3';
    expect(angular.bind(this, $compile(elm), scope)).toThrow();
  }));


  describe('objects', function() {


    it('initializes circles with objects', function() {
      var center1 = objToLatLng(scope.people[0]);
      var center2 = objToLatLng(scope.people[1]);
      expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'value', title: jasmine.any(String), center: center1});
      expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'value', title: jasmine.any(String), center: center2});
    });


    it('updates circles with new objects', function() {
      scope.people.push({name: '6', lat: 7, lng: 8});
      var center = objToLatLng(scope.people[2]);
      scope.$digest();
      expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'value', title: jasmine.any(String), center: center});
    });


    it('updates circles when objects replaced with objects of same length', function() {
      var length = scope.people.length;
      scope.people = [];
      for (var i = 0; i < length; i++) {
        scope.people.push({name: 'new' + i, lat: i, lng: i});
      }
      scope.$digest();
      expect(mapCtrl.removeCircleByHash.calls.length).toEqual(length);
      expect(mapCtrl.addCircle.calls.length).toEqual(length * 2);
    });


    it('updates circles with removed objects', function() {
      var person = scope.people.pop();
      scope.$digest();
      var center = new google.maps.LatLng(person.lat, person.lng);
      expect(mapCtrl.removeCircleByHash).toHaveBeenCalledWith(circlesScopeId, center.toUrlValue(mapCtrl.precision));
    });


    it('does not add duplicate circles', function() {
      var origLength = scope.people.length;
      scope.people.push({name: '0', lat: 1, lng: 2});
      scope.$digest();
      expect(mapCtrl.addCircle.callCount).toEqual(origLength);
    });


    it('does not add null objects', function() {
      var origLength = scope.people.length;
      scope.people.push(null);
      scope.$digest();
      expect(mapCtrl.addCircle.callCount).toEqual(origLength);
    });

  });


  it('retrieves circle options', function() {
    expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'value', title: '0', center: jasmine.any(Object)});
    expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'value', title: '3', center: jasmine.any(Object)});
  });


  it('triggers events', function() {
    var person = scope.people[0];
    var center = new google.maps.LatLng(person.lat, person.lng);
    scope.circleEvents = [{
      event: 'click',
      locations: [center],
    }]

    scope.$digest();
    $timeout.flush();
    var circle = mapCtrl.trigger.mostRecentCall.args[0];
    var event = mapCtrl.trigger.mostRecentCall.args[1];
    expect(circle.getCenter()).toEqual(center);
    expect(event).toEqual('click');
  });


  it('triggers events on multiple circles', function() {
    var center0 = new google.maps.LatLng(scope.people[0].lat, scope.people[0].lng);
    var center1 = new google.maps.LatLng(scope.people[1].lat, scope.people[1].lng);
    scope.circleEvents = [{
      event: 'click',
      locations: [center0, center1]
    }]
    scope.$digest();
    $timeout.flush();
    var circle0 = mapCtrl.trigger.calls[0].args[0];
    var circle1 = mapCtrl.trigger.calls[1].args[0];
    expect(circle0.getCenter()).toEqual(center0);
    expect(circle1.getCenter()).toEqual(center1);
  });


  it('triggers multiple events on circles', function() {
    var center = new google.maps.LatLng(scope.people[0].lat, scope.people[0].lng);
    scope.circleEvents = [
      {
        event: 'event0',
        locations: [center]
      },
      {
        event: 'event1',
        locations: [center]
      }
    ]
    scope.$digest();
    $timeout.flush();
    var event0 = mapCtrl.trigger.calls[0].args[1];
    var event1 = mapCtrl.trigger.calls[1].args[1];
    expect(event0).toEqual('event0');
    expect(event1).toEqual('event1');
  });


  it('sets up event handlers for on-* attributes', function() {
    expect(mapCtrl.addListener).toHaveBeenCalledWith(jasmine.any(Object), 'click', jasmine.any(Function));
    expect(mapCtrl.addListener).toHaveBeenCalledWith(jasmine.any(Object), 'mouseover', jasmine.any(Function));
    expect(mapCtrl.addListener).toHaveBeenCalledWith(jasmine.any(Object), 'center_changed', jasmine.any(Function));
  });


  it('calls event handlers when event fired', function() {
    var person = scope.people[0];
    var circle = mapCtrl.getCircle(circlesScopeId, person.lat, person.lng);
    var handled = false;
    runs(function() {
      google.maps.event.addListener(circle, 'mouseover', function() {handled = true;});
      google.maps.event.trigger(circle, 'mouseover');
    });
    waitsFor(function() {
      return handled;
    }, 'no mouseover', 500);
    runs(function() {
      scope.$digest();
      $timeout.flush();
      expect(scope.mouseovered.person).toEqual(person);
    });
  });


  it('listens for circle redraw event', function() {
    var center1 = objToLatLng(scope.people[0]);
    var center2 = objToLatLng(scope.people[1]);
    scope.getOpts = function(person) {
      return {
        key: 'differentValue',
        title: person.name
      };
    };
    scope.$broadcast('gmCirclesRedraw', 'people');

    expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'differentValue', title: jasmine.any(String), center: center1});
    expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'differentValue', title: jasmine.any(String), center: center2});
  });


  it('listens to circle redraw event when no objects specified', function() {
    var center1 = objToLatLng(scope.people[0]);
    var center2 = objToLatLng(scope.people[1]);
    scope.getOpts = function(person) {
      return {
        key: 'differentValue',
        title: person.name
      };
    };
    scope.$broadcast('gmCirclesRedraw');

    expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'differentValue', title: jasmine.any(String), center: center1});
    expect(mapCtrl.addCircle).toHaveBeenCalledWith(circlesScopeId, {key: 'differentValue', title: jasmine.any(String), center: center2});
  });


  it('ignores circle redraw event for other instance', function() {
    scope.getOpts = function(person) {
      return {
        key: 'differentValue',
        title: person.name
      };
    };
    scope.$broadcast('gmCirclesRedraw', 'otherObjects');

    expect(mapCtrl.addCircle).not.toHaveBeenCalledWith(circlesScopeId, {key: 'differentValue', title: jasmine.any(String), center: jasmine.any(Object)});
    expect(mapCtrl.addCircle).not.toHaveBeenCalledWith(circlesScopeId, {key: 'differentValue', title: jasmine.any(String), center: jasmine.any(Object)});
  });

  it('emits circle update event when circles updated', function() {
    var count = 0;
    scope.$on('gmCirclesUpdated', function(event, objects) {
      if (objects == 'people') { count++; }
    });

    scope.people.pop();
    scope.$digest();

    expect(count).toEqual(1);
  });

});
