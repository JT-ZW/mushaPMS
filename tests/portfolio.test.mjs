import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinates } from '../src/lib/dashboard/portfolio.ts';
test('map coordinates reject missing, empty, invalid and out-of-range values', () => {
	for (const point of [
		{ latitude: null, longitude: null },
		{ latitude: '', longitude: ' ' },
		{ latitude: 'bad', longitude: 30 },
		{ latitude: 91, longitude: 25 },
		{ latitude: 23, longitude: -181 }
	])
		assert.equal(coordinates(point), null);
});
test('valid zero coordinates and numeric strings remain mapped', () => {
	assert.deepEqual(coordinates({ latitude: 0, longitude: 0 }), [0, 0]);
	assert.deepEqual(coordinates({ latitude: '-17.8', longitude: '31.0' }), [-17.8, 31]);
});
