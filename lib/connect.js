import _ from 'lodash';
import { DSUtils, DSErrors } from 'js-data';
let { isArray, isString, isNumber, isObject, set, get, resolveId } = DSUtils;

angular.module('the-ng-jsdata', []).service('connect', function($q, DS) {
  return (target, scope, callback, aggressive=true) => {
    if (aggressive) {
      scope.$watch(function() {
        let hash = {};
        let recordWatcher = (key, type, id) => {
          if (!_.isObject(type)) {
            hash[key] = type + '_' + id;
            hash[key + '_last_modified'] = DS.lastModified(key, id);
          }
        };

        let collectionWatcher = (key, type, hash) => {
          hash[key + '_type'] = type;
          hash[key] = hash;
          hash[key + '_last_modified'] = DS.lastModified(key);
        };

        return hash;
      }, update, true);
    }

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
  };
});
