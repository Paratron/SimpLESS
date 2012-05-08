SimpLESS Compiler 1.3
=====================

Description
-----------

LESS ( http://lesscss.org/ ) is a great tool to write CSS much faster.
But however - in the way its meant to be (running either on node.js or being interpreted by JavaScript in the browser) its just not usable for most web projects.
For the mac there is this great tool called LESS.app ( http://incident57.com/less/ ) but for linux and windows one has to struggle with command line scripts and worse things to compile his LESS files to plain CSS.
Who wants to setup a node.js server for this job?!

Me not ;)

So I decided to create a little compiler for LESS that runs on every platform.
It utilizes the appcelerator titanium platform ( http://appcelerator.com/ ) to achieve this task.


Ubuntu installation
-------------------

- make sure you have the libjpeg62 package installed: ```sudo apt-get install libjpeg62```
- open a terminal in the folder where you uncompressed the file from [wearekiss.com/simpless](http://api.appcelerator.net/p/v1/download?token=K4v9dtQ4) and go to the **modules/tiui/1.1** folder : ```cd /home/username/apps/SimpLESS-1.3/modules/tiui/1.1```.0/
- create a symbolic link to the libnotify shared object: ```ln -s /usr/lib/x86_64-linux-gnu/libnotify.so.4 libnotify.so.1```
- you can now use **SimpLESS** on Ubuntu without Wine!


Changelog
---------

v 1.3

- implemented CSS minification (thanks to: https://github.com/GoalSmashers/clean-css )
  If you don't want a css file to be minified, place the following comment in your less file: //simpless:!minify
- added a button for manual recompilation of files
- added a button for removing files from the list
- fixed a bug where compiling an empty less file crashes the program
- fixed a bug in the quit-restore system
- removed the restore button. Restoring now happens by default.
- fixed a bug where urls in stylesheets got messed up with random "app://com.wearekiss.simpless.open/" insertions.
- included LESS parser 1.1.6
- addded support for backwards @import. Compilation is triggered, if imported files are changed.
- capturing compiling errors in imported files now.
- fixed weird file path problems in appcelerator titanium


v 1.2

- implemented a new drag&drop system. Should work much more reliable now.
- fixed a bug where a space in the filepath prevented simpless from recognizing it.
- fixed a bug where the "show love" message was displayed when it shouldnt
- improved compilation error checking
- improved contrast in the colors of error messages in the UI
- included LESS parser 1.1.4
- added @import functionality
- when minimizing the app, it goes to the tray
- added a "restore last session" button
- implemented an automatic update checker


Download Builds
---------------

Download builds for every platform under http://wearekiss.com/simpless/


Planned Features
----------------

Currently I'm thinking about implementing the following features in near future:

- Adding vendor prefixes automatically like prefixer ( http://cssprefixer.appspot.com/ ) does.
- adding SASS support


