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
        winBody;

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
        position: null
    });

    var movement,
        x;

    function update(msg, className){
        var document;

        document = win.window.document;

        document.body.className = className;
        document.getElementById('msg').innerHTML = msg;

        win.height = document.body.offsetHeight;
    }

    function slideUp(){
        var intv,
            y;

        movement = 'up';
        y = win.y;
        win.show();
        win.setAlwaysOnTop(false);
        win.setAlwaysOnTop(true);


        intv = setInterval(function (){
            if(y < screen.height - win.height - 49 || movement !== 'up'){
                clearInterval(intv);
                return;
            }

            y -= 5;
            win.moveTo(x, y);
        }, 1);
    }

    function slideDown(){
        var intv,
            y;

        movement = 'down';
        y = win.y;

        intv = setInterval(function (){
            if(y > screen.height || movement !== 'down'){
                if(movement === 'down'){
                    win.hide();
                }
                clearInterval(intv);
                return;
            }

            y += 5;
            win.moveTo(x, y);
        }, 1);
    }

    win.on('loaded', function (){
        x = screen.width - win.width - 50;

        win.moveTo(x, screen.height);
        win.hide();

        central.on('compilation', function (){
            update('Compilation successful!', 'success');
            slideUp();

            setTimeout(function(){
                slideDown();
            }, 2000);
        });

        central.on('compilationError', function(obj){
            var err;
            err = obj.get('error');
            update('Compilation error in file:<br><b>' + err.filename.replace(obj.get('inputFolder'), '') + '</b> on line <b>' + err.line + '</b><br>' + err.message, 'error');
            slideUp();

            setTimeout(function(){
                slideDown();
            }, 10000);
        })
    });
});