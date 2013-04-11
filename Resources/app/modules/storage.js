/**
 * Storage
 * ===========
 * This module handles the observed .less files and starts the compilation process, if needed.
 */
define(['modules/compiler','modules/File_Model'], function (compiler,File_Model) {
    var observed_files = new Backbone.Collection();

    var setting_defaults = {
        minify:true,
        prefix:false,
        love:true
    };

    /**
     * Will get a file by a relative path to another one.
     * Originally this should work by calling [ti_file].resolve() but it doesnt. :/
     * @param ti_file
     * @param path
     * @return Ti.Filesystem.File
     */
    function grep(ti_file, path) {
        if (!path) return this;
        var mypath = ti_file.toString(),
                s = Ti.Filesystem.getSeparator(),
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

        return Ti.Filesystem.getFile(my_chain.join(s));
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
            var file = Ti.Filesystem.getFile(item);
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
            //TODO : not sure we need to add these settings here.
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
     * @param additive_arr
     */
    function find_constraints(ti_file_obj, additive_arr) {
        if(!additive_arr) additive_arr = [];
        if (ti_file_obj.exists() == false || ti_file_obj.size() == 0) return additive_arr;
        var source = ti_file_obj.open().read().toString(), //Content of the .less file
                reg_exp = /@import[ \(\"\']*([^\"\'\);\n]+)[;\)\"\']*/g;    //The RegEx magic that detects our import statements =]

        //Find @imports in this file.
        var result,
                filepath,
                tempfile,
                files = [];
        while (result = reg_exp.exec(source)) {
            filepath = result[1].replace('url(', '');
            var ti_folder_obj = ti_file_obj.isDirectory() ? ti_file_obj : ti_file_obj.parent();
            tempfile = ti_folder_obj.resolve(filepath);
            if(!tempfile.exists()) tempfile = ti_folder_obj.resolve(filepath + '.less');
            if (tempfile.exists()) {
                if(tempfile.extension().toString().toLowerCase() == 'less'){
                    files.push(tempfile);
                    files.concat(find_constraints(tempfile));
                }
            } else {
                console.log(tempfile.nativePath() + ' does not exist.');
            }
        }
        //now lets clean the files list of duplicates aleardy in additive_arr
        var clean_files = [];
        for(var i=0; i < files.length; i++){
          var isClean = true;
          for(var p=0; p < additive_arr.length; p++){
            if(additive_arr[p].toURL() === files[i].toURL()) isClean = false;
          }
          if(isClean) clean_files.push(files[i]);
        }

        // clean_files are now all unique ones not in additive_arr
        // add all of them to additive_arr
        additive_arr = additive_arr.concat(clean_files);

        //now for each clean_files, find their imports
        for(var x = 0; x < clean_files.length; x++){
          additive_arr = find_constraints(clean_files[x],additive_arr);
        }

        return additive_arr;
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
            var filetest = Ti.Filesystem.getFile(element.path);
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