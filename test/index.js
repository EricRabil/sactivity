const readline = require('readline-sync');
const { default: Sactivity, SpotifyTrackAnalyzer } = require('../js');

const sactivity = new Sactivity(readline.question('Feed me cookies bitch'));
sactivity.connect().then(socket => {
  const analyzer = new SpotifyTrackAnalyzer(socket);

  analyzer.on('beat', beat => {
    console.log(beat);
  });

  socket.on('track', async track => {
  });
}).catch(e => {
  console.error('Failed to connect to the dealer daddy');
  console.error(e);
});