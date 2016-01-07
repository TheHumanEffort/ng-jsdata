import _ from 'lodash';
import { DSUtils, DSErrors } from 'js-data';
let { isArray, isString, isNumber, isObject, set, get, resolveId } = DSUtils;

// maps resource into scope/expr, optionally using cb to merge values.
// cb is called for every element (maybe just one), like so:
// cb(existingValue,newElement).  The default behavior is simple:

function defaultBindCb(existing,resource) {
  return resource;
}

export function bind(resource,scope,expr,cb) {
  cb = cb || defaultBindCb;
  
  if(isArray(resource)) {
    let array = get(scope,expr);
    array = _.map(resource,(item,index) => cb(array[index],item))
    set(scope,expr,array);
  } else {
    let value = get(scope,expr);
    value = cb(value,resource);
    set(scope,expr,value);
  }
}

