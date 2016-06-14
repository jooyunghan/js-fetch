var assert = require('chai').assert;

var L = require('../list');

describe('list', function () {
  it ('should map to other list', function () {
    assert.deepEqual(L.list(1,2,3).map(n => n+1), L.list(2,3,4))
  })

  it ('should flatMap', function () {
    assert.deepEqual(L.list(1,2,3).flatMap(n => L.list(n, n)), L.list(1,1,2,2,3,3))
  })
})
