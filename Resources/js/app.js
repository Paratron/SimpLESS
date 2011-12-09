/**
 * simpLESS App
 * Fork us on GitHub!
 * Feel free to make any improvements to this little app and send us a notice! =)
 * @author Christian Engel <christian.engel@wearekiss.com>
 * @version 1.1
 */
var app = {
    /**
     * If the app is in debug mode, messages will be posted to the console window.
     */
    debug_mode: true,

    /**
     * Does the compiler have to put a comment in front of the compiled css files?
     */
    show_love: true,
    /**
     * This is the CSS comment put by the compiler if show_love = true;
     */
    love_message: '\/* This beautiful CSS-File has been crafted with LESS (lesscss.org) and compiled by simpLESS (wearekiss.com/simpless) *\/',

    /**
     * The tray icon object will be stored here. Created by app.tray_init();
     */
    tray_icon: null,

    /**
     * This function holds a timeout to re-render the file list when nothing else happens to keep the times up-to-date.
     */
    update_schedule: null,

    /**
     * Drop Path will be updated when the user drags a file onto the app.
     */
    drop_path: '',

    /**
     * This array holds the indexed less files.
     * It
     */
    lessfiles: [],

    /**
     * This is an simple array of file paths of less objects. They will be stored in localStorage on application exit and can be used to restore the file list on application start.
     */
    restore_paths: [],

    /**
     * An instance of the LESS CSS parser from http://lesscss.org
     */
    parser: new (less.Parser),

    ti_filedrop: {
        bind_object: null,
        files: [],
        wait: 0,
        bind: function(object) {
            this.bind_object = object;

            object.ondragenter = object.ondragover = function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.effectAllowed = 'all';
                e.dataTransfer.dropEffect = 'all';
                if (e.dataTransfer.files.length) {
                    app.ti_filedrop.files = e.dataTransfer.files;
                    app.ti_filedrop.wait = 0;
                }
            };

            object.onmousemove = function(e) {
                if (app.ti_filedrop.files.length == 0) return;
                app.ti_filedrop.wait++
                if (app.ti_filedrop.wait > 5) {
                    var evt = app.ti_filedrop.bind_object.createEvent('Event');
                    evt.initEvent('drop', true, true);
                    evt.files = app.ti_filedrop.files;
                    app.ti_filedrop.files = [];
                    app.ti_filedrop.wait = 0;
                    app.ti_filedrop.bind_object.dispatchEvent(evt);
                }
            };
        }
    },


    /**
     * Doing initial warmup.
     * We have to set up some listeners for the UI and stuff.
     */
    init: function() {
        this.debug('Hello - debug Mode is on!');

        app.check_update();

        //First start on a mac? Show some information for the poor user...
        if (Titanium.getPlatform() == 'osx') {
            if (localStorage.getItem('firstRun') != 1) {
                if (confirm('This is your first start of SimpLESS, we will display this message only once:\n\nIf you want to hide this app from the dock, then please read our tutorial on our blog: \n\nhttp://wearekiss.com/blog/simpless-1.2\n\nClick OK to open it in your browser.')) {
                    Titanium.Platform.openURL('http://wearekiss.com/blog/simpless-1.2');
                }
            }
        }
        localStorage.setItem('firstRun', 1);

        $('head title').text('SimpLESS ' + Titanium.App.getVersion());

        //The words "your lessCSS compiler" should disappear after 5 seconds.
        setTimeout(function() {
            $('#zusatz').fadeOut();
        }, 5000);

        //If one hovers over the heart-button, we smoothly fade the tooltip.
        //The variable show_love will be set to advice the compile if he has to set an CSS comment.
        $('#love').hover(
            function() {
                $('#love span').fadeIn();
            },
            function() {
                $('#love span').fadeOut();
            }
        ).click(function(e) {
                $(this).toggleClass('active');
                if ($(this).hasClass('active')) app.show_love = true; else app.show_love = false;
            });


        // =========================================================================================
        //Drop listeners
        // =========================================================================================

        // Appcelerator is somehow fucked up if it comes to handle drop events propably. The DragOver and DragEnter events are handled correctly, but the Drag event never gets fired.
        //So I wrote a little kind of polyfill that covers this bug for me.
        //What a mess.
        app.ti_filedrop.bind(document);

        //Notice: My drop event directly has a files property - no dataTransfer Object, since I just don't need it.
        document.addEventListener('drop', function(e) {
            var path;
            if (Titanium.getPlatform() == 'linux' && e.dataTransfer.files.length > 1) {
                alert('Due to a bug in the appcelerator framework, only one file/folder can be collected at once. :(');
            }
            for (var i = 0; i < e.files.length; i++) {
                path = e.files[i].path;
                //On linux there is some drawback with file dropping: we get an URI encoded string...
                if (Titanium.getPlatform() == 'linux') {
                    path = decodeURI(path.replace('file://', ''));

                }
                app.drop_action(path);
            }
        });

        // =========================================================================================
        // End of the Drop Listeners
        // =========================================================================================

        //Start the Observe Loop
        //This will check the indexed files for changes every second.
        setInterval(app.observe_loop, 1000);


        // =========================================================================================
        //Generic Listeners

        //Overwrite and Cancel are used in the case a CSS file is newer then its LESS source.

        //Click here to say: YES, please overwrite my CSS files.
        $('.overwrite').live('click', function(e) {
            var checksum = $(this).parent().parent().attr('rel');
            app.overwrite_file(checksum);
        });

        //Click here to say: NO, ignore changes to the LESS files and keep my CSS File.
        $('.cancel').live('click', function(e) {
            e.preventDefault();
            var checksum = $(this).parent().parent().attr('rel');
            app.cancel_file(checksum);
        });


        //We create a seperate thread now to crawl through directories when its necessary.
        app.crawler = Titanium.Worker.createWorker('workers/crawl.js');
        //The crawler thread is started now and will listen to commands.
        app.crawler.start();

        /**
         * This initializes the send-to-tray mode introduced in 1.2
         */
        app.tray_init();

        //When the main window gets closed, clean up.
        var win = Titanium.UI.getMainWindow();
        win.addEventListener(Titanium.CLOSED, function(e) {
            var restore_data = Titanium.JSON.stringify(app.restore_paths);
            localStorage.setItem('restore', restore_data);
            Titanium.UI.clearTray();
        });

        //Check if restore data is available.
        var restoreData = localStorage.getItem('restore');
        if (typeof restoreData == 'string' && restoreData != '[]') {
            app.restore_paths = Titanium.JSON.parse(restoreData);
            $('#restore').click(function(e) {
                e.preventDefault();
                $('#restore').remove();
                var xpath = app.restore_paths;
                app.restore_paths = [];
                for (var i in xpath) {
                    app.drop_action(xpath[i]);
                }
            });
        } else {
            $('#restore').remove();
        }

        this.debug('Init finished. App is ready.');
    },

    /**
     * Check on the kiss server, if there is an update available.
     */
    check_update: function() {
        $.get('http://wearekiss.com/simpless-version.txt', function(response) {
            if (response != Titanium.App.getVersion()) {
                if (confirm('There is an update available under http://wearekiss.com/simpless\n\nClick OK to open the website to download it.')) {
                    Titanium.Platform.openURL('http://wearekiss.com/simpless');
                }
            }
        });
    },

    /**
     * This function initializes the send-to-tray mode.
     *
     */
    tray_init: function() {
        //We want to trigger when the app gets minimized to hide the main window
        var win = Titanium.UI.getMainWindow();
        win.addEventListener(Titanium.MINIMIZED, function(e) {
            e.preventDefault();
            win.unminimize();
            win.hide();
        });
        //When someone clicks on the tray, bring the main window back on screen.
        app.tray_icon = Titanium.UI.addTray('img/icon-tray.png', function(e) {
            var win = Titanium.UI.getMainWindow();
            win.show();
            win.unminimize();
        });
        app.tray_status();
    },

    /**
     * This function changes the tray icon as a status indicator.
     * @param int mode 0 = default (blue), 1 = success (green), 2 = error (red)
     * @param int time number of seconds to show the status before switching back to mode=0. Default = 10 - Notice: The error state won't be set back automatically, if no time is given.
     */
    tray_status: function(mode, message, time) {
        var back = '';
        if (typeof message != 'undefined') message = 'SimpLESS - ' + message; else message = 'SimpLESS';

        switch (mode) {
            case 2:
                back = '-red';
                break;
            case 1:
                back = '-green';
                break;
        }
        app.tray_icon.setIcon('img/icon-tray' + back + '.png');
        app.tray_icon.setHint(message);

        if (mode == 1) {
            if (typeof time == 'undefined') time = 10;
            setTimeout('app.tray_status();', time * 1000);
        }
    },

    /**
     * Sends a debug message to the console, if app.debug_mode = true;
     * @param string message
     * @return void
     */
    debug: function(message) {
        if (!this.debug_mode) return;
        console.log(message);
        Titanium.API.debug(message);
    },

    /**
     * The observe loop is called by an interval defined in app.init();
     * It constantly checks the indexed LESS file for changes in the modificationTimestamp and recompiles them if necessary.
     */
    observe_loop: function() {
        //If there are currently no LESS files indexed, we exit the function now.
        if (! app.lessfiles.length) return;

        //Variable to keep the current lessfile in the loop.
        var lf;

        //Loop through all LESS files in the index - we have to check them all.
        for (var i = 0; i < app.lessfiles.length; i++) {
            //Put the current lessfile here, since the variable name is shorter.
            lf = app.lessfiles[i];

            app.debug('Observing: ' + lf.infile);

            //If the file is not market as "don't compile" and the modification stamp has changed, then recompile!
            if (! lf.compiler_wait && lf.infile.modificationTimestamp() != lf.instamp) {
                /*
                 The compiler will parse the LESS file and put the results in the according CSS file.
                 If there is an error, the error will be stored in the LESS file object and later be rendered by app.list_update()
                 */
                app.debug('Trying to compile!');
                app.compile(lf);

                //Update the timestamp of the LESS file object in the index.
                app.lessfiles[i].instamp = lf.infile.modificationTimestamp();
                //Now redraw the file list in the UI to make changes visible.
                app.list_update();
            }
        }
    },

    /**
     * If there is a single file found, the file will be indexed (if not already indexed). If a directory is found, it will be passed to app.scandir()
     */
    drop_action: function(filepath) {
        //Does our path bucket contain a path name?
        app.debug('Drop Action!');
        if (filepath) {
            app.debug(filepath);

            var file_obj = Titanium.Filesystem.getFile(filepath.toString());

            if (file_obj.isFile()) {
                //Okay, we have a single file here. Is it a LESS file?
                app.debug('Testing dropped file...');
                if (file_obj.extension() == 'less') {
                    //Yes, it is! Try to index it.
                    app.index_add(file_obj);
                    app.list_update();
                    return;
                }
            }

            if (file_obj.isDirectory()) {
                //Wow, its a directory!
                //Filter all LESS files out of the directory and its subdirectories with app.scandir();
                app.debug('Starting directory crawling...');
                $('#overlay').fadeIn('fast', function() {
                    var filelist = app.scandir(file_obj);
                    for (var i in filelist) {
                        app.index_add(filelist[i]);
                    }
                    $('#overlay').fadeOut('slow');
                    app.list_update();
                });
            }
        }
    },

    /**
     * This function takes a file object of a LESS file and does the following:
     * 1: Checking if the file is already indexed
     * 2: If not, trying to find the according CSS file path
     * 3: Gathering some information about the files
     * 4: Putting the file into the index
     * @param file_object
     */
    index_add: function(file_object) {
        this.debug('Adding file to index...');
        //With the first file being index, the "restore" button should vanish.
        $('#restore').remove();

        //First, create the checksum of the files filename.
        //We need this checksum to identify our files.
        var checksum = Titanium.Codec.digestToHex(Titanium.Codec.MD5, file_object.toString());

        //So if there are already any lessfiles indexed, look if we can find our checksum.
        //If we found it, we can leave here since we already have indexed this file.
        if (app.lessfiles.length)
            for (var i in app.lessfiles) {
                if (app.lessfiles[i].inchecksum == checksum) return;
            }

        //Great, its not indexed.
        //So then lets try to find out where the matching CSS file to our LESS file is located - if there is any.
        //The function returns us a ready file object.
        var cssfile_path_relative = app.find_css_match(file_object);
        var cssfile = file_object.resolve(cssfile_path_relative);

        //We initialize the timestamp for the output file with 0 and update it if the file really exists.
        //The timestamp is needed for the app to decide if it has to recompile files.
        var the_outstamp = 0;
        if (cssfile.exists()) the_outstamp = Number(cssfile.modificationTimestamp());

        //Now we create the LESS object to store in our index.
        var elem = {
            inchecksum: checksum,
            infile: file_object, //Okay this is the LESS file.
            instamp: Number(file_object.modificationTimestamp()), //The LESS file was changed here
            outpath: cssfile_path_relative, //Relative path to the CSS file. Only needed for displaying right now.
            outfile: cssfile, //Output file (CSS)
            outstamp: the_outstamp, //Time, the output file has been changed the last time.
            compile_status: 0, //0 = neutral, 1 = success, 2 = fault
            compiler_error: '',
            compiler_wait: false //Should the compiler ignore this file? Will be determined below.
        };

        //Is the timestamp of the CSS file newer than the timestamp of the LESS file?
        //If so, tell the compiler to not overwrite the CSS until the user decided what to do.

        if (cssfile.exists()) {
            var di = new Date(elem.instamp);
            var doo = new Date(elem.outstamp);
            elem.compiler_wait = (di.toDateString() != doo.toDateString());
        }

        //Okay, now push our new files into the index.
        app.lessfiles.push(elem);
        app.restore_paths.push(file_object.toString());
    },

    /**
     * Scandir runs recursively over a directory and returns all LESS files it has found.
     * @param dir_object
     * @return array
     */
    scandir: function(dir_object) {
        //This is the array which will be returned at the end.
        var returning = [];

        //Get the list of files and subdirectories.
        var list = dir_object.getDirectoryListing();

        //Run over every single item.
        for (var i = 0; i < list.length; i++) {
            if (list[i].isDirectory()) {
                returning = returning.concat(app.scandir(list[i])); //@TODO: Change this from a recursive in a stack approach, maybe.
            }

            if (list[i].extension() == 'less') {
                returning.push(list[i]);
            }
        }

        return returning;
    },

    /**
     * Returns a file object of an CSS file matching to the LESS file.
     * @param less_file_object
     * @return Titanium.Filesystem.File
     */
    find_css_match: function(less_file_object) {
        //Generic variable to test if a css file is there.
        var test = null;
        //The current operating systems' path seperator
        var s = Titanium.Filesystem.getSeparator();

        //Getting the filename by splitting up the path on every path seperator and popping the last element.
        var filename = less_file_object.nativePath().split(s).pop();
        //Remove the .less file extension to re-use the filename for the CSS file.
        filename = filename.replace('.' + less_file_object.extension(), '');

        //Attempt 1:
        // ../css/[NAME].css;
        test = less_file_object.resolve('..' + s + 'css' + s);
        if (test.exists() && test.isDirectory()) {
            return '..' + s + 'css' + s + filename + '.css';
        }


        //Attempt 2:
        // ./css/[NAME].css;
        test = less_file_object.resolve('..' + s + 'css' + s);
        if (test.exists() && test.isDirectory()) {
            return 'css' + s + filename + '.css';
        }

        //Attempt 3:
        // ./[NAME].css;
        return filename + '.css';
    },

    /**
     * This function takes an indexed less file object and compiles it to css, then puts the result into the css file.
     * @param indexed_less_file_object
     */
    compile: function(indexed_less_file_object) {
        if (indexed_less_file_object.compiler_wait) return;
        var input = indexed_less_file_object.infile;
        var output = indexed_less_file_object.outfile;
        var lesscode = input.open().read().toString();

        //Okay, we now look if the user doesn't want to minify the file.
        //Look for this comment: //simpless:!minify

        var minify = true;
        if(lesscode.search(/simpless\:\!minify/) != -1) minify = false;

        var parse_result = false;

        //We have to remember this in case of @include statements.
        //The compiler has to take the less files object path to find the relative files to it.
        app.compiling_file = indexed_less_file_object;

        try {
            app.parser.parse(lesscode, function(err, tree) {
                if (err) {
                    indexed_less_file_object.compiler_error = err.message.replace(/(on line \d+)/, '<span style="font-weight: bold;">$1</span>');
                    indexed_less_file_object.compile_status = 2;
                    app.tray_status(2, err.message); //Red tray icon
                    return false;
                }
                output.touch();
                output.setWritable();
                var csscode = tree.toCSS();
                if(minify){
                    app.debug('Minifying CSS...');
                    csscode = CleanCSS.process(csscode);
                }
                var pointer = output.open();
                pointer.open(pointer.MODE_WRITE);
                try {
                    if (app.show_love) pointer.write(app.love_message + '\n');
                    pointer.write(csscode);
                }
                catch(e) {
                    Titanium.API.debug('Error writing css file');
                    Titanium.API.debug(e.toString());
                }
                pointer.close();
                parse_result = true;
                app.tray_status(1, 'compilation successful'); //green tray icon
                indexed_less_file_object.compile_status = 1;
            });
        }
        catch(e) {
            parse_result = false;
            for (var key in e) {
                app.debug(key + ' => ' + e[key]);
            }
            indexed_less_file_object.compiler_error = e.message + ' <span style="font-weight: bold;">on line ' + e.line + '</span>';
            indexed_less_file_object.compile_status = 2;
            app.tray_status(2, e.message + ' on line ' + e.line); //Red tray icon
        }


        return parse_result;
    },

    /**
     * This function renders the file list to the screen.
     * It renders all indexed less file objects.
     */
    list_update: function() {
        //We are currently rendering the list.
        //We have to stop the render scheduler during this process to avoid another call to list_update when list_update is not finished.
        clearTimeout(app.update_schedule);
        app.update_schedule = null;

        //Remove all elements from the displayed list.
        $('#list').children('li').remove();

        //If there are no indexed less files, we have nothing to render.
        if (!app.lessfiles.length) return;

        //Now render every indexed LESS file.
        for (var i = 0; i < app.lessfiles.length; i++) {
            app.list_add(app.lessfiles[i]);
        }

        //Rendering is finished.
        //Now we restart the render scheduler again, since the list should be re-rendered at least every minute.
        if (app.update_schedule == null) {
            app.update_schedule = setTimeout(function() {
                app.list_update();
            }, 60 * 1000);
        }

        //Add a last element to the list - the notice that the user can drop new files to simpLESS any time.
        $('#list').append('<li id="add-more"></li>');

        //Now tell cufón to replace the fonts to make everything pretty.
        Cufon.replace('b,span');
    },

    /**
     * Adds an entry to the display list of LESS files.
     * @param lessfile
     */
    list_add: function(lessfile) {
        //Get the Filename of the LESS file to display it.
        var filename = lessfile.infile.nativePath().split(Titanium.Filesystem.getSeparator()).pop();

        //We need the modification timestamp of the file.
        var filedate = new Date(Math.floor(lessfile.infile.modificationTimestamp() / 1000));

        //This is a list of all months, since we want to display the month' name instead of the number. 
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        //Format the time for output.
        var filedate_str = months[filedate.getMonth()] + ' ' + app.dbldigit(filedate.getDate()) + ', ' + filedate.getFullYear();
        var time = app.dbldigit(filedate.getHours()) + ':' + app.dbldigit(filedate.getMinutes());
        var diff = app.date_diff(filedate, new Date);

        //We want to show the relative path to the CSS file.
        var subline = lessfile.outpath;

        var uhr_str = time;
        var addition = '';

        //Now here we decide how to show the time. Dependent on the difference between the last compilation and now.
        if (diff < 30) {
            if (lessfile.compile_status == 1) {
                addition = 'success';
                setTimeout(function() {
                    app.list_update();
                }, 30 * 1000);
            }
            if (lessfile.compile_status == 2) addition = 'error';
            filedate_str = 'a few seconds ago...';
            uhr_str = '';
        }

        if (diff > 30 && diff < 1800) {
            if (lessfile.compile_status == 2) addition = 'error';
            var wert = (Math.floor(diff / 60) + 1);
            filedate_str = 'about ' + wert + ' minute' + ((wert > 1) ? 's' : '') + ' ago';
            uhr_str = '';
        }
        if (diff > 1800 && diff < 86400) {
            if (lessfile.compile_status == 2) addition = 'error';
            date_str = time;
        }

        if (lessfile.compiler_wait) {
            //CSS file newer than LESS file...
            addition = 'warning';
            filedate_str = '<a href="#" class="overwrite">Overwrite</a> <a href="#" class="cancel">Cancel</a>';
            uhr_str = '';
            var s = Titanium.Filesystem.getSeparator();
            var parts = lessfile.outfile.toString().split(s);
            subline = parts.pop() + ' is more recent than the LESS file!';
        }

        if (lessfile.compile_status == 2) uhr_str = lessfile.compiler_error;
        var html = '<li rel="' + lessfile.inchecksum + '" class="' + lessfile.inchecksum + ' ' + addition + '"><b>' + filename + '</b><span class="path">' + subline + '</span><span class="info">' + filedate_str + '<i>' + uhr_str + '</i></span></li>';
        $('body').removeClass('welcome');
        $('#list').append(html);
    },

    dbldigit: function(in_number) {
        in_number = Number(in_number);
        return (in_number < 10) ? '0' + in_number : '' + in_number;
    },

    date_diff: function(date_a, date_b) {
        return Math.abs(date_a.getTime() - date_b.getTime()) / 1000;
    },

    /**
     *
     * @param checksum
     */
    cancel_file: function(checksum) {
        for (var i = 0; i < app.lessfiles.length; i++) {
            if (app.lessfiles[i].inchecksum == checksum) {
                app.lessfiles.splice(i, 1);
                if (! app.lessfiles.length) {
                    $('body').addClass('welcome');
                }
                app.list_update();
                return true;
            }
        }
    },
    /**
     * Activates a file for the LESS compiler.
     * @param checksum
     */
    overwrite_file: function(checksum) {
        for (var i = 0; i < app.lessfiles.length; i++) {
            if (app.lessfiles[i].inchecksum == checksum) {
                app.lessfiles[i].compiler_wait = false;
                app.list_update();
                return true;
            }
        }
    }
}