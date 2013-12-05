/**
 * @ngdoc directive
 * @name angulargm.directive:gmCircles
 * @element ANY
 *
 * @description
 * A directive for adding circles to a `gmMap`. You may have multiple per `gmMap`.
 *
 * To use, you specify an array of custom objects and tell the directive how to
 * extract location data from them. A circle will be created for each of your
 * objects. If you assign a new array to your scope variable or change the
 * array's length, the circles will also update.
 *
 * Only the `gm-objects` and `gm-get-lat-lng` attributes are required.
 *
 * @param {expression} gm-objects an array of objects in the current scope.
 * These can be any objects you wish to attach to circles, the only requirement
 * is that they have a uniform method of accessing a lat and lng.
 *
 *
 * @param {expression} gm-get-lat-lng an angular expression that given an object from
 * `gm-objects`, evaluates to an object with lat and lng properties. Your
 * object can be accessed through the variable `object`.  For example, if
 * your controller has
 * ```js
 * ...
 * $scope.myObjects = [
 *   { id: 0, location: { lat: 5, lng: 5} },
 *   { id: 1, location: { lat: 6, lng: 6} }
 * ]
 * ...
 * ```
 * then in the `gm-circles` directive you would put
 * ```js
 * ...
 * gm-objects="myObjects"
 * gm-get-lat-lng="{ lat: object.location.lat, lng: object.location.lng }"
 * ...
 * ```
 *
 * @param {expression} gm-get-circle-options an angular expression that given
 * an object from `gm-objects`, evaluates to a
 * [google.maps.CircleOptions](https://developers.google.com/maps/documentation/javascript/reference#CircleOptions)
 * object.  Your object can be accessed through the variable `object`. If
 * unspecified, google maps api defaults will be used.
 *
 *
 * @param {expression} gm-events a variable in the current scope that is used to
 * simulate events on circles. Setting this variable to an object of the form
 * ```js
 *     [
 *       {
 *         event: 'click',
 *         locations: [new google.maps.LatLng(45, -120), ...]
 *       },
 *       ...
 *     ]
 * ```
 * will generate the named events on the circles at the given locations, if a
 * circle at each location exists. Note: when setting the `gm-events` variable,
 * you must set it to a new object for the changes to be detected.  Code like
 * ```js
 * myEvent[0]["locations"] = [new google.maps.LatLng(45,-120)]
 * ```
 * will not work.
 *
 *
 * @param {expression} gm-on-*event* an angular expression which evaluates to
 * an event handler. This handler will be attached to each circle's \*event\*
 * event.  The variables 'object' and 'circle' evaluate to your object and the
 * [google.maps.Circle](https://developers.google.com/maps/documentation/javascript/reference#Circle),
 * respectively. For example:
 * ```html
 * gm-on-click="myClickFn(object, circle)"
 * ```
 * will call your `myClickFn` whenever a circle is clicked.  You may have
 * multiple `gm-on-*event*` handlers, but only one for each type of event.
 * For events that have an underscore in their name, such as
 * 'center_changed', write it as 'gm-on-center-changed'.
 */

/**
 * @ngdoc event
 * @name angulargm.directive:gmCircles#gmCirclesRedraw
 * @eventOf angulargm.directive:gmCircles
 * @eventType listen on current gmCircles scope
 *
 * @description Force the gmCircles directive to clear and redraw all circles.
 *
 * @param {string} objects Not required. The name of the scope variable which
 * holds the objects to redraw circles for, i.e. what you set `gm-objects` to.
 * It is useful because there may be multiple instances of the `gmCircles`
 * directive. If not specified, all instances of gmCircles which are child
 * scopes will redraw their circles.
 *
 * @example
 * ```js
 * $scope.$broadcast('gmCirclesRedraw', 'myObjects');
 * ```
 */

/**
 * @ngdoc event
 * @name angulargm.directive:gmCircles#gmCirclesUpdated
 * @eventOf angulargm.directive:gmCircles
 * @eventType emit on current gmCircles scope
 *
 * @description Emitted when circles are updated.
 *
 * @param {string} objects the name of the scope variable which holds the
 * objects the gmCircles directive was constructed with. This is what
 * `gm-objects` was set to.
 *
 * @example
 * ```js
 * $scope.$on('gmCirclesUpdated', function(event, objects) {
 *     if (objects === 'myObjects') {
 *       ...
 *     }
 * });
 * ```
 */

