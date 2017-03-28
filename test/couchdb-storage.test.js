/* global describe, it, after, before */
'use strict'

const amqp = require('amqplib')
const should = require('should')
const moment = require('moment')

const ID = new Date().getTime().toString()
const INPUT_PIPE = 'demo.pipe.storage'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let _app = null
let _conn = null
let _channel = null

let conf = {
  host: 'localhost',
  port: 5984,
  user: 'rozzwalla',
  password: 'reekoh',
  connectionType: 'http',
  database: 'reehkoh_database'
}

let record = {
  _id: ID,
  co2: '11%',
  temp: 23,
  quality: 11.25,
  reading_time: '2015-11-27T11:04:13.539Z',
  metadata: {metadata_json: 'reekoh metadata json'},
  random_data: 'abcdefg',
  is_normal: true
}

describe('CouchDB Storage', () => {
  before('init', () => {
    process.env.BROKER = BROKER
    process.env.INPUT_PIPE = INPUT_PIPE
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate', function () {
    _conn.close()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data', function () {
    it('should process the data', function (done) {
      this.timeout(10000)
      _channel.sendToQueue(INPUT_PIPE, new Buffer(JSON.stringify(record)))
      _app.on('processed', done)
    })

    it('should have inserted the data', function (done) {
      this.timeout(10000)

      let nano = require('nano')(conf.connectionType + '://' + conf.user + ':' + conf.password + '@' + conf.host + ':' + conf.port)
      let database = nano.use(conf.database)

      database.get(ID, {}, function (err, result) {
        should.ifError(err)

        should.equal(record.co2, result.co2, 'Data validation failed. Field: co2')
        should.equal(record.temp, result.temp, 'Data validation failed. Field: temp')
        should.equal(record.quality, result.quality, 'Data validation failed. Field: quality')
        should.equal(record.random_data, result.random_data, 'Data validation failed. Field: random_data')
        should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), moment(result.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: reading_time')
        should.equal(JSON.stringify(record.metadata), JSON.stringify(result.metadata), 'Data validation failed. Field: metadata')
        should.equal(record.is_normal, result.is_normal, 'Data validation failed. Field: is_normal')

        done()
      })
    })
  })
})
