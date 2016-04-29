'use strict';

var uuid          = require('node-uuid'),
	async         = require('async'),
	isArray       = require('lodash.isarray'),
	platform      = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	database;

let sendData = function (data, callback) {
	if (!data._id) data._id = uuid.v4();
	
	database.insert(data, function (insertError) {
		if (!insertError) {
			platform.log(JSON.stringify({
				title: 'Record Successfully inserted to CouchDB.',
				data: data
			}));
		}

		callback(insertError);
	});
};

platform.on('data', function (data) {
	if (isPlainObject(data)) {
		sendData(data, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else if (isArray(data)) {
		async.each(data, (datum, done) => {
			sendData(datum, done);
		}, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	platform.notifyClose();
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {
	let host = `${options.host}`, auth = '';

	if (options.port)
		host = `${host}:${options.port}`;

	if (options.user)
		auth = `${options.user}`;

	if (options.password)
		auth = `${auth}:${options.password}@`;
	else if (options.user)
		auth = `${auth}:@`;

	let nano = require('nano')(`${options.connection_type}://${auth}${host}`);

	database = nano.use(options.database);

	platform.notifyReady();
	platform.log('CouchDB Storage has been initialized.');
});