(function () {
'use strict';

  angular.module('AngularGM').

  directive('gmCircles', ['$log', '$parse', '$timeout', 'angulargmUtils',
    function($log, $parse, $timeout, angulargmUtils) {

    /** aliases */
    var latLngEqual = angulargmUtils.latLngEqual;
    var objToLatLng = angulargmUtils.objToLatLng;
    var getEventHandlers = angulargmUtils.getEventHandlers;
    var createHash = angulargmUtils.createHash;


    function link(scope, element, attrs, controller) {
      // check attrs
      if (!('gmObjects' in attrs)) {
        throw 'gmObjects attribute required';
      } else if (!('gmGetLatLng' in attrs)) {
        throw 'gmGetLatLng attribute required';
      }

      var handlers = getEventHandlers(attrs); // map events -> handlers

      // fn for updating circles from objects
      var updateCircles = function(scope, objects) {

        var objectHash = {};

        angular.forEach(objects, function(object, i) {
          var latLngObj = scope.gmGetLatLng({object: object});
          var center = objToLatLng(latLngObj);
          if (center == null) {
            return;
          }

          var circleOptions = scope.gmGetCircleOptions({object: object});

          // hash objects for quick access
          var hash = angulargmUtils.createHash(center, controller.precision);
          objectHash[hash] = object;

          // add circle
          if (!controller.hasCircle(scope.$id, latLngObj.lat, latLngObj.lng)) {

            var options = {};
            angular.extend(options, circleOptions, {center: center});

            controller.addCircle(scope.$id, options);
            var circle = controller.getCircle(scope.$id, latLngObj.lat, latLngObj.lng);

            // set up circle event handlers
            angular.forEach(handlers, function(handler, event) {
              controller.addListener(circle, event, function() {
                $timeout(function() {
                       // scope is this directive's isolate scope
                       // scope.$parent is the scope of ng-transclude
                       // scope.$parent.$parent is the one we want
                  handler(scope.$parent.$parent, {
                    object: object,
                    circle: circle
                  });
                });
              });
            });
          }
        });

        // remove 'orphaned' circles
        var orphaned = [];

        controller.forEachCircleInScope(scope.$id, function(circle, hash) {
          if (!(hash in objectHash)) {
            orphaned.push(hash);
          }
        });

        angular.forEach(orphaned, function(circleHash, i) {
          controller.removeCircleByHash(scope.$id, circleHash);
        });

        scope.$emit('gmCirclesUpdated', attrs.gmObjects);
      }; // end updateCircles()

      // watch objects
      scope.$watch('gmObjects().length', function(newValue, oldValue) {
        if (newValue != null && newValue !== oldValue) {
          updateCircles(scope, scope.gmObjects());
        }
      });

      scope.$watch('gmObjects()', function(newValue, oldValue) {
        if (newValue != null && newValue !== oldValue) {
          updateCircles(scope, scope.gmObjects());
        }
      });

      // watch gmEvents
      scope.$watch('gmEvents()', function(newValue, oldValue) {
        if (newValue != null && newValue !== oldValue) {
          angular.forEach(newValue, function(eventObj) {
            var event = eventObj.event;
            var locations = eventObj.locations;
            angular.forEach(locations, function(location) {
              var circle = controller.getCircle(scope.$id, location.lat(), location.lng());
              if (circle != null) {
                $timeout(angular.bind(this, controller.trigger, circle, event));
              }
            });
          });
        }
      });

      scope.$on('gmCirclesRedraw', function(event, objectsName) {
        if (objectsName == null || objectsName === attrs.gmObjects) {
          updateCircles(scope);
          updateCircles(scope, scope.gmObjects());
        }
      });

      // initialize circles
      $timeout(angular.bind(null, updateCircles, scope, scope.gmObjects()));
    }


    return {
      restrict: 'AE',
      priority: 100,
      scope: {
        gmObjects: '&',
        gmGetLatLng: '&',
        gmGetCircleOptions: '&',
        gmEvents: '&'
      },
      require: '^gmMap',
      link: link
    };
  }]);
})();
