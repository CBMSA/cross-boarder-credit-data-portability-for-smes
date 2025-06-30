// File: backend/submitToSui.js

const { exec } = require('child_process');

// Replace this with your actual Sui package/module/function after deployment
const PACKAGE_ID = '0xYourPackageID';
const MODULE_NAME = 'data';
const FUNCTION_NAME = 'submit_credit_record';

function toUTF8Bytes(str) {
  return Buffer.from(str).toString();
}

function submitToSui(record) {
  const args = [
    '--package', PACKAGE_ID,
    '--module', MODULE_NAME,
    '--function', FUNCTION_NAME,
    '--args',
    toUTF8Bytes(record.name),
    toUTF8Bytes(record.taxID),
    toUTF8Bytes(record.country),
    toUTF8Bytes(record.financials),
    toUTF8Bytes(record.docURL),
    '--gas-budget', '100000000'
  ];

  const cmd = `sui client call ${args.join(' ')}`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('[SUI Error]', stderr);
    } else {
      console.log('[SUI Success]', stdout);
    }
  });
}

module.exports = submitToSui;
