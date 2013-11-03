/**
 * central
 * ===========
 * description
 */
'use strict';

define([], function (){
    var nodeFS,
        nodeLESS,
        pathSeparator,
        console;

    //Catching potential nodeJS namespacing conflicts.
    console = window.console;

    Backbone.sync = function (){
    };

    nodeFS = nodeRequire('fs');
    nodeLESS = nodeRequire('less');

    document.title += ' - less v' + nodeLESS.version.join('.');

    var central = window.central = {
        _models: {},
        _collections: {}
    };

    _.extend(central, Backbone.Events);

    /**
     * A file watcher element that automatically triggers compilation on the model that
     * has created the element.
     */
    central._models.FileWatcher = Backbone.Model.extend({
        defaults: {
            fileName: '',
            listModel: null
        },
        idAttribute: 'fileName',
        initialize: function (){
            var that;

            that = this;

            if(!nodeFS.existsSync(this.get('fileName'))){
                this.destroy();
                return;
            }

            this.on('destroy', function (){
                console.log('Not watching ' + that.get('fileName') + ' anymore...');
                this.watcher.close();
            });

            this.watcher = nodeFS.watch(this.get('fileName'), function (event, fileName){
                if(event === 'change'){
                    that.get('listModel').compile();
                    return;
                }
            });

            console.log('Now watching ' + this.get('fileName'));
        }
    });

    central._collections.FileWatcherCollection = Backbone.Collection.extend({
        model: central._models.FileWatcher
    });

    //===================================================================

    /**
     * Default Model to keep watching on LESS files.
     * TODO: Detect if files have been deleted/renamed.
     * @type {*}
     */
    central._models.File = Backbone.Model.extend({
        defaults: {
            inputPath: '',
            inputFolder: '',
            outputPath: '',
            fileName: '',
            lastChange: 0,
            doPrefix: false,
            doMinify: true,
            doLove: true,
            state: 0,
            fileWatchers: null
        },
        initialize: function (){
            var path,
                that;

            path = this.attributes.inputPath.split('/');
            that = this;

            this.attributes.fileWatchers = new central._collections.FileWatcherCollection();

            this.attributes.fileName = path.pop();
            this.attributes.inputFolder = path.join('/') + '/';

            this.on('change:outputPath', function (){
                this.set('outputFileName', this.get('outputPath').split('/').pop());
                this.getFileMTime();
            });

            this.set('outputPath', path.join('/') + '/' + this.get('fileName').replace('.less', '.css'));

            //Is there a subdirectory "css" in this folder?
            nodeFS.exists(path.join('/') + '/css/', function (exists){
                if(exists){
                    that.set('outputPath', path.join('/') + '/css/' + that.get('fileName').replace('.less', '.css'));
                }
            });

            //Is there a subdirectory "css" in the parent folder?
            nodeFS.exists(path.slice(0, -1).join('/') + '/css/', function (exists){
                if(exists){
                    that.set('outputPath', path.slice(0, -1).join('/') + '/css/' + that.get('fileName').replace('.less', '.css'));
                }
            });

            this.getFileMTime();

            //Watch the Input File!
            this.attributes.fileWatchers.add({
                fileName: this.get('inputPath'),
                listModel: that
            });

            console.log('Imports: ', this.getImportedPaths(this.get('inputPath')));
        },
        isWatching: function(filename){
            var result;

            result = false;

            this.get('fileWatchers').each(function(f){
                if(f.get('fileName') === filename){
                    result = true;
                    return false;
                }
            });

            return result;
        },
        /**
         * Compiles the LESS source to CSS.
         */
        compile: function (){
            var that,
                parser,
                i,
                importedFiles;

            that = this;

            //Update the List of file watchers.
            importedFiles = this.getImportedPaths(this.get('inputPath'), true);

            //First, try to add all files again. Already watched files will be ignored.
            for (i = 0; i < importedFiles.length; i++) {
                if(!this.isWatching(importedFiles[i])){
                    this.get('fileWatchers').add({
                        fileName: importedFiles[i],
                        listModel: that
                    });
                }
            }

            //Now, remove all watchers of files, no longer being imported.
            this.get('fileWatchers').each(function (watcher){
                if(watcher.get('fileName') === that.get('inputPath')){
                    return;
                }
                if(importedFiles.indexOf(watcher.get('fileName')) === -1){
                    watcher.destroy();
                }
            });

            nodeFS.readFile(that.get('inputPath'), {encoding: 'utf8'}, function (err, data){
                parser = new (nodeLESS.Parser)({
                    paths: ['.'],
                    filename: that.get('inputPath')
                });

                parser.parse(data, function (e, tree){
                    var css;

                    if(e){
                        that.set({
                            state: 2,
                            error: e
                        });
                        return;
                    }

                    css = tree.toCSS({
                        compress: that.get('doMinify')
                    });

                    nodeFS.writeFile(that.get('outputPath'), css);

                    that.set('state', 1);

                    central.trigger('compilation', that);

                    that.getFileMTime();

                    setTimeout(function (){
                        that.set('state', 0);
                    }, 3000);
                });
            });
        },
        /**
         * This method will scan the less file (and included less files) for @import
         * statements and will fetch a list of paths to all less files to be watched.
         */
        getImportedPaths: function (filename, justFind){
            var that,
                i,
                fs,
                path,
                regex,
                fileContent,
                result,
                imports,
                importFile,
                filePath;

            that = this;
            fs = nodeRequire('fs');
            path = nodeRequire('path');

            regex = /^[^\n/]*@import.+?["'](.+?)["']/gm;
            imports = [];
            filePath = path.dirname(filename);

            fileContent = fs.readFileSync(filename, {encoding: 'utf8'});

            console.log('Searching for @imports in ' + filename);

            while (result = regex.exec(fileContent)) {
                importFile = path.resolve(filePath, result[1]);
                if(importFile === true){
                    continue;
                }
                if(fs.existsSync(importFile)){
                    imports.push(importFile);
                    imports = imports.concat(that.getImportedPaths(importFile, true));
                }
            }

            console.log(imports.length + ' @imports found');

            if(!justFind){
                console.log('Creating watchers for found files...');

                for (i = 0; i < imports.length; i++) {
                    that.get('fileWatchers').add({
                        fileName: imports[i],
                        listModel: that
                    });
                }
            }

            return imports;
        },
        /**
         * Gets the current input file change time.
         */
        getFileMTime: function (){
            var that;

            that = this;

            nodeFS.stat(that.get('outputPath'), function (err, stat){
                if(stat){
                    that.set('lastChange', (new Date(stat.mtime)).getTime());
                }
            });
        },
        /**
         * Stops the file watcher before the object is being destroyed.
         */
        stopWatching: function (){
            this.get('fileWatchers').each(function (watcher){
                watcher.destroy();
            });
        }
    });

    /**
     * This is a collection for file objects.
     * @type {*}
     */
    central._collections.Files = Backbone.Collection.extend({
        model: central._models.File
    });

    /**
     * The Main Files Collection.
     * @type {central._collections.Files}
     */
    central.observedFiles = new central._collections.Files();

    return central;
});