var PROTO = {
  map(f) {
    if (this.head) {
      return cons(f(this.head), this.tail.map(f));
    } else {
      return nil(); 
    }
  },

  flatMap(f) {
    return this.map(f).join();
  },

  join() { // [[a]] -> [a]
    if (this.head) {
      return this.head.append(this.tail.join());
    } else {
      return nil();
    }
  },

  append(next) {
    if (this.head) {
      return cons(this.head, this.tail.append(next));
    } else {
      return next;
    }
  },

  map2(b, f) {
    return this.flatMap(n => b.map(m => f(n, m)));
  }

}

const NIL = Object.create(PROTO);

function cons(head, tail) {
  return Object.assign(Object.create(PROTO), {head, tail});
}

function nil() {
  return NIL;
}

function list(...values) {
  if (values.length == 0) return nil();
  let [head, ...tail] = values;
  return cons(head, list(...tail)) 
}

module.exports = {
  cons, nil, list
}