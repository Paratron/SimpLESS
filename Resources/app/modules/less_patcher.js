/**
 * less_patcher
 * ===========
 * description
 */
define(['text!templates/less_xhr_replacement.js', 'text!templates/less_error_replacement.js'], function(xhr_replacement, error_replacement){
    var obj = {
        patch: function(code){
            var xhr_start = code.indexOf('function xhr(');
            var xhr_end = code.indexOf('function getXMLHttpRequest(');

            if(xhr_start === -1 || xhr_end === -1) return false;

            var new_code = code.substr(0, xhr_start) + xhr_replacement + code.substr(xhr_end, code.length - xhr_end);



            var error_start = new_code.indexOf('function error(e, href)');
            var error_end = new_code.indexOf('})(window);', error_start);

            new_code = new_code.substr(0, error_start) + error_replacement + new_code.substr(error_end, new_code.length - (error_end-1));

            return new_code;
        }
    }

    return obj;
});