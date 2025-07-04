

const axios = require('axios');

module.exports = async function (context, req) {
  const clientId = 'IKIA72C65D005F93F30E573EFEAC04FA6DD9E4D344B1';
  const clientSecret = 'YZMqZezsltpSPNb4+49PGeP7lYkzKn1a5SaVSyzKOiI=';
  const terminalId = '3DMO0001';

  const {
    amount,
    destinationAccount,
    destinationBankCode,
    narration
  } = req.body;

  if (!amount || !destinationAccount || !destinationBankCode) {
    context.res = {
      status: 400,
      body: { error: true, message: "Missing required transfer fields" }
    };
    return;
  }

  try {
    const tokenResponse = await axios.post(
      'https://sandbox.interswitchng.com/passport/oauth/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const transferPayload = {
      clientId,
      terminalId,
      amount,
      currency: 'ZAR',
      destinationAccount,
      destinationBankCode,
      narration: narration || 'CBDC Transfer'
    };

    const transferResponse = await axios.post(
      'https://sandbox.interswitchng.com/api/v1/transfer',
      transferPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    context.res = {
      status: 200,
      body: transferResponse.data
    };
  } catch (error) {
    context.log("Transfer Error:", error.response?.data || error.message);
    context.res = {
      status: error.response?.status || 500,
      body: {
        error: true,
        message: error.response?.data || error.message
      }
    };
  }
};



