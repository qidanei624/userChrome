// ==UserScript==
// @name           uAutoPagerize 中文規則增強簡化版
// @namespace      http://d.hatena.ne.jp/Griever/
// @description    在同一個頁面自動加載下一頁
// @include        main
// @modified       ywzhaiqi
// @compatibility  Firefox 17
// @charset        UTF-8
// @version        0.3.0
// @update         2014-06-04
// @homepageURL    https://github.com/ywzhaiqi/userChromeJS/tree/master/uAutoPagerize2
// @reviewURL      http://bbs.kafan.cn/thread-1555846-1-1.html
// @optionsURL     about:config?filter=uAutoPagerize.
// @note           0.3.0 本家に倣って Cookie の處理を変更した
// @note           0.2.9 remove E4X
// @note           0.2.8 履歴に入れる機能を廃止
// @note           0.2.7 Firefox 14 でとりあえず動くように修正
// @note           0.2.6 組み込みの SITEINFO を修正
// @note           0.2.5 MICROFORMAT も設定ファイルから追加・無効化できるようにした
// @note           0.2.5 スペースアルクで動かなくなってたのを修正
// @note           0.2.4 SITEINFO のソートをやめてチェックの仕方を変えた（一度SITEINFOを更新した方がいいかも）
// @note           0.2.4 naver まとめ、kakaku.com 修正
// @note           0.2.3 kakaku.com のスペック検索に対応
// @note           0.2.3 Fx7 くらいから xml で動かなくなってたのを修正
// @note           0.2.3 ver 0.2.2 で nextLink に form 要素が指定されている場合などに動かなくなってたのを修正
// @note           0.2.2 コンテキストメニューが意外と邪魔だったので葬った
// @note           0.2.1 コンテキストメニューに次のページを開くメニューを追加
// @note           0.2.1 區切りのアイコンをクリックしても色が変わらなかったのを修正
// @note           0.2.0 INCLUDE を設定できるようにした
// @note           0.2.0 INCLUDE, EXCLUDE をワイルドカード式にした
// @note           0.2.0 アイコンに右クリックメニューを付けた
// @note           0.2.0 スクロールするまでは次を読み込まないオプションをつけた
// ==/UserScript==

// this script based on
// AutoPagerize version: 0.0.41 2009-09-05T16:02:17+09:00 (http://autopagerize.net/)
// oAutoPagerize (http://d.hatena.ne.jp/os0x/searchdiary?word=%2a%5boAutoPagerize%5d)
//
// Released under the GPL license
// http://www.gnu.org/copyleft/gpl.html

