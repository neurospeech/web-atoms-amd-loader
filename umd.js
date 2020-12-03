var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (factory());
}(this, (function () {
    'use strict';
    function finallyConstructor(callback) {
        var constructor = this.constructor;
        return this.then(function (value) {
            return constructor.resolve(callback()).then(function () {
                return value;
            });
        }, function (reason) {
            return constructor.resolve(callback()).then(function () {
                return constructor.reject(reason);
            });
        });
    }
    var setTimeoutFunc = setTimeout;
    function isArray(x) {
        return Boolean(x && typeof x.length !== 'undefined');
    }
    function noop() { }
    function bind(fn, thisArg) {
        return function () {
            fn.apply(thisArg, arguments);
        };
    }
    function Promise(fn) {
        if (!(this instanceof Promise))
            throw new TypeError('Promises must be constructed via new');
        if (typeof fn !== 'function')
            throw new TypeError('not a function');
        this._state = 0;
        this._handled = false;
        this._value = undefined;
        this._deferreds = [];
        doResolve(fn, this);
    }
    function handle(self, deferred) {
        while (self._state === 3) {
            self = self._value;
        }
        if (self._state === 0) {
            self._deferreds.push(deferred);
            return;
        }
        self._handled = true;
        Promise._immediateFn(function () {
            var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
            if (cb === null) {
                (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
                return;
            }
            var ret;
            try {
                ret = cb(self._value);
            }
            catch (e) {
                reject(deferred.promise, e);
                return;
            }
            resolve(deferred.promise, ret);
        });
    }
    function resolve(self, newValue) {
        try {
            if (newValue === self)
                throw new TypeError('A promise cannot be resolved with itself.');
            if (newValue &&
                (typeof newValue === 'object' || typeof newValue === 'function')) {
                var then = newValue.then;
                if (newValue instanceof Promise) {
                    self._state = 3;
                    self._value = newValue;
                    finale(self);
                    return;
                }
                else if (typeof then === 'function') {
                    doResolve(bind(then, newValue), self);
                    return;
                }
            }
            self._state = 1;
            self._value = newValue;
            finale(self);
        }
        catch (e) {
            reject(self, e);
        }
    }
    function reject(self, newValue) {
        self._state = 2;
        self._value = newValue;
        finale(self);
    }
    function finale(self) {
        if (self._state === 2 && self._deferreds.length === 0) {
            Promise._immediateFn(function () {
                if (!self._handled) {
                    Promise._unhandledRejectionFn(self._value);
                }
            });
        }
        for (var i = 0, len = self._deferreds.length; i < len; i++) {
            handle(self, self._deferreds[i]);
        }
        self._deferreds = null;
    }
    function Handler(onFulfilled, onRejected, promise) {
        this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
        this.onRejected = typeof onRejected === 'function' ? onRejected : null;
        this.promise = promise;
    }
    function doResolve(fn, self) {
        var done = false;
        try {
            fn(function (value) {
                if (done)
                    return;
                done = true;
                resolve(self, value);
            }, function (reason) {
                if (done)
                    return;
                done = true;
                reject(self, reason);
            });
        }
        catch (ex) {
            if (done)
                return;
            done = true;
            reject(self, ex);
        }
    }
    Promise.prototype['catch'] = function (onRejected) {
        return this.then(null, onRejected);
    };
    Promise.prototype.then = function (onFulfilled, onRejected) {
        var prom = new this.constructor(noop);
        handle(this, new Handler(onFulfilled, onRejected, prom));
        return prom;
    };
    Promise.prototype['finally'] = finallyConstructor;
    Promise.all = function (arr) {
        return new Promise(function (resolve, reject) {
            if (!isArray(arr)) {
                return reject(new TypeError('Promise.all accepts an array'));
            }
            var args = Array.prototype.slice.call(arr);
            if (args.length === 0)
                return resolve([]);
            var remaining = args.length;
            function res(i, val) {
                try {
                    if (val && (typeof val === 'object' || typeof val === 'function')) {
                        var then = val.then;
                        if (typeof then === 'function') {
                            then.call(val, function (val) {
                                res(i, val);
                            }, reject);
                            return;
                        }
                    }
                    args[i] = val;
                    if (--remaining === 0) {
                        resolve(args);
                    }
                }
                catch (ex) {
                    reject(ex);
                }
            }
            for (var i = 0; i < args.length; i++) {
                res(i, args[i]);
            }
        });
    };
    Promise.resolve = function (value) {
        if (value && typeof value === 'object' && value.constructor === Promise) {
            return value;
        }
        return new Promise(function (resolve) {
            resolve(value);
        });
    };
    Promise.reject = function (value) {
        return new Promise(function (resolve, reject) {
            reject(value);
        });
    };
    Promise.race = function (arr) {
        return new Promise(function (resolve, reject) {
            if (!isArray(arr)) {
                return reject(new TypeError('Promise.race accepts an array'));
            }
            for (var i = 0, len = arr.length; i < len; i++) {
                Promise.resolve(arr[i]).then(resolve, reject);
            }
        });
    };
    Promise._immediateFn =
        (typeof setImmediate === 'function' &&
            function (fn) {
                setImmediate(fn);
            }) ||
            function (fn) {
                setTimeoutFunc(fn, 0);
            };
    Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
        if (typeof console !== 'undefined' && console) {
            console.warn('Possible Unhandled Promise Rejection:', err);
        }
    };
    var globalNS = (function () {
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        throw new Error('unable to locate global object');
    })();
    if (!('Promise' in globalNS)) {
        globalNS['Promise'] = Promise;
    }
    else if (!globalNS.Promise.prototype['finally']) {
        globalNS.Promise.prototype['finally'] = finallyConstructor;
    }
})));
;
!function (o) { !function (t) { var e = "object" == typeof global ? global : "object" == typeof self ? self : "object" == typeof this ? this : Function("return this;")(), r = n(o); function n(r, n) { return function (t, e) { "function" != typeof r[t] && Object.defineProperty(r, t, { configurable: !0, writable: !0, value: e }), n && n(t, e); }; } void 0 === e.Reflect ? e.Reflect = o : r = n(e.Reflect, r), function (t) { var f = Object.prototype.hasOwnProperty, e = "function" == typeof Symbol, i = e && void 0 !== Symbol.toPrimitive ? Symbol.toPrimitive : "@@toPrimitive", s = e && void 0 !== Symbol.iterator ? Symbol.iterator : "@@iterator", r = "function" == typeof Object.create, n = { __proto__: [] } instanceof Array, o = !r && !n, c = { create: r ? function () { return S(Object.create(null)); } : n ? function () { return S({ __proto__: null }); } : function () { return S({}); }, has: o ? function (t, e) { return f.call(t, e); } : function (t, e) { return e in t; }, get: o ? function (t, e) { return f.call(t, e) ? t[e] : void 0; } : function (t, e) { return t[e]; } }, u = Object.getPrototypeOf(Function), a = "object" == typeof process && process.env && "true" === process.env.REFLECT_METADATA_USE_MAP_POLYFILL, h = a || "function" != typeof Map || "function" != typeof Map.prototype.entries ? function () { var o = {}, r = [], e = function () { function t(t, e, r) { this._index = 0, this._keys = t, this._values = e, this._selector = r; } return t.prototype["@@iterator"] = function () { return this; }, t.prototype[s] = function () { return this; }, t.prototype.next = function () { var t = this._index; if (0 <= t && t < this._keys.length) {
    var e = this._selector(this._keys[t], this._values[t]);
    return t + 1 >= this._keys.length ? (this._index = -1, this._keys = r, this._values = r) : this._index++, { value: e, done: !1 };
} return { value: void 0, done: !0 }; }, t.prototype.throw = function (t) { throw 0 <= this._index && (this._index = -1, this._keys = r, this._values = r), t; }, t.prototype.return = function (t) { return 0 <= this._index && (this._index = -1, this._keys = r, this._values = r), { value: t, done: !0 }; }, t; }(); return function () { function t() { this._keys = [], this._values = [], this._cacheKey = o, this._cacheIndex = -2; } return Object.defineProperty(t.prototype, "size", { get: function () { return this._keys.length; }, enumerable: !0, configurable: !0 }), t.prototype.has = function (t) { return 0 <= this._find(t, !1); }, t.prototype.get = function (t) { var e = this._find(t, !1); return 0 <= e ? this._values[e] : void 0; }, t.prototype.set = function (t, e) { var r = this._find(t, !0); return this._values[r] = e, this; }, t.prototype.delete = function (t) { var e = this._find(t, !1); if (0 <= e) {
    for (var r = this._keys.length, n = e + 1; n < r; n++)
        this._keys[n - 1] = this._keys[n], this._values[n - 1] = this._values[n];
    return this._keys.length--, this._values.length--, t === this._cacheKey && (this._cacheKey = o, this._cacheIndex = -2), !0;
} return !1; }, t.prototype.clear = function () { this._keys.length = 0, this._values.length = 0, this._cacheKey = o, this._cacheIndex = -2; }, t.prototype.keys = function () { return new e(this._keys, this._values, n); }, t.prototype.values = function () { return new e(this._keys, this._values, i); }, t.prototype.entries = function () { return new e(this._keys, this._values, u); }, t.prototype["@@iterator"] = function () { return this.entries(); }, t.prototype[s] = function () { return this.entries(); }, t.prototype._find = function (t, e) { return this._cacheKey !== t && (this._cacheIndex = this._keys.indexOf(this._cacheKey = t)), this._cacheIndex < 0 && e && (this._cacheIndex = this._keys.length, this._keys.push(t), this._values.push(void 0)), this._cacheIndex; }, t; }(); function n(t, e) { return t; } function i(t, e) { return e; } function u(t, e) { return [t, e]; } }() : Map, l = a || "function" != typeof Set || "function" != typeof Set.prototype.entries ? function () { function t() { this._map = new h; } return Object.defineProperty(t.prototype, "size", { get: function () { return this._map.size; }, enumerable: !0, configurable: !0 }), t.prototype.has = function (t) { return this._map.has(t); }, t.prototype.add = function (t) { return this._map.set(t, t), this; }, t.prototype.delete = function (t) { return this._map.delete(t); }, t.prototype.clear = function () { this._map.clear(); }, t.prototype.keys = function () { return this._map.keys(); }, t.prototype.values = function () { return this._map.values(); }, t.prototype.entries = function () { return this._map.entries(); }, t.prototype["@@iterator"] = function () { return this.keys(); }, t.prototype[s] = function () { return this.keys(); }, t; }() : Set, p = new (a || "function" != typeof WeakMap ? function () { var o = 16, e = c.create(), r = n(); return function () { function t() { this._key = n(); } return t.prototype.has = function (t) { var e = i(t, !1); return void 0 !== e && c.has(e, this._key); }, t.prototype.get = function (t) { var e = i(t, !1); return void 0 !== e ? c.get(e, this._key) : void 0; }, t.prototype.set = function (t, e) { var r = i(t, !0); return r[this._key] = e, this; }, t.prototype.delete = function (t) { var e = i(t, !1); return void 0 !== e && delete e[this._key]; }, t.prototype.clear = function () { this._key = n(); }, t; }(); function n() { for (var t; t = "@@WeakMap@@" + a(), c.has(e, t);)
    ; return e[t] = !0, t; } function i(t, e) { if (!f.call(t, r)) {
    if (!e)
        return;
    Object.defineProperty(t, r, { value: c.create() });
} return t[r]; } function u(t, e) { for (var r = 0; r < e; ++r)
    t[r] = 255 * Math.random() | 0; return t; } function a() { var t = function (t) { if ("function" == typeof Uint8Array)
    return "undefined" != typeof crypto ? crypto.getRandomValues(new Uint8Array(t)) : "undefined" != typeof msCrypto ? msCrypto.getRandomValues(new Uint8Array(t)) : u(new Uint8Array(t), t); return u(new Array(t), t); }(o); t[6] = 79 & t[6] | 64, t[8] = 191 & t[8] | 128; for (var e = "", r = 0; r < o; ++r) {
    var n = t[r];
    4 !== r && 6 !== r && 8 !== r || (e += "-"), n < 16 && (e += "0"), e += n.toString(16).toLowerCase();
} return e; } }() : WeakMap); function y(t, e, r) { var n = p.get(t); if (b(n)) {
    if (!r)
        return;
    n = new h, p.set(t, n);
} var o = n.get(e); if (b(o)) {
    if (!r)
        return;
    o = new h, n.set(e, o);
} return o; } function v(t, e, r) { var n = y(e, r, !1); return !b(n) && !!n.has(t); } function _(t, e, r) { var n = y(e, r, !1); if (!b(n))
    return n.get(t); } function d(t, e, r, n) { var o = y(r, n, !0); o.set(t, e); } function w(t, e) { var r = [], n = y(t, e, !1); if (b(n))
    return r; for (var o, i = n.keys(), u = function (t) { var e = M(t, s); if (!j(e))
    throw new TypeError; var r = e.call(t); if (!m(r))
    throw new TypeError; return r; }(i), a = 0;;) {
    var f = (void 0, !(o = u.next()).done && o);
    if (!f)
        return r.length = a, r;
    var c = f.value;
    try {
        r[a] = c;
    }
    catch (t) {
        try {
            A(u);
        }
        finally {
            throw t;
        }
    }
    a++;
} } function g(t) { if (null === t)
    return 1; switch (typeof t) {
    case "undefined": return 0;
    case "boolean": return 2;
    case "string": return 3;
    case "symbol": return 4;
    case "number": return 5;
    case "object": return null === t ? 1 : 6;
    default: return 6;
} } function b(t) { return void 0 === t; } function k(t) { return null === t; } function m(t) { return "object" == typeof t ? null !== t : "function" == typeof t; } function E(t, e) { switch (g(t)) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5: return t;
} var r = 3 === e ? "string" : 5 === e ? "number" : "default", n = M(t, i); if (void 0 !== n) {
    var o = n.call(t, r);
    if (m(o))
        throw new TypeError;
    return o;
} return function (t, e) { if ("string" === e) {
    var r = t.toString;
    if (j(r)) {
        var n = r.call(t);
        if (!m(n))
            return n;
    }
    var o = t.valueOf;
    if (j(o)) {
        var n = o.call(t);
        if (!m(n))
            return n;
    }
}
else {
    var o = t.valueOf;
    if (j(o)) {
        var n = o.call(t);
        if (!m(n))
            return n;
    }
    var i = t.toString;
    if (j(i)) {
        var n = i.call(t);
        if (!m(n))
            return n;
    }
} throw new TypeError; }(t, "default" === r ? "number" : r); } function T(t) { var e = E(t, 3); return "symbol" == typeof e ? e : "" + e; } function O(t) { return Array.isArray ? Array.isArray(t) : t instanceof Object ? t instanceof Array : "[object Array]" === Object.prototype.toString.call(t); } function j(t) { return "function" == typeof t; } function x(t) { return "function" == typeof t; } function M(t, e) { var r = t[e]; if (null != r) {
    if (!j(r))
        throw new TypeError;
    return r;
} } function A(t) { var e = t.return; e && e.call(t); } function P(t) { var e = Object.getPrototypeOf(t); if ("function" != typeof t || t === u)
    return e; if (e !== u)
    return e; var r = t.prototype, n = r && Object.getPrototypeOf(r); if (null == n || n === Object.prototype)
    return e; var o = n.constructor; return "function" != typeof o ? e : o === t ? e : o; } function S(t) { return t.__ = void 0, delete t.__, t; } t("decorate", function (t, e, r, n) { {
    if (b(r)) {
        if (!O(t))
            throw new TypeError;
        if (!x(e))
            throw new TypeError;
        return function (t, e) { for (var r = t.length - 1; 0 <= r; --r) {
            var n = t[r], o = n(e);
            if (!b(o) && !k(o)) {
                if (!x(o))
                    throw new TypeError;
                e = o;
            }
        } return e; }(t, e);
    }
    if (!O(t))
        throw new TypeError;
    if (!m(e))
        throw new TypeError;
    if (!m(n) && !b(n) && !k(n))
        throw new TypeError;
    return k(n) && (n = void 0), r = T(r), function (t, e, r, n) { for (var o = t.length - 1; 0 <= o; --o) {
        var i = t[o], u = i(e, r, n);
        if (!b(u) && !k(u)) {
            if (!m(u))
                throw new TypeError;
            n = u;
        }
    } return n; }(t, e, r, n);
} }), t("metadata", function (r, n) { return function (t, e) { if (!m(t))
    throw new TypeError; if (!b(e) && !function (t) { switch (g(t)) {
    case 3:
    case 4: return !0;
    default: return !1;
} }(e))
    throw new TypeError; d(r, n, t, e); }; }), t("defineMetadata", function (t, e, r, n) { if (!m(r))
    throw new TypeError; b(n) || (n = T(n)); return d(t, e, r, n); }), t("hasMetadata", function (t, e, r) { if (!m(e))
    throw new TypeError; b(r) || (r = T(r)); return function t(e, r, n) { var o = v(e, r, n); if (o)
    return !0; var i = P(r); if (!k(i))
    return t(e, i, n); return !1; }(t, e, r); }), t("hasOwnMetadata", function (t, e, r) { if (!m(e))
    throw new TypeError; b(r) || (r = T(r)); return v(t, e, r); }), t("getMetadata", function (t, e, r) { if (!m(e))
    throw new TypeError; b(r) || (r = T(r)); return function t(e, r, n) { var o = v(e, r, n); if (o)
    return _(e, r, n); var i = P(r); if (!k(i))
    return t(e, i, n); return; }(t, e, r); }), t("getOwnMetadata", function (t, e, r) { if (!m(e))
    throw new TypeError; b(r) || (r = T(r)); return _(t, e, r); }), t("getMetadataKeys", function (t, e) { if (!m(t))
    throw new TypeError; b(e) || (e = T(e)); return function t(e, r) { var n = w(e, r); var o = P(e); if (null === o)
    return n; var i = t(o, r); if (i.length <= 0)
    return n; if (n.length <= 0)
    return i; var u = new l; var a = []; for (var f = 0, c = n; f < c.length; f++) {
    var s = c[f], h = u.has(s);
    h || (u.add(s), a.push(s));
} for (var p = 0, y = i; p < y.length; p++) {
    var s = y[p], h = u.has(s);
    h || (u.add(s), a.push(s));
} return a; }(t, e); }), t("getOwnMetadataKeys", function (t, e) { if (!m(t))
    throw new TypeError; b(e) || (e = T(e)); return w(t, e); }), t("deleteMetadata", function (t, e, r) { if (!m(e))
    throw new TypeError; b(r) || (r = T(r)); var n = y(e, r, !1); if (b(n))
    return !1; if (!n.delete(t))
    return !1; if (0 < n.size)
    return !0; var o = p.get(e); return o.delete(r), 0 < o.size || p.delete(e), !0; }); }(r); }(); }(Reflect || (Reflect = {}));
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate, thisArg) {
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            if (predicate(item, i, this)) {
                return item;
            }
        }
    };
}
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate, thisArg) {
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            if (predicate(item, i, this)) {
                return i;
            }
        }
        return -1;
    };
}
if (!Array.prototype.map) {
    Array.prototype.map = function (callbackfn, thisArg) {
        const a = [];
        for (let i = 0; i < this.length; i++) {
            const r = callbackfn(this[i], i, this);
            if (r !== undefined) {
                a.push(r);
            }
        }
        return a;
    };
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, endPosition) {
        const index = this.indexOf(searchString, endPosition);
        return index === 0;
    };
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString, endPosition) {
        const index = this.lastIndexOf(searchString, endPosition);
        if (index === -1) {
            return false;
        }
        const l = this.length - index;
        return l === searchString.length;
    };
}
if (!Number.parseInt) {
    Number.parseInt = function (n) {
        return Math.floor(parseFloat(n));
    };
}
if (!Number.parseFloat) {
    Number.parseFloat = function (n) {
        return parseFloat(n);
    };
}
if (typeof Element !== "undefined") {
    if (!("remove" in Element.prototype)) {
        Element.prototype["remove"] = function () {
            if (this.parentNode) {
                this.parentNode.removeChild(this);
            }
        };
    }
}
class Module {
    constructor(name, folder) {
        this.name = name;
        this.folder = folder;
        this.emptyExports = {};
        this.ignoreModule = null;
        this.isLoaded = false;
        this.isResolved = false;
        this.dependencies = [];
        this.rID = null;
        const index = name.lastIndexOf("/");
        if (index === -1) {
            this.folder = "";
        }
        else {
            this.folder = name.substr(0, index);
        }
    }
    get filename() {
        return this.name;
    }
    get dependents() {
        const d = [];
        const v = {};
        const modules = AmdLoader.instance.modules;
        for (const key in modules) {
            if (modules.hasOwnProperty(key)) {
                const element = modules[key];
                if (element.isDependentOn(this, v)) {
                    d.push(element);
                }
            }
        }
        return d;
    }
    resolve(id) {
        if (!this.isLoaded) {
            return false;
        }
        if (this.isResolved) {
            return true;
        }
        if (!id) {
            id = Module.nextID++;
        }
        if (this.rID === id) {
            let childrenResolved = true;
            for (const iterator of this.dependencies) {
                if (iterator === this.ignoreModule) {
                    continue;
                }
                if (iterator.rID === id) {
                    continue;
                }
                if (!iterator.resolve(id)) {
                    childrenResolved = false;
                    break;
                }
            }
            return childrenResolved;
        }
        this.rID = id;
        let allResolved = true;
        for (const iterator of this.dependencies) {
            if (iterator === this.ignoreModule) {
                continue;
            }
            if (!iterator.resolve(id)) {
                allResolved = false;
                break;
            }
        }
        if (!allResolved) {
            this.rID = 0;
            return false;
        }
        const i = AmdLoader.instance;
        if (this.dependencyHooks) {
            this.dependencyHooks[0]();
            this.dependencyHooks = null;
        }
        if (this.resolveHooks) {
            this.resolveHooks[0](this.getExports());
            this.resolveHooks = null;
            i.remove(this);
            this.rID = 0;
            return true;
        }
        this.rID = 0;
        return false;
    }
    addDependency(d) {
        if (d === this.ignoreModule) {
            return;
        }
        this.dependencies.push(d);
    }
    getExports() {
        this.exports = this.emptyExports;
        if (this.factory) {
            try {
                const factory = this.factory;
                this.factory = null;
                delete this.factory;
                AmdLoader.instance.currentStack.push(this);
                const result = factory(this.require, this.exports);
                if (result) {
                    if (typeof result === "object") {
                        for (const key in result) {
                            if (result.hasOwnProperty(key)) {
                                const element = result[key];
                                this.exports[key] = element;
                            }
                        }
                    }
                    else if (!this.exports.default) {
                        this.exports.default = result;
                    }
                }
                AmdLoader.instance.currentStack.pop();
                delete this.factory;
                if (this.exports.default) {
                    this.exports.default[UMD.nameSymbol] = this.name;
                }
            }
            catch (e) {
                const em = e.stack ? (`${e}\n${e.stack}`) : e;
                const s = [];
                for (const iterator of AmdLoader.instance.currentStack) {
                    s.push(iterator.name);
                }
                const ne = new Error(`Failed loading module ${this.name} with error ${em}\nDependents: ${s.join("\n\t")}`);
                console.error(ne);
                throw ne;
            }
        }
        return this.exports;
    }
    isDependentOn(m, visited) {
        visited[this.name] = true;
        for (const iterator of this.dependencies) {
            if (iterator.name === m.name) {
                return true;
            }
            if (visited[iterator.name]) {
                continue;
            }
            if (iterator.isDependentOn(m, visited)) {
                return true;
            }
        }
        return false;
    }
}
Module.nextID = 1;
if (typeof require !== "undefined") {
    md = require("module").Module;
}
class AmdLoader {
    constructor() {
        this.root = null;
        this.defaultUrl = null;
        this.currentStack = [];
        this.nodeModules = [];
        this.modules = {};
        this.pathMap = {};
        this.mockTypes = [];
        this.lastTimeout = null;
        this.dirty = false;
    }
    register(packages, modules) {
        for (const iterator of packages) {
            if (!this.pathMap[iterator]) {
                this.map(iterator, "/");
            }
        }
        for (const iterator of modules) {
            this.get(iterator);
        }
    }
    setupRoot(root, url) {
        if (url.endsWith("/")) {
            url = url.substr(0, url.length - 1);
        }
        for (const key in this.pathMap) {
            if (this.pathMap.hasOwnProperty(key)) {
                const moduleUrl = key === root ? url : `${url}/node_modules/${key}`;
                this.map(key, moduleUrl);
            }
        }
        this.defaultUrl = `${url}/node_modules/`;
    }
    registerModule(name, moduleExports) {
        const m = this.get(name);
        m.package.url = "/";
        m.exports = Object.assign({ __esModule: true }, moduleExports);
        m.loader = Promise.resolve();
        m.resolver = Promise.resolve(m.exports);
        m.isLoaded = true;
        m.isResolved = true;
    }
    setup(name) {
        const jsModule = this.get(name);
        const define = this.define;
        jsModule.loader = Promise.resolve();
        AmdLoader.current = jsModule;
        if (define) {
            define();
        }
        if (jsModule.exportVar) {
            jsModule.exports = AmdLoader.globalVar[jsModule.exportVar];
        }
        this.push(jsModule);
        jsModule.isLoaded = true;
        setTimeout(() => {
            this.loadDependencies(jsModule);
        }, 1);
    }
    loadDependencies(m) {
        this.resolveModule(m).catch((e) => {
            console.error(e);
        });
        if (m.dependencies.length) {
            const all = m.dependencies.map((m1) => __awaiter(this, void 0, void 0, function* () {
                if (m1.isResolved) {
                    return;
                }
                yield this.import(m1);
            }));
            Promise.all(all).catch((e) => {
                console.error(e);
            }).then(() => {
                m.resolve();
            });
        }
        else {
            m.resolve();
        }
        this.queueResolveModules(1);
    }
    replace(type, name, mock) {
        if (mock && !this.enableMock) {
            return;
        }
        const peek = this.currentStack.length ? this.currentStack[this.currentStack.length - 1] : undefined;
        const rt = new MockType(peek, type, name, mock);
        this.mockTypes.push(rt);
    }
    resolveType(type) {
        const t = this.mockTypes.find((tx) => tx.type === type);
        return t ? t.replaced : type;
    }
    map(packageName, packageUrl, type = "amd", exportVar) {
        let existing = this.pathMap[packageName];
        if (existing) {
            existing.url = packageUrl;
            existing.exportVar = exportVar;
            existing.type = type;
            return existing;
        }
        existing = {
            name: packageName,
            url: packageUrl,
            type,
            exportVar,
            version: ""
        };
        if (packageName === "reflect-metadata") {
            type = "global";
        }
        this.pathMap[packageName] = existing;
        return existing;
    }
    resolveSource(name, defExt = ".js") {
        try {
            if (/^((\/)|((http|https)\:\/\/))/i.test(name)) {
                return name;
            }
            let path = null;
            for (const key in this.pathMap) {
                if (this.pathMap.hasOwnProperty(key)) {
                    const packageName = key;
                    if (name.startsWith(packageName)) {
                        path = this.pathMap[key].url;
                        if (name.length !== packageName.length) {
                            if (name[packageName.length] !== "/") {
                                continue;
                            }
                            name = name.substr(packageName.length + 1);
                        }
                        else {
                            return path;
                        }
                        if (path.endsWith("/")) {
                            path = path.substr(0, path.length - 1);
                        }
                        path = path + "/" + name;
                        const i = name.lastIndexOf("/");
                        const fileName = name.substr(i + 1);
                        if (fileName.indexOf(".") === -1) {
                            path = path + defExt;
                        }
                        return path;
                    }
                }
            }
            return name;
        }
        catch (e) {
            console.error(`Failed to resolve ${name} with error ${JSON.stringify(e)}`);
            console.error(e);
        }
    }
    resolveRelativePath(name, currentPackage) {
        if (name.charAt(0) !== ".") {
            return name;
        }
        const tokens = name.split("/");
        const currentTokens = currentPackage.split("/");
        currentTokens.pop();
        while (tokens.length) {
            const first = tokens[0];
            if (first === "..") {
                currentTokens.pop();
                tokens.splice(0, 1);
                continue;
            }
            if (first === ".") {
                tokens.splice(0, 1);
            }
            break;
        }
        return `${currentTokens.join("/")}/${tokens.join("/")}`;
    }
    getPackageVersion(name) {
        let [scope, packageName] = name.split("/", 3);
        let version = "";
        if (scope[0] !== "@") {
            packageName = scope;
            scope = "";
        }
        else {
            scope += "/";
        }
        const versionTokens = packageName.split("@");
        if (versionTokens.length > 1) {
            version = versionTokens[1];
            name = name.replace("@" + version, "");
        }
        packageName = scope + packageName;
        return { packageName, version, name };
    }
    get(name1) {
        let module = this.modules[name1];
        if (!module) {
            const { packageName, version, name } = this.getPackageVersion(name1);
            module = new Module(name);
            this.modules[name1] = module;
            module.package = this.pathMap[packageName] ||
                (this.pathMap[packageName] = {
                    type: "amd",
                    name: packageName,
                    version,
                    url: this.defaultUrl ?
                        (this.defaultUrl + packageName) : undefined
                });
            module.url = this.resolveSource(name);
            if (!module.url) {
                if (typeof require === "undefined") {
                    throw new Error(`No url mapped for ${name}`);
                }
            }
            module.require = (n) => {
                const an = this.resolveRelativePath(n, module.name);
                const resolvedModule = this.get(an);
                const m = resolvedModule.getExports();
                return m;
            };
            module.require.resolve = (n) => this.resolveRelativePath(n, module.name);
            this.modules[name] = module;
        }
        return module;
    }
    import(name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof require !== "undefined") {
                return Promise.resolve(require(name));
            }
            const module = typeof name === "object" ? name : this.get(name);
            yield this.load(module);
            const e = yield this.resolveModule(module);
            return e;
        });
    }
    load(module) {
        if (module.loader) {
            return module.loader;
        }
        this.push(module);
        if (AmdLoader.isJson.test(module.url)) {
            const mUrl = module.package.url + module.url;
            module.loader = new Promise((resolve, reject) => {
                try {
                    AmdLoader.httpTextLoader(mUrl, (r) => {
                        try {
                            module.exports = JSON.parse(r);
                            module.emptyExports = module.exports;
                            module.isLoaded = true;
                            setTimeout(() => this.loadDependencies(module), 1);
                            resolve();
                        }
                        catch (e) {
                            reject(e);
                        }
                    }, reject);
                }
                catch (e1) {
                    reject(e1);
                }
            });
        }
        if (AmdLoader.isMedia.test(module.url)) {
            const mUrl = !module.url.startsWith(module.package.url)
                ? (module.package.url + module.url)
                : module.url;
            const m = {
                url: mUrl,
                toString: () => mUrl
            };
            const e = { __esModule: true, default: m };
            module.exports = e;
            module.emptyExports = e;
            module.loader = Promise.resolve();
            module.isLoaded = true;
            return module.loader;
        }
        module.loader = new Promise((resolve, reject) => {
            AmdLoader.moduleLoader(module.name, module.url, () => {
                try {
                    AmdLoader.current = module;
                    if (AmdLoader.instance.define) {
                        AmdLoader.instance.define();
                        AmdLoader.instance.define = null;
                    }
                    if (module.exportVar) {
                        module.exports = AmdLoader.globalVar[module.exportVar];
                    }
                    if (AmdLoader.moduleProgress) {
                        AmdLoader.moduleProgress(module.name, this.modules, "loading");
                    }
                    module.isLoaded = true;
                    setTimeout(() => {
                        this.loadDependencies(module);
                    }, 1);
                    resolve();
                }
                catch (e) {
                    console.error(e);
                    reject(e);
                }
            }, (error) => {
                reject(error);
            });
        });
        return module.loader;
    }
    resolveModule(module) {
        if (module.resolver) {
            return module.resolver;
        }
        module.resolver = this._resolveModule(module);
        return module.resolver;
    }
    remove(m) {
        if (this.tail === m) {
            this.tail = m.previous;
        }
        if (m.next) {
            m.next.previous = m.previous;
        }
        if (m.previous) {
            m.previous.next = m.next;
        }
        m.next = null;
        m.previous = null;
        this.dirty = true;
        this.queueResolveModules();
    }
    queueResolveModules(n = 1) {
        if (this.lastTimeout) {
            return;
        }
        this.lastTimeout = setTimeout(() => {
            this.lastTimeout = 0;
            this.resolvePendingModules();
        }, n);
    }
    watch() {
        const id = setInterval(() => {
            if (this.tail) {
                const list = [];
                for (const key in this.modules) {
                    if (this.modules.hasOwnProperty(key)) {
                        const element = this.modules[key];
                        if (!element.isResolved) {
                            list.push({
                                name: element.name,
                                dependencies: element.dependencies.map((x) => x.name)
                            });
                        }
                    }
                }
                console.log("Pending modules");
                console.log(JSON.stringify(list));
                return;
            }
            clearInterval(id);
        }, 10000);
    }
    resolvePendingModules() {
        if (!this.tail) {
            return;
        }
        this.dirty = false;
        const pending = [];
        let m = this.tail;
        while (m) {
            if (!m.dependencies.length) {
                m.resolve();
            }
            else {
                pending.push(m);
            }
            m = m.previous;
        }
        if (this.dirty) {
            this.dirty = false;
            return;
        }
        for (const iterator of pending) {
            iterator.resolve();
        }
        if (this.dirty) {
            this.dirty = false;
            return;
        }
        if (this.tail) {
            this.queueResolveModules();
        }
    }
    push(m) {
        if (this.tail) {
            m.previous = this.tail;
            this.tail.next = m;
        }
        this.tail = m;
    }
    _resolveModule(module) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.root) {
                this.root = module;
            }
            yield new Promise((resolve, reject) => {
                module.dependencyHooks = [resolve, reject];
            });
            const exports = module.getExports();
            const pendingList = this.mockTypes.filter((t) => !t.loaded);
            if (pendingList.length) {
                for (const iterator of pendingList) {
                    iterator.loaded = true;
                }
                const tasks = pendingList.map((iterator) => __awaiter(this, void 0, void 0, function* () {
                    const containerModule = iterator.module;
                    const resolvedName = this.resolveRelativePath(iterator.moduleName, containerModule.name);
                    const im = this.get(resolvedName);
                    im.ignoreModule = module;
                    const ex = yield this.import(im);
                    const type = ex[iterator.exportName];
                    iterator.replaced = type;
                }));
                yield Promise.all(tasks);
            }
            const setHooks = new Promise((resolve, reject) => {
                module.resolveHooks = [resolve, reject];
            });
            yield setHooks;
            if (this.root === module) {
                this.root = null;
                AmdLoader.moduleProgress(null, this.modules, "done");
            }
            module.isResolved = true;
            return exports;
        });
    }
}
AmdLoader.isMedia = /\.(jpg|jpeg|gif|png|mp4|mp3|css|html|svg)$/i;
AmdLoader.isJson = /\.json$/i;
AmdLoader.globalVar = {};
AmdLoader.instance = new AmdLoader();
AmdLoader.current = null;
const a = AmdLoader.instance;
a.map("global", "/", "global");
a.registerModule("global/document", { default: document });
a.registerModule("global/window", { default: typeof window !== "undefined" ? window : global });
a.map("reflect-metadata", "/", "global");
a.registerModule("reflect-metadata", Reflect);
AmdLoader.moduleLoader = (name, url, success, error) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;
    const s = script;
    script.onload = s.onreadystatechange = () => {
        if ((s.readyState && s.readyState !== "complete" && s.readyState !== "loaded")) {
            return;
        }
        script.onload = s.onreadystatechange = null;
        success();
    };
    script.onerror = (e) => { error(e); };
    document.body.appendChild(script);
};
AmdLoader.httpTextLoader = (url, success, error) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = (e) => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                success(xhr.responseText);
            }
            else {
                error(xhr.responseText);
            }
        }
    };
    xhr.open("GET", url);
    xhr.send();
};
AmdLoader.moduleProgress = (() => {
    if (!document) {
        return (name, p) => {
            console.log(`${name} ${p}%`);
        };
    }
    const progressDiv = document.createElement("div");
    progressDiv.className = "web-atoms-progress-div";
    const style = progressDiv.style;
    style.position = "absolute";
    style.margin = "auto";
    style.width = "200px";
    style.height = "100px";
    style.top = style.right = style.left = style.bottom = "5px";
    style.borderStyle = "solid";
    style.borderWidth = "1px";
    style.borderColor = "#A0A0A0";
    style.borderRadius = "5px";
    style.padding = "5px";
    style.textAlign = "left";
    style.verticalAlign = "bottom";
    const progressLabel = document.createElement("pre");
    progressDiv.appendChild(progressLabel);
    progressLabel.style.color = "#A0A0A0";
    const ps = progressLabel.style;
    ps.position = "absolute";
    ps.left = "5px";
    ps.bottom = "0";
    function ready() {
        document.body.appendChild(progressDiv);
    }
    function completed() {
        document.removeEventListener("DOMContentLoaded", completed);
        window.removeEventListener("load", completed);
        ready();
    }
    if (document.readyState === "complete" ||
        (document.readyState !== "loading" && !document.documentElement["doScroll"])) {
        window.setTimeout(ready);
    }
    else {
        document.addEventListener("DOMContentLoaded", completed);
        window.addEventListener("load", completed);
    }
    return (name, n, status) => {
        if (status === "done") {
            progressDiv.style.display = "none";
            return;
        }
        else {
            progressDiv.style.display = "block";
        }
        name = name.split("/").pop();
        progressLabel.textContent = name;
    };
})();
var define = (requiresOrFactory, factory, nested) => {
    const loader = AmdLoader.instance;
    function bindFactory(module, requireList, fx) {
        if (module.factory) {
            return;
        }
        module.dependencies = [];
        let requires = requireList;
        requires = requireList;
        const args = [];
        for (const s of requires) {
            if (s === "require") {
                args.push(module.require);
                continue;
            }
            if (s === "exports") {
                args.push(module.emptyExports);
                continue;
            }
            if (/^global/.test(s)) {
                args.push(loader.get(s).exports);
            }
            const name = loader.resolveRelativePath(s, module.name);
            const child = loader.get(name);
            module.addDependency(child);
        }
        module.factory = () => {
            return fx.apply(module, args);
        };
    }
    if (nested) {
        const name = requiresOrFactory;
        const rList = factory;
        const f = nested;
        const module = AmdLoader.instance.get(name);
        bindFactory(module, rList, f);
        setTimeout(() => {
            loader.loadDependencies(module);
        }, 1);
        return;
    }
    AmdLoader.instance.define = () => {
        const current = AmdLoader.current;
        if (!current) {
            return;
        }
        if (current.factory) {
            return;
        }
        if (typeof requiresOrFactory === "function") {
            bindFactory(current, [], requiresOrFactory);
        }
        else {
            bindFactory(current, requiresOrFactory, factory);
        }
    };
};
define.amd = {};
class MockType {
    constructor(module, type, name, mock, moduleName, exportName) {
        this.module = module;
        this.type = type;
        this.name = name;
        this.mock = mock;
        this.moduleName = moduleName;
        this.exportName = exportName;
        this.loaded = false;
        this.name = name = name
            .replace("{lang}", UMD.lang)
            .replace("{platform}", UMD.viewPrefix);
        if (name.indexOf("$") !== -1) {
            const tokens = name.split("$");
            this.moduleName = tokens[0];
            this.exportName = tokens[1] || tokens[0].split("/").pop();
        }
        else {
            this.moduleName = name;
            this.exportName = "default";
        }
    }
}
class UMDClass {
    constructor() {
        this.viewPrefix = "web";
        this.defaultApp = "@web-atoms/core/dist/web/WebApp";
        this.lang = "en-US";
        this.nameSymbol = typeof Symbol !== "undefined" ? Symbol() : "_$_nameSymbol";
    }
    get mock() {
        return AmdLoader.instance.enableMock;
    }
    set mock(v) {
        AmdLoader.instance.enableMock = v;
    }
    resolvePath(n) {
        return AmdLoader.instance.resolveSource(n, null);
    }
    resolveViewPath(path) {
        return path.replace("{platform}", this.viewPrefix);
    }
    resolveType(type) {
        return AmdLoader.instance.resolveType(type);
    }
    map(name, path, type = "amd", exportVar) {
        AmdLoader.instance.map(name, path, type, exportVar);
    }
    setupRoot(name, url) {
        AmdLoader.instance.setupRoot(name, url);
    }
    mockType(type, name) {
        AmdLoader.instance.replace(type, name, true);
    }
    inject(type, name) {
        AmdLoader.instance.replace(type, name, false);
    }
    resolveViewClassAsync(path) {
        return __awaiter(this, void 0, void 0, function* () {
            path = this.resolveViewPath(path);
            const e = yield AmdLoader.instance.import(path);
            return e.default;
        });
    }
    import(path) {
        return AmdLoader.instance.import(path);
    }
    load(path, designMode) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mock = designMode;
            const t = yield AmdLoader.instance.import("@web-atoms/core/dist/core/types");
            const a = yield AmdLoader.instance.import("@web-atoms/core/dist/Atom");
            a.Atom.designMode = designMode;
            const al = yield AmdLoader.instance.import("@web-atoms/core/dist/core/AtomList");
            return yield AmdLoader.instance.import(path);
        });
    }
    hostView(id, path, designMode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.mock = designMode;
                AmdLoader.instance.get(path);
                const m = yield this.load(this.defaultApp, designMode);
                const app = new (m.default)();
                app.onReady(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const viewClass = yield AmdLoader.instance.import(path);
                        const view = new (viewClass.default)(app);
                        const element = document.getElementById(id);
                        element.appendChild(view.element);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }));
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    loadView(path, designMode, appPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.mock = designMode;
                appPath = appPath || this.defaultApp;
                AmdLoader.instance.get(path);
                const m = yield this.load(appPath, designMode);
                const app = new (m.default)();
                return yield new Promise((resolve, reject) => {
                    app.onReady(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const viewClass = yield AmdLoader.instance.import(path);
                            const view = new (viewClass.default)(app);
                            app.root = view;
                            resolve(view);
                        }
                        catch (e) {
                            console.error(e);
                            reject(e);
                        }
                    }));
                });
            }
            catch (er) {
                console.error(er);
                throw er;
            }
        });
    }
}
const UMD = new UMDClass();
((u) => {
    const globalNS = (typeof window !== "undefined" ? window : global);
    globalNS.UMD = u;
})(UMD);
//# sourceMappingURL=umd.js.map