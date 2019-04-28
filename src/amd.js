/**
 * Copyright (C) 2019 Yudha Tama Aditiyara
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function(){
/**
 */
'use strict';

/**
 * @returns {string}
 */
function noname(){
	return 'noname:' + new Date().getTime();
}

/**
 * @param {any} value
 * @param {string} type
 * @returns {boolean}
 */
function isTypeOf(value, type){
	return Object.prototype.toString.call(value) === '[object ' + type + ']';
}

/**
 * @param {Object} object
 * @param {string} name
 * @returns {boolean}
 */
function isPropertyOf(object, name){
	return Object.prototype.hasOwnProperty.call(object, name);
}

/**
 * @constructs Amd
 */
var Amd = function(){
	this.handlers = {};
	this.waitings = {};
};

/**
 */
Amd.prototype = {
	/**
 	 * @constructs Amd
	 */
	constructor:Amd,

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	exists:function(name){
		return isPropertyOf(this.handlers, name);
	},

	/**
	 * @param {string} name
	 * @throws {Error}
	 * @returns {any}
	 */
	require:function(name){
		if (!this.exists(name)) {
			throw new Error('The module "' + name + '" is not defined.');
		}
		return this.handlers[name].require();
	},

	/**
	 * @param {string} name
	 * @param {Array} dependencies
	 * @param {function} callback
	 * @param {number} flags
	 * @throws {Error}
	 * @returns {void}
	 */
	define:function(name, dependencies, callback, flags){
		var module = new Module(name, dependencies, callback, flags);
		if (this.exists(module.name)) {
			throw new Error('The module "' + name + '" is already defined.');
		}
		this.handlers[module.name] = new Handler(this, module);
		this.handlers[module.name].define();
	}
};

/**
 * @param {Amd} amd
 * @param {Module} module
 * @constructs Handler
 */
var Handler = function(amd, module){
	this.amd = amd;
	this.module = module;
	this.exports = null;
	this.waiting = 0;
};

/**
 */
Handler.prototype = {
	/**
	 * @constructs Handler
	 */
	constructor:Handler,

	/**
	 * @returns {void}
	 */
	define:function(){
		if (this.module.flags & Module.EXECUTE) {
			this.execute();
		}
		var self = this;
		var timeout = setTimeout(function(){
			clearTimeout(timeout);
			self.resolve();
		}, 10);
	},

	/**
	 * @throws {Error}
	 * @returns {any}
	 */
	require:function(){
		if (this.exports != null) {
			return this.exports;
		}
		this.execute();
		if (this.waiting > 0) {
			throw new Error('The module "' + this.module.name + '" still waiting for dependencies.');
		}
		return this.exports;
	},

	/**
	 * @returns {any}
	 */
	execute:function(){
		if (this.exports != null) {
			return this.exports;
		}
		var imports = [],
			exports = this.exports = this.module.exports,
			waiting = this.waiting = this.module.dependencies.length;
		for (var i = 0; i < waiting; ++i) {
			var name = this.module.dependencies[i];
			if (isPropertyOf(this.amd.handlers, name)) {
				var handler = this.amd.handlers[name],
					execute = handler.execute();
				if (execute != null) {
					imports.push(execute);
					this.waiting--;
					continue;
				}
			}
			this.amd.waitings[name] || (this.amd.waitings[name] = {});
			this.amd.waitings[name][this.module.name] || (this.amd.waitings[name][this.module.name] = this);
		}
		if (!this.waiting) {
			exports = this.module.callback.apply(this.module, imports);
			if (exports == null) {
				exports = this.module.exports;
			}
			if (exports == null) {
				exports = this.exports;
			}
		} else {
			exports = null;
		}
		this.exports = exports;
		return exports;
	},

	/**
	 * @returns {void}
	 */
	resolve:function(){
		var handlers = this.amd.waitings[this.module.name];
		if (!!handlers) {
			delete this.amd.waitings[this.module.name];
			for(var name in handlers){
				var handler = handlers[name];
				if (!--handler.waiting) {
					if (handler.module.flags & Module.EXECUTE) {
						handler.execute();
					} else {
						handler.resolve();
					}
				}
			}
		}
	}
};

/**
 * @param {string} name
 * @param {Array} dependencies
 * @param {function} callback
 * @param {number} flags
 * @constructs Module
 */
var Module = function(name, dependencies, callback, flags){
	if (!isTypeOf(name, 'String')) {
	    flags = callback;
		callback = dependencies;
		dependencies = name;
		name = noname();
	}
    if (!isTypeOf(dependencies, 'Array')) {
		flags = callback;
		callback = dependencies;
		dependencies = [];
	}
	this.name = name;
	this.dependencies = dependencies;
	this.callback = callback;
	this.flags = flags >> 0 || Module.WAITING;
	this.exports = {};
};

/**
 * @constant {number}
 */
Module.EXECUTE = 1;

/**
 * @constant {number}
 */
Module.WAITING = 2;

/**
 */
Module.prototype = {
	/**
 	 * @constructs Module
	 */
	constructor:Module
};

/**
 */
window.Amd = window.Amd || Amd;

})();
