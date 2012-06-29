/**
 * SimpLESS 1.4
 * ===========
 * SimpLESS has been completely re-created and is now following the AMD pattern for development.
 *
 * @author: Christian Engel <hello@wearekiss.com>
 */
settings = {
    debug:true,
    version:'1.4'
}

require.config({
    paths:{
        'less':'3p/less'
    }
});

define(['modules/ui'], function (ui) {
    if (settings.debug) {
        Titanium.UI.getCurrentWindow().showInspector();
    }

    //Check which LESS version is currently in our 3p folder.;
    var lessfile = Titanium.Filesystem.getFile(Titanium.Filesystem.getResourcesDirectory().nativePath() + Titanium.Filesystem.getSeparator() + ['app', '3p', 'less.js'].join(Titanium.Filesystem.getSeparator()));
    var current_less = lessfile.open().read().toString();
    var version_regex = /LESS - Leaner CSS v([\d\.]+)/;
    var result = version_regex.exec(current_less);
    current_less = result[1];

    $.get('http://lesscss.org', function (response) {
        var download_regex = /http:\/\/lesscss.googlecode.com\/files\/less-[\d\.]+\.min\.js/;
        var version_regex = /-([\d\.]+)\.min/;

        var result = download_regex.exec(response);
        var download_link = result[0];
        if (result !== null) {
            var result2 = version_regex.exec(result[0]);
            var actual_version = result2[1];

            if (current_less != actual_version) {
                if (confirm('There is a new less version available (v' + actual_version + ').\nDownload it now into SimpLESS?')) {
                    $.get('https://raw.github.com/cloudhead/less.js/master/dist/less-' + actual_version + '.js', function (response) {
                        require(['modules/less_patcher'], function (patcher) {
                            var patched_code = patcher.patch(response);
                            if (!patched_code) {
                                alert('There was a problem patching the less.js file. =(');
                                return;
                            }
                            lessfile.write(patched_code);
                            alert('Updating to less v' + actual_version + ' was successful. Restart SimpLESS to apply the update.');
                        });
                    });
                }
            }
        }
    });

    Titanium.UI.getCurrentWindow().setTitle('SimpLESS ' + settings.version + ' - less v' + current_less);

    $.get('http://wearekiss.com/simpless-version.txt', function (response) {
        if (response != settings.version) {
            if (confirm('There is an update available under http://wearekiss.com/simpless\n\nClick OK to open the website to download it.')) {
                Titanium.Platform.openURL('http://wearekiss.com/simpless');
            }
        }
    });
});