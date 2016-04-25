export const validate = (res) => {
  if (res && res.meta && res.meta.error == 'invalid') {
    return $q.reject(res);
  } else if (!res.id) {
    return $q.reject(res);
  }
};

