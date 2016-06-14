var L = require('./list');


// [m a] -> m [a]
function sequence(m, as) {
  if (as.head) {
    return m.map2(sequence(as.tail), L.cons);
  } else {
    return L.nil();
  }
}

module.exports = {
  sequence
}