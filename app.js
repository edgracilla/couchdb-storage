'use strict'

const reekoh = require('reekoh')
const plugin = new reekoh.plugins.Storage()

const async = require('async')
const uuid = require('node-uuid')
const isPlainObject = require('lodash.isplainobject')

let database = null

let sendData = function (data, callback) {
  if (!data._id) data._id = uuid.v4()

  database.insert(data, function (insertError) {
    if (!insertError) {
      plugin.emit('processed')
      plugin.log(JSON.stringify({
        title: 'Record Successfully inserted to CouchDB.',
        data: data
      }))
    }

    callback(insertError)
  })
}

plugin.on('data', (data) => {
  if (isPlainObject(data)) {
    sendData(data, (error) => {
      if (error) plugin.logException(error)
    })
  } else if (Array.isArray(data)) {
    async.each(data, (datum, done) => {
      sendData(datum, done)
    }, (error) => {
      if (error) plugin.logException(error)
    })
  } else {
    plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`))
  }
})

plugin.once('ready', () => {
  let options = plugin.config
  let host = `${options.host}`
  let auth = ''

  if (options.port) {
    host = `${host}:${options.port}`
  }

  if (options.user) {
    auth = `${options.user}`
  }

  if (options.password) {
    auth = `${auth}:${options.password}@`
  } else if (options.user) {
    auth = `${auth}:@`
  }

  let nano = require('nano')(`${options.connectionType}://${auth}${host}`)

  database = nano.use(options.database)

  plugin.emit('init')
  plugin.log('CouchDB Storage has been initialized.')
})

module.exports = plugin
