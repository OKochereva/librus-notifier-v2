const Librus = require('librus-api');

async function test() {
  const client = new Librus();
  await client.authorize('12112456', 'rihce8-joqpof-devXuk');
  
  console.log('Client keys:', Object.keys(client));
  console.log('Has jar?', !!client.jar);
  console.log('Has client.jar?', !!client.client?.jar);
  console.log('Has req?', !!client.req);
  console.log('Has request?', !!client.request);
  console.log('Has _req?', !!client._req);
}

test();