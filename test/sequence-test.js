var expect = require('chai').expect;

var M = require('../monad');
var L = require('../list');
var O = require('../option');
var R = require('../reader');

describe('List.sequence', function () {
  it('should run on list of maybe', function () {
    expect(L.list(O.some(1), O.some(2)).sequence(O)).to.eql(O.some(L.list(1,2)))
  })

  it('should run on list of list', function () {
    expect(L.list(L.list(1,2), L.list(3,4)).sequence(L))
      .to.eql(L.list(L.list(1,3), L.list(1,4), L.list(2,3), L.list(2,4)))
  })

  it('should run on reader monad', function () {
    expect(L.list(R.reader(l => l.head), R.reader(l => l.length())).sequence(R).run(L.list(1,2,3)))
      .to.eql(L.list(1,3))
  })
})