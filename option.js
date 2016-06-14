const PROTO = {
  map(f) {
    if (this.value) {
      return some(f(this.value));
    } else {
      return none();
    }
  },

  flatMap(f) {
    if (this.value) {
      return f(this.value);
    } else {
      return none();
    }
  }, 

  map2(b, f) {
    if (this.value && b.value) {
      return some(f(this.value, b.value));
    } else {
      return none();
    }
  }
}

const NONE = Object.create(PROTO);

function some(value) {
  return Object.assign(Object.create(PROTO), {value});
}

function none() {
  return NONE;
}

module.exports = {
  some, none
}