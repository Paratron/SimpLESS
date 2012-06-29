function error(e, href) {
        window.require(['modules/compiler'], function (compiler) {
            compiler.current_model.trigger('compilation:error', e);
        });
    }