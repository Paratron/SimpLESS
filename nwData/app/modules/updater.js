/**
 * updater
 * ===========
 * description
 */
 'use strict';
 
define([], function(){
    var module,
        md5,
        http,
        updateInfo;

    http = nodeRequire('http');

    if(window.gui){
        updateInfo = window.gui.App.manifest.update;
    }

    module = {
        /**
         * Will check the server for an update.
         */
        check: function(){
            var defer;

            defer = Q.defer();

            console.log('Checking for updates');

            $.getJSON(updateInfo.url, function(response){
                console.log('Update-Information fetched');

                if(response.version !== window.gui.App.manifest.version){
                    defer.resolve();
                } else {
                    console.log('SimpLESS is up to date!');
                    defer.reject();
                }
            });

            return defer.promise;
        }
    };

    return module;
});