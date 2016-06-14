function State(f) {
  this.f = f;
}

State.prototype.map = function map(f) {
  return this.flatMap(a => of(f(a)));
}

State.prototype.flatMap = function flatMap(f) {
  return new State(s0 => {
    let [a, s1] = this.runState(s0);
    let [b, s2] = f(a).runState(s1);
    return [b, s2];
  })
}

State.prototype.runState = function runState(s0) {
  return this.f(s0);
}

function state(f) {
  return new State(f)
}

function modify(f) {
  return get().flatMap(s => put(f(s)));
}

function get() {
  return new State(s => [s,s]);
}

function put(s) {
  return new State(() => [undefined, s])
}

function of(value) {
  return new State(s => [value, s])
}

module.exports = {
  state, modify, get, put, of
}