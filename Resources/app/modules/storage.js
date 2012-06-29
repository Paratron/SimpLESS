/**
 * Storage
 * ===========
 * This module handles the observed .less files and starts the compilation process, if needed.
 */
define(['modules/compiler'], function (compiler) {
    var observed_files = new Backbone.Collection();

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
                        output_file:Titanium.Filesystem.getFile(preserved_settings.output_file)
                    });
                }
            }

            this.bind('change:settings', function (dta) {
                dta.output_file = this.get('output_file').nativePath();
                localStorage.setItem('file_' + abspath, JSON.stringify(dta))
            }, this);

            if (this.get('output_file') == null) {
                var newfile = Titanium.Filesystem.getFile(this.get('input_file').nativePath().replace('.less', '.css'));
                this.set({
                    output_file:newfile
                })
            }
        }
    });

    /**
     * Will get a file by a relative path to another one.
     * Originally this should work by calling [ti_file].resolve() but it doesnt. :/
     * @param ti_file
     * @param path
     * @return Titanium.Filesystem.File
     */
    function grep(ti_file, path) {
        if (!path) return this;
        var mypath = ti_file.toString(),
                s = Titanium.Filesystem.getSeparator(),
                my_chain = mypath.split(s),
                grep_chain = path.split(s),
                i,
                g;

        //Get rid of the filename, if there is any.
        if (ti_file.isFile()) {
            my_chain.pop();
        }

        for (i in grep_chain) {
            g = grep_chain[i];
            if (g == '.') continue;
            if (g == '..') {
                my_chain.pop();
                continue;
            }
            my_chain.push(g);
        }

        return Titanium.Filesystem.getFile(my_chain.join(s));
    }

    /**
     * Saves the list of currently loaded LESS files into local storage.
     */
    function to_storage(){
        var list = [];
        observed_files.each(function(item){
            list.push(item.get('input_file').nativePath());
        });
        localStorage.setItem('file_list', JSON.stringify(list));
    }

    function from_storage(){
        var list = JSON.parse(localStorage.getItem('file_list'));
        if(!list) return;
        observed_files.reset();
        _.each(list, function(item){
            var file = Titanium.Filesystem.getFile(item);
            if(file.exists){
                read_file(file);
            }
        });
    }

    /**
     * This will read a file from the harddrive and store it in the observed files array (if not already there).
     * @param ti_file_obj
     */
    function read_file(ti_file_obj) {
        //We read only .less files.
        if (String(ti_file_obj.extension()).toLowerCase() != 'less') {
            return 0;
        }

        var np = ti_file_obj.nativePath(),
                found = false;
        observed_files.each(function(file){
            if(file.get('input_file').nativePath() == np){
                alert(np+'\nIs already in the indexed file list.');
                found = true;
            }
        });
        if(found) return;

        observed_files.add(new File_Model({
            input_file:ti_file_obj,
            constraints:find_constraints(ti_file_obj),
            settings:{
                minify:setting_defaults.minify,
                prefix:setting_defaults.prefix,
                love:setting_defaults.love
            }
        }));
        to_storage();
    }

    /**
     * Will cycle through a folder recursively and pass all .less files inside it to the read_file() method.
     * @param ti_file_obj
     */
    function read_folder(ti_file_obj) {
        _.each(ti_file_obj.getDirectoryListing(), function (file) {
            if (file.isDirectory()) {
                read_folder(file);
            } else {
                if (file.extension().toString().toLowerCase() == 'less') read_file(file);
            }
        });
    }

    /**
     * Finds all @import statements and returns them.
     * @param ti_file_obj
     */
    function find_constraints(ti_file_obj) {
        if (ti_file_obj.exists() == false || ti_file_obj.size() == 0) return [];
        var source = ti_file_obj.open().read().toString(), //Content of the .less file
                reg_exp = /@import[ \(\"\']*([^\"\'\);\n]+)[;\)\"\']*/g;    //The RegEx magic that detects our import statements =]

        //Find @imports in this file.
        var result,
                filepath,
                tempfile,
                files = [];
        while (result = reg_exp.exec(source)) {
            filepath = result[1].replace('url(', '');
            tempfile = ti_file_obj.resolve(filepath);
            if(!tempfile.exists()) tempfile = ti_file_obj.resolve(filepath + '.less');
            if (tempfile.exists()) {
                if(tempfile.extension().toString().toLowerCase() == 'less'){
                    files.push(tempfile);
                    files.concat(find_constraints(tempfile));
                }
            } else {
                console.log(tempfile.nativePath() + ' does not exist.');
            }
        }

        return files;
    }

    var obj = {
        /**
         * The backbone collection of currently observerd files.
         */
        collection:observed_files,

        /**
         * This will add a new file or folder to the list of observed files, if its not already there.
         * @param element
         */
        add:function (element) {
            var filetest = Titanium.Filesystem.getFile(element.path);
            if (filetest.isDirectory()) {
                return read_folder(filetest);
            } else {
                return read_file(filetest);
            }
        },

        remove:function (model) {
            observed_files.remove(model);
            to_storage();
        },

        flush:function () {
            observed_files.reset();
        },
        restore_files: function(){
            from_storage();
        }
    }

    /**
     * Constantly polling the files.
     */
    setInterval(function () {
        observed_files.each(function (lessfile) {
            var last_compilation = lessfile.get('last_compilation');

            _.each(lessfile.get('constraints'), function (file) {
                if (file.modificationTimestamp() > last_compilation) {
                    lessfile.set({
                        constraints:find_constraints(lessfile.get('input_file'))
                    });
                    compiler.compile(lessfile);
                }
            });

            if (lessfile.get('input_file').modificationTimestamp() > last_compilation) {
                lessfile.set({
                    constraints:find_constraints(lessfile.get('input_file'))
                });
                compiler.compile(lessfile);
            }
        });
    }, 1000);

    return obj;
});