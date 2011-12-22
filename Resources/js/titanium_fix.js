/**
 * Working version of resolve() for File objects;
 * @param path
 */
function fixfile(file) {
    file.grep = function(path) {
        if (!path) return this;
        var mypath = this.toString(),
            s = Titanium.Filesystem.getSeparator(),
            my_chain = mypath.split(s),
            grep_chain = path.split(s),
            i,
            g;

        //Get rid of the filename, if there is any.
        if (this.isFile()){
            my_chain.pop();
        }

        for (i in grep_chain) {
            g = grep_chain[i];
            if (g == '.') continue;
            if (g == '..'){
                my_chain.pop();
                continue;
            }
            my_chain.push(g);
        }

        return Titanium.Filesystem.getFile(my_chain.join(s));
    };
    return file;
}