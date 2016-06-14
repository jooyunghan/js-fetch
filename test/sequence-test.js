var assert = require('chai').assert;

var M = require('../monad');
var L = require('../list');
var O = require('../option');

describe('sequence', function () {
  it('should run on list of maybe', function () {
    assert.deepEqual(M.sequence(L.list(O.some(1), O.some(2)))
      , O.some(L.list(1,2)));
  })
})