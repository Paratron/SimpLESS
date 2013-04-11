define([], function () {

    var setting_defaults = {
        minify:true,
        prefix:false,
        love:true,
        lineDebug:false
    };

    var File_Model = Backbone.Model.extend({
        defaults:{
            input_file:null,
            output_file:null,
            last_compilation:0,
            absolute_path:'',
            constraints:[],
            skipStorage:false,
            settings:{
                minify:setting_defaults.minify,
                prefix:setting_defaults.prefix,
                love:setting_defaults.love,
                lineDebug:setting_defaults.lineDebug,
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
                if(this.get('skipStorage') !== true){
                    dta.output_file = this.get('output_file').nativePath();
                    localStorage.setItem('file_' + abspath, JSON.stringify(dta))
                }
            }, this);

            if (this.get('output_file') == null && this.get('skipStorage') !== true) {
                var newfile = Ti.Filesystem.getFile(this.get('input_file').nativePath().replace('.less', '.css'));
                this.set({
                    output_file:newfile
                })
            }
        }
    });

    return File_Model;
});