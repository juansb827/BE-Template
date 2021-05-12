const app = require('./app');

init();

function init() {
    app.listen(3001, () => {
      console.log('Express App Listening on Port 3001');
    }).on('error', (error) => {
      console.error(`An error occurred: ${JSON.stringify(error)}`);
      process.exit(1);
    });
}
