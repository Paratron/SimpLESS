define([], function () {

    var setting_defaults = {
        minify:true,
        prefix:false,
        love:true
    };

    var File_Model = Backbone.Model.extend({
        defaults:{
            input_file:null,
            output_file:null,
            last_compilation:0,
            absolute_path:'',
            constraints:[],
            settings:{
                minify:setting_defaults.minify,
                prefix:setting_defaults.prefix,
                love:setting_defaults.love,
                output_path:''
            },
            error:null,
            uploading:false
        },
        initialize:function () {
            var abspath = this.get('input_file').nativePath();

            this.set({
                absolute_path:abspath,
                last_compilation:(new Date()).getTime() * 1000
            });


            //Make sure to keep settings for files stored and re-load them if the file is dropped again.
            var preserved_settings = localStorage.getItem('file_' + abspath);
            if (preserved_settings) {
                preserved_settings = JSON.parse(preserved_settings);
                this.set({
                    settings:preserved_settings
                });
                if (typeof preserved_settings.output_file != 'undefined') {
                    this.set({
                        output_file:Ti.Filesystem.getFile(preserved_settings.output_file)
                    });
                }
            }

            this.bind('change:settings', function (dta) {
                dta.output_file = this.get('output_file').nativePath();
                localStorage.setItem('file_' + abspath, JSON.stringify(dta))
            }, this);

            if (this.get('output_file') == null) {
                var newfile = Ti.Filesystem.getFile(this.get('input_file').nativePath().replace('.less', '.css'));
                this.set({
                    output_file:newfile
                })
            }
        }
    });

    return File_Model;
});