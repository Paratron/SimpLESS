/**
 * Storage
 * ===========
 * This module handles the observed .less files and starts the compilation process, if needed.
 */
define(['modules/compiler',
        'text!templates/tester-modal.html'], function (compiler, tmp_src_modalHtml) {

    console.log('to run tests, write : startTests() in the console.');

    window.startTests = function(){
        $body = $('body');
        $body.on('click','#test-modal a.close',function(e){
            $('#test-modal').remove();
            QUnit.reset();
        });
        $elm = $body.append(tmp_src_modalHtml);


        QUnit.init();
        QUnit.load();

        test( "hello test", function() {
            ok( 1 == "1", "Passed!" );
        });
        test( "a basic test example", function() {
            var value = "hello";
            equal( value, "hello", "We expect value to be hello" );
        });
        QUnit.start();

        return "Starting Tests...";
    };
})