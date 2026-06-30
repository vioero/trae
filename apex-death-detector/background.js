// Apex Death Detector - 核心状态管理
(function() {
    'use strict';

    // 状态常量
    const STATE = {
        WAITING: 'waiting',      // 等待中（游戏未开始）
        PLAYING: 'playing',      // 游戏中
        DEAD: 'dead',            // 死亡成盒
        IN_DOUYIN: 'in_douyin',  // 在抖音
        TEAM_ELIMINATED: 'team_eliminated'  // 全队淘汰
    };

    // Apex Legends 游戏 ID
    const APEX_GAME_ID = 21566;

    // 当前状态
    let currentState = STATE.WAITING;
    let localPlayerId = null;
    let douyinPath = '';
    let isGameRunning = false;

    // 日志记录
    function log(message) {
        console.log(`[Apex Death Detector] ${new Date().toISOString()} - ${message}`);
    }

    // 保存设置
    function saveSettings(settings) {
        return new Promise((resolve) => {
            overwolf.storage.local.set(settings, resolve);
        });
    }

    // 加载设置
    function loadSettings() {
        return new Promise((resolve) => {
            overwolf.storage.local.get(['douyinPath'], (result) => {
                resolve(result.douyinPath || '');
            });
        });
    }

    // 执行外部脚本
    function runScript(scriptName, args = '') {
        return new Promise((resolve, reject) => {
            const scriptPath = `helpers/${scriptName}`;
            overwolf.utils.runScript(scriptPath, args, (result) => {
                if (result.success) {
                    log(`${scriptName} 执行成功`);
                    resolve(result);
                } else {
                    log(`${scriptName} 执行失败: ${result.message}`);
                    reject(result);
                }
            });
        });
    }

    // 切换到抖音
    async function switchToDouyin() {
        if (currentState === STATE.DEAD || currentState === STATE.IN_DOUYIN) {
            log('已经在抖音或已死亡状态');
            return;
        }

        try {
            currentState = STATE.DEAD;
            log('检测到死亡，切换到抖音');

            if (douyinPath) {
                await runScript('launch-douyin.bat', `"${douyinPath}"`);
            } else {
                await runScript('launch-douyin.bat');
            }

            currentState = STATE.IN_DOUYIN;
        } catch (e) {
            log(`切换抖音失败: ${e.message}`);
            currentState = STATE.DEAD;
        }
    }

    // 切换回 Apex
    async function switchToApex() {
        if (currentState !== STATE.IN_DOUYIN) {
            log('不在抖音窗口，不执行切换');
            return;
        }

        try {
            log('复活/救援，切回 Apex');
            await runScript('focus-apex.bat');
            currentState = STATE.PLAYING;
        } catch (e) {
            log(`切换 Apex 失败: ${e.message}`);
        }
    }

    // 智能收尾（检查当前窗口状态）
    async function smartCleanup() {
        try {
            const windowManager = overwolf.windows;
            const currentWindow = await windowManager.getCurrentWindow();

            if (currentWindow && currentWindow.name !== 'background') {
                const windowName = currentWindow.name.toLowerCase();
                if (windowName.includes('douyin') || windowName.includes('抖音')) {
                    log('全队淘汰，当前在抖音，切回游戏看结算');
                    await runScript('focus-apex.bat');
                } else {
                    log('全队淘汰，当前已在游戏，不操作');
                }
            }
        } catch (e) {
            log(`智能收尾检查失败: ${e.message}`);
        }

        currentState = STATE.TEAM_ELIMINATED;
    }

    // 重置状态
    function resetState() {
        log('新对局开始，重置所有状态');
        currentState = STATE.WAITING;
        localPlayerId = null;
    }

    // 获取本地玩家 ID
    function getLocalPlayerId(info) {
        if (info && info.me) {
            return info.me.account_id || info.me.player_id || null;
        }
        return null;
    }

    // 检查本地玩家是否死亡
    function isLocalPlayerDead(teams, localId) {
        if (!teams || !localId) return false;

        for (const teamId in teams) {
            const team = teams[teamId];
            if (team && team.members) {
                for (const memberId in team.members) {
                    const member = team.members[memberId];
                    if (member && member.account_id === localId) {
                        return member.state === 'death';
                    }
                }
            }
        }
        return false;
    }

    // 检查是否是全队淘汰
    function isTeamEliminated(teams, localId) {
        if (!teams) return false;

        for (const teamId in teams) {
            const team = teams[teamId];
            if (team && team.state === 'eliminated') {
                return true;
            }
        }
        return false;
    }

    // 处理游戏事件
    function handleGameEvent(event) {
        const eventCategory = event.category;
        const eventType = event.type;
        const eventData = event.data || {};

        log(`事件: ${eventCategory} / ${eventType}`);

        // 忽略终态后的任何事件
        if (currentState === STATE.TEAM_ELIMINATED && eventType !== 'match_start') {
            return;
        }

        switch (eventType) {
            case 'match_start':
                resetState();
                currentState = STATE.PLAYING;
                break;

            case 'kill':
                break;

            case 'knocked_out':
                log('被击倒，但不触发任何操作（玩家仍可操作）');
                break;

            case 'death':
                if (currentState === STATE.PLAYING) {
                    switchToDouyin();
                }
                break;

            case 'healed_from_ko':
                log('原地救援复活');
                switchToApex();
                break;

            case 'respawn':
                log('信标/移动重生复活');
                switchToApex();
                break;

            case 'team_state':
                if (eventData.team_state === 'eliminated') {
                    log('全队淘汰');
                    smartCleanup();
                }
                break;

            default:
                break;
        }
    }

    // 处理游戏信息更新
    function handleGameInfo(info) {
        if (!info) return;

        // 获取本地玩家 ID
        if (!localPlayerId && info.me) {
            localPlayerId = getLocalPlayerId(info);
            log(`本地玩家 ID: ${localPlayerId}`);
        }

        // 检查是否在游戏中
        if (info.game_info) {
            const wasRunning = isGameRunning;
            isGameRunning = info.game_info.isInGame;

            if (!wasRunning && isGameRunning) {
                log('游戏开始');
                currentState = STATE.PLAYING;
            } else if (wasRunning && !isGameRunning) {
                log('游戏结束');
                resetState();
            }
        }

        // 检查本地玩家死亡状态
        if (info.teams && localPlayerId && currentState === STATE.PLAYING) {
            if (isLocalPlayerDead(info.teams, localPlayerId)) {
                switchToDouyin();
            }
        }

        // 检查全队淘汰
        if (info.teams && localPlayerId && currentState !== STATE.TEAM_ELIMINATED) {
            if (isTeamEliminated(info.teams, localPlayerId)) {
                smartCleanup();
            }
        }
    }

    // 初始化 Overwolf 事件监听
    function initOverwolfListeners() {
        // 监听游戏事件
        overwolf.games.events.onNewEvent.addListener((event) => {
            handleGameEvent(event);
        });

        // 监听游戏信息变化
        overwolf.games.info.onInfoUpdate.addListener((info) => {
            handleGameInfo(info);
        });

        // 监听游戏启动
        overwolf.games.onGameInfo.addListener((info) => {
            if (info && info.gameId === APEX_GAME_ID) {
                handleGameInfo(info);
            }
        });
    }

    // 获取游戏事件需要的特性
    function getRequiredFeatures() {
        return [
            'death',
            'revive',
            'team',
            'match_state',
            'me',
            'game_info'
        ];
    }

    // 设置游戏事件订阅
    function setEventsSubscription() {
        const features = getRequiredFeatures();

        overwolf.games.events.setRequiredFeatures(features, (result) => {
            if (result.success) {
                log('游戏事件订阅成功');
            } else {
                log(`游戏事件订阅失败: ${JSON.stringify(result)}`);
            }
        });
    }

    // 初始化
    async function init() {
        log('Apex Death Detector 启动');

        // 加载设置
        douyinPath = await loadSettings();
        log(`抖音路径: ${douyinPath || '未设置'}`);

        // 初始化 Overwolf 监听器
        initOverwolfListeners();

        // 设置事件订阅
        setEventsSubscription();

        log('初始化完成');
    }

    // 等待 Overwolf 准备好
    if (typeof overwolf !== 'undefined') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();