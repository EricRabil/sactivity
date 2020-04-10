const readline = require('readline-sync');
const { default: Sactivity } = require('../js');

const sactivity = new Sactivity(readline.question('Feed me cookies bitch'));
sactivity.connect().then(socket => {
  socket.on('track', console.log);
}).catch(e => {
  console.error('Failed to connect to the dealer daddy');
  console.error(e);
});