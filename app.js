'use strict';

var platform = require('./platform'),
	database;

/**
 * Emitted when device data is received. This is the event to listen to in order to get real-time data feed from the connected devices.
 * @param {object} data The data coming from the device represented as JSON Object.
 */
platform.on('data', function (data) {
	database.insert(data, function(err, body) {
		if (err) {
			console.error('Error inserting record on CouchDB', err);
			if (err.statusCode && err.statusCode === 409) {
				platform.log(JSON.stringify({
					title: 'Error inserting record to CouchDB.',
					data: data,
					error: err
				}));
			} else {
				platform.handleException(err);
			}
		} else {
			platform.log(JSON.stringify({
				title: 'Record Successfully inserted to CouchDB.',
				data: data,
				key: body.id
			}));
		}
	});
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function (error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		// TODO: Release all resources and close connections etc.
		platform.notifyClose(); // Notify the platform that resources have been released.
		d.exit();
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {
	var	url      = options.host,
		auth     = options.user + ':';

	if (options.password) auth = auth + options.password;
	if (options.port) url = url + ':' + options.port;

	var nano = require('nano')(options.connection_type + '://' + auth + '@' + url);

	database = nano.use(options.database);

	platform.notifyReady();
	platform.log('CouchDB has been initialized.');
});