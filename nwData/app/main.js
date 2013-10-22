/**
 * SimpLESS 2.0
 * ============
 * Getting rid of the legacy titanium/tidesdk framework.
 * Hooray for node-webkit!
 *
 * @author: Christian Engel <hello@wearekiss.com>
 * @version: 2.0
 */
'use strict';

require.nodeRequire = window.nodeRequire;

define(['ui/base'], function (ui){
    modo.init(ui.root);

    require(['modules/browserPush'], function(browserPush){
        browserPush.init();
    });

    require(['modules/updater'], function(updater){
        updater.check().then(function(){
            var decision;

            decision = prompt('A new version of SimpLESS is available.\nDo you want to open your web browser and download it?');

            if(decision){
                window.gui.Shell.openExternal('http://wearekiss.com/simpless');
            }
        });
    });
});