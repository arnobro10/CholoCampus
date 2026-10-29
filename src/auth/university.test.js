import test from 'node:test';
import assert from 'node:assert/strict';
import { authCallbackFailure, universityAccessFailure, universityEmail, eligibleGoogleUser, nativeCallbackCode, NATIVE_AUTH_CALLBACK } from './university.js';

test('OAuth rejections show university guidance without treating cancellation as a domain rejection', () => {
  for (const separator of ['?', '#']) {
    const failure = authCallbackFailure(`http://localhost:5173/${separator}error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`);
    assert.equal(universityAccessFailure(failure), true);
  }
  assert.equal(universityAccessFailure(authCallbackFailure(`${NATIVE_AUTH_CALLBACK}?error=access_denied&error_description=User+cancelled`)), false);
  assert.equal(authCallbackFailure('http://localhost:5173/?code=example'), '');
  assert.equal(universityAccessFailure('Network request failed'), false);
});

test('only exact student and faculty domains are eligible', () => {
  for (const email of ['member@g.bracu.ac.bd', 'member@bracu.ac.bd', 'Member@G.BRACU.AC.BD']) assert.equal(universityEmail(email), true);
  for (const email of ['member@gmail.com', 'member@g.bracu.ac', 'member@g.bracu.ac.bd.attacker.test', 'member@other.bracu.ac.bd', 'name@@bracu.ac.bd', '', null]) assert.equal(universityEmail(email), false);
});
test('verified Google identity must match the confirmed primary email', () => {
  const user = { email:'member@g.bracu.ac.bd', email_confirmed_at:'2026-10-29', identities:[{provider:'google',identity_data:{email:'member@g.bracu.ac.bd',email_verified:true}}] };
  assert.equal(eligibleGoogleUser(user), true);
  assert.equal(eligibleGoogleUser({...user,email_confirmed_at:null}), false);
  assert.equal(eligibleGoogleUser({...user,identities:[],user_metadata:{provider:'google',email_verified:true}}), false);
  assert.equal(eligibleGoogleUser({...user,identities:[{provider:'google',identity_data:{email:'different@g.bracu.ac.bd',email_verified:true}}]}), false);
  assert.equal(eligibleGoogleUser({...user,identities:[{provider:'email',identity_data:{email:user.email,email_verified:true}}]}), false);
});
test('native callbacks accept only one code at the exact app callback', () => {
  assert.equal(nativeCallbackCode(`${NATIVE_AUTH_CALLBACK}?code=example-code`), 'example-code');
  for (const url of ['https://attacker.test/?code=stolen', 'com.nexasity.campuspool://attacker/callback?code=stolen', `${NATIVE_AUTH_CALLBACK}/extra?code=stolen`, `${NATIVE_AUTH_CALLBACK}?code=one&code=two`, `${NATIVE_AUTH_CALLBACK}?access_token=not-a-code`, 'invalid']) assert.equal(nativeCallbackCode(url), null);
});
