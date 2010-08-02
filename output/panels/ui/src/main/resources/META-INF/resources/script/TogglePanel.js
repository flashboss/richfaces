/*
 * JBoss, Home of Professional Open Source
 * Copyright ${year}, Red Hat, Inc. and individual contributors
 * by the @authors tag. See the copyright.txt in the distribution for a
 * full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

(function ($, rf) {

    rf.ui = rf.ui || {};

    /* SIMPLE INNER CLASS for handle switch operation*/
    function SwitchItems(comp) {
        this.comp = comp;
    }

    SwitchItems.prototype = {

        /**
         * @param {TogglePanelItem} oldPanel
         * @param {TogglePanelItem} newPanel
         *
         * @return {void}
         * */
        exec : function (oldPanel, newPanel) {
            if (newPanel.switchMode == "server") {
                return this.execServer(oldPanel, newPanel);
            } else if (newPanel.switchMode == "ajax") {
                return this.execAjax(oldPanel, newPanel);
            } else if (newPanel.switchMode == "client") {
                return this.execClient(oldPanel, newPanel);
            } else {
                rf.log.error("SwitchItems.exec : unknown switchMode (" + this.comp.switchMode + ")");
            }
        },

        /**
         * @protected
         * @param {TogglePanelItem} oldPanel
         * @param {TogglePanelItem} newPanel
         *
         * @return {Boolean} false
         * */
        execServer : function (oldPanel, newPanel) {
            var continueProcess = oldPanel.__leave();
            if (!continueProcess) {

                return false;
            }

            this.__setActiveItem(newPanel.getName());

            rf.submitForm(this.__getParentForm(), null, {});

            return false;
        },

        /**
         * @protected
         * @param {TogglePanelItem} oldPanel
         * @param {TogglePanelItem} newPanel
         *
         * @return {Boolean} false
         * */
        execAjax : function (oldPanel, newPanel) {
            var options = $.extend({}, this.comp.options["ajax"], {}/*this.getParameters(newPanel)*/);

            this.__setActiveItem(newPanel.getName());
            rf.ajax(this.comp.id, null, options);
            this.__setActiveItem(oldPanel.getName());

            return false;
        },

        /**
         * @protected
         * @param {TogglePanelItem} oldPanel
         * @param {TogglePanelItem} newPanel
         *
         * @return {undefined}
         *             - false - if process has been terminated
         *             - true  - in other cases
         * */
        execClient : function (oldPanel, newPanel) {
            var continueProcess = oldPanel.__leave();
            if (!continueProcess) {
                return false;
            }

            this.__setActiveItem(newPanel.getName());

            newPanel.__enter();
            this.__fireItemChange(oldPanel, newPanel);

            return true;
        },

        /**
         * @private
         * */
        __getParentForm : function () {
            return $(rf.getDomElement(this.comp.id)).parent('form');
        },

        /**
         * @private
         * */
        __setActiveItem : function (name) {
            rf.getDomElement(this.__getValueInputId()).value = name;
            this.comp.activeItem = name;
        },

        /**
         * @private
         * */
        __getValueInputId: function () {
            return this.comp.id + "-value"
        },

        /********************* Events *************************/

        __fireItemChange : function (oldItem, newItem) {
            return new rf.Event.fireById(this.comp.id, "itemchange", {
                id: this.comp.id,
                oldItem : oldItem,
                newItem : newItem
            });
        }
    };

    /**
     * @class TogglePanel
     * @name TogglePanel
     *
     * @constructor
     * @param {String} componentId - component id
     * @param {Hash} options - params
     * */
    rf.ui.TogglePanel = rf.BaseComponent.extendClass({

        // class name
        name:"TogglePanel",

        init : function (componentId, options) {
            // call constructor of parent class
            this.$super.constructor.call(this, componentId);
            this.attachToDom(componentId);

            this.options = options;
            this.activeItem = this.options.activeItem;
            this.items = this.options.items;
        },

        /***************************** Public Methods  ********************************************************************/

        /**
         * @methodOf
         * @name TogglePanel#getSelectItem
         *
         * @return {String} name of current selected panel item
         */
        getSelectItem: function () {
            return this.activeItem;
        },

        /**
         * @methodOf
         * @name TogglePanel#switchToItem
         *
         * @param {String} name - panel item name to switch
         *           we can use meta names @first, @prev, @next and @last
         * @return {Boolean} - false if something wrong and true if all is ok
         */
        switchToItem: function (name) {
            var newPanel = this.getNextItem(name);
            if (newPanel == null) {
                rf.log.warn("TogglePanel.switchToItems(" + name + "): item with name '" + name + "' not found");
                return false;
            }

            var oldPanel = this.__getItemByName(this.getSelectItem());

            var continueProcess = this.__fireBeforeItemChange(oldPanel, newPanel);
            if (!continueProcess) {
                rf.log.warn("TogglePanel.switchToItems(" + name + "): switch has been canceled by beforeItemChange event");
                return false
            }

            return new SwitchItems(this).exec(oldPanel, newPanel);
        },

        /**
         * @methodOf
         * @name TogglePanel#getNextItem
         *
         * @param {String} name of TogglePanelItem or meta name (@first | @prev | @next | @last)
         * @return {TogglePanelItem} null if item not found
         */
        getNextItem : function (name) {
            if (name) {
                var newItemIndex = this.__ITEMS_META_NAMES[name];
                if (newItemIndex) {
                    return this.__getItem(newItemIndex(this));
                } else {
                    return this.__getItemByName(name);
                }
            } else {
                return this.__getItemByName(this.nextItem());
            }
        },

        /**
         * please, remove this method when client side ajax events will be added
         *
         * */
        onCompleteHandler : function (newItemName) {
            var oldItem = this.__getItemByName(this.activeItem);
            var newItem = this.__getItemByName(newItemName);

            // Don't do like this and remove it ASAP
            new SwitchItems(this).execClient(oldItem, newItem);
        },

        /**
         * @methodOf
         * @name TogglePanel#getItems
         *
         * @return {TogglePanelItem[]} all defined panel items
         */
        getItems : function () {
            return this.items;
        },

        /**
         * @methodOf
         * @name TogglePanel#getItemsNames
         *
         * @return {String[]} names of all defined items
         */
        getItemsNames: function () {
            var res = [];
            for (var item in this.items) {
                res.push(this.items[item].getName());
            }

            return res;
        },

        /**
         * @methodOf
         * @name TogglePanel#nextItem
         *
         * @param {String} [itemName = activeItem]
         * @return {String} name of next panel item
         */
        nextItem: function (itemName) {
            var itemIndex = this.__getItemIndex(itemName || this.activeItem);
            if (itemIndex == -1) {
                return null;
            }

            return this.__getItemName(itemIndex + 1);
        },

        /**
         * @methodOf
         * @name TogglePanel#firstItem
         *
         * @return {String} name of first panel item
         */
        firstItem: function () {
            return this.__getItemName(0);
        },

        /**
         * @methodOf
         * @name TogglePanel#lastItem
         *
         * @return {String} name of last panel item
         */
        lastItem: function () {
            return this.__getItemName(this.items.length - 1);
        },

        /**
         * @methodOf
         * @name TogglePanel#prevItem
         *
         * @param {String} itemName
         * @return {String} name of prev panel item
         *                  null if it is first item
         */
        prevItem: function (itemName) {
            var itemIndex = this.__getItemIndex(itemName || this.activeItem);
            if (itemIndex < 1) {
                return null;
            }

            return this.__getItemName(itemIndex - 1);
        },

        /////////////////////////////////////////////////////////////////////////////////
        //// Private
        /////////////////////////////////////////////////////////////////////////////////

        /********************* Methods *************************/

        __ITEMS_META_NAMES : {
            "@first" : function (comp) { return 0; },
            "@prev"  : function (comp) { return comp.__getItemIndex(comp.activeItem) - 1; },
            "@next"  : function (comp) { return comp.__getItemIndex(comp.activeItem) + 1; },
            "@last"  : function (comp) { return comp.items.length - 1; }
        },

        /**
         * @private
         * */
        __getItemIndex : function (itemName) {
            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i].getName() === itemName) {
                    return i;
                }
            }

            rf.log.info("TogglePanel.getItemIndex: item with name '" + itemName + "' not found");
            return -1;
        },

        /**
         * @private
         * @param {Number} index - array index
         *
         * @return {TogglePanelItem}
         *    null - if item not found
         * */
        __getItem : function (index) {
            if (index >= 0 && index < this.items.length) {
                return this.items[index]
            }

            return null;
        },

        __getItemByName : function (name) {
            return this.__getItem(this.__getItemIndex(name));
        },

        __getItemName : function (index) {
            var item = this.__getItem(index);
            if (item == null) {
                return null;
            }

            return item.getName();
        },

        /**
         * Fire Concealable Event
         * */
        __fireBeforeItemChange : function (oldItem, newItem) {
            return rf.Event.fireById(this.id, "beforeitemchange", {
                id: this.id,
                oldItem : oldItem,
                newItem : newItem
            });
        },

        // class stuff
        destroy: function () {
            //                 rf.Event.unbindById(this.options.buttonId, "."+this.namespace);
            //                 rf.Event.unbindById(this.componentId, "."+this.namespace);
            //                 $super.destroy.call(this);
        }
    });
})(jQuery, RichFaces);