(function(css) {

var isUrlbar = 1;  // 放置的位置，0 為附加組件欄，1 為地址欄
var ORIGINAL_SITEINFO = false;  // 原版JSON規則是否啟用？以國外網站為主
var UPDATE_CN_SITEINFO_DAYS = 7;  // 更新中文規則的間隔（天）

var DB_FILENAME_MY = "local\\_uAutoPagerize.js",       // 自定義數據庫的位置
    DB_FILENAME_CN = "local\\uSuper_preloader.db.js",  // 中文數據庫的位置
    DB_FILENAME_EN = "local\\uAutoPagerize.json";      // 默認的 JSON 數據庫位置

var SEND_COOKIE = false;  // 是否發送 cookie？百度有問題時需要清除 cookie

// ワイルドカード(*)で記述する
var INCLUDE = [
    "*"
];
var EXCLUDE = [
    'https://mail.google.com/*',
    'https://maps.google.*/*',
    'https://www.google.com/maps/*',
    'https://www.google.com/calendar*',
    'http://www.google.*/reader/*',
    '*://app.yinxiang.com/*',
    '*://www.dropbox.com/*',
    '*://www.toodledo.com/*',
    '*://www.wumii.com/*',
    'http://www.cnbeta.com/*'
];

var MY_SITEINFO = [
    {
        url          : '^https?://mobile\\.twitter\\.com/'
        ,nextLink    : '//div[contains(concat(" ",normalize-space(@class)," "), " w-button-more ")]/a[@href]'
        ,pageElement : '//div[@class="timeline"]/table[@class="tweet"] | //div[@class="user-list"]/table[@class="user-item"]'
        ,exampleUrl  : 'https://mobile.twitter.com/ https://mobile.twitter.com/search?q=css'
    },
];

var MICROFORMAT = [
    {
        url         : '^https?://.*',
        nextLink    : '//a[@rel="next"] | //link[@rel="next"]',
        pageElement : '//*[contains(@class, "autopagerize_page_element")]',
        insertBefore: '//*[contains(@class, "autopagerize_insert_before")]',
    }
];

var SITEINFO_IMPORT_URLS = ORIGINAL_SITEINFO ? [
        'http://wedata.net/databases/AutoPagerize/items.json',
    ] : [];

// Super_preloaderPlus 地址
var SITEINFO_CN_IMPORT_URL = "https://greasyfork.org/scripts/293-super-preloaderplus-one/code/Super_preloaderPlus_one.user.js";
// var SITEINFO_CN_IMPORT_URL = "https://github.com/ywzhaiqi/userscript/raw/master/Super_preloaderPlus/super_preloaderplus_one.user.js";

var COLOR = {
    on: '#0f0',
	off: '#ccc',
	enable: '#0f0',
	disable: '#ccc',
	loading: '#0ff',
	terminated: '#00f',
	error: '#f0f'
};

// 出在自動翻頁信息附加顯示真實相對頁面信息，一般能智能識別出來。如果還有站點不能識別，可以把地址的特徵字符串加到下面
// 最好不要亂加，一些不規律的站點顯示出來的數字也沒有意義
var REALPAGE_SITE_PATTERN = ['search?', 'search_', 'forum', 'thread'];





// 以下 設定が無いときに利用する
var FORCE_TARGET_WINDOW = true;
var BASE_REMAIN_HEIGHT = 400;
var DEBUG = false;
var AUTO_START = true;
var SCROLL_ONLY = false;
var CACHE_EXPIRE = 24 * 60 * 60 * 1000;
var XHR_TIMEOUT = 30 * 1000;

// 新增的
var MAX_PAGER_NUM = -1;          // 默認最大翻頁數， -1表示無限制
var IMMEDIATELY_PAGER_NUM = 100;   // 立即加載的默認頁數
var USE_IFRAME = true;           // 是否啟用 iframe 加載下一頁（瀏覽器級，默認只允許JavaScript，在 createIframe 中可設置其它允許）
var PRELOADER_NEXTPAGE = true;   // 提前預讀下一頁..就是翻完第1頁,立馬預讀第2頁,翻完第2頁,立馬預讀第3頁..(大幅加快翻頁快感-_-!!)
var ADD_TO_HISTORY = false;      // 添加下一頁鏈接到歷史記錄
var SEPARATOR_RELATIVELY = true; // 分隔符.在使用上滾一頁或下滾一頁的時候是否保持相對位置..
// 額外的設置，在配置文件中
var prefs = {
    pauseA: false,            // 快速停止翻頁開關
};
let { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services) Cu.import("resource://gre/modules/Services.jsm");
if (typeof window.uAutoPagerize != 'undefined') {
    window.uAutoPagerize.destroy();
    // 補上 siteinfo_writer 菜單
    if (window.siteinfo_writer && !document.getElementById("sw-popup-menuitem")) {
        var menuitem = $C("menuitem", {
            id: "sw-popup-menuitem",
            class: "sw-add-element",
            label: "輔助定製翻頁規則",
            oncommand: "siteinfo_writer.show();",
        });
        setTimeout(function(){
            document.getElementById("uAutoPagerize-popup").appendChild(menuitem);
        }, 1000);
    }
}

var ns = window.uAutoPagerize = {
    INCLUDE_REGEXP : /./,
    EXCLUDE_REGEXP : [],
    MICROFORMAT    : MICROFORMAT.slice(),
    MY_SITEINFO    : MY_SITEINFO.slice(),
    SITEINFO       : [],
    SITEINFO_CN    : [],

    get prefs() {
        delete this.prefs;
        return this.prefs = Services.prefs.getBranch("uAutoPagerize.");
    },
    get file() {
        var aFile = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
        aFile.appendRelativePath(DB_FILENAME_MY);
        delete this.file;
        return this.file = aFile;
    },
    get file_CN() {
        var aFile = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
        aFile.appendRelativePath(DB_FILENAME_CN);
        delete this.file_CN;
        return this.file_CN = aFile;
    },
    _isModified_lastcheck: 0,
    _modified: 0,
    get isModified() {
        let aFile = ns.file;
        if(!aFile.exists() || !aFile.isFile()){
            return false;
        }

        let now = Date.now();
        if (now - this._isModified_lastcheck < 1000) {
            return false;
        }
        this._isModified_lastcheck = now;

        let lmt = aFile.lastModifiedTime;
        if (this._modified != lmt) {
            this._modified = lmt;
            return true;
        }

        return false;
    },

    get INCLUDE() INCLUDE,
    set INCLUDE(arr) {
        try {
            this.INCLUDE_REGEXP = arr.length > 0 ?
                new RegExp(arr.map(wildcardToRegExpStr).join("|")) :
                /./;
            INCLUDE = arr;
        } catch (e) {
            log("INCLUDE 不正確");
        }
        return arr;
    },
    get EXCLUDE() EXCLUDE,
    set EXCLUDE(arr) {
        try {
            this.EXCLUDE_REGEXP = arr.map(function(s){
                return new RegExp(wildcardToRegExpStr(s));
            });
            EXCLUDE = arr;
        } catch (e) {
            log("EXCLUDE 不正確");
        }
        return arr;
    },
    get AUTO_START() AUTO_START,
    set AUTO_START(bool) {
        updateIcon();
        $("uAutoPagerize-AUTOSTART").setAttribute("checked", !!bool);
        return AUTO_START = !!bool;
    },
    get BASE_REMAIN_HEIGHT() BASE_REMAIN_HEIGHT,
    set BASE_REMAIN_HEIGHT(num) {
        num = parseInt(num, 10);
        if (!num) return num;
        let m = $("uAutoPagerize-BASE_REMAIN_HEIGHT");
        if (m) m.setAttribute("tooltiptext", BASE_REMAIN_HEIGHT = num);
        return num;
    },
    get MAX_PAGER_NUM() MAX_PAGER_NUM,
    set MAX_PAGER_NUM(num) {
        num = parseInt(num, 10);
        if (!num) return num;
        let m = $("uAutoPagerize-MAX_PAGER_NUM");
        if (m) m.setAttribute("tooltiptext", MAX_PAGER_NUM = num);
        return num;
    },
    get IMMEDIATELY_PAGER_NUM() $("uAutoPagerize-immedialate-pages").value,
    set IMMEDIATELY_PAGER_NUM(num){
        num = parseInt(num, 10);
        if (!num && (num != 0)) return num;
        let m = $("uAutoPagerize-immedialate-pages");
        if (m) m.value = num;
        return num;
    },
    get DEBUG() DEBUG,
    set DEBUG(bool) {
        let m = $("uAutoPagerize-DEBUG");
        if (m) m.setAttribute("checked", DEBUG = !!bool);
        return bool;
    },
    get FORCE_TARGET_WINDOW() FORCE_TARGET_WINDOW,
    set FORCE_TARGET_WINDOW(bool) {
        let m = $("uAutoPagerize-FORCE_TARGET_WINDOW");
        if (m) m.setAttribute("checked", FORCE_TARGET_WINDOW = !!bool);
        return bool;
    },
    get SCROLL_ONLY() SCROLL_ONLY,
    set SCROLL_ONLY(bool) {
        let m = $("uAutoPagerize-SCROLL_ONLY");
        if (m) m.setAttribute("checked", SCROLL_ONLY = !!bool);
        return bool;
    },
    get PRELOADER_NEXTPAGE() PRELOADER_NEXTPAGE,
    set PRELOADER_NEXTPAGE(bool) {
        let m = $("uAutoPagerize-PRELOADER_NEXTPAGE");
        if (m) m.setAttribute("checked", PRELOADER_NEXTPAGE = !!bool);
        return bool;
    },
    get ADD_TO_HISTORY() ADD_TO_HISTORY,
    set ADD_TO_HISTORY(bool) {
        let m = $("uAutoPagerize-ADD_TO_HISTORY");
        if (m) m.setAttribute("checked", ADD_TO_HISTORY = !!bool);
        return bool;
    },
    lastCheckTime: 0,
    setLastCheckTime: function() {
        var time = parseInt(new Date().getTime()/1000);
        try {
            ns.prefs.setIntPref('lastCheckTime', ns.lastCheckTime = time);
        } catch(e) {}
    },

    init: function() {
        ns.style = addStyle(css);

        if (isUrlbar) {
            ns.icon = $('TabsToolbar').appendChild($C("image", {
                id: "uAutoPagerize-icon",
                state: "disable",
                tooltiptext: "disable",
//                onmouseover: "document.getElementById('uAutoPagerize-popup').openPopupAtScreen(event.screenX, event.screenY, true);",
                onclick: "if (event.button != 2) {uAutoPagerize.iconClick(event);} else if (event.button == 2) {uAutoPagerize.edit(uAutoPagerize.file_CN, true); uAutoPagerize.edit(uAutoPagerize.file); event.preventDefault();}",
//                context: "uAutoPagerize-popup",
                style: "margin: 8px 1px;",
            }));
        } else {
            ns.icon = $('status-bar').appendChild($C("statusbarpanel", {
            // ns.icon = $('addon-bar').appendChild($C("statusbarpanel", {
                id: "uAutoPagerize-icon",
                class: "statusbarpanel-iconic",
                state: "disable",
                tooltiptext: "disable",
                onclick: "if (event.button != 2) {uAutoPagerize.iconClick(event);} else if (event.button == 2) {uAutoPagerize.edit(uAutoPagerize.file_CN, true); uAutoPagerize.edit(uAutoPagerize.file); event.preventDefault();}",
//                context: "uAutoPagerize-popup",
            }));
        }

        var xml = '\
            <menupopup id="uAutoPagerize-popup" position="after_start"\
                       ignorekeys="true"\
                       onpopupshowing="uAutoPagerize.onPopupShowing(event);" >\
                <menuitem label="啟用自動翻頁"\
                          id="uAutoPagerize-AUTOSTART"\
                          type="checkbox"\
                          checked="'+ AUTO_START +'"\
                          oncommand="uAutoPagerize.toggle(event);"/>\
                <menuitem label="重新載入 / 編輯配置"\
                          tooltiptext="左鍵：重新載入配置\n右鍵：編輯配置文件和中文規則文件"\
                          onclick="uAutoPagerize.reloadMenuClick(event);"/>\
                <menuitem label="更新中文規則" \
                          tooltiptext="包含 Super_preloader 的中文規則"\
                          oncommand="uAutoPagerize.resetSITEINFO_CN();"/>\
                <menuitem label="更新原版規則" hidden="' + !ORIGINAL_SITEINFO + '" \
                          tooltiptext="原版 JSON 規則，以外國網站為主" \
                          oncommand="uAutoPagerize.resetSITEINFO();"/>\
                <hbox>\
                    <textbox id="uAutoPagerize-blacklist-textbox" oninput="uAutoPagerize.checkUrl(event);"\
                        tooltiptext="綠色代表在黑名單中，紅色代表不匹配當前網址"/>\
                    <toolbarbutton label="添加" id="uAutoPagerize-blacklist-icon" \
                        tooltiptext="添加到黑名單" onclick="uAutoPagerize.blacklistBtnClick(event);"/>\
                </hbox>\
                <hbox style="padding-left:32px;">\
                    立即翻<textbox type="number" value="' + IMMEDIATELY_PAGER_NUM + '" tooltiptext="連續翻頁的數量" \
                        id="uAutoPagerize-immedialate-pages" style="width:35px" />頁\
                    <toolbarbutton label="開始" tooltiptext="現在立即開始連續翻頁" \
                        id="uAutoPagerize-immedialate-start" oncommand="uAutoPagerize.immediatelyStart();"/>\
                </hbox>\
                <menuseparator/>\
                <menuitem label="提前預讀下一頁"\
                          tooltiptext="翻完第1頁,立馬預讀第2頁,翻完第2頁,立馬預讀第3頁..(大幅加快翻頁快感-_-!!)"\
                          id="uAutoPagerize-PRELOADER_NEXTPAGE"\
                          type="checkbox"\
                          autoCheck="false"\
                          checked="'+ PRELOADER_NEXTPAGE +'"\
                          oncommand="uAutoPagerize.PRELOADER_NEXTPAGE = !uAutoPagerize.PRELOADER_NEXTPAGE;"/>\
                <menuitem label="添加下一頁到歷史記錄"\
                          id="uAutoPagerize-ADD_TO_HISTORY"\
                          type="checkbox"\
                          autoCheck="false"\
                          checked="'+ ADD_TO_HISTORY +'"\
                          oncommand="uAutoPagerize.ADD_TO_HISTORY = !uAutoPagerize.ADD_TO_HISTORY;"/>\
                <menuitem label="新標籤打開鏈接"\
                          tooltiptext="下一頁的鏈接設置成在新標籤頁打開"\
                          id="uAutoPagerize-FORCE_TARGET_WINDOW"\
                          type="checkbox"\
                          autoCheck="false"\
                          checked="'+ FORCE_TARGET_WINDOW +'"\
                          oncommand="uAutoPagerize.FORCE_TARGET_WINDOW = !uAutoPagerize.FORCE_TARGET_WINDOW;"/>\
                <menuitem label="設置翻頁高度"\
                          id="uAutoPagerize-BASE_REMAIN_HEIGHT"\
                          tooltiptext="'+ BASE_REMAIN_HEIGHT +'"\
                          oncommand="uAutoPagerize.BASE_REMAIN_HEIGHT = prompt(\'\', uAutoPagerize.BASE_REMAIN_HEIGHT);"/>\
                <menuitem label="設置最大自動翻頁數"\
                          id="uAutoPagerize-MAX_PAGER_NUM"\
                          tooltiptext="'+ MAX_PAGER_NUM +'"\
                          oncommand="uAutoPagerize.MAX_PAGER_NUM = prompt(\'\', uAutoPagerize.MAX_PAGER_NUM);"/>\
                <menuitem label="滾動時才翻頁"\
                          id="uAutoPagerize-SCROLL_ONLY"\
                          type="checkbox"\
                          autoCheck="false"\
                          checked="'+ SCROLL_ONLY +'"\
                          oncommand="uAutoPagerize.SCROLL_ONLY = !uAutoPagerize.SCROLL_ONLY;"/>\
                <menuitem label="調試模式"\
                          id="uAutoPagerize-DEBUG"\
                          type="checkbox"\
                          autoCheck="false"\
                          checked="'+ DEBUG +'"\
                          oncommand="uAutoPagerize.DEBUG = !uAutoPagerize.DEBUG;"/>\
                <menuseparator/>\
                <menuitem label="在線搜索翻頁規則"\
                          id="uAutoPagerize-search"\
                          oncommand="uAutoPagerize.search()"/>\
                <menuitem label="打開規則列表"\
                          hidden="true"\
                          oncommand="uAutoPagerize.showUI()"/>\
            </menupopup>\
        ';
        var range = document.createRange();
        range.selectNodeContents($('mainPopupSet'));
        range.collapse(false);
        range.insertNode(range.createContextualFragment(xml.replace(/\n|\t/g, '')));
        range.detach();

        ["DEBUG", "AUTO_START", "FORCE_TARGET_WINDOW", "SCROLL_ONLY", "PRELOADER_NEXTPAGE", "ADD_TO_HISTORY"].forEach(function(name) {
            try {
                ns[name] = ns.prefs.getBoolPref(name);
            } catch (e) {}
        }, ns);
        ["BASE_REMAIN_HEIGHT", "MAX_PAGER_NUM", "IMMEDIATELY_PAGER_NUM", "lastCheckTime"].forEach(function(name) {
            try {
                ns[name] = ns.prefs.getIntPref(name);
            } catch (e) {}
        }, ns);

        ns.INCLUDE = INCLUDE;

        ns.loadExclude();

        ns.addListener();
        ns.loadSetting();

        if(!ns.loadSetting_CN()){
            requestSITEINFO_CN();
        } else {  // 檢查更新規則的間隔
            if (UPDATE_CN_SITEINFO_DAYS > 0 && (new Date().getTime() - ns.lastCheckTime * 1000) > UPDATE_CN_SITEINFO_DAYS * 24 * 3600 * 1000) {
                requestSITEINFO_CN();
            }
        }

        if (!getCache()){
            requestSITEINFO();
        }

        updateIcon();

        // 載入初始值
        ns.isModified;
    },
    uninit: function() {
        ns.removeListener();
        ["DEBUG", "AUTO_START", "FORCE_TARGET_WINDOW", "SCROLL_ONLY", "PRELOADER_NEXTPAGE", "ADD_TO_HISTORY"].forEach(function(name) {
            try {
                ns.prefs.setBoolPref(name, ns[name]);
            } catch (e) {}
        }, ns);
        ["BASE_REMAIN_HEIGHT", "MAX_PAGER_NUM", "IMMEDIATELY_PAGER_NUM"].forEach(function(name) {
            try {
                ns.prefs.setIntPref(name, ns[name]);
            } catch (e) {}
        }, ns);

        ns.saveExclude();

        ns.IMMEDIATELY_PAGER_NUM = $("uAutoPagerize-immedialate-pages").value;
    },
    theEnd: function() {
        var ids = ["uAutoPagerize-icon", "uAutoPagerize-popup"];
        for (let [, id] in Iterator(ids)) {
            let e = document.getElementById(id);
            if (e) e.parentNode.removeChild(e);
        }
        ns.style.parentNode.removeChild(ns.style);
        ns.removeListener();
    },
    destroy: function() {
        ns.uninit();
        ns.theEnd();
        delete window.uAutoPagerize;
    },
    addListener: function() {
        gBrowser.mPanelContainer.addEventListener('DOMContentLoaded', this, true);
        gBrowser.mTabContainer.addEventListener('TabSelect', this, false);
        gBrowser.mTabContainer.addEventListener('TabClose', this, false);
        window.addEventListener('uAutoPagerize_destroy', this, false);
        window.addEventListener('unload', this, false);
        ns.prefs.addObserver('', this, false);
    },
    removeListener: function() {
        gBrowser.mPanelContainer.removeEventListener('DOMContentLoaded', this, true);
        gBrowser.mTabContainer.removeEventListener('TabSelect', this, false);
        gBrowser.mTabContainer.removeEventListener('TabClose', this, false);
        window.removeEventListener('uAutoPagerize_destroy', this, false);
        window.removeEventListener('unload', this, false);
        ns.prefs.removeObserver('', this, false);
    },
    handleEvent: function(event) {
        switch(event.type) {
            case "DOMContentLoaded":
                if (this.AUTO_START)
                    this.launch(event.target.defaultView, null, true);
                break;
            case "TabSelect":
                if (this.AUTO_START)
                    updateIcon();
                break;
            case "TabClose":  // 如果有 iframe 則移除
                let browser = gBrowser.getBrowserForTab(event.target);
                if(browser.uAutoPagerizeIframes){
                    browser.uAutoPagerizeIframes.forEach(function(i){
                        i.parentNode.removeChild(i);
                    });
                    browser.uAutoPagerizeIframes = null
                }
                break;
            case "uAutoPagerize_destroy":
                this.destroy(event);
                break;
            case "unload":
                this.uninit(event);
                break;
        }
    },
    observe: function(aSubject, aTopic, aData){
        if (aTopic == 'nsPref:changed') {
            switch(aData) {
                case 'EXCLUDE':
                    ns.loadExclude();
                    break;
            }
        }
    },
    loadExclude: function() {
        // 從 prefs 載入 EXCLUDE
                    try {
                        let str = ns.prefs.getCharPref("EXCLUDE");
            ns.EXCLUDE = str.split(/,| |[\n\r]+/);
                    } catch(e) {}
        
        if(!ns.EXCLUDE){
            ns.EXCLUDE = EXCLUDE;
            }
    },
    saveExclude: function() {  // 保存到 about:config 中
        ns.prefs.setCharPref("EXCLUDE", ns.EXCLUDE.join("\r\n"));
    },
    loadSetting: function(isAlert) {
        var data = loadText(this.file);
        if (!data) return false;
        var sandbox = new Cu.Sandbox( new XPCNativeWrapper(window) );
        sandbox.INCLUDE = null;
        // sandbox.EXCLUDE = null;
        sandbox.MY_SITEINFO = [];
        sandbox.MICROFORMAT = [];
        sandbox.USE_MY_SITEINFO = false;
        sandbox.USE_MICROFORMAT = true;

        // 替換 unsafeWindow
        data = data.replace(/unsafeWindow/g, "this.wrappedJSObject");

		try {
			Cu.evalInSandbox(data, sandbox, '1.8');
		} catch (e) {
            log('load error.', e);
            alerts('配置文件錯誤', e);
            return;
		}
        sandbox.MY_SITEINFO = this.convertSiteInfos(sandbox.MY_SITEINFO);

		ns.MY_SITEINFO = sandbox.USE_MY_SITEINFO ? sandbox.MY_SITEINFO.concat(MY_SITEINFO): sandbox.MY_SITEINFO;
		ns.MICROFORMAT = sandbox.USE_MICROFORMAT ? sandbox.MICROFORMAT.concat(MICROFORMAT): sandbox.MICROFORMAT;
		if (sandbox.INCLUDE)
			ns.INCLUDE = sandbox.INCLUDE;
		// if (sandbox.EXCLUDE)
		// 	ns.EXCLUDE = sandbox.EXCLUDE;
        
        if (sandbox.prefs) {
            prefs = sandbox.prefs;
        }

		if (isAlert) alerts('uAutoPagerize', '配置文件已經重新載入');

		return true;
	},
    loadSetting_CN: function(isAlert) {
        var data = loadText(this.file_CN);
        if (!data) return false;
        var sandbox = new Cu.Sandbox( new XPCNativeWrapper(window) );
        sandbox.SITEINFO = [];
        sandbox.SITEINFO_TP = [];
        sandbox.SITEINFO_comp = [];

        // 替換 unsafeWindow
        data = data.replace(/unsafeWindow/g, "this.wrappedJSObject");
        data = data.replace(/window/g, "this");

        try {
            Cu.evalInSandbox(data, sandbox, '1.8');
        } catch (e) {
            return log('載入中文數據庫錯誤', e);
        }

        var list = sandbox.SITEINFO.concat(sandbox.SITEINFO_TP).concat(sandbox.SITEINFO_comp);

        ns.SITEINFO_CN = this.convertSiteInfos(list);

        if (isAlert)
            alerts('uAutoPagerize', '中文數據庫已經重新載入');

        return true;
    },
    convertSiteInfos: function(list) {
        var newList = [];
        // 轉換
        for(let [index, info] in Iterator(list)){
            if (!info.autopager){
                newList.push(info);
                continue;
            }

            let newInfo = {
                url: info.url,
                nextLink: info.nextLink,
                pageElement: info.pageElement,
                name: info.name || info.siteName,
                exampleUrl: info.exampleUrl || info.siteExample
            };

            ['name', 'exampleUrl'].forEach(function(n){
                if (!newInfo[n]) delete newInfo[n];
            });
            
            ["enable", "pageElement", "useiframe", "newIframe", "iloaded", "itimeout", "documentFilter", "filter", 
                "startFilter", "stylish", 'replaceE', 'lazyImgSrc', 'separatorReal'].forEach(function(name){
                if(info.autopager[name] != undefined){
                    newInfo[name] = info.autopager[name];
                }
            });

            if (info.autopager.uAutoPagerize2) {
                for (var name in info.autopager.uAutoPagerize2) {
                    newInfo[name] = info.autopager.uAutoPagerize2[name];
                }
            }

            newList.push(newInfo);
        }
        return newList;
    },
	launch: function(win, timer, DOMLoad){
        if (!win) return;
        var doc = win.document;
        if (!doc) return;

        // 監測文件是否更新
        if(ns.isModified){
            ns.loadSetting(true);
        }

        var locationHref = win.location.href;
        if (locationHref.indexOf('http') !== 0 ||
           !ns.INCLUDE_REGEXP.test(locationHref)){
            return updateIcon("不包含的頁面");
        }

        for(let [index, reg] in Iterator(ns.EXCLUDE_REGEXP)){
            if(reg.test(locationHref)){
                return updateIcon("排除列表, " + ns.EXCLUDE[index]);
            }
        }

        if (!/html|xml/i.test(doc.contentType) ||
            doc.body instanceof HTMLFrameSetElement ||
            win.frameElement && !(win.frameElement instanceof HTMLFrameElement) ||
            doc.querySelector('meta[http-equiv="refresh"]') && /shooter\.cn/.test(win.location.host))
            return updateIcon();

        if (typeof win.AutoPagerize == 'undefined') {
            win.filters         = [];
            win.documentFilters = [];
            win.requestFilters  = [];
            win.responseFilters = [];
            win.AutoPagerize = {
                addFilter         : function(f) { win.filters.push(f) },
                addDocumentFilter : function(f) { win.documentFilters.push(f); },
                addResponseFilter : function(f) { win.responseFilters.push(f); },
                addRequestFilter  : function(f) { win.requestFilters.push(f); },
                launchAutoPager   : function(l) { launchAutoPager_org(l, win); }
            }
            // uAutoPagerize original
            win.fragmentFilters = [];
        }
        var ev = doc.createEvent('Event');
        ev.initEvent('GM_AutoPagerizeLoaded', true, false);
        doc.dispatchEvent(ev);

		var miscellaneous = [];
		// 継ぎ足されたページからは新しいタブで開く
		win.fragmentFilters.push(function(df){
			if (!ns.FORCE_TARGET_WINDOW) return;
			var arr = Array.slice(df.querySelectorAll('a[href]:not([href^="mailto:"]):not([href^="javascript:"]):not([href^="#"])'));
			arr.forEach(function (elem){
				elem.setAttribute('target', '_blank');
			});
		});

        var index = -1, info, nextLink;
        var hashchange = false;

        // 已經移到外置規則，便於更新
        // Google 搜索的一些網址需要加 hashchange
        if (/^https?:\/\/(www|encrypted)\.google\..{2,9}\/(webhp|#|$|\?)/.test(locationHref)) {
            timer = 1500;
            hashchange = true;
        } else if (/^https?:\/\/www\.baidu\.com\/($|#wd=)/.test(locationHref)) {
            timer = 1000;
            hashchange = true;
        } else if (win.location.host === 'www.newsmth.net') {  // 水木清華社區延遲加載及下一頁加載的修復
            timer = 1000;
            hashchange = true;
        }

        if(hashchange){
            win.addEventListener("hashchange", function(event) {
                debug("Add Hashchang Event listener" + locationHref);
                if (!win.ap) {
                    win.setTimeout(function(){
                        let [index, info] = [-1, null];
                        if (!info) [, info] = ns.getInfo(ns.MY_SITEINFO, win);
                        if (!info) [, info] = ns.getInfo(null, win);
                        if (info) win.ap = new AutoPager(win.document, info);
                        updateIcon();
                    }, timer);
                    return;
                }
                let info = win.ap.info;
                win.ap.destroy(true);
                win.setTimeout(function(){
                    win.ap = new AutoPager(win.document, info);
                    updateIcon();
                }, timer);
            }, false);
        }

        // 不是加載文檔時啟用則不需要延遲
        if (!DOMLoad) {
            timer = 0;
        }

		win.setTimeout(function(){
            var startTime = new Date().getTime();
			win.ap = null;
			miscellaneous.forEach(function(func){ func(doc, locationHref); });
			var index = -1;
			if (!info) [, info, nextLink] = ns.getInfo(ns.MY_SITEINFO, win);
            if (!info) [, info, nextLink] = ns.getInfo(ns.SITEINFO_CN, win);
			if (info) {
				if (info.requestFilter)
					win.requestFilters.push(info.requestFilter.bind(win));
				if (info.responseFilter)
					win.responseFilters.push(info.responseFilter.bind(win));
				if (info.documentFilter)    
					win.documentFilters.push(info.documentFilter.bind(win));
				if (info.filter && typeof(info.filter) === "function")
					win.filters.push(info.filter.bind(win));
				if (info.fragmentFilter)
					win.fragmentFilters.push(info.fragmentFilter.bind(win));

				if (info.startFilter)
					info.startFilter.call(win, win.document);
				if (info.stylish) {
					let style = doc.createElement("style");
					style.setAttribute("id", "uAutoPagerize-style");
					style.setAttribute("type", "text/css");
					style.appendChild(doc.createTextNode(info.stylish));
					doc.getElementsByTagName("head")[0].appendChild(style);
				}
			}
            //var s = new Date().getTime();
            if (!info) [, info, nextLink] = ns.getInfo(ns.SITEINFO, win);
            //debug(index + 'th/' + (new Date().getTime() - s) + 'ms');
            if (!info) [, info, nextLink] = ns.getInfo(ns.MICROFORMAT, win);
            if (info) {
                if (info.enable == false) {
                    debug('找到規則：', info, '但默認禁用');
                } else {
                    win.ap = new AutoPager(win.document, info, nextLink);
                }
            }

            debug('總耗時:' + (new Date() - startTime) + '毫秒, 地址為：' + locationHref);

			updateIcon();
		}, timer||0);
	},
    onPopupShowing: function(event){
        if(event.target != event.currentTarget) return;

        var excludeStr;
        var locationHref = content.location.href;
        var blacklistBtn = $("uAutoPagerize-blacklist-icon");
        var blacklistText = $("uAutoPagerize-blacklist-textbox");

        for(let [index, reg] in Iterator(ns.EXCLUDE_REGEXP)){
            if(reg.test(locationHref)){
                excludeStr = ns.EXCLUDE[index];
                break;
            }
        }

        if(excludeStr){
            blacklistBtn.setAttribute("label", "修改");
            blacklistBtn.setAttribute("tooltiptext", "修改黑名單或從中刪除，空白為刪除");
            blacklistText.setAttribute("oldvalue", excludeStr);
            blacklistText.style.color = "green";
        }else{
            excludeStr = "*" + content.location.host + "*";
            blacklistBtn.setAttribute("label", "添加");
            blacklistBtn.setAttribute("tooltiptext", "添加到黑名單中");
            blacklistText.removeAttribute("oldvalue");
            blacklistText.style.color = "";
        }

        blacklistText.value = excludeStr;
    },
    checkUrl: function(event){
        var blacklistText = event.target;

        var url = content.location.href;
        if (!url)
            blacklistText.style.color = "";

        var urlValue = wildcardToRegExpStr(blacklistText.value);
        try {
            var regexp = new RegExp(urlValue);

            if (regexp.test(url))
                blacklistText.style.color = "green";
            else
                blacklistText.style.color = "red";
        } catch (e) {
            blacklistText.style.color = "red";
        }
    },
    iconClick: function(event){
        if (!event || !event.button) {
            ns.toggle();
        } else if (event.button == 1) {
			document.getElementById('uAutoPagerize-popup').openPopupAtScreen(event.screenX, event.screenY, true);
//            ns.loadSetting(true);
//            ns.loadSetting_CN();
        }
    },
    blacklistBtnClick: function(event){
        var textbox = $("uAutoPagerize-blacklist-textbox");
        var oldvalue = textbox.getAttribute("oldvalue");
        var newValue = textbox.value.trim();

        if(oldvalue){
            var index = ns.EXCLUDE.indexOf(oldvalue);
            if(index == -1) return;

            if(!newValue || newValue == "**"){  // remove
                ns.EXCLUDE.splice(index, 1);
            }else{  // modified
                ns.EXCLUDE[index] = newValue;
            }

            ns.EXCLUDE = ns.EXCLUDE;  // 重新賦值，刷新 EXCLUDE_REGEXP

            ns.launch(content);
        }else{  // add
            if(!newValue || newValue == "**") return;

            ns.EXCLUDE.push(newValue);
            ns.EXCLUDE = ns.EXCLUDE;

            if(content.ap){
                content.ap.destroy(true);
                updateIcon("排除列表, " + newValue);
            }
        }

        $('uAutoPagerize-popup').hidePopup();
        ns.saveExclude();
    },
    resetSITEINFO: function() {
        if (confirm('reset SITEINFO?'))
            requestSITEINFO();
    },
    resetSITEINFO_CN: function() {
        if (confirm('確定要重置中文規則嗎？'))
            requestSITEINFO_CN();
    },
    toggle: function() {
        if (ns.AUTO_START) {
            ns.AUTO_START = false;
            updateIcon();
        } else {
            ns.AUTO_START = true;
            if (!content.ap){
                ns.launch(content);
                content.ap && content.ap.scroll();
            }
            else{
                content.ap.scroll();
                updateIcon();
            }
        }
    },
    reloadMenuClick: function(event){
        switch(event.button){
            case 0:
                ns.loadSetting(true);
                ns.loadSetting_CN();
                break;
            case 1:
            case 2:
                ns.edit(ns.file_CN, true);
                ns.edit(ns.file);
                event.preventDefault();
                break;
        }
    },
    immediatelyStart: function(){
        var pages = ns.IMMEDIATELY_PAGER_NUM;

        if(content.ap){
            content.ap.loadImmediately(pages);
        }
    },

    getInfo: function (list, win) {
        if (!list) list = ns.MY_SITEINFO.concat(ns.SITEINFO_CN);
        if (!win)  win  = content;
        var doc = win.document;
        var locationHref = doc.location.href;
        for (let [index, info] in Iterator(list)) {
            try {
                var exp = info.url_regexp || Object.defineProperty(info, "url_regexp", {
                        enumerable: false,
                        value: toRE(info.url)
                    }).url_regexp;
                if ( !exp.test(locationHref) ) continue;

                var nextLink = getElementMix(info.nextLink, doc);
                if (!nextLink) {
                    // FIXME microformats case detection.
                    // limiting greater than 12 to filter microformats like SITEINFOs.
                    if (info.url.length > 12) {
                        debug('nextLink not found.', info.nextLink);
                    }
                    // else if (info.url.length == undefined) {
                    //     console.log('[uAutoPagerize] ', 'nextLink not found.', info.nextLink)
                    // }
                    continue;
                }
                var pageElement = getElementMix(info.pageElement, doc);
                if (!pageElement) {
                    if (!info.url.length || info.url.length > 12)
                        debug('pageElement not found.', info.pageElement);
                    continue;
                }
                return [index, info, nextLink, pageElement];
            } catch(e) {
                log('error at launchAutoPager() : ' + e);
            }
        }
        return [-1, null];
    },
    getInfoFromURL: function (url) {
        if (!url) url = content.location.href;
        var list = ns.MY_SITEINFO.concat(ns.SITEINFO_CN).concat(ns.SITEINFO);
        return list.filter(function(info, index, array) {
            try {
                var exp = info.url_regexp || Object.defineProperty(info, "url_regexp", {
                        enumerable: false,
                        value: toRE(info.url)
                    }).url_regexp;
                return exp.test(url);
            } catch(e){ }
        });
    },
    getInfoFromKeyword: function(keyword){
        if(!keyword) return;
        var list = ns.MY_SITEINFO.concat(ns.SITEINFO_CN);
        return list.filter(function(info, index, array){
            return (info.name && info.name.indexOf(keyword) > 0) || info.url.toString().indexOf(keyword) > 0;
        });
    },
    getFocusedWindow: function() {
        var win = document.commandDispatcher.focusedWindow;
        return (!win || win == window) ? content : win;
    },

    search: function(){
        var url = content.location.href;
        if(!url.startsWith("http")) return;

        var keyword = Services.eTLD.getBaseDomainFromHost(content.location.host);

        // gBrowser.addTab('http://wedata.net/databases/AutoPagerize/items?query=' + keyword);
        gBrowser.selectedTab = gBrowser.addTab('http://ap.teesoft.info/?exp=0&url=' + encodeURIComponent(url));
    },
    showUI: function(){
        var splitter = $C("splitter", {
            id: "uAutoPagerize-bottombar-splitter",
            orient: "vertical"
        });

        var box = $C("vbox", {
            id: "uAutoPagerize-bottombar",
            width: "200",
            height: "232"
        });

        var toolbar = box.appendChild($C("toolbar", {
            id: "uAutoPagerize-bottombar-toolbar",
            align: "center",
            grippyhidden: "true",
            fullscreentoolbar: "true"
        }));
        var title = toolbar.appendChild($C("label", {
            id: "uAutoPagerize-bottombar-title",
            control: "uAutoPagerize-bottombar-browser",
            value: "站點規則列表",
            flex: "1",
            crop: "end"
        }));
        var closeButton = toolbar.appendChild($C("toolbarbutton", {
            id: "uAutoPagerize-bottombar-close",
            tooltiptext: "關閉",
            oncommand: "uAutoPagerize.hideUI()",
            style: "list-style-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABj0lEQVQ4jaXRsUsCYRjHcf8YNcQg1CGUAk1RvJOLaIlAJKPBQVzMIVu8amlNCQQbDqIhwqGlocWzwUMknByEONH5kIIav03dS4mg9MBveH4872d5HZ/mG6NqjY6yu1BG1Rqf5hs/4zCvqryrFbjTFsq7WsG8qgqgLe+A1mBSLvGSTfOSTTMpl0BrzO3b8o4AWtI21Gu003t22S+XGBcLjIsF+uWS3bfTe1Cv0ZK2BfCcUODygnHuiH6xIJBiYWYf547g8oLnhCKAp7gMJ8dwcswos89rPsffec3nGGX27bunuCyAx5iEtbZmx3C50eWkfaDLSQyX+9fNY0wSQDOSmPt4HtKMJARwH45j+fwY7hX0lJD1lDSzG+4VLJ+f+3BcALebMabBEA9OlzhWUnS9q3S9q+hKyu4fnC6mwRC3mzEBaKEtPqJRev4ATY+HpsdDzx/gIxqd22uhLQHcrEf4kqWlcrMeEYBxfoZ5eACV04ViHh5gnJ8JwBoO6Kgq14GNhdJRVazhQAAzf7bk/Bv4Bv7RCf77/Pb2AAAAAElFTkSuQmCC)"
        }));

        box.appendChild($C("iframe", {
            id: "uAutoPagerize-bottombar-browser",
            src: "chrome://userchromejs/content/uAutoPagerizeUI/main.xul",
            flex: "1"
        }));

        var ins = $("appcontent");
        ins.appendChild(splitter);
        ins.appendChild(box);
    },
    hideUI: function(){
        let m = $("uAutoPagerize-bottombar-splitter");
        if(m)
            m.parentNode.removeChild(m);

        m = $("uAutoPagerize-bottombar");
        if(m)
            m.parentNode.removeChild(m);
    },
    gototop: function(win){
        if(!win) win = content;
        win.scroll(win.scrollX, 0);
    },
    gotobottom: function(win){
        if(!win) win = content;
        var doc = win.document;
        win.scroll(win.scrollX, Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight));
    },
    gotoprev: function(win, sepSelector, insertPoint){
        if(!win)
            win = content;
        if(!sepSelector)
            sepSelector = ".autopagerize_link";
        if(!insertPoint && win.ap && win.ap.insertPoint)
            insertPoint = win.ap.insertPoint.parentNode;

        var [preDS, , divS] = ns.getSeparators(win, sepSelector, insertPoint);
        divS = divS || 0;
        if(SEPARATOR_RELATIVELY){
            preDS = win.scrollY - (divS - preDS);
        }else{
            preDS += win.scrollY - 6;
        }

        win.scroll(win.scrollY, preDS);
    },
    gotonext: function(win, sepSelector, insertPoint){
        if(!win)
            win = content;
        if(!sepSelector)
            sepSelector = ".autopagerize_link";
        if(!insertPoint && win.ap && win.ap.insertPoint)
            insertPoint = win.ap.insertPoint.parentNode;

        var [, nextDS, divS] = this.getSeparators(win, sepSelector, insertPoint);
        divS = divS || 0;
        if(SEPARATOR_RELATIVELY){
            nextDS = win.scrollY + (-divS + nextDS);
        }else{
            nextDS += win.scrollY - 6;
        }

        win.scroll(win.scrollY, nextDS);
    },
    // 找到窗口視野內前後2個分隔條的位置
    getSeparators: function(win, separatorSelector, insertPoint){
        var doc = win.document;
        if(!insertPoint)
            insertPoint = doc.documentElement;

        var separators = doc.querySelectorAll(separatorSelector);
        var insData = insertPoint.getBoundingClientRect();
        var viewportHeight = win.innerHeight;

        // 得到一個數組
        var heightArr = [insData.top];
        for (var i = 0; i < separators.length; i++) {
            heightArr.push(separators[i].getBoundingClientRect().top);
        }
        if(insData.bottom > viewportHeight)
            heightArr.push(insData.bottom);
        else
            heightArr.push(viewportHeight + 1);

        // 查找
        for (var i = 0; i < heightArr.length; i++) {
            if(heightArr[i] > viewportHeight){
                if(heightArr[i - 1] > 0){
                    return [heightArr[i - 2], heightArr[i], heightArr[i - 1]];
                }else{
                    return [heightArr[i - 1], heightArr[i]];
                }
            }
        }

        return [];
    },
    autoGetLink: function(doc){
        if(!doc){
            doc = content.document;
        }
        return SP.autoGetLink(doc);
    },
    edit: function(aFile, showError) {
        if (!aFile || !aFile.exists() || !aFile.isFile()) return;
        var editor;
        try {
            editor = Services.prefs.getComplexValue("view_source.editor.path", Ci.nsILocalFile);
        } catch(e) {}
        
        if (!editor || !editor.exists()) {
            if (showError) {
                alert("編輯器的路徑未設置!!!\n請設置 view_source.editor.path");
                var url = "about:config?filter=view_source.editor.path";
                openLinkIn(url, "tab", { inBackground: false});
            }
            return;
        }

        var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
            UI.charset = window.navigator.platform.toLowerCase().indexOf("win") >= 0? "gbk": "UTF-8";
        var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);

        try {
            var path = UI.ConvertFromUnicode(aFile.path);
            var args = [path];
            process.init(editor);
            process.run(false, args, args.length);
        } catch (e) {
            alert("編輯器路徑不正確");
        }
    },
    getElementsByXPath: getElementsByXPath,
    getElementMix: getElementMix,
    getElementsMix: getElementsMix
};

// Class
function AutoPager(doc, info, nextLink) {
    this.init.apply(this, arguments);
};
AutoPager.prototype = {
    req: null,
    pageNum: 1,
    _state: 'disable',
    myRemoves: [],
    get state() this._state,
    set state(state) {
        if (this.state !== "terminated" && this.state !== "error") {
            if (state === "disable") {
                this.abort();
            }
            else if (state === "terminated" && state === "error") {
                this.removeListener();
            }
            if (this.state !== "loading" && state !== "loading" || this.isFrame) {
                Array.forEach(this.doc.getElementsByClassName('autopagerize_icon'), function(e) {
                    e.style.backgroundColor = COLOR[state];
                    e.setAttribute("state", state);
                });
            }
            this._state = state;
            updateIcon();
        }
        return state;
    },
    init: function(doc, info, nextLink) {
        this.doc = doc;
        this.win = doc.defaultView;
        this.documentElement = doc.documentElement;
        this.body = doc.body;
        this.isXML = this.doc.contentType.indexOf('xml') > 0;
        this.isFrame = this.win.top != this.win;
        this.info = {};
        for (let [key, val] in Iterator(info)) {
            this.info[key] = val;
        }

        // 新加的
        this.iframeMode = USE_IFRAME && this.info.useiframe || false;
        this.ipagesMode = false;
        this.lastPageURL = doc.location.href.replace(/#.*$/, ''); // url 去掉hash;
        this.C = this.win.wrappedJSObject.console;

        var url = this.getNextURL(nextLink ? nextLink : this.doc);
        if ( !url ) {
            debug("getNextURL returns null.", this.info.nextLink);
            return;
        }

        this.setInsertPoint();
        if (!this.insertPoint) {
            debug("insertPoint not found.", this.info.pageElement);
            return;
        }
        this.setRemainHeight();

        if (this.isFrame)
            this.initIcon();

        this.requestURL = url;
        this.loadedURLs = {};
        this.loadedURLs[doc.location.href] = true;

        this.state = "enable";
        this.win.addEventListener("pagehide", this, false);
        this.addListener();

        if (!ns.SCROLL_ONLY && !this.info.scroll_only)
            this.scroll();
        if (this.getScrollHeight() == this.win.innerHeight)
            this.body.style.minHeight = (this.win.innerHeight + 1) + 'px';

        this.addPauseContrl();

        if (this.state !== 'loading' && PRELOADER_NEXTPAGE) {  // 提前預讀
            this.request();
        }
    },
    destroy: function(isRemoveAddPage) {
        this.state = "disable";
        this.win.removeEventListener("pagehide", this, false);
        this.removeListener();
        this.abort();

        try {
            this.myRemoves.forEach(function(func){ func(); });
        } catch (e) {}

        if (isRemoveAddPage) {
            var separator = this.doc.querySelector('.autopagerize_page_separator, .autopagerize_page_info');
            if (separator) {
                var range = this.doc.createRange();
                range.setStartBefore(separator);
                range.setEndBefore(this.insertPoint);
                range.deleteContents();
                range.detach();
            }
            var style = this.doc.getElementById("uAutoPagerize-style");
            if (style)
                style.parentNode.removeChild(style);
        }

        this.win.ap = null;
        updateIcon();
    },
    addListener: function() {
        this.win.addEventListener("scroll", this, false);
        this.doc.addEventListener("AutoPagerizeToggleRequest", this, false);
        this.doc.addEventListener("AutoPagerizeEnableRequest", this, false);
        this.doc.addEventListener("AutoPagerizeDisableRequest", this, false);
    },
    removeListener: function() {
        this.win.removeEventListener("scroll", this, false);
        this.doc.removeEventListener("AutoPagerizeToggleRequest", this, false);
        this.doc.removeEventListener("AutoPagerizeEnableRequest", this, false);
        this.doc.removeEventListener("AutoPagerizeDisableRequest", this, false);
    },
    handleEvent: function(event) {
        switch(event.type) {
            case "scroll":
                if (this.timer)
                    this.win.clearTimeout(this.timer);
                this.timer = this.win.setTimeout(function(){
                    this.scroll();
                    this.timer = null;
                }.bind(this), 100);
                break;
            case "click":
                this.stateToggle();
                break;
            case "pagehide":
                this.abort();
                break;
            case "AutoPagerizeToggleRequest":
                this.stateToggle();
                break;
            case "AutoPagerizeEnableRequest":
                this.state = "enable";
                break;
            case "AutoPagerizeDisableRequest":
                this.state = "disable";
                break;
        }
    },
    addPauseContrl: function() {
        if (!prefs.pauseA) return;

        var self = this;

        var Sbutton = ['target', 'shiftKey', 'ctrlKey', 'altKey'];
        var ltype = prefs.mouseA ? 'mousedown' : 'dblclick';

        var button_1 = Sbutton[prefs.Pbutton[0]];
        var button_2 = Sbutton[prefs.Pbutton[1]];
        var button_3 = Sbutton[prefs.Pbutton[2]];

        this.doc.addEventListener(ltype, pausehandler, false);
        this.myRemoves.push(function() {
            self.doc.removeEventListener(ltype, pausehandler, false);
        });

        var Sctimeout;
        
        function pausehandler(e) {
            if (e[button_1] && e[button_2] && e[button_3]) {
                if (e.type == 'mousedown') {
                    self.doc.addEventListener('mouseup', clearPause, false);
                    Sctimeout = self.win.setTimeout(pauseIt, prefs.Atimeout);
                } else {
                    pauseIt();
                }
            }
        }

        function clearPause() {
            self.win.clearTimeout(Sctimeout);
            self.doc.removeEventListener('mouseup', arguments.callee, false);
        }

        function pauseIt() {
            self.stateToggle();
            if (prefs.stop_ipage) self.ipagesMode = false;
            self.scroll();
        }
    },
    stateToggle: function() {
        this.state = this.state == 'disable'? 'enable' : 'disable';
    },
    tmpDoc: null,
    scroll : function(){
        if (this.state !== 'enable' || !ns.AUTO_START) return;
        var remain = this.getScrollHeight() - this.win.innerHeight - this.win.scrollY;
        if (remain < this.remainHeight || this.ipagesMode) {
            if(this.tmpDoc) {
                this.load(this.tmpDoc);
            } else
                this.request();
        }
    },
    abort: function() {
        if (this.req) {
            this.req.abort();
            this.req = null;
        }
    },
    isThridParty: function(aHost, bHost) {
        try {
            var aTLD = Services.eTLD.getBaseDomainFromHost(aHost);
            var bTLD = Services.eTLD.getBaseDomainFromHost(bHost);
            return aTLD === bTLD;
        } catch (e) {
            return aHost === bHost;
        }
    },
    request: function(){
        if (!this.requestURL || this.loadedURLs[this.requestURL]) return;

        // 最大頁數自動停止
        if(MAX_PAGER_NUM > 0 && this.pageNum > (MAX_PAGER_NUM - 1)){
            this.addEndSeparator();
            return;
        }

        var [reqScheme,,reqHost] = this.requestURL.split('/');
        var {protocol, host} = this.win.location;
        if (reqScheme !== protocol) {
            log(protocol + " が " + reqScheme + "にリクエストを送ることはできません");
            this.state = "error";
            return;
        }
        var isSameDomain = reqHost == host;
        if (!isSameDomain && !this.isThridParty(host, reqHost)) {
            log(host + " が " + reqHost + "にリクエストを送ることはできません");
            this.state = 'error';
            return;
        }
        this.lastRequestURL = this.requestURL;

        if(this.iframeMode){
            this.iframeRequest();
        }else{
            this.httpRequest(isSameDomain, reqHost, reqScheme);
        }
    },
    httpRequest: function(isSameDomain, reqHost, reqScheme){
        var self = this;
        var headers = {};
        if (SEND_COOKIE && isSameDomain)
            headers.Cookie = getCookie(reqHost, reqScheme === 'https');
        var opt = {
            method: 'get',
            get url() self.requestURL,
            set url(url) self.requestURL = url,
            headers: headers,
            overrideMimeType: 'text/html; charset=' + self.doc.characterSet,
            onerror: function(){ self.state = 'error'; self.req = null; },
            onload: function(res) { self.httpLoad.apply(self, [res]); self.req = null; }
        };

        if(!this.isXML){
            opt.responseType = "document";
        }

        this.win.requestFilters.forEach(function(i) { i(opt) }, this);
        this.state = 'loading';
        this.req = GM_xmlhttpRequest(opt);
    },
    iframeRequest: function(){
        var self = this;
        this.state = 'loading';

        var browser = gBrowser.getBrowserForDocument(this.doc);
        if (typeof browser.uAutoPagerizeIframes == 'undefined') {
            browser.uAutoPagerizeIframes = [];
        }

        var iframe;
        if(this.info.newIframe || browser.uAutoPagerizeIframes.length === 0){
            iframe = createIframe("uAutoPagerize-iframe");
            browser.uAutoPagerizeIframes.push(iframe);
        } else {
            iframe = browser.uAutoPagerizeIframes[0];
        }

        //兩個地址都要改?mdc是按照第二個寫的,真正有效的也是第二個,第一個是以後用來比較用的
        iframe.src = this.requestURL;
        iframe.contentDocument.location.href = this.requestURL;

        if(this.info.iloaded){
            iframe.addEventListener("load", onload, true);
        }else{
            iframe.addEventListener("DOMContentLoaded", onload, true);
        }

        function onload(event){
            var doc = event.originalTarget;
            if (doc.location.href == "about:blank" || doc.defaultView.frameElement)
                return;

            iframe.removeEventListener(event.type, onload, true);

            self.win.setTimeout(function(){
                self.iframeLoad.apply(self, [doc]);
            }, self.info.itimeout || 0);
        }
    },
    httpLoad : function(res){
        var before = res.URI.host;
        var after  = res.originalURI.host;
        if (before != after && !this.isThridParty(before, after)) {
            log(before + " 被重新定向到 " + after);
            this.state = 'error';
            return;
        }
        delete res.URI;
        delete res.originalURI;

        this.win.responseFilters.forEach(function(i) { i(res, this.requestURL) }, this);
        if (res.finalUrl)
            this.requestURL = res.finalUrl;

        var htmlDoc;
        if (this.isXML) {
            var str = res.responseText;
            htmlDoc = new DOMParser().parseFromString(str, "application/xml");
        } else {
            htmlDoc = res.response;
        }

        this.win.documentFilters.forEach(function(i) { i(htmlDoc, this.requestURL, this.info) }, this);

        this.beforeLoad(htmlDoc);
    },
    iframeLoad: function (htmlDoc) {
        let win = htmlDoc.defaultView;
        win.scroll(win.scrollX, 99999);  //滾動到底部,針對,某些使用滾動事件加載圖片的網站.

        this.beforeLoad(htmlDoc);
    },
    beforeLoad: function(htmlDoc){
        if(PRELOADER_NEXTPAGE && !this.ipagesMode){
            this.tmpDoc = htmlDoc;
            this.state = 'enable';  // 讓 scroll 能繼續下去
            this.scroll();
        }else{
            this.load(htmlDoc);
        }
    },
    load: function(htmlDoc){
        try {
            var page = getElementsMix(this.info.pageElement, htmlDoc);
            var url = this.getNextURL(htmlDoc);
        }
        catch(e){
            this.state = 'error';
            return;
        }

		if (!page || page.length < 1 ) {
			this.state = 'terminated';
            this.C.error('[uAutoPagerize] pageElement not found.', this.info.pageElement, htmlDoc.body && htmlDoc.body.innerHTML);
			return;
		}

		if (this.loadedURLs[this.requestURL]) {
			this.C.error('[uAutoPagerize] page is already loaded.', this.requestURL, this.info.nextLink);
			this.state = 'terminated';
			return;
		}

		if (typeof this.win.ap == 'undefined') {
			this.win.ap = { state: 'enabled' };
			updateIcon();
		}
		this.loadedURLs[this.requestURL] = true;
		if (this.insertPoint.compareDocumentPosition(this.doc) >= 32) {
			this.setInsertPoint();
			if (!this.insertPoint) {
				this.C.error("[uAutoPagerize] insertPoint not found.", this.info.pageElement);
				this.state = 'terminated';
				return;
			}
			this.setRemainHeight();
		}
		page = this.addPage(htmlDoc, page, url);
		this.win.filters.forEach(function(i) { i(page) });

        if(ADD_TO_HISTORY){  // 添加到歷史記錄
            this.doc.title = htmlDoc.title;
            this.win.history.pushState(null, '', this.requestURL);
        }

		this.requestURL = url;
		this.state = 'enable';
		// if (!ns.SCROLL_ONLY)
		// 	this.scroll();
		if (!url) {
			this.C.error('[uAutoPagerize] nextLink not found.', this.info.nextLink);
			this.state = 'terminated';
		}

		var ev = this.doc.createEvent('Event');
		ev.initEvent('GM_AutoPagerizeNextPageLoaded', true, false);
		this.doc.dispatchEvent(ev);

        this.afterLoad();
    },
    addPage : function(htmlDoc, page, nextPageUrl){
        var fragment = this.doc.createDocumentFragment();
        page.forEach(function(i) { fragment.appendChild(i); });
        this.win.fragmentFilters.forEach(function(i) { i(fragment, htmlDoc, page) }, this);

        // 移除部分內容
        if (typeof(this.info.filter) == 'string') { //功能未完善.
            var nodes = []
            try {
                nodes = getElementsMix(this.info.filter, fragment);
            } catch (e) {};
            var nodes_x;
            for (i = nodes.length - 1; i >= 0; i--) {
                nodes_x = nodes[i];
                nodes_x.parentNode.removeChild(nodes_x);
            }
        }
        // 修正延遲加載的圖片
        var lazyImgSrc = (this.info.lazyImgSrc === undefined) ? prefs.lazyImgSrc : this.info.lazyImgSrc;
        if (lazyImgSrc) {
            var imgAttrs = lazyImgSrc.split('|');
            imgAttrs.forEach(function(attr){
                attr = attr.trim();
                [].forEach.call(fragment.querySelectorAll("img[" + attr + "]"), function(img){
                    var newSrc = img.getAttribute(attr);
                    if (newSrc && newSrc != img.src) {
                        img.setAttribute("src", newSrc);
                        img.removeAttribute(attr);
                    } 
                });
            });
        }

        //收集所有圖片
        var imgs;
        if (this.iframeMode && !this.ipagesMode) {
            imgs = getElementsMix('css;img[src]', fragment);
        }

        if (this.info.wrap) {
            var div = this.doc.createElement("div");
            div.setAttribute("class", "uAutoPagerize-wrapper");
            div.appendChild(fragment);
            fragment = this.doc.createDocumentFragment();
            fragment.appendChild(div);
        }
        var ralativePageStr = (this.info.separatorReal === false) ? 
                '' : 
                getRalativePageStr(this.lastPageURL, this.requestURL, nextPageUrl);
        this.lastPageURL = this.requestURL;

        var hr = this.doc.createElement('hr');
        hr.setAttribute('class', 'autopagerize_page_separator');
        hr.setAttribute('style', 'clear: both;');
        var p  = this.doc.createElement('p');
        p.setAttribute('class', 'autopagerize_page_info');
        p.setAttribute('style', 'clear: both;');
        p.innerHTML = '<a class="autopagerize_link" href="' + this.requestURL.replace(/&/g, '&amp;') +
            '">第 <font color="red">' + (++this.pageNum) + '</font> 頁 ' + ralativePageStr + '</a> ';

        if (!this.isFrame) {
            var o = p.insertBefore(this.doc.createElement('div'), p.firstChild);
            o.setAttribute('class', 'autopagerize_icon');
            o.setAttribute('state', 'enable');
            o.setAttribute('title', "點擊啟用禁用");
            o.style.cssText = [
                'background: ', COLOR['enable'], ';'
                ,'width: .8em;'
                ,'height: .8em;'
                ,'padding: 0px;'
                ,'margin: 0px .4em 0px 0px;'
                ,'display: inline-block;'
                ,'vertical-align: middle;'
            ].join('');
            o.addEventListener('click', this, false);
        }

        var insertParent = this.insertPoint.parentNode;
        if (page[0] && page[0].tagName == 'TR') {
            var colNodes = getElementsByXPath('child::tr[1]/child::*[self::td or self::th]', insertParent);
            var colums = 0;
            for (var i = 0, l = colNodes.length; i < l; i++) {
                var col = colNodes[i].getAttribute('colspan');
                colums += parseInt(col, 10) || 1;
            }
            var td = this.doc.createElement('td');
            td.appendChild(hr);
            td.appendChild(p);
            var tr = this.doc.createElement('tr');
            td.setAttribute('colspan', colums);
            tr.appendChild(td);
            fragment.insertBefore(tr, fragment.firstChild);
        } else {
            fragment.insertBefore(p, fragment.firstChild);
            fragment.insertBefore(hr, fragment.firstChild);
        }

        insertParent.insertBefore(fragment, this.insertPoint);

        if (imgs) {   // 非opera, 在iframeDOM取出數據時需要重載圖片.
            this.win.setTimeout(function() {
                var _imgs = imgs;
                var i, ii, img;
                for (i = 0, ii = _imgs.length; i < ii; i++) {
                    img = _imgs[i];
                    var src = img.src;
                    img.src = src;
                }
            }, 99);
        }

        // 來自Super_preloader，需要替換的部分 xpath 或 CSS選擇器 一般是頁面的本來的翻頁導航
        if (this.info.replaceE) {
            var oldE = getElementsMix(this.info.replaceE, this.doc);
            var oldE_lt = oldE.length;
            if (oldE_lt > 0) {
                var newE = getElementsMix(this.info.replaceE, htmlDoc);
                var newE_lt = newE.length;
                if (newE_lt == oldE_lt) {
                    for (i = 0; i < newE_lt; i++) {
                        let oldE_x = oldE[i];
                        let newE_x = newE[i];
                        newE_x = this.doc.importNode(newE_x, true);
                        oldE_x.parentNode.replaceChild(newE_x, oldE_x);
                    }
                }
            }
        }

        return page.map(function(pe) {
            var ev = this.doc.createEvent('MutationEvent');
            ev.initMutationEvent('AutoPagerize_DOMNodeInserted', true, false,
                                 insertParent, null,
                                 this.requestURL, null, null);
            pe.dispatchEvent(ev);
            return pe;
        }, this);
    },
    addEndSeparator: function(){
        var html = "已達到設置的最大自動翻頁數，點擊進入下一頁";

        var fragment = this.doc.createDocumentFragment();
        var page = this.doc.createElement('div');

        this.addPage(fragment, [page], html);

        this.state = 'terminated';
    },
    afterLoad: function(){
        this.tmpDoc = null;

        // 立即加載n頁
        this.ipaged += 1;
        if(this.ipagesMode && this.ipaged >= this.ipagesNumber){
            this.ipagesMode = false;
        }

        if(PRELOADER_NEXTPAGE || this.ipagesMode){
            this.request();
        }
    },
    getNextURL : function(doc) {
        var nextLink = doc instanceof this.win.HTMLElement ?
            doc :
            getElementMix(this.info.nextLink, doc);
        if (nextLink) {
            var nextValue = nextLink.getAttribute('href') ||
                nextLink.getAttribute('action') || nextLink.value;

            return this.getFullUrl(nextValue);
        }
    },
    getPageElementsBottom : function() {
        try {
            var elem = getElementsMix(this.info.pageElement, this.doc).pop();
            return getElementBottom(elem);
        }
        catch(e) {}
    },
    getScrollHeight: function() {
        return Math.max(this.documentElement.scrollHeight, this.body.scrollHeight);
    },
    setInsertPoint: function() {
        var insertPoint = null;
        if (this.info.insertBefore) {
            insertPoint = getElementMix(this.info.insertBefore, this.doc);
        }
        if (!insertPoint) {
            var lastPageElement = getElementsMix(this.info.pageElement, this.doc).pop();
            if (lastPageElement) {
                insertPoint = lastPageElement.nextSibling ||
                    lastPageElement.parentNode.appendChild(this.doc.createTextNode(' '));
            }
            lastPageElement = null;
        }
        this.insertPoint = insertPoint;
    },
    setRemainHeight: function() {
        var scrollHeight = this.getScrollHeight();
        var bottom = getElementPosition(this.insertPoint).top ||
            this.getPageElementsBottom() || Math.round(scrollHeight * 0.8);
        this.remainHeight = scrollHeight - bottom + ns.BASE_REMAIN_HEIGHT;
    },
    initIcon: function() {
        var div = this.doc.createElement("div");
        div.setAttribute('id', 'autopagerize_icon');
        div.setAttribute('class', 'autopagerize_icon');
        div.setAttribute('state', this.state);
        div.style.cssText = [
            'font-size: 12px;'
            ,'position: fixed;'
            ,'z-index: 9999;'
            ,'top: 3px;'
            ,'right: 3px;'
            ,'width: 10px;'
            ,'height: 10px;'
            ,'border: 1px inset #999;'
            ,'padding: 0px;'
            ,'margin: 0px;'
            ,'color: #fff;'
            ,'background: ' + COLOR[this.state]
        ].join(" ");
        this.icon = this.body.appendChild(div);
        this.icon.addEventListener('click', this, false);
    },
    ipaged: 0,
    ipagesNumber: 0,
    loadImmediately: function(num){
        num = parseInt(num, 10);
        if(num <= 0) return;

        debug("準備立即載入" + num + "頁");

        this.ipagesMode = true;
        this.ipaged = 0;
        this.ipagesNumber = num;

        this.scroll();
    },
    getFullUrl: function (url) {
        if (url && url.indexOf('http') != 0) {
            var anc = this.doc.createElement('a');
            anc.setAttribute('href', url);
            url = anc.href;
            anc = null;
        }
        return url;
    }
};

var stateTooltip = {
    "off": "自動翻頁已關閉",
    "terminated": "自動翻頁已結束",
    "enable": "自動翻頁已啟用",
    "disable": "此頁面不支持自動翻頁",
    "error": "自動翻頁有錯誤",
    "loading": "自動翻頁進行中"
};

function updateIcon(tooltiptext){
    var newState = "";
    if (ns.AUTO_START == false) {
        newState = "off";
    } else {
        if (content.ap) {
            newState = content.ap.state;
        } else {
            newState = "disable";
        }
    }
    ns.icon.setAttribute('state', newState);
    ns.icon.setAttribute('tooltiptext', tooltiptext || stateTooltip[newState]);
}

function launchAutoPager_org(list, win) {
    try {
        var doc = win.document;
        var locationHref = win.location.href;
    } catch(e) {
        return;
    }
    list.some(function(info, index, array) {
        try {
            var exp = new RegExp(info.url);
            if (win.ap) {
            } else if ( ! exp.test(locationHref) ) {
            } else if (!getElementMix(info.nextLink, doc)) {
                // ignore microformats case.
                if (!exp.test('http://a'))
                    debug('nextLink not found.', info.nextLink);
            } else if (!getElementMix(info.pageElement, doc)) {
                if (!exp.test('http://a'))
                    debug('pageElement not found.', info.pageElement);
            } else {
                win.ap = new AutoPager(doc, info);
                return true;
            }
        } catch(e) {
            log('error at launchAutoPager() : ' + e);
        }
    });
    updateIcon();
}

var SP = (function() { // 来自 NLF 的 Super_preloader
    var nextPageKey = [ //下一页关键字
        '下一页', '下一頁', '下1页', '下1頁', '下页', '下頁',
        '翻页', '翻頁', '翻下頁', '翻下页',
        '下一张', '下一張', '下一幅', '下一章', '下一节', '下一節', '下一篇',
        '后一页', '後一頁',
        '前进', '下篇', '后页', '往后', 'Next', 'Next Page', '次へ'
    ];
    var autoMatch = {
        digitalCheck: true, //對數字連接進行檢測,從中找出下一頁的鏈接
        cases: false, //關鍵字區分大小寫....
        pfwordl: { //關鍵字前面的字符限定.
            next: { //下一頁關鍵字前面的字符
                enable: true,
                maxPrefix: 2,
                character: [' ', '　', '[', '［', '『', '「', '【', '(']
            }
        },
        sfwordl: { //關鍵字後面的字符限定.
            next: { //下一頁關鍵字後面的字符
                enable: true,
                maxSubfix: 3,
                character: [' ', '　', ']', '］', '>', '﹥', '›', '»', '>>', '』', '」', '】', ')', '→']
            }
        }
    };

    function parseKWRE() {
        function modifyPageKey(name, pageKey, pageKeyLength) {
            function strMTE(str) {
                return str.replace(/[()\[\]{}|+.,^$?\\]/g, "\\$&");
            }

            var pfwordl = autoMatch.pfwordl,
                sfwordl = autoMatch.sfwordl;

            var RE_enable_a = pfwordl[name].enable,
                RE_maxPrefix = pfwordl[name].maxPrefix,
                RE_character_a = pfwordl[name].character,
                RE_enable_b = sfwordl[name].enable,
                RE_maxSubfix = sfwordl[name].maxSubfix,
                RE_character_b = sfwordl[name].character;
            var plwords,
                slwords,
                rep;

            plwords = RE_maxPrefix > 0 ? ('[' + (RE_enable_a ? strMTE(RE_character_a.join('')) : '.') + ']{0,' + RE_maxPrefix + '}') : '';
            plwords = '^\\s*' + plwords;
            slwords = RE_maxSubfix > 0 ? ('[' + (RE_enable_b ? strMTE(RE_character_b.join('')) : '.') + ']{0,' + RE_maxSubfix + '}') : '';
            slwords = slwords + '\\s*$';
            rep = autoMatch.cases ? '' : 'i';

            for (var i = 0; i < pageKeyLength; i++) {
                pageKey[i] = new RegExp(plwords + strMTE(pageKey[i]) + slwords, rep);
            }
            return pageKey;
        }
        //轉成正則.
        return modifyPageKey('next', nextPageKey, nextPageKey.length);
    }

    var re_nextPageKey;

    function autoGetLink(doc, cplink) {
        if (!re_nextPageKey)
            re_nextPageKey = parseKWRE();

        var startTime = new Date();

        var _nextPageKey = re_nextPageKey;
        var _nPKL = _nextPageKey.length;
        var _getAllElementsByXpath = function (xpath, contextNode, doc) {
            contextNode = contextNode || doc;
            return doc.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        };
        cplink = cplink || doc.URL || doc.location.href;
        var m = cplink.match(/https?:\/\/([^\/]+)/);
        if (!m) return;
        var _domain_port = m[1]; //端口和域名,用來驗證是否跨域.
        var alllinks = doc.links;
        var alllinksl = alllinks.length;

        var curLHref = cplink;
        var _nextlink;

        var DCEnable = autoMatch.digitalCheck;
        var DCRE = /^\s*\D{0,1}(\d+)\D{0,1}\s*$/;

        var i, a, ahref, atext, numtext;
        var aP, initSD, searchD = 1,
            preS1, preS2, searchedD, pSNText, preSS, nodeType;
        var nextS1, nextS2, nSNText, nextSS;
        var aimgs, j, jj, aimg_x, xbreak, k, keytext;

        function finalCheck(a, type) {
            var ahref = a.href;

            //3個條件:http協議鏈接,非跳到當前頁面的鏈接,非跨域
            if (/^https?:/i.test(ahref) && ahref.replace(/#.*$/, '') != curLHref && ahref.match(/https?:\/\/([^\/]+)/)[1] == _domain_port) {
                debug("[autoGetLink] " + (type == 'pre' ? '上一頁' : '下一頁') + '匹配到的關鍵字為:', atext);
                return a; //返回對象A
            }
        }

        debug('[autoGetLink] 全文檔鏈接數量：' + alllinksl);

        for (i = 0; i < alllinksl; i++) {
            if (_nextlink) break;
            a = alllinks[i];
            if (!a) continue; //undefined跳過
            atext = a.textContent;
            if (atext) {
                if (DCEnable) {
                    numtext = atext.match(DCRE);
                    if (numtext) { //是不是純數字
                        //C.log(numtext);
                        numtext = numtext[1];
                        aP = a;
                        initSD = 0;

                        if (!_nextlink) {
                            preS1 = a.previousSibling;
                            preS2 = a.previousElementSibling;

                            while (!(preS1 || preS2) && initSD < searchD) {
                                aP = aP.parentNode;
                                if (aP) {
                                    preS1 = aP.previousSibling;
                                    preS2 = aP.previousElementSibling;
                                };
                                initSD++;
                            };
                            searchedD = initSD > 0 ? true : false;

                            if (preS1 || preS2) {
                                pSNText = preS1 ? preS1.textContent.match(DCRE) : '';
                                if (pSNText) {
                                    preSS = preS1;
                                } else {
                                    pSNText = preS2 ? preS2.textContent.match(DCRE) : '';
                                    preSS = preS2;
                                };
                                if (pSNText) {
                                    pSNText = pSNText[1];
                                    //C.log(pSNText)
                                    if (Number(pSNText) == Number(numtext) - 1) {
                                        nodeType = preSS.nodeType;
                                        if (nodeType == 3 || (nodeType == 1 && (searchedD ? _getAllElementsByXpath('./descendant-or-self::a[@href]', preSS, doc).snapshotLength == 0 : (!preSS.hasAttribute('href') || preSS.href == curLHref)))) {
                                            _nextlink = finalCheck(a, 'next');
                                        }
                                        continue;
                                    }
                                }
                            }
                        }

                        continue;
                    };
                }
            } else {
                atext = a.title;
            }
            if (!atext) {
                aimgs = a.getElementsByTagName('img');
                for (j = 0, jj = aimgs.length; j < jj; j++) {
                    aimg_x = aimgs[j];
                    atext = aimg_x.alt || aimg_x.title;
                    if (atext) break;
                }
            }
            if (!atext) continue;

            if (!_nextlink) {
                xbreak = false;
                for (k = 0; k < _nPKL; k++) {
                    keytext = _nextPageKey[k];
                    if (!(keytext.test(atext))) continue;
                    _nextlink = finalCheck(a, 'next');
                    xbreak = true;
                    break;
                }
                if (xbreak || _nextlink) continue;
            }
        }

        debug('[autoGetLink] 搜索鏈接數量：' + i, '，耗時：' + (new Date() - startTime) + '毫秒');

        return _nextlink || null;
    }

    // 地址欄遞增
    function hrefInc(obj, doc, win) {
        var _cplink = doc._cplink || doc.URL;
        // _cplink = _cplink.replace(/#.*$/, ''); //url 去掉hash

        function getHref(href) {
            var mFails = obj.mFails;
            if (!mFails) return href;
            var str;
            if (typeof mFails == 'string') {
                str = mFails;
            } else {
                var fx;
                var array = [];
                var i, ii;
                var mValue;
                for (i = 0, ii = mFails.length; i < ii; i++) {
                    fx = mFails[i];
                    if (!fx) continue;
                    if (typeof fx == 'string') {
                        array.push(fx);
                    } else {
                        mValue = href.match(fx);
                        if (!mValue) return href;
                        array.push(mValue);
                    };
                };
                var str = array.join('');
            };
            return str;
        }

        var sa = obj.startAfter;
        var saType = typeof sa;
        var index;

        if (saType == 'string') {
            index = _cplink.indexOf(sa);
            if (index == -1) {
                _cplink = getHref(_cplink);
                index = _cplink.indexOf(sa);
                if (index == -1) return;
            }
        } else {
            var tsa = _cplink.match(sa);
            if (!tsa) {
                _cplink = getHref(_cplink);
                sa = (_cplink.match(sa) || [])[0];
                if (!sa) return;
                index = _cplink.indexOf(sa);
                if (index == -1) return;
            } else {
                sa = tsa[0];
                index = _cplink.indexOf(sa);
            }
        }

        index += sa.length;
        var max = obj.max === undefined ? 9999 : obj.max;
        var min = obj.min === undefined ? 1 : obj.min;
        var aStr = _cplink.slice(0, index);
        var bStr = _cplink.slice(index);
        var nbStr = bStr.replace(/^(\d+)(.*)$/, function(a, b, c) {
            b = Number(b) + obj.inc;
            if (b >= max || b < min) return a;
            return b + c;
        });
        if (nbStr !== bStr) {
            var ilresult;
            try {
                ilresult = obj.isLast(doc, win.wrappedJSObject, _cplink);
            } catch (e) {
                debug("Error: hrefInc().", e);
            }
            if (ilresult) return;
            return aStr + nbStr;
        }
    }

    return {
        autoGetLink: autoGetLink,
        hrefInc: hrefInc
    };
})();

function toRE(obj) {
    if (obj instanceof RegExp) {
        return obj;
    } else if (obj instanceof Array) {
        return new RegExp(obj[0], obj[1]);
    } else {
        if (typeof(obj) == 'string' && obj.startsWith("wildc;")){
            obj = wildcardToRegExpStr(obj.slice(6));
        }
        return new RegExp(obj);
    }
}

function createIframe(name) {
    let frame = document.createElement("iframe");
    if (name)
        frame.setAttribute("name", name);
    frame.setAttribute("type", "content");
    //iframe是沒有history的
    frame.setAttribute("collapsed", "true");
    //frame.setAttribute('style', 'display: none;');
    //不append就沒有webnavigation
    document.documentElement.appendChild(frame);
    frame.webNavigation.allowAuth = false;  // 安全驗證
    frame.webNavigation.allowImages = true;
    frame.webNavigation.allowJavascript = true;
    frame.webNavigation.allowMetaRedirects = true;  //重定向之後的文檔
    frame.webNavigation.allowPlugins = false;
    frame.webNavigation.allowSubframes = false;  //子窗口,frame,iframe
    return frame;
}

// By lastDream2013 略加修改，原版只能用於 Firefox
function getRalativePageStr(lastUrl, currentUrl, nextUrl) {
    var getRalativePageNumArray = function (lasturl, url) {
        if (!lasturl || !url) {
            return [0, 0];
        }

        var lasturlarray = lasturl.split(/-|\.|\&|\/|=|#|\?/),
            urlarray = url.split(/-|\.|\&|\/|=|#|\?/),
            url_info,
            lasturl_info;
        // 一些 url_info 為 p1,p2,p3 之類的
        var handleInfo = function(s) {
            if (s) {
                return s.replace('p', '');
            }
            return s;
        };
        while (urlarray.length != 0) {
            url_info = handleInfo(urlarray.pop()),
            lasturl_info = handleInfo(lasturlarray.pop());
            if (url_info != lasturl_info) {
                if (/[0-9]+/.test(url_info) && (url_info == "2" || /[0-9]+/.test(lasturl_info)))
                    return [(parseInt(lasturl_info) || 1), parseInt(url_info)];
            }
        }
        return [0, 0];
    };

    //論壇和搜索引擎網頁顯示實際頁面信息
    var ralativePageNumarray = [];
    if (nextUrl) {
        ralativePageNumarray = getRalativePageNumArray(currentUrl, nextUrl);
    } else {
        ralativePageNumarray = getRalativePageNumArray(lastUrl, currentUrl);
        var ralativeOff = ralativePageNumarray[1] - ralativePageNumarray[0]; //用的上一頁的相對信息比較的，要補充差值……
        ralativePageNumarray[1] = ralativePageNumarray[1] + ralativeOff;
        ralativePageNumarray[0] = ralativePageNumarray[0] + ralativeOff;
    }
    // console.log('[獲取實際頁數] ', '要比較的3個頁數：',arguments, '，得到的差值:', ralativePageNumarray);
    if (isNaN(ralativePageNumarray[0]) || isNaN(ralativePageNumarray[1])) {
        return '';
    }

    var realPageSiteMatch = false;
    var ralativeOff = ralativePageNumarray[1] - ralativePageNumarray[0];
    //上一頁與下一頁差值為1，並最大數值不超過10000(一般論壇也不會超過這麼多頁……)
    if (ralativeOff === 1 && ralativePageNumarray[1] < 10000) {
        realPageSiteMatch = true;
    }

    //上一頁與下一頁差值不為1，但上一頁與下一頁差值能被上一頁與下一面所整除的，有規律的頁面
    if (!realPageSiteMatch && ralativeOff !== 1) {
        if ((ralativePageNumarray[1] % ralativeOff) == 0 && (ralativePageNumarray[0] % ralativeOff) == 0) {
            realPageSiteMatch = true;
        }
    }

    if (!realPageSiteMatch) { //不滿足以上條件，再根據地址特徵來匹配
        var sitePattern;
        for (var i = 0, length = REALPAGE_SITE_PATTERN.length; i < length; i++) {
            sitePattern = REALPAGE_SITE_PATTERN[i];
            if (currentUrl.toLocaleLowerCase().indexOf(sitePattern) >= 0) {
                realPageSiteMatch = true;
                break;
            }
        }
    }

    var ralativePageStr;
    if (realPageSiteMatch) { //如果匹配就顯示實際網頁信息
        if (ralativePageNumarray[1] - ralativePageNumarray[0] > 1) { //一般是搜索引擎的第xx - xx項……
            ralativePageStr = ' [ 實際：第 <font color="red">' + ralativePageNumarray[0] + ' - ' + ralativePageNumarray[1] + '</font> 項 ]';
        } else if ((ralativePageNumarray[1] - ralativePageNumarray[0]) == 1) { //一般的翻頁數，差值應該是1
            ralativePageStr = ' [ 實際：第 <font color="red">' + ralativePageNumarray[0] + '</font> 頁 ]';
        } else if ((ralativePageNumarray[0] == 0 && ralativePageNumarray[1]) == 0) { //找不到的話……
            ralativePageStr = ' [ <font color="red">實際網頁結束</font> ]';
        }
    } else {
        ralativePageStr = '';
    }
    return ralativePageStr;
}

//-------- 來自 Super_preloader, 為了兼容 Super_preloader 數據庫 -------------
//獲取單個元素,混合。
function getElementMix(selector, doc, win) {
    var ret;
    if (!selector) return ret;
    win = win || doc.defaultView;
    var type = typeof selector;
    if (type == 'string') {
        if (selector.search(/^css;/i) == 0) {
            ret = doc.querySelector(selector.slice(4));
        } else if (selector.toLowerCase() == 'auto;') {
            ret = SP.autoGetLink(doc);
        } else {
            ret = getFirstElementByXPath(selector, doc);
        }
    } else if (type == 'function') {
        ret = selector.apply(win, [doc, win, doc.URL]);
    } else if (Array.isArray(selector)) {
        for (var i = 0, l = selector.length; i < l; i++) {
            ret = getElementMix(selector[i], doc, win);
            if(ret) break;
        }
    } else {
        ret = SP.hrefInc(selector, doc, win);

        }
    if (typeof ret == 'string') {
        var elem = doc.createElement('a');
        elem.setAttribute('href', ret);
        ret = elem;
    }
    return ret;
}

function getElementsMix(selector, doc) {
    if (selector.search(/^css;/i) == 0) {
        return Array.prototype.slice.call(doc.querySelectorAll(selector.slice(4)));
    } else {
        return getElementsByXPath(selector, doc);
    }
}

function getElementsByXPath(xpath, node) {
    var nodesSnapshot = getXPathResult(xpath, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var data = [];
    for (var i = 0, l = nodesSnapshot.snapshotLength; i < l; i++) {
        data[i] = nodesSnapshot.snapshotItem(i);
    }
    return data;
}

function getFirstElementByXPath(xpath, node) {
    var result = getXPathResult(xpath, node, XPathResult.FIRST_ORDERED_NODE_TYPE);
    return result.singleNodeValue;
}

function getXPathResult(xpath, node, resultType) {
    var doc = node.ownerDocument || node;
    var resolver = doc.createNSResolver(node.documentElement || node);
    var defaultNS = null;

    try {
        defaultNS = (node.nodeType == node.DOCUMENT_NODE) ?
            node.documentElement.lookupNamespaceURI(null):
            node.lookupNamespaceURI(null);
    } catch(e) {}

    if (defaultNS) {
        const defaultPrefix = '__default__';
        xpath = addDefaultPrefix(xpath, defaultPrefix);
        var defaultResolver = resolver;
        resolver = function (prefix) {
            return (prefix == defaultPrefix)
                ? defaultNS : defaultResolver.lookupNamespaceURI(prefix);
        }
    }
    return doc.evaluate(xpath, node, resolver, resultType, null);
}

function addDefaultPrefix(xpath, prefix) {
    const tokenPattern = /([A-Za-z_\u00c0-\ufffd][\w\-.\u00b7-\ufffd]*|\*)\s*(::?|\()?|(".*?"|'.*?'|\d+(?:\.\d*)?|\.(?:\.|\d+)?|[\)\]])|(\/\/?|!=|[<>]=?|[\(\[|,=+-])|([@$])/g
    const TERM = 1, OPERATOR = 2, MODIFIER = 3
    var tokenType = OPERATOR
    prefix += ':'
    function replacer(token, identifier, suffix, term, operator, modifier) {
        if (suffix) {
            tokenType =
                (suffix == ':' || (suffix == '::' &&
                 (identifier == 'attribute' || identifier == 'namespace')))
                ? MODIFIER : OPERATOR
        }
        else if (identifier) {
            if (tokenType == OPERATOR && identifier != '*') {
                token = prefix + token
            }
            tokenType = (tokenType == TERM) ? OPERATOR : TERM
        }
        else {
            tokenType = term ? TERM : operator ? OPERATOR : MODIFIER
        }
        return token
    }
    return xpath.replace(tokenPattern, replacer)
};

function getElementPosition(elem) {
    var offsetTrail = elem;
    var offsetLeft  = 0;
    var offsetTop   = 0;
    while (offsetTrail) {
        offsetLeft += offsetTrail.offsetLeft;
        offsetTop  += offsetTrail.offsetTop;
        offsetTrail = offsetTrail.offsetParent;
    }
    return {left: offsetLeft || null, top: offsetTop|| null};
}

function getElementBottom(elem) {
    var doc = elem.ownerDocument;
    if ('getBoundingClientRect' in elem) {
        var rect = elem.getBoundingClientRect();
        var top = parseInt(rect.top, 10) + (doc.body.scrollTop || doc.documentElement.scrollTop);
        var height = parseInt(rect.height, 10);
    } else {
        var c_style = doc.defaultView.getComputedStyle(elem, '');
        var height  = 0;
        var prop    = ['height', 'borderTopWidth', 'borderBottomWidth',
            'paddingTop', 'paddingBottom',
            'marginTop', 'marginBottom'];
        prop.forEach(function(i) {
            var h = parseInt(c_style[i]);
            if (typeof h == 'number') {
                height += h;
            }
        });
        var top = getElementPosition(elem).top;
    }
    return top ? (top + height) : null;
}

function getCookie(host, needSecureCookie) {
    var result = []
    var cookieManager = Cc['@mozilla.org/cookiemanager;1'].getService(Ci.nsICookieManager2);
    var enumerator = cookieManager.getCookiesFromHost(host);
    var cookie;
    while (enumerator.hasMoreElements()) {
        cookie = enumerator.getNext().QueryInterface(Ci.nsICookie2);
        if (!cookie.isSecure || needSecureCookie) {
            result.push(cookie.name + '=' + cookie.value);
        }
    }
    return result.join('; ');
}

// end utility functions.
function getCache() {
    try{
        var cache = loadFile(DB_FILENAME_EN);
        if (!cache) return false;
        cache = JSON.parse(cache);
        ns.SITEINFO = cache;
        log('Load cacheInfo.');
        return true;
    }catch(e){
        log('Error getCache.')
        return false;
    }
}


function requestSITEINFO_CN(){
    var xhrState,
        url = SITEINFO_CN_IMPORT_URL;

    var opt = {
        method: 'get',
        url: url,
        overrideMimeType: "text/plan; charset=utf-8;",
        onload: function(res) {
            xhrState = 'loaded';
            getCacheCallback_CN(res, url);
            uAutoPagerize.setLastCheckTime();
        },
        onerror: function(res) {
            xhrState = 'error';url
            getCacheErrorCallback(url);
        },
    }
    xhrState = 'start';
    GM_xmlhttpRequest(opt);
    setTimeout(function() {
        if (xhrState == 'start') {
            getCacheErrorCallback(url);
        }
    }, XHR_TIMEOUT);
}

function getCacheCallback_CN(res, url) {
    if (res.status != 200) {
        return getCacheErrorCallback(url);
    }

    var matches = res.responseText.match(/(\/\/高优先级规则,第一个是教程[\s\S]+)\/\/分页导航的6个图标/i);

    if(!matches){
        if(!matches){
            log("no matches.");
            return;
        }
    }

    saveFile(DB_FILENAME_CN, "    " + matches[1]);
    ns.loadSetting_CN();
    alerts("uAutoPagerize", "中文規則已經更新完畢");

    log('getCacheCallback:' + url);
}

function requestSITEINFO(){
    var xhrStates = {};
    SITEINFO_IMPORT_URLS.forEach(function(i) {
        var opt = {
            method: 'get',
            url: i,
            onload: function(res) {
                xhrStates[i] = 'loaded';
                getCacheCallback(res, i);
            },
            onerror: function(res) {
                xhrStates[i] = 'error';
                getCacheErrorCallback(i);
            },
        }
        xhrStates[i] = 'start';
        GM_xmlhttpRequest(opt);
        setTimeout(function() {
            if (xhrStates[i] == 'start') {
                getCacheErrorCallback(i);
            }
        }, XHR_TIMEOUT);
    });
};

function getCacheCallback(res, url) {
    if (res.status != 200) {
        return getCacheErrorCallback(url);
    }

    var temp;
    try {
        temp = Cu.evalInSandbox(res.responseText, Cu.Sandbox("about:blank"));
    } catch(e) {
        log(e);
    }
    if (!temp || !temp.length)
        return getCacheErrorCallback(url);

    var info = [];
    temp.forEach(function(i){
        var data = i.data;
        if (!data.url || data.url.length <= 12) return;
        try {
            var exp = new RegExp(data.url);
            if (exp.test('http://a')) return;
            var o = {
                url: data.url,
                nextLink: data.nextLink,
                pageElement: data.pageElement,
            };
            Object.defineProperty(o, 'url_regexp', {
                enumerable: false,
                value: exp
            });
            if (data.insertBefore)
                o.insertBefore = data.insertBefore;
            //o.resource_url = i.resource_url;
            info.push(o);
        } catch (e) {}
    });
    info.sort(function(a, b) b.url.length - a.url.length);
    saveFile(DB_FILENAME_EN, JSON.stringify(info));

    ns.SITEINFO = info;
    log('getCacheCallback:' + url);
    alerts("uAutoPagerize", "JSON 規則已經更新完畢");
}

function getCacheErrorCallback(url) {
    log('getCacheErrorCallback:' + url);
}

// 修改過，為了能使用 responseType = "document"，這樣下一頁頭像和 //body 都有能用。
function GM_xmlhttpRequest(obj, win) {
    if (typeof(obj) != 'object' || (typeof(obj.url) != 'string' && !(obj.url instanceof String))) return;
    if (!win || "@maone.net/noscript-service;1" in Cc) win = window;

    var req = new win.XMLHttpRequest();
    req.open(obj.method || 'GET',obj.url,true);

    if (typeof(obj.headers) == 'object')
        for(var i in obj.headers)
            req.setRequestHeader(i,obj.headers[i]);
    if (obj.overrideMimeType)
        req.overrideMimeType(obj.overrideMimeType);
    if (obj.responseType)
        req.responseType = obj.responseType;

    ['onload','onerror','onreadystatechange'].forEach(function(k) {
        if (obj[k] && (typeof(obj[k]) == 'function' || obj[k] instanceof Function)) req[k] = function() {
            req.finalUrl = (req.readyState == 4) ? req.channel.URI.spec : '';
            req.URI = req.channel.URI;
            req.originalURI = req.channel.originalURI;
            obj[k](req);
        };
    });

    req.send(obj.send || null);
    return req;
}

function wildcardToRegExpStr(urlstr) {
    if (urlstr.source) return urlstr.source;
    let reg = urlstr.replace(/[()\[\]{}|+.,^$?\\]/g, "\\$&").replace(/\*+/g, function(str){
        return str === "*" ? ".*" : "[^/]*";
    });
    return "^" + reg + "$";
}

function log(){ Application.console.log('[uAutoPagerize] ' + $A(arguments)); }
function debug(){ if (ns.DEBUG) Application.console.log('[uAutoPagerize DEBUG] ' + $A(arguments)); };
function $(id, doc) (doc || document).getElementById(id);

function $A(arr) Array.slice(arr);
function $C(name, attr) {
    var el = document.createElement(name);
    if (attr) Object.keys(attr).forEach(function(n) el.setAttribute(n, attr[n]));
    return el;
}

function alerts(title, info){
    Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService)
        .showAlertNotification(null, title, info, false, "", null, "");
}

function addStyle(css) {
    var pi = document.createProcessingInstruction(
        'xml-stylesheet',
        'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
    );
    return document.insertBefore(pi, document.documentElement);
}

function loadFile(aLeafName) {
    var aFile = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
    aFile.appendRelativePath(aLeafName);
    return loadText(aFile);
}
function loadText(aFile) {
    if (!aFile.exists() || !aFile.isFile()) return null;
    var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
    fstream.init(aFile, -1, 0, 0);
    sstream.init(fstream);
    var data = sstream.read(sstream.available());
    try { data = decodeURIComponent(escape(data)); } catch(e) {}
    sstream.close();
    fstream.close();
    return data;
}

function saveFile(name, data) {
    var file;
    if(typeof name == "string"){
        var file = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
        file.appendRelativePath(name);
    }else{
        file = name;
    }

    var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    suConverter.charset = 'UTF-8';
    data = suConverter.ConvertFromUnicode(data);

    var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
    foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
    foStream.write(data, data.length);
    foStream.close();
}

})('\
#uAutoPagerize-icon {\
	list-style-image: url(\
		data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAQCAYAAACBSfjBAAAA2klEQVRYhe\
		2WwYmGMBhE390+0kCOwZLswQK82YAg2Ict2IBdeJ3/FHcW9oewnoRv4N0yGB4TECLPs22bHIBlWeQAzP\
		Msp/a7q5MDkM4kB6DsRc7PDaTfQEqnHIBSdjm1fXWXHIAznXIA9rLLub+esxyA4zjkfDsXAkNgCHy/wM\
		jDtK5tHEc5td+6tn7t5dz9xrX1/Sqn9lvXtvarnNpvXdtfLzUEhsAQ+H6BkYdpXdswDHJqv3Vtecpy7n\
		7j2nKe5NR+69qmPMmp/da1ff2NCYEhMAS+WmDk//kA2XH2W9CWRjQAAAAASUVORK5CYII=\
		);\
	-moz-image-region: rect(0px 16px 16px 0px );\
}\
\
#uAutoPagerize-icon[state="enable"]     { -moz-image-region: rect(0px 32px 16px 16px); }\
#uAutoPagerize-icon[state="terminated"] { -moz-image-region: rect(0px 48px 16px 32px); }\
#uAutoPagerize-icon[state="error"]      { -moz-image-region: rect(0px 64px 16px 48px); }\
#uAutoPagerize-icon[state="off"]        { -moz-image-region: rect(0px 80px 16px 64px); }\
\
\
#uAutoPagerize-icon[state="loading"] {\
	list-style-image: url(data:image/gif;base64,\
		R0lGODlhEAAQAKEDADC/vyHZ2QD//////yH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgADACwAAAAAEAAQ\
		AAACIJyPacKi2txDcdJmsw086NF5WviR32kAKvCtrOa2K3oWACH5BAkKAAMALAAAAAAQABAAAAIinI9p\
		wTEChRrNRanqi1PfCYLACIQHWZoDqq5kC8fyTNdGAQAh+QQJCgADACwAAAAAEAAQAAACIpyPacAwAcMQ\
		VKz24qyXZbhRnRNJlaWk6sq27gvH8kzXQwEAIfkECQoAAwAsAAAAABAAEAAAAiKcj6kDDRNiWO7JqSqU\
		1O24hCIilMJomCeqokPrxvJM12IBACH5BAkKAAMALAAAAAAQABAAAAIgnI+pCg2b3INH0uquXqGH7X1a\
		CHrbeQiqsK2s5rYrehQAIfkECQoAAwAsAAAAABAAEAAAAiGcj6nL7Q+jNKACaO/L2E4mhMIQlMEijuap\
		pKSJim/5DQUAIfkECQoAAwAsAAAAABAAEAAAAiKcj6nL7Q+jnLRaJbIYoYcBhIChbd4njkPJeaBIam33\
		hlUBACH5BAEKAAMALAAAAAAQABAAAAIgnI+py+0PoxJUwGofvlXKAAYDQAJLKJamgo7lGbqktxQAOw==\
		);\
}\
\
'.replace(/\n|\t/g, ''));

window.uAutoPagerize.init();