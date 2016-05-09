import _ from 'lodash';
import { DSUtils, DSErrors } from 'js-data';
let { isArray, isString, isNumber, isObject, set, get, resolveId } = DSUtils;

angular.module('the-ng-jsdata', []).service('onceAfterDigest', function($timeout, $rootScope) {
  return function(callback) {
    let alreadyCalling = false;
    return function(a, b) {
      if (a === b) return;
      if (alreadyCalling) return;

      alreadyCalling = true;
      $timeout(() => {
        alreadyCalling = false;
        callback();
      }, 0);
    };
  };
});

// connect allows you to connect a scope to a few different JSData
// resources.  It defines a syntax that allows multiple behaviors to
// share the same definition: refreshing, initial data loading, etc.
// By doing it this way, we semantically represent what we want to
// actually happen, and it is in charge of doing the right thing
// vis-a-vis refreshing etc.
//
// Only one connect per scope, it will automatically disconnect old
// connect calls.  This allows you to call connect repeatedly when,
// say, search parameters change, and the old connect() will
// automatically be removed.

angular.module('the-ng-jsdata').service('connect', function($q, DS, $timeout, onceAfterDigest) {
  return (target, scope, callback, aggressive=true) => {
    if (target.__disconnect) target.__disconnect();

    function update(getIfMissing) {
      let record = (key, type, id, relations) => {
        if (_.isObject(id)) {
          target[key] = DS.createInstance(type, id);
        } else {
          let res = DS.get(type, id);
          if (!res && getIfMissing) {
            target[key] = null;
            DS.find(type, id, {bypassCache:true})
              .then((res) => {
                if (relations === true) return res.DSLoadRelations();
                else if (relations) return res.DSLoadRelations(relations);
                else return res;
              })
              .then((res) => target[key] = res, (err) => target[key] = err);
          } else {
            target[key] = res;
          }
        }
      };

      let collection = (key, type, hash) => {
        let res = DS.filter(type, hash);

        if (res.length == 0 && getIfMissing) {
          target[key] = null;
          DS.findAll(type, hash, {bypassCache:true}).then((res) => target[key] = res, (err) => target[key] = err);
        } else {
          target[key] = res;
        }
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

    target.refresher = () => {
      target.refresh().finally(() => scope.$broadcast('scroll.refreshComplete'));
    };

    update(true);

    var unwatchers = [];

    if (aggressive) {
      const updateOncePerDigest = onceAfterDigest(update);

      let recordWatcher = (key, type, id) => unwatchers.push(scope.$watch(() => DS.lastModified(type, id), updateOncePerDigest));
      let collectionWatcher = (key, type, hash) => unwatchers.push(scope.$watch(() => DS.lastModified(type), updateOncePerDigest));

      callback(recordWatcher, collectionWatcher);
    }

    target.__disconnect = function() {
      let u; while (u = unwatchers.pop()) { u(); }
    };
  };
}).service('validate', function($q) {
  return (res) => {
    if (res && res.meta && res.meta.error == 'invalid') {
      return $q.reject(res);
    } else if (!res.id) {
      return $q.reject(res);
    } else {
      return res;
    }
  };
});
