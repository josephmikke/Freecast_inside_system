function groupBy(xs: any[], key: keyof any) {
  return xs.reduce((rv, x) => {
    // eslint-disable-next-line no-param-reassign
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

export default groupBy;
