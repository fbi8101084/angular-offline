/**
 * Created by Nobita on 14/12/30.
 * version: 1.0.0
 */
(function (angular) {
    'use strict';
    angular.module('offline', [])
        .service('offlineHelper', ['$http', '$window', '$q', '$timeout', function ($http, $window, $q, $timeout) {
            var container = this,
                localStorage = $window.localStorage;

            function Offline() {
                this.checkTime = 5000;
                this.processLocalXHR();
            }

            /*
             * 設定預設的基本資料
             * */
            Offline.prototype.cacheList = JSON.parse(localStorage.jqOffline || '[]');
            Offline.prototype.timeoutId = null;
            Offline.prototype.networkIsConnect = true;

            /*
             * 設定檔每個 XHR 都必需獨立擁有，不能共用
             * */
            Offline.prototype.offConfig = function () {
                return {
                    message: 'Network not connect, data has saved in localStorage.',
                    key: '',
                    checkTime: this.checkTime
                };
            };

            /*
             * 啟動檢查網路機制
             * */
            Offline.prototype.startCheck = function (opts) {
                var _this = this;
                _this.timeoutId = $timeout(function () {
                    _this.processLocalXHR();
                    _this.startCheck(opts);
                }, opts.offConfig.checkTime);
            };

            /*
             * 關閉檢查網路機制
             * */
            Offline.prototype.stopCheck = function () {
                $timeout.cancel(this.timeoutId);
            };

            /*
             * 迴圈執行所有暫存 XHR
             * */
            Offline.prototype.processLocalXHR = function () {
                var _this = this;

                if (_this.cacheList.length) {
                    angular.forEach(_this.cacheList, function (keyName) {
                        var opts = JSON.parse(localStorage[keyName]);

                        // don't need to do callback
                        _this.main('ajax', opts).then(function (response) {
                            if (!response.isOffline) {
                                _this.removeKeyFromList(opts.offConfig.key);
                                _this.networkIsConnect = true;
                            }
                        });
                    });
                }
            };

            /*
             * 將記錄移除
             * */
            Offline.prototype.removeKeyFromList = function (key) {
                var _this= this,
                    index = _this.cacheList.indexOf(key);

                if (0 <= index) {
                    localStorage.removeItem(key);
                    _this.cacheList.splice(index, 1);
                    localStorage.jqOffline = JSON.stringify(_this.cacheList);
                    return true;
                }

                return false;
            };

            /*
             * 將資料存在本機端
             * 補充：如果沒有指定 key 的話，key 將在這裡自動產生。
             * */
            Offline.prototype.saveDataInLocal = function (opts) {
                var _this = this;

                opts.offConfig.key = (opts.offConfig.key) ? opts.offConfig.key : 'offline_' + (new Date()).getTime() + Math.floor(Math.random() * 10000);

                localStorage[opts.offConfig.key] = JSON.stringify(opts);

                if (-1 === _this.cacheList.indexOf(opts.offConfig.key)) {
                    _this.cacheList.push(opts.offConfig.key);
                }

                localStorage.jqOffline = JSON.stringify(this.cacheList);

                // 如果沒有 timeoutId 就啟動自動檢查機制
                if (!_this.timeoutId) {
                    _this.startCheck(opts);
                }
            };

            Offline.prototype.post = function (method, url, data, callback) {
                return this.ajaxXHRGateway.call(this, url, data, callback, 'post');
            };

            Offline.prototype.get = function (method, url, data, callback) {
                return this.ajaxXHRGateway.call(this, url, data, callback, 'get');
            };

            Offline.prototype.put = function (method, url, data, callback) {
                return this.ajaxXHRGateway.call(this, url, data, callback, 'put');
            };

            Offline.prototype.delete = function (method, url, data, callback) {
                return this.ajaxXHRGateway.call(this, url, data, callback, 'delete');
            };

            /*
             * XHR type option gateway
             * */
            Offline.prototype.ajaxXHRGateway = function (url, data, callback, type) {
                if (angular.isFunction(data)) {
                    type = type || callback;
                    callback = data;
                    data = undefined;
                }

                return this.ajax({
                    url: url,
                    type: type,
                    data: data,
                    success: callback
                });
            };

            /*
             * offline 版 ajax
             * 如果判斷為離線，就自動存本機端，並且在檢查列表或下次重新整理畫面的時候送出
             * */
            Offline.prototype.ajax = function (url, opts) {
                var _this = this,
                    d = $q.defer();

                // 判斷參數的內容
                if ('object' === typeof url) {
                    opts = url;
                    url = undefined;
                }

                opts.offConfig = angular.extend(_this.offConfig(), opts.offConfig || {});

                // for $http
                opts.method = opts.method || opts.type;

                $http(opts).success(function () {
                    d.resolve.apply(_this, arguments);
                }).error(function (response, status) {
                    if (0 === status) {
                        opts.offConfig.status = status;
                        _this.saveDataInLocal(opts);
                        _this.networkIsConnect = false;
                        opts.offConfig.isOffline = true;
                        d.resolve(opts.offConfig, status);
                    } else {
                        d.reject.apply(_this, arguments);
                    }
                });

                return d.promise;
            };

            /*
             * 主要 router 介面，供使用者使用，根據 method 將程式導向所需功能。
             * */
            Offline.prototype.main = function (method, url, opts) {
                var _this = this;

                switch (method) {
                    case 'isConnect':
                        return _this.networkIsConnect;

                    case 'start':
                        _this.startCheck();
                        break;

                    case 'stop':
                        _this.stopCheck();
                        break;

                    case 'setCheckTime':
                        var num = parseInt(url);

                        if (num && (0 < num)) {
                            _this.checkTime = num;
                        }
                        return _this;

                    case 'get':
                        return _this.get.apply(_this, arguments);

                    case 'post':
                        return _this.post.apply(_this, arguments);

                    case 'put':
                        return _this.put.apply(_this, arguments);

                    case 'delete':
                        return _this.delete.apply(_this, arguments);

                    case 'ajax':
                        if ('object' === typeof url) {
                            opts = url;
                            url = undefined;
                            return _this.ajax.call(_this, opts);
                        } else {
                            opts.url = url;
                            return _this.ajax.call(_this, opts);
                        }
                }
            };

            var offline = new Offline();

            container.offline = function () {
                return offline.main.apply(offline, arguments);
            };

            return container;
        }]);
})(angular);
