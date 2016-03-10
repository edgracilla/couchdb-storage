'use strict';

var platform = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	isArray = require('lodash.isarray'),
	async = require('async'),
	database;


let sendData = (data) => {
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
};

platform.on('data', function (data) {
	if(isPlainObject(data)){
		sendData(data);
	}
	else if(isArray(data)){
		async.each(data, function(datum){
			sendData(datum);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
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