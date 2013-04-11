/**
 * Storage
 * ===========
 * This module handles the observed .less files and starts the compilation process, if needed.
 */
define(['modules/compiler',
        'text!templates/tester-modal.html'], function (compiler, tmp_src_modalHtml) {

    console.log('hi i am in tester');

    function startTests(){
        $body = $('body');
        $body.on('click','#test-modal a.close',function(e){
            $('#test-modal').remove();
        });
        $elm = $body.append(tmp_src_modalHtml);


    }

    return{
        startTests:startTests
    }
})