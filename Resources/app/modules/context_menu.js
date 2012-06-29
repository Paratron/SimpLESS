/**
 * context_menu
 * ===========
 * This module creates and handles a context menu which can be used in different places.
 *
 * Pass an array with menu-item elements to the constructor:
 *
 * [
 *  {
 *      label: 'This is the menu title',
 *      callback: function()
 *  },
 *  ...
 * ]
 */
define(['text!templates/context-item.html'], function (template_src) {
    var item_template = _.template(template_src);

    return function (elements) {
        var html = '<ul class="context-menu">';

        for (var i = 0; i < elements.length; i++) {
            elements[i]['index'] = i;
            if (typeof elements[i].disabled == 'undefined') elements[i]['disabled'] = false;
            html += item_template(elements[i]);
        }

        html += '</ul>';

        var dom_obj = $(html);

        dom_obj.delegate('li', 'click', function (e) {
            $target = $(e.target);
            var element_id = $target.attr('data-index');
            elements[element_id].callback();
            dom_obj.slideUp(100, function () {
                dom_obj.remove();
            });
        });

        var obj = {
            /**
             * Will show the context menu at a specific element.
             * @param element
             */
            show_at_element:function (element) {
                $('body').append(dom_obj);

                var pos = $(element).position();
                dom_obj.css({
                    top:(parseInt(pos.top) + 15) + 'px',
                    left:(parseInt(pos.left) - 3) + 'px'
                }).slideDown(100, function () {
                            $('body').one('click', function () {
                                dom_obj.slideUp(100, function () {
                                    dom_obj.remove();
                                });
                            });
                        });


            },
            /**
             * Will show the context menu at a specific position.
             * @param x
             * @param y
             */
            show_at:function (x, y) {
                $('body').append(dom_obj);

                dom_obj.css({
                    top:(y + 12) + 'px',
                    left:(x + 12) + 'px'
                }).slideDown(100, function () {
                            $('body').one('click', function () {
                                dom_obj.slideUp(100, function () {
                                    dom_obj.remove();
                                });
                            });
                        });
            }
        };

        return obj;
    }
});