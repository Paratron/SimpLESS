/**
 * base
 * ===========
 * description
 */
'use strict';

define(['modules/central', 'text!templates/filesList.html'], function (central, tplFileListEntry){
    var ui,
        nodePath,
        nodeFS;

    tplFileListEntry = _.template(tplFileListEntry);
    nodePath = nodeRequire('path');
    nodeFS = nodeRequire('fs');

    ui = modo.generate([
        {
            type: 'FlexContainer',
            ref: 'root',
            params: {
                direction: modo.FlexContainer.VERTICAL
            },
            children: [
                {
                    type: 'List',
                    flexible: true,
                    params: {
                        className: 'filesList',
                        data: central.observedFiles,
                        itemRender: tplFileListEntry,
                        emptyRender: function (){
                            return '<div></div>';
                        },
                        itemEvents: {
                            'click .remove': function (e, i, m){
                                m.stopWatching();
                                central.observedFiles.remove(m);
                            },
                            'click .recompile': function (e, i, m){
                                m.compile();
                            },
                            'click .minify': function (e, i, m){
                                m.set('doMinify', !m.get('doMinify'));
                            },
                            'click .love': function (e, i, m){
                                m.set('doLove', !m.get('doLove'));
                            },
                            'click .pickOutputPath': function (e, i, m){
                                var workingDir;

                                workingDir = nodePath.dirname(m.get('outputPath'));

                                if(process.platform === 'win32'){
                                    workingDir = workingDir.replace(/\//g, '\\');
                                }

                                $('#saveFile')
                                    .attr('nwworkingdir', workingDir)
                                    .attr('nwsaveas', nodePath.basename(m.get('outputPath')))
                                    .trigger('click')
                                    .one('change', function (){
                                        m.set('outputPath', $(this).val().replace(/\\/g, '/'));
                                    });
                            }
                        }
                    }
                },
                {
                    type: 'Container',
                    params: {
                        className: 'bottomBar'
                    },
                    children: [
                        {
                            type: 'Label',
                            params: {
                                className: 'logo',
                                value: '<b>SimpLESS</b> your *.less compiler'
                            }
                        },
                        {
                            type: 'Container',
                            rel: 'bottomBar',
                            params: {
                                className: 'bottomBarButtons'
                            }
                        },
                        {
                            type: 'Label',
                            params: {
                                className: 'saveFile',
                                value: '<input type="file" id="saveFile" nwsaveas="">'
                            }
                        }
                    ]
                }
            ]
        }
    ]);

    window.ondragover = window.ondrop = function (e){
        e.preventDefault();
    };

    function readDir(filePath){
        var i;

        nodeFS.readdir(filePath, function (err, files){
            if(err){
                return;
            }

            if(filePath.substr(-1) !== '/'){
                filePath += '/';
            }

            for (i = 0; i < files.length; i++) {
                if(nodeFS.statSync(filePath + files[i]).isDirectory()){
                    readDir(filePath + files[i]);
                    continue;
                }
                if(files[i].substr(-5).toLowerCase() === '.less'){
                    central.observedFiles.add({
                        inputPath: filePath + files[i]
                    });
                }
            }
        });
    }

    //Listening for file drops.
    ui.root.el.on('dragover',function (e){

        $(this).addClass('dropFile');

    }).on('dragend',function (){

            $(this).removeClass('dropFile');

        }).on('drop', function (e){
            var i,
                filePath;

            e.preventDefault();
            e.stopPropagation();

            for (i = 0; i < e.originalEvent.dataTransfer.files.length; i++) {
                filePath = e.originalEvent.dataTransfer.files[i].path;
                filePath = filePath.replace(/\\/g, '/');

                if(nodeFS.statSync(filePath).isDirectory()){
                    //Its a folder!
                    readDir(filePath);
                } else {
                    if(filePath.substr(-5).toLowerCase() === '.less'){
                        central.observedFiles.add({
                            inputPath: filePath
                        });
                    }
                }
            }

            $(this).removeClass('dropFile');

        });

    return ui;
});