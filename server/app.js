const express = require('express');

const routes = (app) => {
    "use strict";
    const router = express.Router();
    // router.get('/', function (req, res) {
    //     res.json({message: 'invalid request'});
    // });
    // router.get('/fast_rate_lookup/', require('./api/fast_rate_lookup'));
    // router.get('/sales_tax_lookup/', require('./api/sales_tax_lookup'));
    // app.use('/api', router);
    return app;
};

const start = (app) => {
    "use strict";
    const port = process.env.PORT || 3666;

    app.listen(port);
    console.log('Listening: '.green + ('' + port).magenta);
    module.exports = app;
    return app;
};

const server = () => {
    "use strict";
    const path = require('path');
    require('colors');

    const bodyParser = require('body-parser');
    const cookieParser = require('cookie-parser');
    const logger = require('morgan');

    const indexRouter = require('./routes/index');

    const app = express();
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    app.use('/', indexRouter);

    var http = require('http').Server(app)
    var io = require('socket.io')(http)

    var hexes = require('./hextrek/main')
    var game = new hexes.Game();
    game.start(io)


    return app;
};

start(routes(server()));
