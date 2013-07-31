/**
 * compiler
 * ===========
 * The compiler module compiles a .less file to CSS and performs a couple of optimizations on it, if necessary.
 */
define(['less', '3p/cleancss'], function (less, cleancss) {

    less.env = 'development';

    var love_insertion = '/* This beautiful CSS-File has been crafted with LESS (lesscss.org) and compiled by simpLESS (wearekiss.com/simpless) */\n';
    var beginning_comment = '';

    function save_css_file(model, csscode) {
        var dta = model.toJSON();
        if (beginning_comment) {
            csscode = beginning_comment + '\n' + csscode;
        }
        if (dta.settings.love) {
            csscode += '\n' + love_insertion
        }
        dta.output_file.touch();
        dta.output_file.setWritable();
        var stream = dta.output_file.open();

        csscode = csscode.replace(/app:\/\/com.wearekiss.simpless\//g, '');

        stream.open(stream.MODE_WRITE);
        stream.write(csscode);
        stream.close();
        model.trigger('compilation:success');
        model.collection.trigger('compilation:success');
    }

    function postCreateCleanup(css){

        //this is due to mechanism in less.js which is assumeing a browser.
        //TODO cleanup
        css = css.split('file\\:\\/\\/file\\:\\/\\/').join('file\\:\\/\\/')

        return css;
    }

    var obj = {
        current_model:null,
        compile:function (model) {
            var model_dta = model.toJSON();

            model.set({
                last_compilation:(new Date()).getTime() * 1000,
                error:null
            });

            obj.current_model = model;

            var lesscode = model_dta.input_file.open().read().toString();
            
            
            var parserConfig = {
              // Specify search paths for @import directives
              'paths' : [
                model_dta.input_file.parent().toURL() + '/' //folder toURL requires trailing slash
              ],
                filename: model_dta.input_file.toURL()  // Specify a filename, for better error messages
            };

            // alittle ugly because lesscss 3.31 doesn't passthrough debug to imports.
            //thus the need for the static less.dumpLineNumbers
            if(model_dta.settings.debugLines){
              less.dumpLineNumbers = true; 
              parserConfig.dumpLineNumbers = 'all';
            }else{
              less.dumpLineNumbers = false;
            }
            var parser = new less.Parser(parserConfig);

            try {
                parser.parse(lesscode, function (err, tree) {
                    if (err) {
                        model.set({
                            error:err
                        });
                        model.trigger('compilation:error', err);
                        model.collection.trigger('compilation:error', err);
                        return;
                    }

                    var csscode = tree.toCSS(parserConfig);

                    csscode = postCreateCleanup(csscode);

                    var comment_regex = /^\/\*([^\*\/]+?)\*\//gm;
                    var result = comment_regex.exec(csscode);
                    if (result) {
                        beginning_comment = result[0];
                    } else {
                        beginning_comment = '';
                    }

                    if (model_dta.settings.minify) {
                        csscode = cleancss.process(csscode);
                    }

                    if (model_dta.settings.prefix) {
                        model.set({
                            uploading:true
                        });
                        var ajax_data = {
                            css:csscode,
                            simpless:settings.version
                        }
                        if (model_dta.settings.minify) {
                            ajax_data.compress_option = 'on';
                        }
                        $.ajax({
                            async:true,
                            cache:false,
                            data:ajax_data,
                            type:'POST',
                            url:'http://prefixr.com/api/index.php?' + Math.random(),
                            success:function (response) {
                                model.set({
                                    uploading:false
                                });
                                save_css_file(model, response);
                            }
                        });

                    } else {
                        //Do not prefix.
                        save_css_file(model, csscode);
                    }
                });
            }
            catch (e) {
                console.log(e);
                model.set({ error:e });
                model.trigger('compilation:error', e);
                model.collection.trigger('compilation:error', e);
            }
        }
    }

    _.extend(obj, Backbone.Events);

    return obj;
});