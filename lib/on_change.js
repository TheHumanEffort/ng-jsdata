import { checkCallbackSpeed} from './utils';
import _ from 'lodash';
import { DSUtils, DSErrors } from 'js-data';
let { isArray, isString, isNumber, isObject, set, get, resolveId } = DSUtils;

// Calls cb every time a change occurred in the referenced set of
// data.

export function onChange(scope,DS,resource,refExpr,cb) {
  cb = checkCallbackSpeed(cb,'onChange',5);

  scope.$watch(() => {
    var ref = get(scope,refExpr);
    if(isObject(ref)) {
      return DS.lastModified(resource)
    } else {
      return DS.lastModified(resource,ref);
    }
  },cb);
}
