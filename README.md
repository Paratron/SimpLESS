SimpLESS Compiler 1.2
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

Changelog
---------

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
- Adding a css minification function
- adding SASS support


