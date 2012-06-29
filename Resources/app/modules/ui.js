/**
 * UI
 * ===========
 * The UI module handles everything UI related.
 */
define([
    'modules/storage',
    'modules/compiler',
    'text!templates/list-item.html'
], function (storage, compiler, tmp_src_listitem) {
    var tmp_listitem = _.template(tmp_src_listitem);

    /**
     * Makes sure that numbers are always of two digits. Will prefix a "0" to numbers < 10
     * @param in_number
     * @return {String}
     */
    function dbldigit(in_number) {
        in_number = Number(in_number);
        return (in_number < 10) ? '0' + in_number : '' + in_number;
    }

    /**
     * Determines the difference in seconds between two date objects.
     * @param date_a
     * @param date_b
     * @return {Number}
     */
    function date_diff(date_a, date_b) {
        return Math.abs(date_a.getTime() - date_b.getTime()) / 1000;
    }

    /**
     * Will prettify a date you pass into.
     * @param in_date
     * @return [pretty_date, pretty_time]
     */
    function pretty_date(in_date) {

        //This is a list of all months, since we want to display the month' name instead of the number.
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        var filedate_str = months[in_date.getMonth()] + ' ' + dbldigit(in_date.getDate()) + ', ' + in_date.getFullYear();
        var time = dbldigit(in_date.getHours()) + ':' + dbldigit(in_date.getMinutes());
        var diff = date_diff(in_date, new Date());

        if (diff < 30) return 'A few seconds ago';
        if (diff < 60) return 'About a minute ago';
        if (diff < 300) return Math.floor(diff / 60) + ' minutes ago';
        if (diff < 3600 * 5) return time;
        return filedate_str;
    }

    var file_view = Backbone.View.extend({
        tagName:'li',
        events:{
            "click .recompile":"recompile",
            "click .remove":"remove",
            "click .prefixr":"toggle_prefixr",
            "click .minify":"toggle_minify",
            "click .love":"toggle_love",
            "click .browse":"browse_css"
        },
        is_appended:false,
        initialize:function () {
            $('body').removeClass('welcome');
            if (!$('#add-more').size()) $('#list').append('<li id="add-more"></li>')
            $('#add-more').before(this.render().el);
            this.is_appended = true;
            Cufon.replace(this.el);

            this.model.bind('change:all', this.render, this);

            var _this = this;
            this.model.bind('compilation:success', function () {
                _this.model.collection.trigger('compillation:success');
                _this.render();
            });

            this.model.bind('compilation:error', function (err) {
                if (err.filename == null) {
                    err.filename = _this.model.get('input_file').nativePath().toString().split(Titanium.Filesystem.getSeparator()).pop();
                }

                _this.model.collection.trigger('compillation:error', err);
                _this.model.set({
                    error:err
                });
                _this.render();
                require(['modules/notification'], function (n) {
                    n.show({
                        title: 'Compilation Error',
                        icon: 'img/compilation-error.png',
                        message: err.message,
                        position: 'bottom-right',
                        duration: 5000
                    });
                });
            });

            setInterval(function () {
                _this.render();
            }, 15000);
        },
        render:function () {
            var model_dta = this.model.toJSON(),
                    dta,
                    source_path = model_dta.input_file.nativePath().split(Titanium.Filesystem.getSeparator());

            $(this.el).removeClass('success error');

            var source = String(model_dta.input_file.nativePath()).split(Titanium.Filesystem.getSeparator());
            var target = String(model_dta.output_file.nativePath()).split(Titanium.Filesystem.getSeparator());

            dta = {
                filename:source_path.pop(),
                source_file_name:source.pop(),
                target_file_name:target.pop(),
                source_file_path:source.join(Titanium.Filesystem.getSeparator()) + Titanium.Filesystem.getSeparator(),
                target_file_path:target.join(Titanium.Filesystem.getSeparator()) + Titanium.Filesystem.getSeparator(),
                info_a:'',
                info_b:'',
                settings:model_dta.settings,
                constraints:[]
            }

            _.each(model_dta.constraints, function (c) {
                var filename = c.nativePath().split(Titanium.Filesystem.getSeparator()).pop();
                dta.constraints.push(filename);
            });

            if (model_dta.error) {
                $(this.el).addClass('error');
                dta.info_a = model_dta.error.message.replace('on', 'in ' + model_dta.error.filename + ' <b>on') + '</b>';
            } else {
                var compile_time = new Date();
                if (model_dta.output_file.exists()) {
                    compile_time.setTime(model_dta.output_file.modificationTimestamp() / 1000);
                    if (date_diff(compile_time, new Date()) < 10) {
                        dta.info_a = 'Compilation successful';
                        $(this.el).addClass('success');
                        var _this = this;
                        setTimeout(function () {
                            _this.render();
                        }, 10000);
                    } else {
                        var pretty_date_result = pretty_date(compile_time);
                        dta.info_a = pretty_date_result;
                    }
                } else {
                    //Never compiled
                    dta.info_a = 'Never compiled';
                }
            }

            if (model_dta.uploading) {
                dta.info_a = 'Uploading to prefixr.com...';
            }


            this.el.innerHTML = tmp_listitem(dta);
            $('.constraints', this.el).attr('title', 'Compilation will be triggered from these files: \n\n' + dta.constraints.join('\n'));
            if (this.is_appended) Cufon.replace(this.el);
            return this;
        },
        recompile:function () {
            compiler.compile(this.model);
        },
        remove:function () {
            storage.remove(this.model);
            $(this.el).remove();
            if ($('#list li').size() == 1) {
                $('#add-more').remove();
                $('body').addClass('welcome');
            }
        },
        toggle_prefixr:function () {
            var settings = this.model.get('settings');
            settings.prefix = !settings.prefix;
            this.model.set({
                settings:settings
            });
            this.model.trigger('change:settings', settings);
            this.model.trigger('change:all');
        },
        toggle_minify:function () {
            var settings = this.model.get('settings');
            settings.minify = !settings.minify;
            this.model.set({
                settings:settings
            });
            this.model.trigger('change:settings', settings);
            this.model.trigger('change:all');
        },
        toggle_love:function () {
            var settings = this.model.get('settings');
            settings.love = !settings.love;
            this.model.set({
                settings:settings
            });
            this.model.trigger('change:settings', settings);
            this.model.trigger('change:all');
        },
        browse_css:function () {
            var abs,
                    filename,
                    model = this.model;

            var sourcefile = this.model.get('output_file');
            if (sourcefile == null) {
                //Take path of the LESS file.
                abs = this.model.get('absolute_path').split(Titanium.Filesystem.getSeparator());
                filename = abs.pop();
            } else {
                //Take path of the CSS file.
                abs = sourcefile.nativePath().split(Titanium.Filesystem.getSeparator());
                filename = abs.pop();
            }
            abs = abs.join(Titanium.Filesystem.getSeparator());

            var options = {
                title:'Select target CSS file',
                defaultName:filename.replace('less', 'css'),
                types:['css'],
                typesDescription:'CSS files',
                path:abs
            }

            Titanium.UI.currentWindow.openSaveAsDialog(function (selected_path) {
                var css_file = Titanium.Filesystem.getFile(selected_path);
                model.set({
                    output_file:css_file
                });
                model.trigger('change:settings');
                model.trigger('change:all');
            }, options);
        },
        settings:function () {
            var model = this.model;
            var settings = model.get('settings');
            require(['modules/context_menu'], function (ContextMenu) {
                var menu = new ContextMenu([
                    {
                        label:'Mention SimpLESS in a CSS comment',
                        css_class:settings.love ? 'tick' : 'cross',
                        callback:function () {

                            settings.love = !settings.love;
                            model.set({
                                settings:settings
                            });
                            model.trigger('change:settings', settings);
                        }
                    },
                    {
                        label:'Minify CSS',
                        css_class:settings.minify ? 'tick' : 'cross',
                        callback:function () {
                            settings.minify = !settings.minify;
                            model.set({
                                settings:settings
                            });
                            model.trigger('change:settings', settings);
                        }
                    },
                    {
                        label:'CSS Prefixing with prefixr.com',
                        css_class:settings.prefix ? 'tick' : 'cross',
                        callback:function () {
                            settings.prefix = !settings.prefix;
                            model.set({
                                settings:settings
                            });
                            model.trigger('change:settings', settings);
                        }
                    },
                    {
                        label:'Set target CSS file...',
                        css_class:'browse',
                        callback:function () {
                            var abs,
                                    filename;

                            var sourcefile = model.get('output_file');
                            if (sourcefile == null) {
                                //Take path of the LESS file.
                                abs = model.get('absolute_path').split(Titanium.Filesystem.getSeparator());
                                filename = abs.pop();
                            } else {
                                //Take path of the CSS file.
                                abs = sourcefile.nativePath().split(Titanium.Filesystem.getSeparator());
                                filename = abs.pop();
                            }
                            abs = abs.join(Titanium.Filesystem.getSeparator());

                            var options = {
                                title:'Select target CSS file',
                                defaultName:filename.replace('less', 'css'),
                                types:['css'],
                                typesDescription:'CSS files',
                                path:abs
                            }

                            Titanium.UI.currentWindow.openSaveAsDialog(function (selected_path) {
                                var css_file = Titanium.Filesystem.getFile(selected_path);
                                model.set({
                                    output_file:css_file
                                });
                                model.trigger('change:settings', model.get('settings'));
                            }, options);
                        }
                    }
                ]);

                menu.show_at_element($('.settings', this.el));
            });
        }
    });


    //The infamous Titanium Dropfix
    function dropfix() {
        var bind_object = document,
                files = [],
                wait = 0;

        bind_object.ondragenter = bind_object.ondragover = function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'all';
            e.dataTransfer.dropEffect = 'all';
            if (e.dataTransfer.files.length) {
                files = e.dataTransfer.files;
                wait = 0;
            }
        };

        bind_object.onmousemove = function (e) {
            if (files.length == 0) return;
            wait++
            if (wait > 5) {
                var evt = document.createEvent('CustomEvent');
                evt.initCustomEvent('drop');
                evt.dataTransfer = {
                    files:files
                };
                files = [];
                wait = 0;
                bind_object.dispatchEvent(evt);
            }
        };
    }

    dropfix();

    $(document).bind('drop', function (e) {
        var my_files = e.originalEvent.dataTransfer.files;
        for (var i = 0; i < my_files.length; i++) {
            storage.add(my_files[i]);
        }
    });

    storage.collection.bind('add', function (model) {
        var view = new file_view({model:model});
    });

    storage.collection.bind('compillation:success', function () {
        obj.tray.success('Compillation successful');
    }, this);

    storage.collection.bind('compillation:error', function (e) {
        obj.tray.error('Compillation error: ' + e.message.replace('on', 'in ' + e.filename + ' on'));
    }, this);


    var list_dom = $('#list'),
            love_button_dom = $('#love');

    love_button_dom.click(function (e) {
        if (confirm('Do you really want to remove all files from the watchlist?')) {
            storage.flush();
            $('#list li').remove();
            $('body').addClass('welcome');
        }
    });

    var obj = {
        list:list_dom,
        tray:{
            normal:function () {
                tray_icon.setIcon('img/icon-tray.png');
                tray_icon.setHint('SimpLESS');
            },
            success:function (message) {
                tray_icon.setIcon('img/icon-tray-green.png');
                tray_icon.setHint('SimpLESS - ' + message);
                setTimeout(function () {
                    obj.tray.normal();
                }, 2000);
            },
            error:function (message) {
                tray_icon.setIcon('img/icon-tray-red.png');
                tray_icon.setHint('SimpLESS - ' + message);
                setTimeout(function () {
                    obj.tray.normal();
                }, 10000);
            }
        }
    }


    //Configuring the Tray Symbol.
    var win = Titanium.UI.getMainWindow();
    win.addEventListener(Titanium.MINIMIZED, function (e) {
        e.preventDefault();
        win.unminimize();
        win.hide();
    });
    //When someone clicks on the tray, bring the main window back on screen.
    var tray_icon = Titanium.UI.addTray('img/icon-tray.png', function (e) {
        win.show();
        win.unminimize();
    });
    obj.tray.normal();

    storage.restore_files();


    return obj;
});