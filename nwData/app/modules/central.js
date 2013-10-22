/**
 * central
 * ===========
 * description
 */
'use strict';

define([], function (){
    var nodeFS,
        nodeLESS,
        pathSeparator;

    nodeFS = nodeRequire('fs');
    nodeLESS = nodeRequire('less');

    document.title += ' - less v' + nodeLESS.version.join('.');

    var central = window.central = {
        _models: {},
        _collections: {}
    };

    _.extend(central, Backbone.Events);

    /**
     * Default Model to keep watching on LESS files.
     * @type {*}
     */
    central._models.File = Backbone.Model.extend({
        defaults: {
            inputPath: '',
            inputFolder: '',
            outputPath: '',
            fileName: '',
            lastChange: 0,
            includes: 0,
            doPrefix: false,
            doMinify: true,
            doLove: true,
            state: 0
        },
        initialize: function (){
            var path,
                that;

            path = this.attributes.inputPath.split('/');
            that = this;

            this.attributes.fileName = path.pop();
            this.attributes.inputFolder = path.join('/') + '/';

            this.on('change:outputPath', function(){
                this.set('outputFileName', this.get('outputPath').split('/').pop());
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

            this.watcher = nodeFS.watch(this.attributes.inputPath, function (event){
                if(event === 'change'){
                    that.compile();
                    that.getFileMTime();
                    return;
                }

                if(event === 'rename'){
                    var name;
                    that.stopListening();
                    name = that.get('fileName');
                    central.observedFiles.remove(that);
                    alert('Stopped watching "' + name + '" because it has been renamed or deleted.');
                }
            });
        },
        /**
         * Compiles the LESS source to CSS.
         */
        compile: function (){
            var that,
                parser;

            that = this;

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

                    css = tree.toCSS(that.get('doMinify'));

                    nodeFS.writeFile(that.get('outputPath'), css);

                    that.set('state', 1);

                    central.trigger('compilation', that);

                    setTimeout(function (){
                        that.set('state', 0);
                    }, 3000);
                });
            });
        },
        /**
         * Gets the current input file change time.
         */
        getFileMTime: function (){
            var that;

            that = this;

            nodeFS.stat(that.get('inputPath'), function (err, stat){
                if(stat){
                    that.set('lastChange', (new Date(stat.mtime)).getTime());
                }
            });
        },
        /**
         * Stops the file watcher before the object is being destroyed.
         */
        stopWatching: function (){
            this.watcher.close();
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