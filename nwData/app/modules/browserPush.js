/**
 * browserPush
 * ===========
 * Browser Push forwards the compilation events to the browser and causes the fitting CSS files to reload.
 */
'use strict';

define(['modules/central', 'text!modules/browserPushClient.js'], function (central, srcBrowserPushClient){
    var nodeHTTP,
        nodeSocket,
        io,
        app,
        initialized,
        module;

    nodeHTTP = nodeRequire('http');
    nodeSocket = nodeRequire('socket.io');
    initialized = false;


    module = {
        init: function (){
            if(initialized){
                return;
            }

            initialized = true;

            app = nodeHTTP.createServer(function (request, response){

                if(request.url === '/simpless.js'){
                    response.writeHead(200, {'Content-Type': 'application/javascript'});
                    response.write(srcBrowserPushClient.replace(/%host%/g, request.headers.host));
                    response.end();
                } /*else {
                    response.writeHead(404, {'Content-Type': 'text/plain'});
                    response.write('404 not found\n');
                    response.end();
                }*/

            }).listen(5377);

            io = nodeSocket.listen(app);

            io.sockets.on('connection', function (socket){

                console.log('Browser is connected');

                central.on('compilation', function (file){

                    console.log('Browser push: ' + file.get('outputFileName'));

                    socket.emit(file.get('outputFileName'));
                });
            });
        }
    };

    return module;
});