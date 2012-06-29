function xhr(url, type, callback, errback) {
        var a = 'b';
        //Okay, callback awaits (data, lastModified);
        //errback awaits (status, url) (both strings)

        if (url.substr(0, 7) == 'http://' || url.substr(0, 8) == 'https://' || url.substr(0, 6) == 'ftp://') {
            //AJAX load.
            window.$.ajax({
                url:url,
                timeout:500,
                error:function (jqXHR, textStatus, errorThrown) {
                    window.require(['modules/compiler'], function (compiler) {
                        compiler.current_model.trigger('compilation:error', {message:textStatus, filename:url});
                    });
                    errback(textStatus, url);
                },
                success:function (data) {
                    callback(data, 0);
                }
            });
        } else {
            //FILE load.
            window.require(['modules/compiler'], function (compiler) {
                var current_basefile = compiler.current_model.get('input_file'),
                        sep = Titanium.Filesystem.getSeparator();

                var current_file = current_basefile.resolve(url);

                if(!current_file.exists()) current_file = current_basefile.resolve(url+'.less');

                if (current_file.exists()) {
                    var lesscode = '';
                    if(current_file.size()){
                        lesscode = current_file.open().read().toString();
                    }
                    callback(lesscode, current_file.modificationTimestamp());
                } else {
                    compiler.current_model.trigger('compilation:error', {message:'File not found', filename:current_file.nativePath()});
                    errback('File not found', current_file.nativePath());
                }
            });
        }
    }