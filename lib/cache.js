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

  function go(event) {
    function maybeCache(elem) {
      if (ruleCb(elem)) {
        Resource.create(elem, { adapter: 'localforage', upsert: true, cacheResponse: false });
      }
    }

    Resource.on(event, (rsrc, elems) => {
      console.log(`${ event } on `, elems);

      if (event == 'DS.afterUpdate') {
        let changes = rsrc.changes(elems);
        if (_.isEqual(changes, {added:{}, removed:{}, changed:{}})) return;
      }

      if (isArray(elems)) _.map(elems, maybeCache);
      else maybeCache(elems);
    });
  }

  go('DS.afterInject');
  go('DS.afterUpdate');
}
