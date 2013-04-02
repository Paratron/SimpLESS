/**
 * notification
 * ===========
 * A wrapper for the ti-notifications because the setup of that thing sucks -.-
 */
define(function(){

    var settings = {
        duration: 10000,
        icon: 'file:///'+Ti.App.getIcon().replace(/\\/g, '/')
    }

    var obj = {
        config: function(params){
            _.extend(settings, params);
        },
        show: function(params){
            var n = Ti.Notification.createNotification();

            if(params.icon){
                params.icon = 'file:///' + Ti.Filesystem.getResourcesDirectory().resolve('Resources/'+params.icon).nativePath().replace(/\\/g, '/');
            }

            var params = _.extend(settings, params);

            n.setMessage(params.message);
            n.setIcon(params.icon);
            n.setTimeout(params.duration);
            n.setTitle('SimpLESS - ' + params.title);
            n.show();
        }
    }

    return obj;
});