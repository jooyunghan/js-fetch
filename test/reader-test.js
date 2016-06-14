var expect = require('chai').expect

var R = require('../reader');

describe('reader', function () {
  it('should run with arg', function () {
    expect(R.reader(a => a + 1).run(3)).to.be.eql(4)
  })
})