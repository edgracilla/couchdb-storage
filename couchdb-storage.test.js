/*
 * Just a sample code to test the storage plugin.
 * Kindly write your own unit tests for your own plugin.
 */
'use strict';

var cp       = require('child_process'),
	assert   = require('assert'),
	should   = require('should'),
	moment   = require('moment'),
	storage;


var HOST 	        = '52.91.127.32',
	USER 	        = 'rozzwalla',
	PASSWORD        = 'reekoh',
	PORT 	        = 5984,
	CONNECTION_TYPE = 'http',
	DATABASE        = 'reekoh_database',
	ID  	        = new Date().getTime().toString();

var record = {
	_id: ID,
	co2: '11%',
	temp: 23,
	quality: 11.25,
	reading_time: '2015-11-27T11:04:13.539Z',
	metadata: {metadata_json: 'reekoh metadata json'},
	random_data: 'abcdefg',
	is_normal: true
};

describe('Storage', function () {
	this.slow(5000);

	after('terminate child process', function () {
		storage.send({
			type: 'close'
		});

		setTimeout(function () {
			storage.kill('SIGKILL');
		}, 3000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(storage = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			storage.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			storage.send({
				type: 'ready',
				data: {
					options: {
						host	          : HOST,
						port              : PORT,
						user	          : USER,
						password          : PASSWORD,
						connection_type   : CONNECTION_TYPE,
						database          : DATABASE
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the data', function (done) {
			storage.send({
				type: 'data',
				data: record
			}, done);
		});
	});

	describe('#data', function () {
		it('should have inserted the data', function (done) {
			this.timeout(20000);


			var nano     = require('nano')(CONNECTION_TYPE + '://' + USER + ':' + PASSWORD + '@' + HOST + ':' + PORT),
			    database = nano.use('reekoh_database');

			database.get(ID, {}, function(err, result) {
				should.equal(record.co2, result.co2, 'Data validation failed. Field: co2');
				should.equal(record.temp, result.temp, 'Data validation failed. Field: temp');
				should.equal(record.quality, result.quality, 'Data validation failed. Field: quality');
				should.equal(record.random_data, result.random_data, 'Data validation failed. Field: random_data');
				should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'),
					moment(result.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'),  'Data validation failed. Field: reading_time');
				should.equal(JSON.stringify(record.metadata), JSON.stringify(result.metadata), 'Data validation failed. Field: metadata');
				should.equal(record.is_normal, result.is_normal, 'Data validation failed. Field: is_normal');

				done();
			});


		});
	});
});