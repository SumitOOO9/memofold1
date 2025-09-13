// swagger.js
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'MemoFold API',
    description: 'Auto-generated API docs'
  },
  host: 'localhost:5000',
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js']; // your main server file

swaggerAutogen(outputFile, endpointsFiles, doc);
