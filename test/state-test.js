var expect = require('chai').expect;

var S = require('../state');

describe('state', function () {
  it('should run with initial state', function () {
    expect(S.modify(s => s + 1).flatMap(() => S.get()).runState(0))
      .to.eql([1,1])
  })
})