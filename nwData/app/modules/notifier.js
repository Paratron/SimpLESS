/**
 * notifier
 * ========
 * The notifier will listen to central "compilation" and "compilationError" events
 * and display a notification window for them.
 */
define(['modules/central'], function (central){
    'use strict';

    var gui,
        win,
        winBody,
        hideTimer;

    gui = nodeRequire('nw.gui');

    win = gui.Window.open('app/templates/notification.html', {
        title: 'Notification',
        toolbar: false,
        frame: false,
        transparent: true,          //Sadly not supported right now :(
        'always-on-top': true,
        focus: false,
        resizable: false,
        width: 300,
        height: 100,
        show: false,
        position: null
    });

    function update(msg, className){
        var document;

        document = win.window.document;

        document.body.className = className;
        document.getElementById('msg').innerHTML = msg;

        win.height = document.body.offsetHeight;
    }


    win.on('loaded', function (){
        var x, y;

        x = screen.width - win.width - 50;
        y = screen.height - win.height - 50;

        win.moveTo(x, y);
        win.hide();

        central.on('compilation', function (){
            update('Compilation successful!', 'success');
            win.show();

            clearTimeout(hideTimer);
            hideTimer = setTimeout(function (){
                win.hide();
            }, 2000);
        });

        central.on('compilationError', function (obj){
            var err;
            err = obj.get('error');
            update('Compilation error in file:<br><b>' + err.filename.replace(obj.get('inputFolder'), '') + '</b> on line <b>' + err.line + '</b><br>' + err.message, 'error');
            win.show();

            clearTimeout(hideTimer);
            hideTimer = setTimeout(function (){
                win.hide();
            }, 20000);
        });

        central.on('connect', function (){
            update('Browser has connected.', 'connect');
            win.show();

            clearTimeout(hideTimer);
            hideTimer = setTimeout(function (){
                win.hide();
            }, 2000);
        });
    });
});