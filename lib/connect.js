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

angular.module('the-ng-jsdata').service('connect', function($q, DS, $timeout, onceAfterDigest, $ionicPopup, $state, validate) {
  return (target, scope, callback, aggressive=true) => {
    if (target.__disconnect) target.__disconnect();

    let records = {};
    let types = {};

    function update(getIfMissing) {
      records = {};
      types = {};

      let record = (key, type, id, relations) => {
        if (_.isObject(id)) {
          let r = DS.createInstance(type, id);
          records[key] = r;
          types[key] = type;

          target[key] = r;

        } else {
          let res = DS.get(type, id);
          if (!res && getIfMissing) {
            target[key] = null;
            DS.find(type, id, {bypassCache:true})
              .then((res) => {
                records[key] = res;
                types[key] = type;

                if (relations === true) return res.DSLoadRelations();
                else if (relations) return res.DSLoadRelations(relations);
                else return res;
              })
              .then((res) => target[key] = res, (err) => target[key] = err);
          } else {
            records[key] = res;
            types[key] = type;

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

    const saveAndValidate = (record, key) =>
          record.DSCreate({ upsert: true, cacheResponse: false })
          .then(validate)
          .then((res) => records[key] = res)
          .then((res) => DS.inject(types[key], res));

    target.save = () => $q.all(_.map(records, saveAndValidate));

    update(true);

    var unwatchers = [];

    if (aggressive) {
      const updateOncePerDigest = onceAfterDigest(update);

      let recordWatcher = (key, type, id) => {
        if ((typeof id == 'string') || (typeof id == 'number'))
          unwatchers.push(scope.$watch(() => DS.lastModified(type, id), updateOncePerDigest));
      };

      let collectionWatcher = (key, type, hash) => unwatchers.push(scope.$watch(() => DS.lastModified(type), updateOncePerDigest));

      callback(recordWatcher, collectionWatcher);
    }

    const hasChanges = (record) => !record.id || !_.isEqual(record.DSChanges(), { changed: {}, added: {}, removed: {} });

    unwatchers.push(scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
      // ignore tab changes:
      if (_.intersection(_.keys(toState.views), _.keys(fromState.views)).length == 0) return;

      if (_.find(records, hasChanges)) {
        event.preventDefault();

        $ionicPopup.confirm({ title: 'Discard changes?' }).then(
          (discard) => {
            if (discard) {
              _.each(records, (record) => record.id && record.DSRevert());
              records = {};

              $state.go(toState, toParams);
            }
          });
      }
    }));

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
