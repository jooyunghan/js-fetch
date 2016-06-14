
function Reader(f) {
  this.f = f;
}

Reader.prototype.map = function map(f) {
  return new Reader(a => f(this.run(a)))
}

Reader.prototype.flatMap = function flatMap(f) {
  return new Reader(a => f(this.run(a)).run(a))
}

Reader.prototype.run = function run(arg) {
  return this.f(arg);
}

function reader(f) {
  return new Reader(f)
}

function of(value) {
  return new Reader(() => value)
}

module.exports = {
  reader, of
}