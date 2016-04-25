import _ from 'lodash';
import { DSUtils, DSErrors } from 'js-data';
let { isArray, isString, isNumber, isObject, set, get, resolveId } = DSUtils;

angular.module('the-ng-jsdata', []).service('onceAfterDigest', function($timeout, $rootScope) {
  return function(callback) {
    let alreadyCalling = false;
    return function() {
      if (alreadyCalling) return;
      alreadyCalling = true;
      $timeout(() => {
        alreadyCalling = false;
        callback();
      }, 0);
    };
  };
});

angular.module('the-ng-jsdata').service('connect', function($q, DS, $timeout, onceAfterDigest) {
  return (target, scope, callback, aggressive=true) => {

    function update() {
      let record = (key, type, id) => {
        if (_.isObject(id)) {
          target[key] = DS.createInstance(type, id);
        } else {
          target[key] = DS.get(type, id);
        }
      };

      let collection = (key, type, hash) => {
        target[key] = DS.filter(type, hash);
      };

      callback(record, collection);
    }

    target.refresh = () => {
      let promises = [];

      let record = (key, type, id) => {
        promises.push(
          DS.find(type, id, {bypassCache:true})
            .then((res) => target[key] = res)
        );
      };

      let collection = (key, type, hash) => {
        promises.push(
          DS.findAll(type, hash, {bypassCache:true})
            .then((res) => target[key] = res)
        );
      };

      callback(record, collection);

      return $q.all(promises);
    };

    update();

    if (aggressive) {
      const updateOncePerDigest = onceAfterDigest(update);

      let recordWatcher = (key, type, id) => scope.$watch(() => DS.lastModified(type, id), updateOncePerDigest);
      let collectionWatcher = (key, type, hash) => scope.$watch(() => DS.lastModified(type), updateOncePerDigest);

      callback(recordWatcher, collectionWatcher);
    }
  };
});
