/**!
 * koa-gzip - test/index.test.js
 *
 * Copyright(c) 2014
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com)
 */

"use strict";

/**
 * Module dependencies.
 */

var fs = require('fs');
var should = require('should');
var request = require('supertest');
var koa = require('koa');
var mm = require('mm');
var gzip = require('../');

describe('index.test.js', function () {
  var options = {};
  var BODY = 'foo bar string, foo bar string, foo bar string, foo bar string, \
    foo bar string, foo bar string, foo bar string, foo bar string, foo bar string, foo bar string, \
    foo bar string, foo bar string, foo bar string, foo bar string, foo bar string, foo bar string';
  var app = koa();
  // app.outputErrors = true;
  app.use(gzip(options));
  app.use(function *(next) {
    if (this.url === '/404') {
      return yield next;
    }
    if (this.url === '/small') {
      return this.body = 'foo bar string';
    }
    if (this.url === '/string') {
      return this.body = BODY;
    }
    if (this.url === '/buffer') {
      return this.body = new Buffer(BODY);
    }
    if (this.url === '/object') {
      return this.body = {foo: BODY};
    }
    if (this.url === '/number') {
      return this.body = 1984;
    }
    if (this.url === '/stream') {
      return this.body = fs.createReadStream(__filename);
    }
    if (this.url === '/exists-encoding') {
      this.set('content-encoding', 'gzip');
      return this.body = new Buffer('gzip');
    }
    if (this.url === '/error') {
      return this.throw(new Error('mock error'));
    }
  });

  before(function (done) {
    app = app.listen(0, done);
  });

  afterEach(mm.restore);

  describe('gzip()', function () {
    it('should work with no options', function () {
      gzip();
    });
  });

  describe('when status 200 and request accept-encoding include gzip', function () {
    it('should return gzip string body', function (done) {
      request(app)
      .get('/string')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200)
      .expect('content-encoding', 'gzip')
      .expect('content-length', '46')
      .expect(BODY, done);
    });

    it('should return raw string body if body smaller than minLength', function (done) {
      request(app)
      .get('/small')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200)
      .expect('content-length', '14')
      .expect('foo bar string', function (err, res) {
        should.not.exist(err);
        should.not.exist(res.headers['content-encoding']);
        done();
      });
    });

    it('should return raw string body if gzip body bigger than raw body', function (done) {
      mm(options, 'minLength', 10);
      request(app)
      .get('/small')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200)
      .expect('content-length', '14')
      .expect('foo bar string', function (err, res) {
        should.not.exist(err);
        should.not.exist(res.headers['content-encoding']);
        done();
      });
    });

    it('should return gzip buffer body', function (done) {
      request(app)
      .get('/buffer')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200)
      .expect('content-encoding', 'gzip')
      .expect('content-length', '46')
      .expect(BODY, done);
    });

    it('should return gzip stream body', function (done) {
      request(app)
      .get('/stream')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200)
      .expect('Content-Encoding', 'gzip')
      .expect(fs.readFileSync(__filename, 'utf8'), done);
    });

    it('should return gzip json body', function (done) {
      request(app)
      .get('/object')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200)
      .expect('Content-Encoding', 'gzip')
      .expect({foo: BODY}, done);
    });

    it('should return number body', function (done) {
      request(app)
      .get('/number')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(200, function (err, res) {
        should.not.exist(err);
        res.body.should.equal(1984);
        done();
      });
    });
  });

  describe('when status 200 and request accept-encoding exclude gzip', function () {
    it('should return raw body', function (done) {
      request(app)
      .get('/string')
      .set('Accept-Encoding', 'deflate,sdch')
      .expect(200)
      .expect('content-length', '' + BODY.length)
      .expect(BODY,
      function (err, res) {
        should.not.exist(err);
        should.not.exist(res.headers['content-encoding']);
        done();
      });
    });
  });

  describe('when status non 200', function () {
    it('should return 404', function (done) {
      request(app)
      .get('/404')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(404)
      .expect('Not Found', done);
    });

    it('should return 500', function (done) {
      request(app)
      .get('/error')
      .set('Accept-Encoding', 'gzip,deflate,sdch')
      .expect(500)
      .expect('Internal Server Error', done);
    });
  });
});
