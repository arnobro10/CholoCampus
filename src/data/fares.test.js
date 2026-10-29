import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFare, fareLabel } from './fares.js';

test('optional fares preserve blank versus free and validate decimal amounts',()=>{
  assert.equal(parseFare(''),null);assert.equal(parseFare('  '),null);
  assert.equal(parseFare('0'),0);assert.equal(parseFare('80.50'),80.5);
  for(const value of ['-5','NaN','Infinity','1e3','1.234','100000000','free'])assert.throws(()=>parseFare(value));
});
test('fare labels distinguish discuss, free and taka per seat',()=>{
  assert.equal(fareLabel(null),'Discuss with ride owner');
  assert.equal(fareLabel(undefined),'Discuss with ride owner');
  assert.equal(fareLabel('0.00'),'Free');assert.equal(fareLabel('80.50'),'৳80.5 / seat');
});
