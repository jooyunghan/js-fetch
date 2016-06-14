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
  },

  sequence(M) {
    if (this.head) {
      return this.head.flatMap(h => {
        const se = this.tail.sequence(M);
        return se.map(t => cons(h, t))
      });
    } else {
      return M.of(nil());
    }
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

function of(value) {
  return list(value)
}

module.exports = {
  cons, nil, list, of
}