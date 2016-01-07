export function checkCallbackSpeed(cb,note,speed) {
  if(window.DEVELOPMENT=true) {
    return function() {
      var start = new Date();
      var res = cb.apply(this,arguments);
      var end = new Date();

      if(end - start > speed) {
        console.warning(`Slow ${note} callback: `,cb);
      }
      
      return res;
    }
  } else {
    return cb;
  }
};
