import Fastify from 'fastify';

const fastify = Fastify({logger: true});

const listings = [
  { id: 1, name: "Stock A", price: 120.50 },
  { id: 2, name: "Stock B", price: 75.25 },
  { id: 3, name: "Stock C", price: 300.00 }
];

fastify.get('/listings', async (request, reply) => {
  return listings;
});

fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});