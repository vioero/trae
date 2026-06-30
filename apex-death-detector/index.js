// Apex Death Detector - 设置界面逻辑
(function() {
    'use strict';

    const douyinPathInput = document.getElementById('douyin-path');
    const browseBtn = document.getElementById('browse-btn');
    const statusDisplay = document.getElementById('status-display');

    // 日志
    function log(message) {
        console.log(`[Settings] ${message}`);
    }

    // 更新状态显示
    function updateStatus(state, detail = '') {
        const statusLabel = statusDisplay.querySelector('.status-label');
        const statusBadge = statusDisplay.querySelector('.status-badge');

        const stateMap = {
            'waiting': { text: '等待游戏开始', class: 'status-waiting' },
            'playing': { text: '游戏中', class: 'status-playing' },
            'dead': { text: '死亡成盒', class: 'status-dead' },
            'in_douyin': { text: '在抖音', class: 'status-douyin' },
            'team_eliminated': { text: '全队淘汰', class: 'status-eliminated' }
        };

        const stateInfo = stateMap[state] || { text: '未知状态', class: '' };

        if (statusBadge) {
            statusBadge.textContent = stateInfo.text;
            statusBadge.className = `status-badge ${stateInfo.class}`;
        } else {
            statusDisplay.innerHTML = `<span class="status-badge ${stateInfo.class}">${stateInfo.text}</span>`;
        }

        if (detail) {
            log(`状态: ${stateInfo.text} - ${detail}`);
        }
    }

    // 保存抖音路径
    function saveDouyinPath(path) {
        return new Promise((resolve) => {
            overwolf.storage.local.set({ douyinPath: path }, () => {
                log(`已保存抖音路径: ${path}`);
                resolve();
            });
        });
    }

    // 加载保存的路径
    function loadSettings() {
        return new Promise((resolve) => {
            overwolf.storage.local.get(['douyinPath'], (result) => {
                resolve(result.douyinPath || '');
            });
        });
    }

    // 浏览文件
    function browseForFile() {
        const currentPath = douyinPathInput.value.trim();

        overwk.utils.openMediaDialog({
            startPath: currentPath || 'C:\\',
            filter: '可执行文件 (*.exe)|*.exe',
            multiSelect: false
        }, (result) => {
            if (result.success && result.path) {
                douyinPathInput.value = result.path;
                saveDouyinPath(result.path);
                log(`选择文件: ${result.path}`);
            }
        });
    }

    // 手动输入路径时保存
    function handlePathInput() {
        const path = douyinPathInput.value.trim();
        saveDouyinPath(path);
    }

    // 从 background.js 接收状态更新
    function setupMessageListener() {
        overwolf.message.setReceiveallback((message) => {
            if (message.type === 'state_update') {
                updateStatus(message.state, message.detail);
            }
        });
    }

    // 初始化
    async function init() {
        log('设置界面初始化');

        // 加载保存的设置
        const savedPath = await loadSettings();
        if (savedPath) {
            douyinPathInput.value = savedPath;
        }

        // 绑定事件
        browseBtn.addEventListener('click', browseForFile);
        douyinPathInput.addEventListener('change', handlePathInput);

        // 监听 background 消息
        setupMessageListener();

        log('设置界面初始化完成');
    }

    // 等待 Overwolf 准备好
    if (typeof overwolf !== 'undefined') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();