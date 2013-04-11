/**
 * Storage
 * ===========
 * This module handles the observed .less files and starts the compilation process, if needed.
 */
define(['modules/compiler',
        'modules/file_model',
        'text!templates/tester-modal.html'], function (compiler, File_Model, tmp_src_modalHtml) {

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

        module('Simplest Tests');

        test( "Hello World Test", function() {
            var value = "hello";
            equal( value, "hello", "We expect value to be hello" );
        });

        asyncTest( "asynchronous test: one second later!", function() {
            expect( 1 );

            setTimeout(function() {
                ok( true, "Passed and ready to resume!" );
                start();
            }, 1000);
        });


        module('Compiler-Tests');

        //TODO : we will want to loop through the subdirectories so we can run many tests


        asyncTest( "1-simple-vars", function() {
            var inputFile = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDirectory(),'/Resources/tests/compiler-tests/1-simple-vars/input.less');
            var fileModel = new File_Model({
                input_file:inputFile,
                skipStorage:true
            });

            var outputFile = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDirectory(),'/Resources/tests/compiler-tests/1-simple-vars/output.css');
            var expectedCss = outputFile.open().read().toString();

            compiler.compile_to_string(fileModel,function(model,css){
                var passed = (css === expectedCss);

                if(!passed){
                    //we want to dump the vars
                    console.log('compiled',css);
                    console.log('expected',expectedCss);
                }
                ok( passed, "Compiled LESS matches expected output" );
                start();
            });
        });


        asyncTest( "2-paths", function() {
            var inputFile = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDirectory(),'/Resources/tests/compiler-tests/2-paths/input.less');
            var fileModel = new File_Model({
                input_file:inputFile,
                skipStorage:true
            });

            var outputFile = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDirectory(),'/Resources/tests/compiler-tests/2-paths/output.css');
            var expectedCss = outputFile.open().read().toString();

            compiler.compile_to_string(fileModel,function(model,css){
                var passed = (css === expectedCss);

                if(!passed){
                    //we want to dump the vars
                    console.log('compiled:');
                    console.log(css)
                    console.log('expected:');
                    console.log(expectedCss)
                }
                ok( passed, "Compiled LESS matches expected output" );
                start();
            });
        });


        QUnit.start();

        return "Starting Tests...";
    };
})