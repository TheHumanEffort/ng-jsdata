// TODO: This should eject things automatically that no longer match
// the search criteria.

import _ from 'lodash';
import { DSUtils, DSErrors } from 'js-data';
let { isArray, isString, isNumber, isObject, set, get, resolveId } = DSUtils;

export function restore(Resource) {
  return Resource.findAll(null, { bypassCache: true, adapter: 'localforage' }).then((res) => { if (res.length == 0) return Promise.reject('no items'); });
}

export function cache(Api, Resource, ruleCb) {
  Api.on('clear_data', function() {
    DS.adapters.localforage.destroyAll(Resource);
  });

  function addOn(event) {
    function maybeCache(elem) {
      if (elem.id && (!ruleCb || ruleCb(elem))) {
        Resource.create(elem, { adapter: 'localforage', upsert: true, cacheResponse: false, notify: false });
      }
    }

    Resource.on(event, (rsrc, elems) => {
      //      console.log(`${ event } on `, elems);

      if (event == 'DS.afterUpdate') {
        let changes = rsrc.changes(elems);
        if (_.isEqual(changes, {added:{}, removed:{}, changed:{}})) return;
      }

      console.log('ADDING: ', event, elems);
      if (isArray(elems)) _.map(elems, maybeCache);
      else maybeCache(elems);
    });
  }

  function removeOn(event) {
    function eject(elem) {
      return Resource.destroy(elem.id, { adapter: 'localforage', cacheResponse: false, notify: false });
    }

    Resource.on(event, (rsrc, elems) => {
      console.log('REMOVING: ', event, elems);
      if (isArray(elems)) _.map(elems, eject);
      else eject(elems);
    });

  }

  addOn('DS.afterInject');
  addOn('DS.afterUpdate');
  addOn('DS.afterCreate');

  removeOn('DS.afterEject');
  removeOn('DS.beforeDestroy');
}
