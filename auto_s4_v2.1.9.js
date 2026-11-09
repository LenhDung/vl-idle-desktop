/* Auto S4 v2.1.9 - 2026-11-08
   Dong bo nut Auto native + AU().fight; xac nhan sau thao tac.
   Ke thua sua thuong ngay/tuan va Ban theo loc tu VL4 v4.0.1.
   Chay tai https://hoainiem2003.net/vl4/
*/
(() => {
  'use strict';
  function captureUpgradeSession(previous){
    try{
      const x=previous?.state;
      if(!x?.running||typeof S==='undefined'||!S.name||!S.fac)return null;
      const saved=previous.resume?.saved?.()||{};
      return {...saved,v:1,active:true,at:Date.now(),identity:String(S.name)+'|'+String(S.fac),
        completed:x.completed,baseStep:x.baseStep,questActive:x.questActive,lastReborns:x.lastReborns,options:{...x.config}};
    }catch(_){return null;}
  }
  const previousAuto=window.__AUTO_S4||window.__VL4_DA_TAU;
  const upgradeResume=captureUpgradeSession(previousAuto);
  if(previousAuto){previousAuto.stop();previousAuto.remove();}
  const MIN_DA_TAU_LEVEL = 40;
  const MIN_WORLD_BOSS_LEVEL = 60;
  // VL4 bridge.js wbWin(): S.lv >= st.minLv || S.reset > 0. Dã Tẩu sau chuyển
  // sinh chỉ được xác nhận khi máy chủ cập nhật S.qc; nếu từ chối sẽ farm lên cấp 30/40.
  const REBORN_QUEST_RETRY_LEVELS = [30, 40];
  const ID = 'vl4-dt-panel', delay = 1000;
  const RESPAWN_WAIT_MS = 7000; // de game hoi sinh xong va may chu dong bo
  const ZONE_RETRY_MS = 12000;
  const ZONE_RETRY_MAX = 3; // toi da 3 lan thu lai, khong spam lenh
  const RECOVERY_MAX_MS = 180000; // thong bao neu 3 phut van khong ve bai
  const STALLED_KILL_MS = 180000; // khong nham voi chet / dang boss
  const STALLED_ELITE_MS = 360000; // quai tinh anh hiem, cho lau hon
  const MAP_FAILURE_COOLDOWN_MS = 15 * 60000;
  const STALLED_QUEST_BOSS_MS = 5 * 60000; // boss bai co the xuat hien theo nhat dinh/chu ky
  const questBoss = { savedPrio: null, activeStep: null, lastSeen: '', lastReport: 0 };
  const cfg = { partyFollowWorld:false,partyWorldChat:false, partyWaitEnabled:true, daTauPaused:false, rangedHoldEnabled:true, partyInviteEnabled:true, partyPreferChannel:true, partyLeaveOtherMap:true, partyKickAway:true, reward: 'xp', target: 200, keepGameAuto: true, channelMode: 'rank3', bossWorldEnabled: true, tongKimEnabled: true, tongKimCombatEnabled:true, tongKimHpPct:75, tongKimMpPct:75, bossAt12: true, bossAt21: true, bossPrepareMinutes: 0, resumeDaTau: true, bossRejoinOnDeath: true, powerSaveAfk: true, bossQuestEnabled: true, bossChannelRotate: false, preferBossMaps: true, bossPositionEnabled: true, worldBossCombatPriority: true, quizEnabled: true, quizUnknown: 'guess', quizWebSearch: true, rebirthEnabled: false, rebirthMode: 'game', rebirthTarget: 100, rebirthWaitQuest: true, rebirthMaxPerRun: 1, autoSellEnabled: false, autoSellPct: 85, autoSellMinFree: 8, autoSellCooldown: 120, resumeAfterReload: true, continueEventsAfterTarget: true, watchdogReload: false, rewardDirectEnabled: true, rewardManualMode: true, rewardFreeSpin: false, dualRouteMode: 'auto' };
  // Chi luu cai dat tinh nang moi. Tu chuyen sinh MAC DINH TAT; bat bang tay o tab Chuyen sinh.
  const EXTRA_PREF_KEY='vl4_dt_v30_options_v1';
  function loadExtraPrefs() {
    try {
      const p=JSON.parse(localStorage.getItem(EXTRA_PREF_KEY)||'{}');
      if(p && typeof p==='object') {
        if([0,1,3].includes(p.bossPrepareMinutes))cfg.bossPrepareMinutes=p.bossPrepareMinutes;
        for(const key of ['tongKimHpPct','tongKimMpPct']){
          if(Number.isInteger(p[key])&&p[key]>=0&&p[key]<=100)cfg[key]=p[key];
        }
        if(typeof p.quizWebSearch==='boolean') cfg.quizWebSearch=p.quizWebSearch;
        if(typeof p.rebirthEnabled==='boolean') cfg.rebirthEnabled=p.rebirthEnabled;
        if(['game','custom'].includes(p.rebirthMode)) cfg.rebirthMode=p.rebirthMode;
        if(Number.isInteger(p.rebirthTarget)) cfg.rebirthTarget=Math.max(100,Math.min(500,p.rebirthTarget));
        if(typeof p.rebirthWaitQuest==='boolean') cfg.rebirthWaitQuest=p.rebirthWaitQuest;
        if([0,1,3,10].includes(p.rebirthMaxPerRun)) cfg.rebirthMaxPerRun=p.rebirthMaxPerRun;
        if(typeof p.autoSellEnabled==='boolean') cfg.autoSellEnabled=p.autoSellEnabled;
        if([70,80,85,90,95].includes(p.autoSellPct)) cfg.autoSellPct=p.autoSellPct;
        if([3,5,8,10,15].includes(p.autoSellMinFree)) cfg.autoSellMinFree=p.autoSellMinFree;
        if([60,120,300,600].includes(p.autoSellCooldown)) cfg.autoSellCooldown=p.autoSellCooldown;
        if(['auto','command','ui'].includes(p.dualRouteMode))cfg.dualRouteMode=p.dualRouteMode;
        for (const k of ['partyFollowWorld','partyWorldChat','partyWaitEnabled','daTauPaused','resumeAfterReload','continueEventsAfterTarget','watchdogReload','rewardDirectEnabled','rewardManualMode','rewardFreeSpin','bossPositionEnabled','tongKimEnabled','tongKimCombatEnabled','partyInviteEnabled','partyPreferChannel','partyLeaveOtherMap','partyKickAway','rangedHoldEnabled'])
          if (typeof p[k]==='boolean') cfg[k]=p[k];
      }
    } catch(_) {}
  }
  function saveExtraPrefs() {
    try { localStorage.setItem(EXTRA_PREF_KEY,JSON.stringify({
      partyFollowWorld:cfg.partyFollowWorld,partyWorldChat:cfg.partyWorldChat,partyWaitEnabled:cfg.partyWaitEnabled,bossPrepareMinutes:cfg.bossPrepareMinutes,
      quizWebSearch:cfg.quizWebSearch, rebirthEnabled:cfg.rebirthEnabled,
      rebirthMode:cfg.rebirthMode,rebirthTarget:cfg.rebirthTarget,
rebirthWaitQuest:cfg.rebirthWaitQuest,rebirthMaxPerRun:cfg.rebirthMaxPerRun,
      autoSellEnabled:cfg.autoSellEnabled,autoSellPct:cfg.autoSellPct,
      autoSellMinFree:cfg.autoSellMinFree,autoSellCooldown:cfg.autoSellCooldown,
      daTauPaused:cfg.daTauPaused,resumeAfterReload:cfg.resumeAfterReload,continueEventsAfterTarget:cfg.continueEventsAfterTarget,watchdogReload:cfg.watchdogReload,
      rewardDirectEnabled:cfg.rewardDirectEnabled,rewardManualMode:cfg.rewardManualMode,rewardFreeSpin:cfg.rewardFreeSpin,dualRouteMode:cfg.dualRouteMode,bossPositionEnabled:cfg.bossPositionEnabled,tongKimEnabled:cfg.tongKimEnabled,tongKimCombatEnabled:cfg.tongKimCombatEnabled,tongKimHpPct:cfg.tongKimHpPct,tongKimMpPct:cfg.tongKimMpPct,partyInviteEnabled:cfg.partyInviteEnabled,partyPreferChannel:cfg.partyPreferChannel,partyLeaveOtherMap:cfg.partyLeaveOtherMap,partyKickAway:cfg.partyKickAway,rangedHoldEnabled:cfg.rangedHoldEnabled
    })); } catch(_) {}
  }
  loadExtraPrefs();
  const st = { running: false, questActive: true, busy: false, completed: 0, baseStep: null, lastReborns:0, softUntil:0, softFault:'', softTries:0,
    action: '', actionAt: 0, checkpoint: '', fieldHave: null, fieldAt: 0, levelMode: '',
    status: 'San sang', logs: [], chosenZone: null,
    lastTown: null, recoveryAt: 0, recoveryAttempts: 0, zoneRetryAt: 0,
    recoveryStatus: '', recoveryStep: null, map: { failures: {}, requested: null, lastZone: '', noProgressAt: 0, noProgressHave: null, questStep: null, reportAt: 0, rotations: 0 }, minimized: false, startup: 'pending', startupAt: 0, startupJob: null, startupOnce: false, boss: { phase: 'idle', slot: '', requestedAt: 0, joinedAt: 0, lastPoll: 0, lastJoin: 0, joinTries: 0, cooldownAt: 0, finished: {}, wasRunning: false, lastMessage: '', deathAt: 0, reentries: 0, hadJoined: false, joiningSince: 0, lastArenaAt: 0, lastRecoveryLog: 0, lastStatusAt: 0, lastStatusLogAt: 0, lastDamage: 0, bestRank: null, bossName: '', bossHp: null, bossMax: null, participantCount: null, endAt: 0, waitReason: '', lastWaitLog: 0, rejectedSince: 0, downInsideAt: 0 }, channel: { key: '', done: false, pending: 0, sentAt: 0, enteredAt: 0, tries: 0, label: '' } };
  const diag = { records: [], max: 900, errors: 0 };
  const netState = { offlineAt: 0, resumeAt: 0, warningAt: 0, reconnects: 0 };
  const townFlow = { request: null };
  const worldCombat = { saved: null }; // giu prio/chase truoc Boss, khoi phuc khi roi
  const startupField = { step:null, zone:'', kind:'', active:false, reported:false };
  const quizRun = { day:'', answered:new Set(), learned:new Set(), results:new Set(), lastState:'', lastError:0 };
  const quizWeb = { event:'', status:'idle', index:-1, confidence:0, evidence:'', source:'', abort:null, attempts:0 };
  const questReborn = { blockedAction:'', waitLevel:0, until:0, noDataAt:0,
    lastInfo:'Chưa kiểm tra quyền nhận Dã Tẩu cấp thấp sau chuyển sinh', rejected:0 };
  // v1.0: action router. Two independent ENTRY PATHS when verified in game source:
  // command (cmd) and actual DOM button callback. Never dispatch both in one attempt.
  // Auto alternates on genuine server-ACK retries; no immediate double sending.
  const dual = {last:{},counts:{command:0,ui:0,unavailable:0},history:[],max:120};
  const DUAL_CAPABILITIES={
    quest:['qc','NPC Da Tau #qcTake / [data-qcp]'],
    questSkip:['qc:skip','vlQcWin/vlQcDraw → #qcSkip (có phí, một lần/reset)'],
    zone:['zone','Native pcZone / zrow buttons mapped through ZONES index'],
    channel:['ch','[data-vch] or panelOpen(map) [data-ch]'],
    tongKim:['tk:join','NPC tong_kim / vlTkWin → #tkJoin'],
    tongKimTarget:['tgt','vlTkClick trên đối thủ khác phe'],
    worldBoss:['wb:join','wbWin #wbGo'],
    quiz:['qz:ans','qzDraw [data-qa]'],
    rebirth:['reset','rebornWin #rbGo double confirmation'],
    selling:['native #slFilter','sellModal #slFilter; full game filter list'],
    reward:['dy/wq','giftWin/wqWin claim buttons'],
    freeSpin:['dy:spin (ONLY spin=0)','giftWin(spin) #dySpin ONLY when label says Quay miễn phí'],
    town:['town:go=1 via goTown','Game town control when present'],
    powerSave:['vlAfkOn/vlAfkOff','Game overlay control when available'],
    combat:['opt:auto + sendCfg','Game Auto toggle when verified'],
    questBoss:['tgt','Target clicking when game exposes target UID'],
    status:['server state snapshot','Visible panel only; not an alternate server authority'],
    quick:['window opener','Actual built-in menu button when identifiable']
  };
  function dualLog(kind,way,reason=''){
    dual.last[kind]={way,at:Date.now(),reason};
    if(way in dual.counts)dual.counts[way]++;
    dual.history.push({kind,way,at:Date.now(),reason});
    if(dual.history.length>dual.max)dual.history.shift();
    if(way==='unavailable')diagnostic('DUAL_UI','No safe UI route: '+kind+' '+reason);
  }
  // UI actions MUST use an enabled element that belongs to the game, not Auto panel.
  function clickGame(button){
    if(!button || !button.isConnected || button.disabled || button.closest('#vl4-dt-panel'))return false;
    if(button.hidden || button.closest('[hidden]'))return false;
    const cs=typeof getComputedStyle==='function' ? getComputedStyle(button) : null;
    if(cs && (cs.display==='none'||cs.visibility==='hidden'))return false;
    button.click(); return true;
  }
  function dualExecute(kind,attempt,commandAction,uiAction){
    const pref=cfg.dualRouteMode;
    // In automatic mode first request uses command, second request only AFTER a
    // separate ACK timeout may use UI. This guards against duplicate rewards.
    const preferUi=pref==='ui' || (pref==='auto' && Number(attempt)>1 && Number(attempt)%2===0);
    const paths=preferUi?['ui','command']:['command','ui'];
    for(const way of paths){
      // In forced mode don't silently override user preference.
      if(pref==='ui' && way==='command')break;
      if(pref==='command' && way==='ui')break;
      try{
        if(way==='ui' && typeof uiAction==='function' && uiAction()===true){dualLog(kind,'ui');return 'ui';}
        if(way==='command' && typeof commandAction==='function' && commandAction()!==false){dualLog(kind,'command');return 'command';}
      }catch(e){diagnostic('DUAL_FAIL',kind+' '+way+': '+String(e?.message||e));}
    }
    dualLog(kind,'unavailable',pref);
    return null;
  }
  function uiQuest(action,option){
    if(typeof vlNpcOpen!=='function'||typeof NPCS==='undefined')return false;
    const npc=NPCS.find(x=>x.k==='da_tau');if(!npc)return false;
    // Only NPC entry grants the right to take/claim; menu-only quest windows are read-only.
    vlNpcOpen(npc);
    const entry=[...document.querySelectorAll('#mBody button[data-i]')].find(x=>x.dataset.i==='0');
    if(entry&&!clickGame(entry))return false;
    if(!entry && typeof vlQcDraw==='function')return false;
    const selector=action==='take'?'#qcTake':('[data-qcp="'+String(option)+'"], [data-qp="'+String(option)+'"]');
    return clickGame(document.querySelector('#mBody '+selector));
  }
  function gamePointer(button){
    if(!button || !button.isConnected || button.disabled || button.closest('#vl4-dt-panel'))return false;
    const evt=typeof PointerEvent==='function' ? new PointerEvent('pointerdown',{bubbles:true,cancelable:true})
       : new MouseEvent('pointerdown',{bubbles:true,cancelable:true});
    button.dispatchEvent(evt);return true;
  }
  function uiTown(){
    // bridge controls #bTp via pointerdown, NOT click.
    return gamePointer(document.getElementById('bTp'));
  }
  function uiPowerSave(on){
    if(on)return clickGame(document.getElementById('vlAfk'));
    // bgrun.js afk overlay: pointerdown anywhere except its Chat button exits.
    const overlay=document.getElementById('afk');
    if(overlay&&!overlay.classList.contains('hidden'))return gamePointer(overlay);
    const old=document.getElementById('vlAfkO');
    return !!old&&!old.classList.contains('hidden')&&clickGame(old);
  }
  function combatControl(){
    const native=document.getElementById('ctrlBtn');
    if(native?.isConnected&&!native.disabled)return native;
    const root=document.getElementById('autoWrap');
    if(!root)return null;
    const nodes=[...root.querySelectorAll('button,input[type="checkbox"],[role="switch"],label,.sw,[role="button"],[onclick],.switch,.toggle')]
      .filter(el=>el.isConnected&&!el.disabled&&!el.closest('#vl4-dt-panel'));
    const label=el=>String(el.getAttribute('aria-label')||el.textContent||el.title||'').trim().replace(/\s+/g,' ');
    let el=nodes.find(el=>/^auto(?:\s*(?:on|off|bật|tắt))?$/i.test(label(el)));
    if(el?.tagName==='LABEL')el=el.control||el.querySelector('input[type="checkbox"]')||el;
    if(!el){const switches=nodes.filter(el=>el.matches('input[type="checkbox"],[role="switch"],.sw'));if(switches.length===1)el=switches[0];}
    return el||null;
  }
  function combatButtonState(button=combatControl()){
    if(!button)return null;
    if(button.id==='ctrlBtn'){
      if(/^Đang Auto:/.test(button.title||''))return true;
      if(/^Đang tự điều khiển:/.test(button.title||''))return false;
    }
    if(button.tagName==='INPUT'&&button.type==='checkbox')return !!button.checked;
    const probe=[button,...button.querySelectorAll('input[type="checkbox"],[role="switch"],.sw')];
    for(const el of probe){
      if(el.tagName==='INPUT'&&el.type==='checkbox')return !!el.checked;
      for(const key of ['aria-checked','aria-pressed','data-on','data-checked']){
        const value=el.getAttribute(key);
        if(value==='true'||value==='1')return true;
        if(value==='false'||value==='0')return false;
      }
    }
    const sw=probe.find(el=>el.matches('.sw,[role="switch"]'));
    if(sw)return sw.classList.contains('on');
    if(button.classList.contains('on')||button.classList.contains('active')||button.classList.contains('is-on'))return true;
    if(button.classList.contains('off')||button.classList.contains('is-off'))return false;
    return null; // unknown representation is not an OFF signal
  }
  function uiCombat(desired){
    const button=combatControl(),shown=combatButtonState(button);
    // Use the real master control before touching AU().fight. Its handler also
    // updates related game state and redraws the switch.
    if(button&&shown!==null){
      if(shown!==!!desired){
        if(!clickGame(button))return false;
        return combatButtonState(button)===!!desired&&combatEnabled()===!!desired;
      }
      // ctrlBtn owns S.ctrl, not AU().fight. Once the master is settled,
      // use the separate native fight switch on the next synchronization pass.
      if(combatEnabled()===!!desired)return true;
    }
    if(button&&shown===null&&combatEnabled()!==!!desired){
      if(!clickGame(button))return false;
      return combatEnabled()===!!desired;
    }
    if(combatEnabled()===!!desired)return true;
    if(typeof autoModal!=='function')return false;
    autoModal();
    const toggle=[...document.querySelectorAll('#mBody [data-sw]')].find(b=>b.dataset.sw==='fight');
    if(!clickGame(toggle))return false;
    return combatEnabled()===!!desired;
  }

  function uiZone(id){
    // VL4 removes map from PANEL.tabs. Its actual map controls use ZONES
    // indexes, not server map IDs (bridge.js gotoStage / pc.js pcZone).
    const zones=typeof ZONES!=='undefined'&&Array.isArray(ZONES)?ZONES:null;
    const index=zones?zones.findIndex(z=>String(z.id)===String(id)):-1;
    if(index<0)return false;
    const shown=el=>!!el&&el.isConnected&&!el.disabled&&!el.hidden&&
      !el.closest('[hidden],#vl4-dt-panel')&&el.getClientRects().length>0&&
      getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
    const select=document.getElementById('pcZone');
    const option=select&&[...select.options].find(o=>String(o.value)===String(index)&&!o.disabled);
    if(option&&shown(select)){
      select.value=String(index);
      // Execute the game's real onchange handler, including same-value retries;
      // dispatch success is a request only; changeZone still waits for zone ACK.
      select.dispatchEvent(new Event('change',{bubbles:true}));return true;
    }
    const findButton=selector=>[...document.querySelectorAll(selector)]
      .find(el=>Number(el.dataset.z)===index&&shown(el));
    let button=findButton('#t-log button.zrow[data-z],#mBody .vlxp button.zrow[data-z]');
    if(button)return clickGame(button);
    if(typeof vlXaPhu!=='function')return false;
    vlXaPhu();
    button=findButton('#mBody .vlxp button.zrow[data-z]');
    return !!button&&clickGame(button);
  }
  function uiChannel(id){
    let button=[...document.querySelectorAll('button[data-vch]')].find(x=>Number(x.dataset.vch)===Number(id)&&!x.disabled);
    if(!button && typeof panelOpen==='function'){
      panelOpen('map');
      button=[...document.querySelectorAll('#mBody button[data-ch],#mBody button[data-vch]')]
        .find(x=>Number(x.dataset.ch??x.dataset.vch)===Number(id)&&!x.disabled);
    }
    return clickGame(button);
  }
  function uiWorldBossJoin(){
    if(typeof wbWin!=='function')return false;
    wbWin(); return clickGame(document.getElementById('wbGo'));
  }
  function quizNativePanel(m){
    if(!m || typeof document?.getElementById!=='function')return null;
    const panel=document.getElementById('qzBox');
    if(!panel || qNorm(panel.querySelector('.qq')?.textContent)!==qNorm(m.q))return null;
    const heading=String(panel.querySelector('h4')?.textContent||'');
    const round=heading.match(/câu\s+(\d+)\s*\/\s*(\d+)/i);
    if(!round || Number(round[1])!==Number(m.i)+1 || Number(round[2])!==Number(m.n))return null;
    const buttons=[...panel.querySelectorAll('[data-qa]')];
    if(buttons.length!==m.c?.length)return null;
    if(buttons.some((b,i)=>Number(b.dataset.qa)!==i ||
      qNorm(String(b.textContent||'').replace(/^[A-Z]\.\s*/,''))!==qNorm(m.c[i])))return null;
    return panel;
  }
  function quizNativePick(m){
    const panel=quizNativePanel(m);
    if(!panel)return null;
    const selected=[...panel.querySelectorAll('[data-qa].bj')];
    if(selected.length!==1)return null;
    const index=Number(selected[0].dataset.qa);
    return Number.isInteger(index)&&index>=0&&index<m.c.length?index:null;
  }
  function uiQuizAnswer(index,questionIndex){
    // VL4 qzDraw is private to vlwin.js. The global legacy qzDraw can hide
    // the real panel; never call it to prepare a VL4 answer.
    const q=quizClient();
    if(!q?.m || Number(q.m.i)!==Number(questionIndex) || q.m.open!==1)return false;
    const panel=quizNativePanel(q.m);
    if(!panel || quizNativePick(q.m)!==null)return false;
    return clickGame([...panel.querySelectorAll('[data-qa]')]
      .find(x=>Number(x.dataset.qa)===Number(index)));
  }
  function uiRebirth(){
    if(typeof rebornWin!=='function')return false;
    rebornWin();
    let button=document.getElementById('rbGo');
    if(!button||button.disabled||!clickGame(button))return false;
    // Game first click arms the exact same button for 3 seconds; second click
    // is the true confirmation, matching the UI protocol (not a synthetic cmd).
    button=document.getElementById('rbGo');
    if(!button || button.disabled || !/chắc chắn/i.test(button.textContent||''))return false;
    return clickGame(button);
  }
  function uiSellExact(plan){
    if(typeof sellModal!=='function'||typeof sellFilterList!=='function')return false;
    sellModal();
    try{
      // Keep the native filter's complete UID list; never replace it with sell-all.
      const all=sellFilterList();
      if(!Array.isArray(all)||all.length===0||all.length!==plan.ids.length)return false;
      const a=all.map(itemId).sort((x,y)=>x-y),b=plan.ids.slice().sort((x,y)=>x-y);
      if(a.some((id,i)=>!id||id!==b[i]))return false;
      const button=document.getElementById('slFilter');
      if(!button||!/bán theo lọc/i.test(button.textContent||''))return false;
      return clickGame(button);
    }finally{
      // Only this synchronously opened sell window is ours. A different panel is untouched.
      if(document.getElementById('slFilter')&&typeof closeModal==='function')closeModal();
    }
  }

  function dualStatus(){return {mode:cfg.dualRouteMode,capabilities:DUAL_CAPABILITIES,last:{...dual.last},counts:{...dual.counts},recent:dual.history.slice(-15)};}
  function questEligible(s) {
    return !!s && (s.level >= MIN_DA_TAU_LEVEL || s.reborns > 0);
  }
  // Native game owns movement while levelling before the first rebirth, and
  // while finishing the quest inherited from a rebirth. Persist the exact step:
  // a newly accepted quest must return to the normal S4 controller.
  const nativeQuest = {identity:'', record:null, mode:'', active:false, savedZone:null,
    lastZoneSend:0, status:'Auto S4 đang điều khiển Dã Tẩu'};
  function nativeQuestKey(){return 'auto_s4_native_quest_v1:'+charIdentity();}
  function saveNativeQuest(){
    try{const value=JSON.stringify(nativeQuest.record);localStorage.setItem(nativeQuestKey(),value);return localStorage.getItem(nativeQuestKey())===value;}catch(_){return false;}
  }
  function nativeQuestMode(s){
    if(!s || !Number.isFinite(s.level) || s.level<1)return '';
    if(!s.reborns && s.level<MIN_DA_TAU_LEVEL)return 'under40';
    const r=nativeQuest.record;
    if(s.reborns>0 && r?.reset===s.reborns){
      if(s.q && s.level<MIN_DA_TAU_LEVEL && (!s.took || (!r.active&&s.took&&s.have<s.need)))return 'reborn-training';
      if(r.pending && !s.q)return 'reborn-sync';
      if(r.active && s.q && s.took && s.need<=0)return 'reborn-sync';
      if(r.active && (!s.q || (s.took && s.step===r.step && s.need>0 && s.have<s.need)))return 'inherited';
    }
    return '';
  }
  function updateNativeQuest(s){
    const identity=charIdentity();
    if(nativeQuest.identity!==identity){
      nativeQuest.identity=identity;nativeQuest.record=null;
      try{
        const r=JSON.parse(localStorage.getItem(nativeQuestKey())||'null');
        if(r && Number.isInteger(r.reset) && r.reset>=0 && typeof r.active==='boolean')nativeQuest.record=r;
      }catch(_){}
    }
    if(!s || !Number.isFinite(s.reborns))return '';
    let r=nativeQuest.record;
    if(!r || s.reborns>r.reset){
      nativeQuest.record=r={reset:s.reborns,step:s.q?s.step:null,pending:s.reborns>0&&!s.q,
        active:s.reborns>0&&!!s.q&&s.took&&s.need>0&&s.have<s.need};
      saveNativeQuest();
    }else if(s.reborns===r.reset && r.pending && s.q){
      r.pending=false;r.step=s.step;r.active=s.took&&s.need>0&&s.have<s.need;saveNativeQuest();
    }
    if(s.reborns===r.reset && r.active && s.q &&
       (s.step!==r.step || !s.took || (s.need>0&&s.have>=s.need))){
      r.active=false;r.pending=false;saveNativeQuest();
    }
    // During a missing/invalid quest snapshot after rebirth, do not guess that
    // the inherited quest completed and start sending town/quest commands.
    if(s.reborns===r.reset && r.active && s.q && s.took && s.need<=0)return 'reborn-sync';
    return nativeQuestMode(s);
  }
  function inheritedHighQuest(s){
    const r=nativeQuest.record;
    if(!r?.active || r.reset!==s.reborns || !s.reborns || !s.q || !s.took ||
       s.need<=0 || s.have>=s.need || s.level>=80 || r.step!==s.step)return false;
    const plain=normalize(s.text).match(/\b(?:quai|thu)\s+(?:co\s+)?(?:cap|lv|level)\s+(\d+)/);
    const minimum=questMinLevel(s.text)??(plain?Number(plain[1]):null);
    if(questKind(s.text)==='kill' && Number.isFinite(minimum) && minimum>=80)return true;
    const place=questPlace(s.text);
    if(!place || typeof W==='undefined' || !Array.isArray(W.zones))return false;
    return W.zones.some(z=>normalize(z.n)===place && Number(z.lo)>=80);
  }
  function inheritedQuestSignature(s){return JSON.stringify([s.step,s.took,s.q?.kind,s.need]);}
  function uiSkipInheritedQuest(){
    if(typeof vlQcWin==='function')vlQcWin();
    else if(typeof vlQcDraw==='function')vlQcDraw();
    else return false;
    const b=document.querySelector('#mBody #qcSkip');
    if(!b || b.disabled)return false;
    return clickGame(b);
  }
  function skipInheritedQuestTick(s){
    const r=nativeQuest.record;if(!r || r.reset!==s.reborns)return false;
    if(r.skipSent){
      const left=Number(s.info?.left);
      if(s.q && (inheritedQuestSignature(s)!==r.skipBefore ||
          (Number.isFinite(left)&&left<r.skipLeft))){
        r.skipSent=false;r.skipConfirmed=true;r.active=false;r.pending=false;
        saveNativeQuest();nativeQuest.status='Máy chủ xác nhận đã đổi nhiệm vụ sau chuyển sinh';
        diagnostic('REBORN_SKIP','Máy chủ xác nhận đổi nhiệm vụ',{reset:r.reset,step:s.step});
      }else nativeQuest.status='Đã gửi đổi nhiệm vụ một lần; chờ máy chủ, không gửi lại';
      return false;
    }
    if(cfg.daTauPaused || !inheritedHighQuest(s) || r.skipUsed)return false;
    const price=Number(s.info?.skip),left=Number(s.info?.left),gold=Number(s.gold);
    if(s.info?.skip==null || !Number.isSafeInteger(price)||price<0||!Number.isFinite(left)||left<=0||!Number.isFinite(gold)||gold<price){
      nativeQuest.status='Nhiệm vụ ≥80: chờ giá/lượt đổi hợp lệ hoặc đủ lượng; game tiếp tục luyện';return false;
    }
    if(!isOnline() || typeof R!=='undefined'&&Number(R.deadT)>0)return false;
    r.skipUsed=true;r.skipSent=true;r.skipBefore=inheritedQuestSignature(s);r.skipLeft=left;r.skipPrice=price;
    if(!saveNativeQuest()){r.skipSent=false;r.skipError='Không lưu được giới hạn đổi; chưa gửi';return false;} // Never spend without a durable one-shot guard.
    try{
      const way=dualExecute('questSkip',1,()=>cmd('qc',{a:'skip'}),uiSkipInheritedQuest);
      if(!way){r.skipSent=false;r.skipError='Không có đường đổi nhiệm vụ';saveNativeQuest();return false;}
      diagnostic('REBORN_SKIP','Gửi đổi nhiệm vụ tối đa một lần sau chuyển sinh',{reset:r.reset,price,way});
      if(typeof closeQuestModal==='function')closeQuestModal();
    }catch(e){r.skipError=String(e.message);saveNativeQuest();}
    return true;
  }
  function releaseNativeQuest(s=null){
    if(!nativeQuest.active)return;
    const saved=nativeQuest.savedZone,a=combatConfig();
    if(saved && saved.identity===charIdentity() && a){
      a.zone=saved.zone;
      if(typeof S!=='undefined'&&S.opt)S.opt.zoneAuto=saved.zone?1:0;
      if(isOnline()&&typeof cmd==='function')cmd('opt',{k:'zoneAuto',v:saved.zone?1:0});
    }
    nativeQuest.active=false;nativeQuest.mode='';nativeQuest.savedZone=null;
    if(s){st.lastTown=s.town;st.zoneRetryAt=0;st.recoveryAt=0;st.action='';st.map.requested=null;
      st.channel.key='';st.channel.pending=0;st.channel.done=false;st.chosenZone=null;}
    nativeQuest.status='Đã trả quyền Dã Tẩu cho Auto S4';
    diagnostic('NATIVE_QUEST','Kết thúc nhường quyền; kiểm tra nhận/trả theo tiến độ máy chủ');
  }
  function nativeQuestTick(s,mode){
    if(!mode){releaseNativeQuest(s);return false;}
    if(!nativeQuest.active){
      restoreGameZoneAuto();restoreQuestBossPriority();restoreRangedPolicy();
      const player=typeof VL!=='undefined'?bossMapPoint(VL.ents?.get?.(VL.meU)):null;
      stopOwnedBossMove(player);clearBossApproach('Nhường di chuyển cho auto game');
      clearTownRecovery();resetBossHunt();resetFieldSafety();
      const a=combatConfig();
      nativeQuest.savedZone={identity:charIdentity(),zone:!!a?.zone||!!(typeof S!=='undefined'&&S.opt?.zoneAuto)};
      nativeQuest.active=true;nativeQuest.lastZoneSend=0;
      st.action='';st.map.requested=null;townFlow.request=null;st.zoneRetryAt=0;
      st.recoveryAt=0;st.recoveryAttempts=0;st.recoveryStatus='';st.fieldAt=0;
      st.softUntil=0;st.softFault='';st.channel.pending=0;st.channel.done=false;st.chosenZone=null;
      combatSync.forceSync=true;
      diagnostic('NATIVE_QUEST','Nhường di chuyển và đánh quái cho auto game',{mode,reset:s.reborns,step:s.step});
    }
    nativeQuest.mode=mode;
    const a=combatConfig(),now=Date.now();
    if(a && (!a.zone || !(typeof S!=='undefined'&&S.opt?.zoneAuto)) &&
       (!nativeQuest.lastZoneSend || now-nativeQuest.lastZoneSend>=5000)){
      a.zone=true;if(typeof S!=='undefined'&&S.opt)S.opt.zoneAuto=1;
      if(isOnline()&&typeof cmd==='function')cmd('opt',{k:'zoneAuto',v:1});
      nativeQuest.lastZoneSend=now;
    }
    // Keep the native Auto master/fight switch enabled, including in Ba Lang.
    syncCombatAuto(s);
    ensureChannelSelection({...s,town:false}); // Include Ba Lang; never call ensureChannel(): it also moves toward Bosses.
    nativeQuest.status=mode==='paused'?'Dã Tẩu tạm dừng nhận/trả · game tự luyện, S4 chọn kênh':mode==='under40'?'Chưa chuyển sinh, cấp dưới 40: game tự luyện cấp; dừng thao tác Dã Tẩu':
      mode==='reborn-training'?'Sau chuyển sinh, chưa có Dã Tẩu: game tự luyện đến cấp 40; S4 chọn kênh':
      mode==='reborn-sync'?'Sau chuyển sinh: game tự luyện; chờ tiến độ Dã Tẩu từ máy chủ':
      'Game tự di chuyển và đánh: chờ Dã Tẩu '+s.step+' hoàn thành ('+s.have+'/'+s.need+')';
    st.status=nativeQuest.status+(nativeQuest.record?.skipSent?' · Đã gửi đổi một lần, chờ máy chủ':nativeQuest.record?.skipError?' · '+nativeQuest.record.skipError:'');st.lastTown=s.town;
    return true;
  }
  function worldBossEligible(s, status) {
    if (!s || !Number.isFinite(s.level) || s.level < 1) return false;
    const minimum = status && Number.isFinite(Number(status.minLv)) && Number(status.minLv) > 0
      ? Math.max(MIN_WORLD_BOSS_LEVEL, Number(status.minLv)) : MIN_WORLD_BOSS_LEVEL;
    return s.reborns > 0 || s.level >= minimum;
  }
  function questRebornBlocked(s) {
    if (!s || !s.reborns || !questReborn.blockedAction) return false;
    const action = !s.took ? 'take' : (s.need > 0 && s.have >= s.need ? 'claim' : '');
    if (action !== questReborn.blockedAction) return false;
    if (questReborn.waitLevel && s.level >= questReborn.waitLevel) {
      questReborn.blockedAction='';questReborn.waitLevel=0;questReborn.until=0;
      questReborn.lastInfo='Đã đạt cấp thử lại Dã Tẩu, đang kiểm tra máy chủ';
      diagnostic('REBORN_QUEST','Thử lại sau khi đủ cấp',{lv:s.level,reborn:s.reborns});
      return false;
    }
    if (questReborn.until && Date.now() >= questReborn.until) {
      questReborn.blockedAction='';questReborn.until=0;
      return false;
    }
    return true;
  }
  function questRebornDefer(s, action) {
    questReborn.blockedAction=action;questReborn.rejected++;questReborn.noDataAt=0;
    const next=REBORN_QUEST_RETRY_LEVELS.find(l=>l>s.level);
    questReborn.waitLevel=next||0;
    questReborn.until=next?0:Date.now()+10*60*1000;
    questReborn.lastInfo='Máy chủ chưa xác nhận '+action+
      (next?'; luyện đến cấp '+next+' rồi thử lại':'; chờ 10 phút rồi kiểm tra lại');
    st.action='';st.ackFailures=0;st.fieldAt=0;st.map.requested=null;
    diagnostic('REBORN_QUEST',questReborn.lastInfo,{lv:s.level,reborn:s.reborns,action});
    say('☯️ '+questReborn.lastInfo+'. Vẫn luyện cấp và tham gia Boss Thế Giới nếu đủ điều kiện.');
  }
  const rebirth = { phase:'idle', before:0, prevLevel:0, sentAt:0, startedAt:0,
    retries:0, count:0, lastError:'', lastStatus:'Chưa kích hoạt', lastLogAt:0 };

  const quizHook = { originalState:null, wrapperState:null, originalRes:null, wrapperRes:null };
  // Receive quiz frames without altering the game's existing WebSocket handlers.
  // This also works if Tampermonkey cannot access the page's lexical QZ/qzState.
  const quizWire = { m:null, at:0, pick:{}, res:{}, ws:null, listener:null,
    seen:0, questions:0, results:0, announced:0, duplicates:0, wsHits:0, dispatchHits:0,
    lastPacket:'',lastPacketAt:0,lastSource:'',lastAt:0,lastOpen:null,lastQuestion:'',
    lastIssue:'Chưa nhận tin qz từ máy chủ' };
  // Two independent paths: game gsMsg (works immediately after reconnect) and
  // WebSocket message listener (works when game lexical hooks are unavailable).
  // Both may receive the SAME frame: deduplicate without dropping new questions.
  function quizOnMessageParsed(msg, source='ws') {
    if(!msg || (msg.t!=='qz'&&msg.t!=='qzr'))return false;
    const now=Date.now();
    const packet=JSON.stringify([msg.t,msg.open,msg.i,msg.q,msg.c,msg.ok,msg.right,msg.gold,msg.fd,msg.xp,msg.msg,msg.end,msg.now]);
    if(quizWire.lastPacket===packet && now-quizWire.lastPacketAt<2500){
      quizWire.duplicates++;return true;
    }
    if(typeof auditMessage==='function')auditMessage(msg);
    quizWire.lastPacket=packet;quizWire.lastPacketAt=now;
    quizWire.lastSource=source;quizWire.seen++;quizWire.lastAt=now;
    if(msg.t==='qz'){
      quizWire.m=msg;quizWire.at=now;quizWire.lastOpen=msg.open;
      if(msg.open===1 && typeof msg.q==='string' && Array.isArray(msg.c)){
        quizWire.questions++;
        quizWire.lastQuestion=msg.q.slice(0,130);
        quizWire.lastIssue='Đã nhận câu hỏi qua '+source+'; đang xử lý';
        diagnostic('QUIZ_RX','Nhận câu Hoa Đăng',
          {source,i:msg.i,n:msg.n,open:msg.open,question:quizWire.lastQuestion,choices:msg.c.length});
      }else if(msg.open===2){
        quizWire.announced++;
        quizWire.lastIssue='Máy chủ công bố đáp án câu '+(Number(msg.i)+1);
        diagnostic('QUIZ_RX','Máy chủ công bố đáp án',{source,i:msg.i,ok:msg.ok});
      }else if(msg.open===0){
        quizWire.lastIssue='Sự kiện Hoa Đăng đã kết thúc';
        abortQuizWeb();
        diagnostic('QUIZ_RX','Máy chủ kết thúc Hoa Đăng',{source});
      }else quizWire.lastIssue='Tin qz chưa có câu hỏi (open='+msg.open+')';
    }else{
      quizWire.results++;
      if(!msg.msg && msg.i!=null && msg.right!=null)quizWire.res[msg.i]=msg.right;
      quizWire.lastIssue=msg.msg?'Máy chủ trả lời: '+String(msg.msg).slice(0,110):
        'Máy chủ xác nhận câu '+(Number(msg.i)+1)+': '+(msg.right?'ĐÚNG':'SAI');
    }
    // Trigger on arrival: Android can throttle setInterval while backgrounded.
    try{quizTick();}catch(e){diagnostic('QUIZ','Lỗi xử lý sự kiện: '+String(e?.message||e));}
    return true;
  }
  function quizWireOnMessage(ev){
    if(typeof ev?.data!=='string')return;
    let msg;try{msg=JSON.parse(ev.data);}catch(_){return;}
    if(msg && (msg.t==='qz'||msg.t==='qzr'))quizWire.wsHits++;
    quizOnMessageParsed(msg,'ws');
  }
  function installQuizWire() {
    try {
      const ws=typeof NET!=='undefined' ? NET?.ws : null;
      if (ws===quizWire.ws) return;
      if(quizWire.ws && quizWire.listener)quizWire.ws.removeEventListener('message',quizWire.listener);
      quizWire.ws=null;quizWire.listener=null;
      if(ws && typeof ws.addEventListener==='function') {
        ws.addEventListener('message',quizWireOnMessage);
        quizWire.ws=ws;quizWire.listener=quizWireOnMessage;
        diagnostic('QUIZ_RX','Đã đăng ký lắng nghe WebSocket Hoa Đăng');
      }
    } catch(e) {quizWire.lastIssue='Không gắn được WebSocket: '+String(e?.message||e);}
  }
  function uninstallQuizWire() {
    try {if(quizWire.ws && quizWire.listener)quizWire.ws.removeEventListener('message',quizWire.listener);}catch(_){}
    quizWire.ws=null;quizWire.listener=null;
  }
  const QUIZ_BANK_KEY = 'vl4_dt_hoa_dang_bank_v1';
  const BUNDLED_QUIZ_BANK = {"co bao nhieu con giap":{"answer":"12","question":"Có bao nhiêu con giáp?","saved":1793971807246,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-06.json"},"van long kich la chieu thuc cua phai nao":{"answer":"thien nhan","question":"Vân Long Kích là chiêu thức của phái nào?","saved":1793971831785,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-06.json"},"trong son ha xa tac noi mua tien thao lo va bi kip la":{"answer":"ky tran cac","question":"Trong Sơn Hà Xã Tắc, nơi mua Tiên Thảo Lộ và Bí Kíp là?","saved":1793971856903,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-06.json"},"dat ma do giang la chieu thuc cua phai nao":{"answer":"thieu lam","question":"Đạt Ma Độ Giang là chiêu thức của phái nào?","saved":1793971881515,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-06.json"},"theo ngu hanh tuong sinh kim sinh ra hanh nao":{"answer":"thuy","question":"Theo ngũ hành tương sinh, Kim sinh ra hành nào?","saved":1793971907289,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-06.json"},"su tu hong la chieu thuc cua phai nao":{"question":"Sư Tử Hống là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":20,"faction_key":"shaolin"},"saved":0},"hoanh tao thien quan la chieu thuc cua phai nao":{"question":"Hoành Tảo Thiên Quân là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":319,"faction_key":"shaolin"},"saved":0},"pha thien tram la chieu thuc cua phai nao":{"question":"Phá Thiên Trảm là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":322,"faction_key":"tianwang"},"saved":0},"truy tinh truc nguyet la chieu thuc cua phai nao":{"question":"Truy Tinh Trục Nguyệt là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":323,"faction_key":"tianwang"},"saved":0},"bao vu le hoa la chieu thuc cua phai nao":{"question":"Bạo Vũ Lê Hoa là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":302,"faction_key":"tangmen"},"saved":0},"cuu cung phi tinh la chieu thuc cua phai nao":{"question":"Cửu Cung Phi Tinh là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":342,"faction_key":"tangmen"},"saved":0},"am phong thuc cot la chieu thuc cua phai nao":{"question":"Âm Phong Thực Cốt là chiêu thức của phái nào?","answer":"ngu doc","aliases":["ngu doc giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":353,"faction_key":"wudu"},"saved":0},"doan can hu cot la chieu thuc cua phai nao":{"question":"Đoạn Cân Hủ Cốt là chiêu thức của phái nào?","answer":"ngu doc","aliases":["ngu doc giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":390,"faction_key":"wudu"},"saved":0},"tam nga te tuyet la chieu thuc cua phai nao":{"question":"Tam Nga Tề Tuyết là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":328,"faction_key":"emei"},"saved":0},"pho do chung sinh la chieu thuc cua phai nao":{"question":"Phổ Độ Chúng Sinh là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":332,"faction_key":"emei"},"saved":0},"bang tung vo anh la chieu thuc cua phai nao":{"question":"Băng Tung Vô ảnh là chiêu thức của phái nào?","answer":"thuy yen","aliases":["thuy yen mon"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":336,"faction_key":"cuiyan"},"saved":0},"bang tam tien tu la chieu thuc cua phai nao":{"question":"Băng Tâm Tiên Tử là chiêu thức của phái nào?","answer":"thuy yen","aliases":["thuy yen mon"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":337,"faction_key":"cuiyan"},"saved":0},"phi long tai thien la chieu thuc cua phai nao":{"answer":"cai bang","question":"Phi Long Tại Thiên là chiêu thức của phái nào?","saved":1794144630968,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-08.json"},"thien ha vo cau la chieu thuc cua phai nao":{"question":"Thiên Hạ Vô Cẩu là chiêu thức của phái nào?","answer":"cai bang","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":359,"faction_key":"gaibang"},"saved":0},"thien ngoai luu tinh la chieu thuc cua phai nao":{"question":"Thiên Ngoại Lưu Tinh là chiêu thức của phái nào?","answer":"thien nhan","aliases":["thien nhan giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":362,"faction_key":"tianren"},"saved":0},"nhiep hon loan tam la chieu thuc cua phai nao":{"question":"Nhiếp Hồn Loạn Tâm là chiêu thức của phái nào?","answer":"thien nhan","aliases":["thien nhan giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":391,"faction_key":"tianren"},"saved":0},"thien dia vo cuc la chieu thuc cua phai nao":{"question":"Thiên Địa Vô Cực là chiêu thức của phái nào?","answer":"vo dang","aliases":["vo dang phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":365,"faction_key":"wudang"},"saved":0},"nhan kiem hop nhat la chieu thuc cua phai nao":{"question":"Nhân Kiếm Hợp Nhất là chiêu thức của phái nào?","answer":"vo dang","aliases":["vo dang phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":368,"faction_key":"wudang"},"saved":0},"ngao tuyet tieu phong la chieu thuc cua phai nao":{"question":"Ngạo Tuyết Tiêu Phong là chiêu thức của phái nào?","answer":"con lon","aliases":["con lon phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":372,"faction_key":"kunlun"},"saved":0},"loi dong cuu thien la chieu thuc cua phai nao":{"question":"Lôi Động Cửu Thiên là chiêu thức của phái nào?","answer":"con lon","aliases":["con lon phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vltk/data.js","skill_id":375,"faction_key":"kunlun"},"saved":0},"theo ngu hanh tuong sinh thuy sinh ra hanh nao":{"question":"Theo ngũ hành tương sinh, Thủy sinh ra hành nào?","answer":"moc","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong sinh moc sinh ra hanh nao":{"question":"Theo ngũ hành tương sinh, Mộc sinh ra hành nào?","answer":"hoa","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong sinh hoa sinh ra hanh nao":{"question":"Theo ngũ hành tương sinh, Hỏa sinh ra hành nào?","answer":"tho","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong sinh tho sinh ra hanh nao":{"question":"Theo ngũ hành tương sinh, Thổ sinh ra hành nào?","answer":"kim","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"trong vong tuong sinh hanh nao sinh ra thuy":{"question":"Trong vòng tương sinh, hành nào sinh ra Thủy?","answer":"kim","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong khac kim khac hanh nao":{"question":"Theo ngũ hành tương khắc, Kim khắc hành nào?","answer":"moc","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong khac moc khac hanh nao":{"question":"Theo ngũ hành tương khắc, Mộc khắc hành nào?","answer":"tho","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong khac tho khac hanh nao":{"question":"Theo ngũ hành tương khắc, Thổ khắc hành nào?","answer":"thuy","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong khac thuy khac hanh nao":{"question":"Theo ngũ hành tương khắc, Thủy khắc hành nào?","answer":"hoa","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"theo ngu hanh tuong khac hoa khac hanh nao":{"question":"Theo ngũ hành tương khắc, Hỏa khắc hành nào?","answer":"kim","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"all_game_scripts.js","reference":"KHAC và vòng tương sinh trong mô tả ngũ hành trang bị"},"saved":0},"trong son ha xa tac co the mua que hoa tuu o dau":{"question":"Trong Sơn Hà Xã Tắc, có thể mua Quế Hoa Tửu ở đâu?","answer":"ky tran cac","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: luck"},"saved":0},"trong son ha xa tac co the mua tiem nang kinh o dau":{"question":"Trong Sơn Hà Xã Tắc, có thể mua Tiềm Năng Kinh ở đâu?","answer":"ky tran cac","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: book"},"saved":0},"trong son ha xa tac co the mua ruong than ma o dau":{"question":"Trong Sơn Hà Xã Tắc, có thể mua Rương Thần Mã ở đâu?","answer":"ky tran cac","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: mbbuy; VLNPC.ma_phu"},"saved":0},"trong son ha xa tac co the mua bi kip 8x o dau":{"question":"Trong Sơn Hà Xã Tắc, có thể mua Bí Kíp 8x ở đâu?","answer":"ky tran cac","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: lx; giao diện kỹ năng VL4"},"saved":0},"o ba lang huyen npc nao ban binh mau":{"question":"Ở Ba Lăng Huyện, NPC nào bán bình máu?","answer":"tap hoa","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.tap_hoa"},"saved":0},"o ba lang huyen npc nao ban binh noi luc":{"question":"Ở Ba Lăng Huyện, NPC nào bán bình nội lực?","answer":"tap hoa","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.tap_hoa"},"saved":0},"o ba lang huyen muon mua vu khi trang thi tim npc nao":{"question":"Ở Ba Lăng Huyện, muốn mua vũ khí trắng thì tìm NPC nào?","answer":"binh khi","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.binh_khi"},"saved":0},"o ba lang huyen muon mua ao giap thi tim npc nao":{"question":"Ở Ba Lăng Huyện, muốn mua áo giáp thì tìm NPC nào?","answer":"trang bi","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.trang_bi"},"saved":0},"o ba lang huyen npc nao mo noi mua ban vat pham giua nguoi choi":{"question":"Ở Ba Lăng Huyện, NPC nào mở nơi mua bán vật phẩm giữa người chơi?","answer":"cho","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.cho"},"saved":0},"o ba lang huyen muon cat ngua chua dung vao ma truong thi tim npc nao":{"question":"Ở Ba Lăng Huyện, muốn cất ngựa chưa dùng vào Mã trường thì tìm NPC nào?","answer":"ma phu","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.ma_phu"},"saved":0},"dao hu thien la chieu thuc cua phai nao":{"question":"Đảo Hư Thiên là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":708,"faction_key":"tianwang"},"saved":0},"dai thua nhu lai chu la chieu thuc cua phai nao":{"question":"Đại Thừa Như Lai Chú là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":709,"faction_key":"shaolin"},"saved":0},"me anh tung la chieu thuc cua phai nao":{"question":"Mê Ảnh Tung là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":710,"faction_key":"tangmen"},"saved":0},"hap tinh yem la chieu thuc cua phai nao":{"question":"Hấp Tinh Yểm là chiêu thức của phái nào?","answer":"ngu doc","aliases":["ngu doc giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":711,"faction_key":"wudu"},"saved":0},"be nguyet phat tran la chieu thuc cua phai nao":{"question":"Bế Nguyệt Phất Trần là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":712,"faction_key":"emei"},"saved":0},"ngu tuyet an la chieu thuc cua phai nao":{"question":"Ngự Tuyết Ẩn là chiêu thức của phái nào?","answer":"thuy yen","aliases":["thuy yen mon"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":713,"faction_key":"cuiyan"},"saved":0},"hon thien khi cong la chieu thuc cua phai nao":{"question":"Hỗn Thiên Khí Công là chiêu thức của phái nào?","answer":"cai bang","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":714,"faction_key":"gaibang"},"saved":0},"ma am phe phach la chieu thuc cua phai nao":{"question":"Ma Âm Phệ Phách là chiêu thức của phái nào?","answer":"thien nhan","aliases":["thien nhan giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":715,"faction_key":"tianren"},"saved":0},"xuat u bat nhiem la chieu thuc cua phai nao":{"question":"Xuất Ứ Bất Nhiễm là chiêu thức của phái nào?","answer":"vo dang","aliases":["vo dang phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":716,"faction_key":"wudang"},"saved":0},"luong nghi chan khi la chieu thuc cua phai nao":{"question":"Lưỡng Nghi Chân Khí là chiêu thức của phái nào?","answer":"con lon","aliases":["con lon phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk120.js","skill_id":717,"faction_key":"kunlun"},"saved":0},"dai luc kim cang chuong la chieu thuc cua phai nao":{"question":"Đại Lực Kim Cang Chưởng là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1055,"faction_key":"shaolin"},"saved":0},"vi da hien xu la chieu thuc cua phai nao":{"question":"Vi Đà Hiến Xử là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1056,"faction_key":"shaolin"},"saved":0},"tam gioi quy thien la chieu thuc cua phai nao":{"question":"Tam Giới Quy Thiền là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1057,"faction_key":"shaolin"},"saved":0},"hao hung tram la chieu thuc cua phai nao":{"question":"Hào Hùng Trảm là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1058,"faction_key":"tianwang"},"saved":0},"tung hoanh bat hoang la chieu thuc cua phai nao":{"question":"Tung Hoành Bát Hoang là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1059,"faction_key":"tianwang"},"saved":0},"ba vuong tam kim la chieu thuc cua phai nao":{"question":"Bá Vương Tạm Kim là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1060,"faction_key":"tianwang"},"saved":0},"vo anh xuyen la chieu thuc cua phai nao":{"question":"Vô Ảnh Xuyên là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1069,"faction_key":"tangmen"},"saved":0},"thiet lien tu sat la chieu thuc cua phai nao":{"question":"Thiết Liên Tứ Sát là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1070,"faction_key":"tangmen"},"saved":0},"can khon nhat trich la chieu thuc cua phai nao":{"question":"Càn Khôn Nhất Trịch là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1071,"faction_key":"tangmen"},"saved":0},"hinh tieu cot lap la chieu thuc cua phai nao":{"question":"Hình Tiêu Cốt Lập là chiêu thức của phái nào?","answer":"ngu doc","aliases":["ngu doc giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1066,"faction_key":"wudu"},"saved":0},"u hon phe anh la chieu thuc cua phai nao":{"question":"U Hồn Phệ Ảnh là chiêu thức của phái nào?","answer":"ngu doc","aliases":["ngu doc giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1067,"faction_key":"wudu"},"saved":0},"kiem hoa van tinh la chieu thuc cua phai nao":{"question":"Kiếm Hoa Vãn Tinh là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1061,"faction_key":"emei"},"saved":0},"bang vu lac tinh la chieu thuc cua phai nao":{"question":"Băng Vũ Lạc Tinh là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1062,"faction_key":"emei"},"saved":0},"ngoc tuyen tam kinh la chieu thuc cua phai nao":{"question":"Ngọc Tuyền Tâm Kinh là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1114,"faction_key":"emei"},"saved":0},"bang tuoc hoat ky la chieu thuc cua phai nao":{"question":"Băng Tước Hoạt Kỳ là chiêu thức của phái nào?","answer":"thuy yen","aliases":["thuy yen mon"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1063,"faction_key":"cuiyan"},"saved":0},"thuy anh man tu la chieu thuc cua phai nao":{"question":"Thủy Anh Man Tú là chiêu thức của phái nào?","answer":"thuy yen","aliases":["thuy yen mon"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1065,"faction_key":"cuiyan"},"saved":0},"thoi thang luc long la chieu thuc cua phai nao":{"question":"Thời Thặng Lục Long là chiêu thức của phái nào?","answer":"cai bang","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1073,"faction_key":"gaibang"},"saved":0},"bong huynh luoc dia la chieu thuc cua phai nao":{"question":"Bổng Huýnh Lược Địa là chiêu thức của phái nào?","answer":"cai bang","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1074,"faction_key":"gaibang"},"saved":0},"giang hai no lan la chieu thuc cua phai nao":{"question":"Giang Hải Nộ Lan là chiêu thức của phái nào?","answer":"thien nhan","aliases":["thien nhan giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1075,"faction_key":"tianren"},"saved":0},"tat hoa lieu nguyen la chieu thuc cua phai nao":{"question":"Tật Hỏa Liệu Nguyên là chiêu thức của phái nào?","answer":"thien nhan","aliases":["thien nhan giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1076,"faction_key":"tianren"},"saved":0},"tao hoa thai thanh la chieu thuc cua phai nao":{"question":"Tạo Hóa Thái Thanh là chiêu thức của phái nào?","answer":"vo dang","aliases":["vo dang phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1078,"faction_key":"wudang"},"saved":0},"kiem thuy tinh ha la chieu thuc cua phai nao":{"question":"Kiếm Thùy Tinh Hà là chiêu thức của phái nào?","answer":"vo dang","aliases":["vo dang phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1079,"faction_key":"wudang"},"saved":0},"cuu thien cuong phong la chieu thuc cua phai nao":{"question":"Cửu Thiên Cương Phong là chiêu thức của phái nào?","answer":"con lon","aliases":["con lon phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1080,"faction_key":"kunlun"},"saved":0},"thien loi chan nhac la chieu thuc cua phai nao":{"question":"Thiên Lôi Chấn Nhạc là chiêu thức của phái nào?","answer":"con lon","aliases":["con lon phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","skill_id":1081,"faction_key":"kunlun"},"saved":0},"kim quyen la han la chieu thuc cua phai nao":{"question":"Kim Quyên La Hán là chiêu thức của phái nào?","answer":"thieu lam","aliases":["thieu lam phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1220,"faction_key":"shaolin"},"saved":0},"chinh chien bat phuong la chieu thuc cua phai nao":{"question":"Chinh Chiến Bát Phương là chiêu thức của phái nào?","answer":"thien vuong","aliases":["thien vuong bang"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1221,"faction_key":"tianwang"},"saved":0},"sam la doc hai la chieu thuc cua phai nao":{"question":"Sâm La Độc Hải là chiêu thức của phái nào?","answer":"ngu doc","aliases":["ngu doc giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1222,"faction_key":"wudu"},"saved":0},"hap tinh tran la chieu thuc cua phai nao":{"question":"Hấp Tinh Trận là chiêu thức của phái nào?","answer":"duong mon","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1223,"faction_key":"tangmen"},"saved":0},"ba la tam kinh la chieu thuc cua phai nao":{"question":"Ba La Tâm Kinh là chiêu thức của phái nào?","answer":"nga my","aliases":["nga my phai","nga mi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1224,"faction_key":"emei"},"saved":0},"huyen bang vo tuc la chieu thuc cua phai nao":{"question":"Huyền Băng Vô Tức là chiêu thức của phái nào?","answer":"thuy yen","aliases":["thuy yen mon"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1225,"faction_key":"cuiyan"},"saved":0},"liet hoa phan thien la chieu thuc cua phai nao":{"question":"Liệt Hỏa Phẫn Thiên là chiêu thức của phái nào?","answer":"thien nhan","aliases":["thien nhan giao"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1226,"faction_key":"tianren"},"saved":0},"o y quyet la chieu thuc cua phai nao":{"question":"Ô Y Quyết là chiêu thức của phái nào?","answer":"cai bang","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1227,"faction_key":"gaibang"},"saved":0},"chan vu that tiet la chieu thuc cua phai nao":{"question":"Chân Vũ Thất Tiệt là chiêu thức của phái nào?","answer":"vo dang","aliases":["vo dang phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1228,"faction_key":"wudang"},"saved":0},"thien cuong khat kinh la chieu thuc cua phai nao":{"question":"Thiên Cương Khất Kính là chiêu thức của phái nào?","answer":"con lon","aliases":["con lon phai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → js/vlwin.js và jx/sk180.js","skill_id":1229,"faction_key":"kunlun"},"saved":0},"thieu lam thuoc hanh nao trong ngu hanh":{"question":"Thiếu Lâm thuộc hành nào trong ngũ hành?","answer":"kim","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"shaolin","series_index":0},"saved":0},"thien vuong thuoc hanh nao trong ngu hanh":{"question":"Thiên Vương thuộc hành nào trong ngũ hành?","answer":"kim","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"tianwang","series_index":0},"saved":0},"duong mon thuoc hanh nao trong ngu hanh":{"question":"Đường Môn thuộc hành nào trong ngũ hành?","answer":"moc","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"tangmen","series_index":1},"saved":0},"ngu doc thuoc hanh nao trong ngu hanh":{"question":"Ngũ Độc thuộc hành nào trong ngũ hành?","answer":"moc","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"wudu","series_index":1},"saved":0},"nga my thuoc hanh nao trong ngu hanh":{"question":"Nga My thuộc hành nào trong ngũ hành?","answer":"thuy","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"emei","series_index":2},"saved":0},"thuy yen thuoc hanh nao trong ngu hanh":{"question":"Thúy Yên thuộc hành nào trong ngũ hành?","answer":"thuy","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"cuiyan","series_index":2},"saved":0},"cai bang thuoc hanh nao trong ngu hanh":{"question":"Cái Bang thuộc hành nào trong ngũ hành?","answer":"hoa","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"gaibang","series_index":3},"saved":0},"thien nhan thuoc hanh nao trong ngu hanh":{"question":"Thiên Nhẫn thuộc hành nào trong ngũ hành?","answer":"hoa","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"tianren","series_index":3},"saved":0},"vo dang thuoc hanh nao trong ngu hanh":{"question":"Võ Đang thuộc hành nào trong ngũ hành?","answer":"tho","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"wudang","series_index":4},"saved":0},"con lon thuoc hanh nao trong ngu hanh":{"question":"Côn Lôn thuộc hành nào trong ngũ hành?","answer":"tho","aliases":[],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har → vldata.js","faction_key":"kunlun","series_index":4},"saved":0},"hoa dang dien ra luc may gio hang ngay":{"question":"Hoa Đăng diễn ra lúc mấy giờ hằng ngày?","answer":"20 30","aliases":["20h30","20 gio 30"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/quiz.js: lịch 20h30 giờ VN","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"boss the gioi dien ra vao nhung gio nao moi ngay":{"question":"Boss Thế Giới diễn ra vào những giờ nào mỗi ngày?","answer":"12 00 va 21 00","aliases":["12h va 21h"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/bridge.js: VLNPC.su_kien","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"moi luot boss the gioi keo dai bao nhieu phut":{"question":"Mỗi lượt Boss Thế Giới kéo dài bao nhiêu phút?","answer":"15 phut","aliases":["15"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vlwin.js: wbWin","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"tong kim mo bao danh luc may gio":{"question":"Tống Kim mở báo danh lúc mấy giờ?","answer":"21 55","aliases":["21h55"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/news.js: bản tin vl4-9","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"tran tong kim bat dau luc may gio":{"question":"Trận Tống Kim bắt đầu lúc mấy giờ?","answer":"22 00","aliases":["22h","22 gio"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/news.js: bản tin vl4-9","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"tran tong kim ket thuc luc may gio":{"question":"Trận Tống Kim kết thúc lúc mấy giờ?","answer":"22 15","aliases":["22h15"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/news.js: bản tin vl4-9","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"tran tong kim thu nghiem keo dai bao nhieu phut":{"question":"Trận Tống Kim thử nghiệm kéo dài bao nhiêu phút?","answer":"15 phut","aliases":["15"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/news.js: 22:00–22:15","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"muon tham gia tong kim thu nghiem can chuyen sinh it nhat may lan":{"question":"Muốn tham gia Tống Kim thử nghiệm cần chuyển sinh ít nhất mấy lần?","answer":"1 lan","aliases":["1"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/news.js: bản tin vl4-9","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"tong kim thu nghiem nhan toi da bao nhieu nguoi":{"question":"Tống Kim thử nghiệm nhận tối đa bao nhiêu người?","answer":"50 nguoi","aliases":["50"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"jx/news.js: bản tin vl4-9","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"khi tran tong kim bat dau bao danh con mo khong":{"question":"Khi trận Tống Kim bắt đầu, báo danh còn mở không?","answer":"khong","aliases":["da dong bao danh"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vltk.js: vlTkInfo; jx/news.js","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"da bam roi chien truong thi co duoc vao lai cung tran tong kim khong":{"question":"Đã bấm Rời chiến trường thì có được vào lại cùng trận Tống Kim không?","answer":"khong","aliases":["khong duoc vao lai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vltk.js: kiểm tra left; jx/news.js","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"trong chien truong tong kim co duoc lap to doi khong":{"question":"Trong chiến trường Tống Kim có được lập tổ đội không?","answer":"khong","aliases":["khong duoc lap to doi"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/bridge.js: ẩn tổ đội trong tk; jx/news.js","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"theo dieu kien hien tai da chuyen sinh co duoc mien xet cap toi thieu khi vao boss the gioi khong":{"question":"Theo điều kiện hiện tại, đã chuyển sinh có được miễn xét cấp tối thiểu khi vào Boss Thế Giới không?","answer":"co","aliases":["duoc"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vlwin.js: S.lv >= st.minLv || S.reset > 0","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"nhiem vu ngay lam moi vao thoi diem nao":{"question":"Nhiệm vụ ngày làm mới vào thời điểm nào?","answer":"0 gio moi ngay","aliases":["00 00 moi ngay"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vlwin.js: giftWin(dq)","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"nhiem vu tuan lam moi vao thoi diem nao":{"question":"Nhiệm vụ tuần làm mới vào thời điểm nào?","answer":"0 gio thu hai","aliases":["00 00 thu hai"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vlwin.js: wqWin","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"mot cau hoa dang da cong bo dap an con duoc gui tra loi khong":{"question":"Một câu Hoa Đăng đã công bố đáp án còn được gửi trả lời không?","answer":"khong","aliases":["khong duoc"],"source":"game-data-predicted-wording","evidence":{"resource":"download1.har","reference":"js/vlwin.js: qzDraw chỉ bật nút khi open === 1 và còn thời gian","as_of":"2026-11-06","timezone":"Asia/Ho_Chi_Minh"},"saved":0},"con vat nao la bieu tuong cua nam thin":{"answer":"rong","question":"Con vật nào là biểu tượng của năm Thìn?","saved":1794058207431,"source":"game-log","aliases":["con rong"],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json"},"thien ha vo cau thuoc phai nao":{"answer":"cai bang","question":"Thiên Hạ Vô Cẩu thuộc phái nào?","saved":1794058231765,"source":"game-log","aliases":["cai bang phai"],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json"},"trong son ha xa tac thanh chinh co cac npc la":{"answer":"ba lang huyen","question":"Trong Sơn Hà Xã Tắc, thành chính có các NPC là?","saved":1794058257409,"source":"game-log","aliases":["ba lang"],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json"},"vo tuong tram la tuyet chieu cua phai nao":{"answer":"thieu lam","question":"Vô Tướng Trảm là tuyệt chiêu của phái nào?","saved":1794058282188,"source":"game-log","aliases":["thieu lam phai"],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json"},"con lon phai thuoc he ngu hanh nao":{"answer":"tho","question":"Côn Lôn phái thuộc hệ ngũ hành nào?","saved":1794058306691,"source":"game-log","aliases":["he tho"],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json"},"chieu hoanh tao luc hop la vo cong cua mon phai nao":{"id":"HD-01","group":"Chiêu thức chưa có","question":"Chiêu Hoành Tảo Lục Hợp là võ công của môn phái nào?","displayAnswer":"Thiếu Lâm","answer":"thieu lam","aliases":["thieu lam phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[11].f và fac.shaolin.skills","skillId":11,"faction":"shaolin"},"saved":0},"chieu ma ha vo luong la vo cong cua mon phai nao":{"id":"HD-02","group":"Chiêu thức chưa có","question":"Chiêu Ma Ha Vô Lượng là võ công của môn phái nào?","displayAnswer":"Thiếu Lâm","answer":"thieu lam","aliases":["thieu lam phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[19].f và fac.shaolin.skills","skillId":19,"faction":"shaolin"},"saved":0},"chieu truy phong quyet la vo cong cua mon phai nao":{"id":"HD-03","group":"Chiêu thức chưa có","question":"Chiêu Truy Phong Quyết là võ công của môn phái nào?","displayAnswer":"Thiên Vương","answer":"thien vuong","aliases":["thien vuong bang"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[325].f và fac.tianwang.skills","skillId":325,"faction":"tianwang"},"saved":0},"chieu vo tam tram la vo cong cua mon phai nao":{"id":"HD-04","group":"Chiêu thức chưa có","question":"Chiêu Vô Tâm Trảm là võ công của môn phái nào?","displayAnswer":"Thiên Vương","answer":"thien vuong","aliases":["thien vuong bang"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[32].f và fac.tianwang.skills","skillId":32,"faction":"tianwang"},"saved":0},"chieu nhiep hon nguyet anh la vo cong cua mon phai nao":{"id":"HD-05","group":"Chiêu thức chưa có","question":"Chiêu Nhiếp Hồn Nguyệt ảnh là võ công của môn phái nào?","displayAnswer":"Đường Môn","answer":"duong mon","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[339].f và fac.tangmen.skills","skillId":339,"faction":"tangmen"},"saved":0},"chieu loan hoan kich la vo cong cua mon phai nao":{"id":"HD-06","group":"Chiêu thức chưa có","question":"Chiêu Loạn Hoàn Kích là võ công của môn phái nào?","displayAnswer":"Đường Môn","answer":"duong mon","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[351].f và fac.tangmen.skills","skillId":351,"faction":"tangmen"},"saved":0},"chieu huyen am tram la vo cong cua mon phai nao":{"id":"HD-07","group":"Chiêu thức chưa có","question":"Chiêu Huyền Âm Trảm là võ công của môn phái nào?","displayAnswer":"Ngũ Độc","answer":"ngu doc","aliases":["ngu doc giao"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[355].f và fac.wudu.skills","skillId":355,"faction":"wudu"},"saved":0},"chieu thien cuong dia sat la vo cong cua mon phai nao":{"id":"HD-08","group":"Chiêu thức chưa có","question":"Chiêu Thiên Cương Địa Sát là võ công của môn phái nào?","displayAnswer":"Ngũ Độc","answer":"ngu doc","aliases":["ngu doc giao"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[71].f và fac.wudu.skills","skillId":71,"faction":"wudu"},"saved":0},"chieu phong suong toai anh la vo cong cua mon phai nao":{"id":"HD-09","group":"Chiêu thức chưa có","question":"Chiêu Phong Sương Toái ảnh là võ công của môn phái nào?","displayAnswer":"Nga My","answer":"nga my","aliases":["nga my phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[380].f và fac.emei.skills","skillId":380,"faction":"emei"},"saved":0},"chieu bat diet bat tuyet la vo cong cua mon phai nao":{"id":"HD-10","group":"Chiêu thức chưa có","question":"Chiêu Bất Diệt Bất Tuyệt là võ công của môn phái nào?","displayAnswer":"Nga My","answer":"nga my","aliases":["nga my phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[88].f và fac.emei.skills","skillId":88,"faction":"emei"},"saved":0},"chieu muc da luu tinh la vo cong cua mon phai nao":{"id":"HD-11","group":"Chiêu thức chưa có","question":"Chiêu Mục Dã Lưu Tinh là võ công của môn phái nào?","displayAnswer":"Thúy Yên","answer":"thuy yen","aliases":["thuy yen mon"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[108].f và fac.cuiyan.skills","skillId":108,"faction":"cuiyan"},"saved":0},"chieu bich hai trieu sinh la vo cong cua mon phai nao":{"id":"HD-12","group":"Chiêu thức chưa có","question":"Chiêu Bích Hải Triều Sinh là võ công của môn phái nào?","displayAnswer":"Thúy Yên","answer":"thuy yen","aliases":["thuy yen mon"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[111].f và fac.cuiyan.skills","skillId":111,"faction":"cuiyan"},"saved":0},"chieu bong da ac cau la vo cong cua mon phai nao":{"id":"HD-13","group":"Chiêu thức chưa có","question":"Chiêu Bổng Đả ác Cẩu là võ công của môn phái nào?","displayAnswer":"Cái Bang","answer":"cai bang","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[125].f và fac.gaibang.skills","skillId":125,"faction":"gaibang"},"saved":0},"chieu khang long huu hoi la vo cong cua mon phai nao":{"id":"HD-14","group":"Chiêu thức chưa có","question":"Chiêu Kháng Long Hữu Hối là võ công của môn phái nào?","displayAnswer":"Cái Bang","answer":"cai bang","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[128].f và fac.gaibang.skills","skillId":128,"faction":"gaibang"},"saved":0},"chieu thau thien hoan nhat la vo cong cua mon phai nao":{"id":"HD-15","group":"Chiêu thức chưa có","question":"Chiêu Thâu Thiên Hoán Nhật là võ công của môn phái nào?","displayAnswer":"Thiên Nhẫn","answer":"thien nhan","aliases":["thien nhan giao"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[142].f và fac.tianren.skills","skillId":142,"faction":"tianren"},"saved":0},"chieu ma diem that sat la vo cong cua mon phai nao":{"id":"HD-16","group":"Chiêu thức chưa có","question":"Chiêu Ma Diệm Thất Sát là võ công của môn phái nào?","displayAnswer":"Thiên Nhẫn","answer":"thien nhan","aliases":["thien nhan giao"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[148].f và fac.tianren.skills","skillId":148,"faction":"tianren"},"saved":0},"chieu vo nga vo kiem la vo cong cua mon phai nao":{"id":"HD-17","group":"Chiêu thức chưa có","question":"Chiêu Vô Ngã Vô Kiếm là võ công của môn phái nào?","displayAnswer":"Võ Đang","answer":"vo dang","aliases":["vo dang phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[165].f và fac.wudang.skills","skillId":165,"faction":"wudang"},"saved":0},"chieu tam hoan thao nguyet la vo cong cua mon phai nao":{"id":"HD-18","group":"Chiêu thức chưa có","question":"Chiêu Tam Hoàn Thao Nguyệt là võ công của môn phái nào?","displayAnswer":"Võ Đang","answer":"vo dang","aliases":["vo dang phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[267].f và fac.wudang.skills","skillId":267,"faction":"wudang"},"saved":0},"chieu ngu loi chanh phap la vo cong cua mon phai nao":{"id":"HD-19","group":"Chiêu thức chưa có","question":"Chiêu Ngũ Lôi Chánh Pháp là võ công của môn phái nào?","displayAnswer":"Côn Lôn","answer":"con lon","aliases":["con lon phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[182].f và fac.kunlun.skills","skillId":182,"faction":"kunlun"},"saved":0},"chieu cuong phong sau dien la vo cong cua mon phai nao":{"id":"HD-20","group":"Chiêu thức chưa có","question":"Chiêu Cuồng Phong Sậu Điện là võ công của môn phái nào?","displayAnswer":"Côn Lôn","answer":"con lon","aliases":["con lon phai"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"sk[176].f và fac.kunlun.skills","skillId":176,"faction":"kunlun"},"saved":0},"chieu van long kich thuoc mon phai nao":{"id":"HD-21","group":"Cách hỏi khác từ log","question":"Chiêu Vân Long Kích thuộc môn phái nào?","displayAnswer":"Thiên Nhẫn","answer":"thien nhan","aliases":["thien nhan giao"],"source":"draft-from-local-game-data","evidence":{"resource":"VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json","reference":"Vân Long Kích là chiêu thức của phái nào?","originalQuestion":"Vân Long Kích là chiêu thức của phái nào?","confirmedAt":"2026-11-06T13:30:31.785Z"},"saved":0},"mon phai nao co vo cong dat ma do giang":{"id":"HD-22","group":"Cách hỏi khác từ log","question":"Môn phái nào có võ công Đạt Ma Độ Giang?","displayAnswer":"Thiếu Lâm","answer":"thieu lam","aliases":["thieu lam phai"],"source":"draft-from-local-game-data","evidence":{"resource":"VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json","reference":"Đạt Ma Độ Giang là chiêu thức của phái nào?","originalQuestion":"Đạt Ma Độ Giang là chiêu thức của phái nào?","confirmedAt":"2026-11-06T13:31:21.515Z"},"saved":0},"mon phai nao su dung thien ha vo cau":{"id":"HD-23","group":"Cách hỏi khác từ log","question":"Môn phái nào sử dụng Thiên Hạ Vô Cẩu?","displayAnswer":"Cái Bang","answer":"cai bang","aliases":["cai bang phai"],"source":"draft-from-local-game-data","evidence":{"resource":"VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json","reference":"Thiên Hạ Vô Cẩu thuộc phái nào?","originalQuestion":"Thiên Hạ Vô Cẩu thuộc phái nào?","confirmedAt":"2026-11-07T13:30:31.393Z"},"saved":0},"phai nao co tuyet chieu vo tuong tram":{"id":"HD-24","group":"Cách hỏi khác từ log","question":"Phái nào có tuyệt chiêu Vô Tướng Trảm?","displayAnswer":"Thiếu Lâm","answer":"thieu lam","aliases":["thieu lam phai"],"source":"draft-from-local-game-data","evidence":{"resource":"VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json","reference":"Vô Tướng Trảm là tuyệt chiêu của phái nào?","originalQuestion":"Vô Tướng Trảm là tuyệt chiêu của phái nào?","confirmedAt":"2026-11-07T13:31:21.712Z"},"saved":0},"mot vong con giap co tat ca bao nhieu con":{"id":"HD-25","group":"Cách hỏi khác từ log","question":"Một vòng con giáp có tất cả bao nhiêu con?","displayAnswer":"12","answer":"12","aliases":["12 con giap"],"source":"draft-from-local-game-data","evidence":{"resource":"VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json","reference":"Có bao nhiêu con giáp?","originalQuestion":"Có bao nhiêu con giáp?","confirmedAt":"2026-11-06T13:30:07.246Z"},"saved":0},"trong 12 con giap thin ung voi con vat nao":{"id":"HD-26","group":"Cách hỏi khác từ log","question":"Trong 12 con giáp, Thìn ứng với con vật nào?","displayAnswer":"Rồng","answer":"rong","aliases":["con rong"],"source":"draft-from-local-game-data","evidence":{"resource":"VL4_Hoa_Dang_ngan_hang_2026-11-07 (1).json","reference":"Con vật nào là biểu tượng của năm Thìn?","originalQuestion":"Con vật nào là biểu tượng của năm Thìn?","confirmedAt":"2026-11-07T13:30:07.003Z"},"saved":0},"thieu lam va thien vuong cung thuoc he nao":{"id":"HD-27","group":"Ngũ hành môn phái","question":"Thiếu Lâm và Thiên Vương cùng thuộc hệ nào?","displayAnswer":"Kim","answer":"kim","aliases":["he kim","hanh kim"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series = 0"},"saved":0},"theo tuong khac thieu lam khac doi thu thuoc he nao":{"id":"HD-28","group":"Ngũ hành môn phái","question":"Theo tương khắc, Thiếu Lâm khắc đối thủ thuộc hệ nào?","displayAnswer":"Mộc","answer":"moc","aliases":["he moc","hanh moc"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js và all_game_scripts.js","reference":"fac[].series = 0, KHAC[0] = 1"},"saved":0},"duong mon va ngu doc cung thuoc he nao":{"id":"HD-29","group":"Ngũ hành môn phái","question":"Đường Môn và Ngũ Độc cùng thuộc hệ nào?","displayAnswer":"Mộc","answer":"moc","aliases":["he moc","hanh moc"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series = 1"},"saved":0},"theo tuong khac duong mon khac doi thu thuoc he nao":{"id":"HD-30","group":"Ngũ hành môn phái","question":"Theo tương khắc, Đường Môn khắc đối thủ thuộc hệ nào?","displayAnswer":"Thổ","answer":"tho","aliases":["he tho","hanh tho"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js và all_game_scripts.js","reference":"fac[].series = 1, KHAC[1] = 4"},"saved":0},"nga my va thuy yen cung thuoc he nao":{"id":"HD-31","group":"Ngũ hành môn phái","question":"Nga My và Thúy Yên cùng thuộc hệ nào?","displayAnswer":"Thủy","answer":"thuy","aliases":["he thuy","hanh thuy"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series = 2"},"saved":0},"theo tuong khac nga my khac doi thu thuoc he nao":{"id":"HD-32","group":"Ngũ hành môn phái","question":"Theo tương khắc, Nga My khắc đối thủ thuộc hệ nào?","displayAnswer":"Hỏa","answer":"hoa","aliases":["he hoa","hanh hoa"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js và all_game_scripts.js","reference":"fac[].series = 2, KHAC[2] = 3"},"saved":0},"cai bang va thien nhan cung thuoc he nao":{"id":"HD-33","group":"Ngũ hành môn phái","question":"Cái Bang và Thiên Nhẫn cùng thuộc hệ nào?","displayAnswer":"Hỏa","answer":"hoa","aliases":["he hoa","hanh hoa"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series = 3"},"saved":0},"theo tuong khac cai bang khac doi thu thuoc he nao":{"id":"HD-34","group":"Ngũ hành môn phái","question":"Theo tương khắc, Cái Bang khắc đối thủ thuộc hệ nào?","displayAnswer":"Kim","answer":"kim","aliases":["he kim","hanh kim"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js và all_game_scripts.js","reference":"fac[].series = 3, KHAC[3] = 0"},"saved":0},"vo dang va con lon cung thuoc he nao":{"id":"HD-35","group":"Ngũ hành môn phái","question":"Võ Đang và Côn Lôn cùng thuộc hệ nào?","displayAnswer":"Thổ","answer":"tho","aliases":["he tho","hanh tho"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series = 4"},"saved":0},"theo tuong khac vo dang khac doi thu thuoc he nao":{"id":"HD-36","group":"Ngũ hành môn phái","question":"Theo tương khắc, Võ Đang khắc đối thủ thuộc hệ nào?","displayAnswer":"Thủy","answer":"thuy","aliases":["he thuy","hanh thuy"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/vldata.js và all_game_scripts.js","reference":"fac[].series = 4, KHAC[4] = 2"},"saved":0},"npc nao co muc chon noi den de di bai luyen":{"id":"HD-37","group":"NPC và vật phẩm","question":"NPC nào có mục Chọn nơi đến để đi bãi luyện?","displayAnswer":"Xa Phu","answer":"xa phu","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.xa_phu · Chọn nơi đến"},"saved":0},"muon gui do vao kho dung chung nen gap npc nao":{"id":"HD-38","group":"NPC và vật phẩm","question":"Muốn gửi đồ vào kho dùng chung, nên gặp NPC nào?","displayAnswer":"Thủ Khố","answer":"thu kho","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.thu_kho · Mở kho"},"saved":0},"npc nao mo cua so dong hanh de quan ly linh thu":{"id":"HD-39","group":"NPC và vật phẩm","question":"NPC nào mở cửa sổ Đồng hành để quản lý linh thú?","displayAnswer":"Linh Thú Sư","answer":"linh thu su","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.linh_thu · Đồng hành"},"saved":0},"npc nao o thanh co muc bang xep hang":{"id":"HD-40","group":"NPC và vật phẩm","question":"NPC nào ở thành có mục Bảng xếp hạng?","displayAnswer":"Tàng Kinh Các","answer":"tang kinh cac","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.tang_kinh · Bảng xếp hạng"},"saved":0},"trong thanh npc nao co muc diem danh":{"id":"HD-41","group":"NPC và vật phẩm","question":"Trong thành, NPC nào có mục Điểm danh?","displayAnswer":"Phần Thưởng","answer":"phan thuong","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.phan_thuong · Điểm danh"},"saved":0},"npc nao co muc mo ruong phuc duyen trong bang qua":{"id":"HD-42","group":"NPC và vật phẩm","question":"NPC nào có mục mở Rương Phúc Duyên trong bảng quà?","displayAnswer":"Phần Thưởng","answer":"phan thuong","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.phan_thuong · Rương Phúc Duyên"},"saved":0},"muon mo muc doi vat pham su kien o thanh thi gap npc nao":{"id":"HD-43","group":"NPC và vật phẩm","question":"Muốn mở mục Đổi vật phẩm sự kiện ở thành thì gặp NPC nào?","displayAnswer":"Sự Kiện","answer":"su kien","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.su_kien · Đổi vật phẩm sự kiện"},"saved":0},"npc nao mo cua so chuyen sinh":{"id":"HD-44","group":"NPC và vật phẩm","question":"NPC nào mở cửa sổ Chuyển Sinh?","displayAnswer":"Chuyển Sinh","answer":"chuyen sinh","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.chuyen_sinh · rebornWin"},"saved":0},"o ba lang huyen npc nao giao chuoi nhiem vu da tau":{"id":"HD-45","group":"NPC và vật phẩm","question":"Ở Ba Lăng Huyện, NPC nào giao chuỗi nhiệm vụ Dã Tẩu?","displayAnswer":"Dã Tẩu","answer":"da tau","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.da_tau · Nhiệm vụ Dã Tẩu"},"saved":0},"npc nao mo cua so bao danh chien truong tong kim":{"id":"HD-46","group":"NPC và vật phẩm","question":"NPC nào mở cửa sổ báo danh chiến trường Tống Kim?","displayAnswer":"Tống Kim","answer":"tong kim","aliases":[],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.tong_kim · vlTkWin"},"saved":0},"trong cua so ky nang tay tuy dung de tra lai loai diem nao":{"id":"HD-47","group":"NPC và vật phẩm","question":"Trong cửa sổ kỹ năng, Tẩy tủy dùng để trả lại loại điểm nào?","displayAnswer":"Điểm kỹ năng","answer":"diem ky nang","aliases":["ky nang"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/vlwin.js","reference":"skRe → Tẩy tủy (trả điểm kỹ năng)"},"saved":0},"tien thao lo tang bao nhieu phan tram kinh nghiem danh quai khi co hieu luc":{"id":"HD-48","group":"NPC và vật phẩm","question":"Tiên Thảo Lộ tăng bao nhiêu phần trăm kinh nghiệm đánh quái khi có hiệu lực?","displayAnswer":"50%","answer":"50","aliases":["50 phan tram"],"source":"draft-from-local-game-data","evidence":{"resource":"download1.har → /vl4/js/vlwin.js","reference":"ktcWin · Tiên Thảo Lộ, +50% kinh nghiệm đánh quái trong 60 phút"},"saved":0},"con vat nao la bieu tuong cua nam suu":{"id":"HD-50","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Sửu?","displayAnswer":"Trâu","answer":"trau","aliases":["con trau"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam dan":{"id":"HD-51","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Dần?","displayAnswer":"Hổ","answer":"ho","aliases":["con ho"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam mao":{"id":"HD-52","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Mão?","displayAnswer":"Mèo","answer":"meo","aliases":["con meo"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam ngo":{"id":"HD-54","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Ngọ?","displayAnswer":"Ngựa","answer":"ngua","aliases":["con ngua"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam mui":{"id":"HD-55","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Mùi?","displayAnswer":"Dê","answer":"de","aliases":["con de"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam than":{"id":"HD-56","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Thân?","displayAnswer":"Khỉ","answer":"khi","aliases":["con khi"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam dau":{"id":"HD-57","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Dậu?","displayAnswer":"Gà","answer":"ga","aliases":["con ga"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam tuat":{"id":"HD-58","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Tuất?","displayAnswer":"Chó","answer":"cho","aliases":["con cho"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"con vat nao la bieu tuong cua nam hoi":{"id":"HD-59","group":"Biểu tượng 12 con giáp","question":"Con vật nào là biểu tượng của năm Hợi?","displayAnswer":"Heo","answer":"heo","aliases":["con heo","lon","con lon"],"source":"draft-from-local-game-data","evidence":{"resource":"Tệp xuất Hoa Đăng dùng làm mẫu câu, đối chiếu theo 12 con giáp Việt Nam","reference":"Đáp án dự kiến theo 12 con giáp Việt Nam"},"saved":0},"thieu lam con phap la chieu thuc cua phai nao":{"question":"Thiếu Lâm Côn pháp là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":4,"faction_key":"shaolin","required_level":10}},"thieu lam con phap thuoc phai nao":{"question":"Thiếu Lâm Côn pháp thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":4,"faction_key":"shaolin","required_level":10}},"thieu lam con phap la tuyet chieu cua phai nao":{"question":"Thiếu Lâm Côn pháp là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":4,"faction_key":"shaolin","required_level":10}},"thieu lam dao phap la chieu thuc cua phai nao":{"question":"Thiếu Lâm Đao pháp là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":6,"faction_key":"shaolin","required_level":10}},"thieu lam dao phap thuoc phai nao":{"question":"Thiếu Lâm Đao pháp thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":6,"faction_key":"shaolin","required_level":10}},"thieu lam dao phap la tuyet chieu cua phai nao":{"question":"Thiếu Lâm Đao pháp là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":6,"faction_key":"shaolin","required_level":10}},"thieu lam quyen phap la chieu thuc cua phai nao":{"question":"Thiếu Lâm Quyền Pháp là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":8,"faction_key":"shaolin","required_level":10}},"thieu lam quyen phap thuoc phai nao":{"question":"Thiếu Lâm Quyền Pháp thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":8,"faction_key":"shaolin","required_level":10}},"thieu lam quyen phap la tuyet chieu cua phai nao":{"question":"Thiếu Lâm Quyền Pháp là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":8,"faction_key":"shaolin","required_level":10}},"kim cang phuc ma la chieu thuc cua phai nao":{"question":"Kim Cang Phục Ma là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":10,"faction_key":"shaolin","required_level":1}},"kim cang phuc ma thuoc phai nao":{"question":"Kim Cang Phục Ma thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":10,"faction_key":"shaolin","required_level":1}},"kim cang phuc ma la tuyet chieu cua phai nao":{"question":"Kim Cang Phục Ma là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":10,"faction_key":"shaolin","required_level":1}},"hang long bat vu la chieu thuc cua phai nao":{"question":"Hàng Long Bất Vũ là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":14,"faction_key":"shaolin","required_level":10}},"hang long bat vu thuoc phai nao":{"question":"Hàng Long Bất Vũ thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":14,"faction_key":"shaolin","required_level":10}},"hang long bat vu la tuyet chieu cua phai nao":{"question":"Hàng Long Bất Vũ là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":14,"faction_key":"shaolin","required_level":10}},"bat dong minh vuong la chieu thuc cua phai nao":{"question":"Bất động Minh Vương là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":15,"faction_key":"shaolin","required_level":20}},"bat dong minh vuong thuoc phai nao":{"question":"Bất động Minh Vương thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":15,"faction_key":"shaolin","required_level":20}},"bat dong minh vuong la tuyet chieu cua phai nao":{"question":"Bất động Minh Vương là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":15,"faction_key":"shaolin","required_level":20}},"la han tran la chieu thuc cua phai nao":{"question":"La Hán Trận là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":16,"faction_key":"shaolin","required_level":30}},"la han tran thuoc phai nao":{"question":"La Hán Trận thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":16,"faction_key":"shaolin","required_level":30}},"la han tran la tuyet chieu cua phai nao":{"question":"La Hán Trận là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":16,"faction_key":"shaolin","required_level":30}},"su tu hong thuoc phai nao":{"question":"Sư Tử Hống thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":20,"faction_key":"shaolin","required_level":40}},"su tu hong la tuyet chieu cua phai nao":{"question":"Sư Tử Hống là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":20,"faction_key":"shaolin","required_level":40}},"hoanh tao luc hop la chieu thuc cua phai nao":{"question":"Hoành Tảo Lục Hợp là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":11,"faction_key":"shaolin","required_level":50}},"hoanh tao luc hop thuoc phai nao":{"question":"Hoành Tảo Lục Hợp thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":11,"faction_key":"shaolin","required_level":50}},"hoanh tao luc hop la tuyet chieu cua phai nao":{"question":"Hoành Tảo Lục Hợp là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":11,"faction_key":"shaolin","required_level":50}},"ma ha vo luong la chieu thuc cua phai nao":{"question":"Ma Ha Vô Lượng là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":19,"faction_key":"shaolin","required_level":50}},"ma ha vo luong thuoc phai nao":{"question":"Ma Ha Vô Lượng thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":19,"faction_key":"shaolin","required_level":50}},"ma ha vo luong la tuyet chieu cua phai nao":{"question":"Ma Ha Vô Lượng là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":19,"faction_key":"shaolin","required_level":50}},"long trao ho trao la chieu thuc cua phai nao":{"question":"Long Trảo Hổ Trảo là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":271,"faction_key":"shaolin","required_level":50}},"long trao ho trao thuoc phai nao":{"question":"Long Trảo Hổ Trảo thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":271,"faction_key":"shaolin","required_level":50}},"long trao ho trao la tuyet chieu cua phai nao":{"question":"Long Trảo Hổ Trảo là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":271,"faction_key":"shaolin","required_level":50}},"dich can kinh la chieu thuc cua phai nao":{"question":"Dịch Cân kinh là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":21,"faction_key":"shaolin","required_level":60}},"dich can kinh thuoc phai nao":{"question":"Dịch Cân kinh thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":21,"faction_key":"shaolin","required_level":60}},"dich can kinh la tuyet chieu cua phai nao":{"question":"Dịch Cân kinh là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":21,"faction_key":"shaolin","required_level":60}},"nhu lai thien diep la chieu thuc cua phai nao":{"question":"Như Lai Thiên Diệp là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":273,"faction_key":"shaolin","required_level":60}},"nhu lai thien diep thuoc phai nao":{"question":"Như Lai Thiên Diệp thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":273,"faction_key":"shaolin","required_level":60}},"nhu lai thien diep la tuyet chieu cua phai nao":{"question":"Như Lai Thiên Diệp là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":273,"faction_key":"shaolin","required_level":60}},"dat ma do giang thuoc phai nao":{"question":"Đạt Ma Độ Giang thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":318,"faction_key":"shaolin","required_level":80}},"dat ma do giang la tuyet chieu cua phai nao":{"question":"Đạt Ma Độ Giang là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":318,"faction_key":"shaolin","required_level":80}},"hoanh tao thien quan thuoc phai nao":{"question":"Hoành Tảo Thiên Quân thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":319,"faction_key":"shaolin","required_level":80}},"hoanh tao thien quan la tuyet chieu cua phai nao":{"question":"Hoành Tảo Thiên Quân là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":319,"faction_key":"shaolin","required_level":80}},"vo tuong tram la chieu thuc cua phai nao":{"question":"Vô Tướng Trảm là chiêu thức của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":321,"faction_key":"shaolin","required_level":80}},"vo tuong tram thuoc phai nao":{"question":"Vô Tướng Trảm thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":321,"faction_key":"shaolin","required_level":80}},"dai luc kim cang chuong thuoc phai nao":{"question":"Đại Lực Kim Cang Chưởng thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1055,"faction_key":"shaolin","required_level":150}},"dai luc kim cang chuong la tuyet chieu cua phai nao":{"question":"Đại Lực Kim Cang Chưởng là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1055,"faction_key":"shaolin","required_level":150}},"vi da hien xu thuoc phai nao":{"question":"Vi Đà Hiến Xử thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1056,"faction_key":"shaolin","required_level":150}},"vi da hien xu la tuyet chieu cua phai nao":{"question":"Vi Đà Hiến Xử là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1056,"faction_key":"shaolin","required_level":150}},"tam gioi quy thien thuoc phai nao":{"question":"Tam Giới Quy Thiền thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1057,"faction_key":"shaolin","required_level":150}},"tam gioi quy thien la tuyet chieu cua phai nao":{"question":"Tam Giới Quy Thiền là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1057,"faction_key":"shaolin","required_level":150}},"thien vuong thuong phap la chieu thuc cua phai nao":{"question":"Thiên Vương  Thương pháp là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":23,"faction_key":"tianwang","required_level":10}},"thien vuong thuong phap thuoc phai nao":{"question":"Thiên Vương  Thương pháp thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":23,"faction_key":"tianwang","required_level":10}},"thien vuong thuong phap la tuyet chieu cua phai nao":{"question":"Thiên Vương  Thương pháp là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":23,"faction_key":"tianwang","required_level":10}},"thien vuong dao phap la chieu thuc cua phai nao":{"question":"Thiên Vương  Đao pháp là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":24,"faction_key":"tianwang","required_level":10}},"thien vuong dao phap thuoc phai nao":{"question":"Thiên Vương  Đao pháp thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":24,"faction_key":"tianwang","required_level":10}},"thien vuong dao phap la tuyet chieu cua phai nao":{"question":"Thiên Vương  Đao pháp là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":24,"faction_key":"tianwang","required_level":10}},"thien vuong chuy phap la chieu thuc cua phai nao":{"question":"Thiên Vương  Chùy Pháp là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":26,"faction_key":"tianwang","required_level":10}},"thien vuong chuy phap thuoc phai nao":{"question":"Thiên Vương  Chùy Pháp thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":26,"faction_key":"tianwang","required_level":10}},"thien vuong chuy phap la tuyet chieu cua phai nao":{"question":"Thiên Vương  Chùy Pháp là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":26,"faction_key":"tianwang","required_level":10}},"tram long quyet la chieu thuc cua phai nao":{"question":"Trảm Long quyết là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":29,"faction_key":"tianwang","required_level":1}},"tram long quyet thuoc phai nao":{"question":"Trảm Long quyết thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":29,"faction_key":"tianwang","required_level":1}},"tram long quyet la tuyet chieu cua phai nao":{"question":"Trảm Long quyết là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":29,"faction_key":"tianwang","required_level":1}},"hoi phong lac nhan la chieu thuc cua phai nao":{"question":"Hồi Phong Lạc Nhạn là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":30,"faction_key":"tianwang","required_level":10}},"hoi phong lac nhan thuoc phai nao":{"question":"Hồi Phong Lạc Nhạn thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":30,"faction_key":"tianwang","required_level":10}},"hoi phong lac nhan la tuyet chieu cua phai nao":{"question":"Hồi Phong Lạc Nhạn là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":30,"faction_key":"tianwang","required_level":10}},"kinh loi tram la chieu thuc cua phai nao":{"question":"Kinh Lôi Trảm là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":34,"faction_key":"tianwang","required_level":10}},"kinh loi tram thuoc phai nao":{"question":"Kinh Lôi Trảm thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":34,"faction_key":"tianwang","required_level":10}},"kinh loi tram la tuyet chieu cua phai nao":{"question":"Kinh Lôi Trảm là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":34,"faction_key":"tianwang","required_level":10}},"tinh tam quyet la chieu thuc cua phai nao":{"question":"Tĩnh Tâm Quyết là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":33,"faction_key":"tianwang","required_level":20}},"tinh tam quyet thuoc phai nao":{"question":"Tĩnh Tâm Quyết thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":33,"faction_key":"tianwang","required_level":20}},"tinh tam quyet la tuyet chieu cua phai nao":{"question":"Tĩnh Tâm Quyết là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":33,"faction_key":"tianwang","required_level":20}},"hang van quyet la chieu thuc cua phai nao":{"question":"Hàng Vân Quyết là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":31,"faction_key":"tianwang","required_level":30}},"hang van quyet thuoc phai nao":{"question":"Hàng Vân Quyết thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":31,"faction_key":"tianwang","required_level":30}},"hang van quyet la tuyet chieu cua phai nao":{"question":"Hàng Vân Quyết là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":31,"faction_key":"tianwang","required_level":30}},"duong quan tam diep la chieu thuc cua phai nao":{"question":"Dương Quan Tam Điệp là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":35,"faction_key":"tianwang","required_level":30}},"duong quan tam diep thuoc phai nao":{"question":"Dương Quan Tam Điệp thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":35,"faction_key":"tianwang","required_level":30}},"duong quan tam diep la tuyet chieu cua phai nao":{"question":"Dương Quan Tam Điệp là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":35,"faction_key":"tianwang","required_level":30}},"bat phong tram la chieu thuc cua phai nao":{"question":"Bát Phong Trảm là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":37,"faction_key":"tianwang","required_level":30}},"bat phong tram thuoc phai nao":{"question":"Bát Phong Trảm thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":37,"faction_key":"tianwang","required_level":30}},"bat phong tram la tuyet chieu cua phai nao":{"question":"Bát Phong Trảm là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":37,"faction_key":"tianwang","required_level":30}},"doan hon thich la chieu thuc cua phai nao":{"question":"Đoạn Hồn Thích là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":40,"faction_key":"tianwang","required_level":40}},"doan hon thich thuoc phai nao":{"question":"Đoạn Hồn Thích thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":40,"faction_key":"tianwang","required_level":40}},"doan hon thich la tuyet chieu cua phai nao":{"question":"Đoạn Hồn Thích là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":40,"faction_key":"tianwang","required_level":40}},"kim chung trao la chieu thuc cua phai nao":{"question":"Kim Chung Tráo là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":42,"faction_key":"tianwang","required_level":50}},"kim chung trao thuoc phai nao":{"question":"Kim Chung Tráo thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":42,"faction_key":"tianwang","required_level":50}},"kim chung trao la tuyet chieu cua phai nao":{"question":"Kim Chung Tráo là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":42,"faction_key":"tianwang","required_level":50}},"vo tam tram la chieu thuc cua phai nao":{"question":"Vô Tâm Trảm là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":32,"faction_key":"tianwang","required_level":60}},"vo tam tram thuoc phai nao":{"question":"Vô Tâm Trảm thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":32,"faction_key":"tianwang","required_level":60}},"vo tam tram la tuyet chieu cua phai nao":{"question":"Vô Tâm Trảm là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":32,"faction_key":"tianwang","required_level":60}},"thien vuong chien y la chieu thuc cua phai nao":{"question":"Thiên Vương Chiến ý là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":36,"faction_key":"tianwang","required_level":60}},"thien vuong chien y thuoc phai nao":{"question":"Thiên Vương Chiến ý thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":36,"faction_key":"tianwang","required_level":60}},"thien vuong chien y la tuyet chieu cua phai nao":{"question":"Thiên Vương Chiến ý là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":36,"faction_key":"tianwang","required_level":60}},"huyet chien bat phuong la chieu thuc cua phai nao":{"question":"Huyết Chiến Bát Phương là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":41,"faction_key":"tianwang","required_level":60}},"huyet chien bat phuong thuoc phai nao":{"question":"Huyết Chiến Bát Phương thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":41,"faction_key":"tianwang","required_level":60}},"huyet chien bat phuong la tuyet chieu cua phai nao":{"question":"Huyết Chiến Bát Phương là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":41,"faction_key":"tianwang","required_level":60}},"thua long quyet la chieu thuc cua phai nao":{"question":"Thừa Long Quyết là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":324,"faction_key":"tianwang","required_level":60}},"thua long quyet thuoc phai nao":{"question":"Thừa Long Quyết thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":324,"faction_key":"tianwang","required_level":60}},"thua long quyet la tuyet chieu cua phai nao":{"question":"Thừa Long Quyết là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":324,"faction_key":"tianwang","required_level":60}},"pha thien tram thuoc phai nao":{"question":"Phá Thiên Trảm thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":322,"faction_key":"tianwang","required_level":80}},"pha thien tram la tuyet chieu cua phai nao":{"question":"Phá Thiên Trảm là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":322,"faction_key":"tianwang","required_level":80}},"truy tinh truc nguyet thuoc phai nao":{"question":"Truy Tinh Trục Nguyệt thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":323,"faction_key":"tianwang","required_level":80}},"truy tinh truc nguyet la tuyet chieu cua phai nao":{"question":"Truy Tinh Trục Nguyệt là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":323,"faction_key":"tianwang","required_level":80}},"truy phong quyet la chieu thuc cua phai nao":{"question":"Truy Phong Quyết là chiêu thức của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":325,"faction_key":"tianwang","required_level":80}},"truy phong quyet thuoc phai nao":{"question":"Truy Phong Quyết thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":325,"faction_key":"tianwang","required_level":80}},"truy phong quyet la tuyet chieu cua phai nao":{"question":"Truy Phong Quyết là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":325,"faction_key":"tianwang","required_level":80}},"hao hung tram thuoc phai nao":{"question":"Hào Hùng Trảm thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1058,"faction_key":"tianwang","required_level":150}},"hao hung tram la tuyet chieu cua phai nao":{"question":"Hào Hùng Trảm là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1058,"faction_key":"tianwang","required_level":150}},"tung hoanh bat hoang thuoc phai nao":{"question":"Tung Hoành Bát Hoang thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1059,"faction_key":"tianwang","required_level":150}},"tung hoanh bat hoang la tuyet chieu cua phai nao":{"question":"Tung Hoành Bát Hoang là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1059,"faction_key":"tianwang","required_level":150}},"ba vuong tam kim thuoc phai nao":{"question":"Bá Vương Tạm Kim thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1060,"faction_key":"tianwang","required_level":150}},"ba vuong tam kim la tuyet chieu cua phai nao":{"question":"Bá Vương Tạm Kim là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1060,"faction_key":"tianwang","required_level":150}},"duong mon am khi la chieu thuc cua phai nao":{"question":"Đường Môn ám khí là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":43,"faction_key":"tangmen","required_level":10}},"duong mon am khi thuoc phai nao":{"question":"Đường Môn ám khí thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":43,"faction_key":"tangmen","required_level":10}},"duong mon am khi la tuyet chieu cua phai nao":{"question":"Đường Môn ám khí là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":43,"faction_key":"tangmen","required_level":10}},"phich lich don la chieu thuc cua phai nao":{"question":"Phích Lịch đơn là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":45,"faction_key":"tangmen","required_level":1}},"phich lich don thuoc phai nao":{"question":"Phích Lịch đơn thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":45,"faction_key":"tangmen","required_level":1}},"phich lich don la tuyet chieu cua phai nao":{"question":"Phích Lịch đơn là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":45,"faction_key":"tangmen","required_level":1}},"dia diem hoa la chieu thuc cua phai nao":{"question":"Địa Diệm Hỏa là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":347,"faction_key":"tangmen","required_level":10}},"dia diem hoa thuoc phai nao":{"question":"Địa Diệm Hỏa thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":347,"faction_key":"tangmen","required_level":10}},"dia diem hoa la tuyet chieu cua phai nao":{"question":"Địa Diệm Hỏa là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":347,"faction_key":"tangmen","required_level":10}},"doc thich cot la chieu thuc cua phai nao":{"question":"Độc Thích Cốt là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":303,"faction_key":"tangmen","required_level":20}},"doc thich cot thuoc phai nao":{"question":"Độc Thích Cốt thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":303,"faction_key":"tangmen","required_level":20}},"doc thich cot la tuyet chieu cua phai nao":{"question":"Độc Thích Cốt là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":303,"faction_key":"tangmen","required_level":20}},"doat hon tieu la chieu thuc cua phai nao":{"question":"Đoạt Hồn Tiêu là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":47,"faction_key":"tangmen","required_level":30}},"doat hon tieu thuoc phai nao":{"question":"Đoạt Hồn Tiêu thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":47,"faction_key":"tangmen","required_level":30}},"doat hon tieu la tuyet chieu cua phai nao":{"question":"Đoạt Hồn Tiêu là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":47,"faction_key":"tangmen","required_level":30}},"truy tam tien la chieu thuc cua phai nao":{"question":"Truy Tâm Tiễn là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":50,"faction_key":"tangmen","required_level":30}},"truy tam tien thuoc phai nao":{"question":"Truy Tâm Tiễn thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":50,"faction_key":"tangmen","required_level":30}},"truy tam tien la tuyet chieu cua phai nao":{"question":"Truy Tâm Tiễn là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":50,"faction_key":"tangmen","required_level":30}},"man thien hoa vu la chieu thuc cua phai nao":{"question":"Mạn Thiên Hoa Vũ là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":54,"faction_key":"tangmen","required_level":30}},"man thien hoa vu thuoc phai nao":{"question":"Mạn Thiên Hoa Vũ thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":54,"faction_key":"tangmen","required_level":30}},"man thien hoa vu la tuyet chieu cua phai nao":{"question":"Mạn Thiên Hoa Vũ là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":54,"faction_key":"tangmen","required_level":30}},"xuyen tam thich la chieu thuc cua phai nao":{"question":"Xuyên Tâm Thích là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":343,"faction_key":"tangmen","required_level":30}},"xuyen tam thich thuoc phai nao":{"question":"Xuyên Tâm Thích thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":343,"faction_key":"tangmen","required_level":30}},"xuyen tam thich la tuyet chieu cua phai nao":{"question":"Xuyên Tâm Thích là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":343,"faction_key":"tangmen","required_level":30}},"han bang thich la chieu thuc cua phai nao":{"question":"Hàn Băng Thích là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":345,"faction_key":"tangmen","required_level":40}},"han bang thich thuoc phai nao":{"question":"Hàn Băng Thích thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":345,"faction_key":"tangmen","required_level":40}},"han bang thich la tuyet chieu cua phai nao":{"question":"Hàn Băng Thích là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":345,"faction_key":"tangmen","required_level":40}},"loi kich thuat la chieu thuc cua phai nao":{"question":"Lôi Kích Thuật là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":349,"faction_key":"tangmen","required_level":50}},"loi kich thuat thuoc phai nao":{"question":"Lôi Kích Thuật thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":349,"faction_key":"tangmen","required_level":50}},"loi kich thuat la tuyet chieu cua phai nao":{"question":"Lôi Kích Thuật là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":349,"faction_key":"tangmen","required_level":50}},"tam nhan la chieu thuc cua phai nao":{"question":"Tâm Nhãn là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":48,"faction_key":"tangmen","required_level":60}},"tam nhan thuoc phai nao":{"question":"Tâm Nhãn thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":48,"faction_key":"tangmen","required_level":60}},"tam nhan la tuyet chieu cua phai nao":{"question":"Tâm Nhãn là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":48,"faction_key":"tangmen","required_level":60}},"thien la dia vong la chieu thuc cua phai nao":{"question":"Thiên La Địa Võng là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":58,"faction_key":"tangmen","required_level":60}},"thien la dia vong thuoc phai nao":{"question":"Thiên La Địa Võng thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":58,"faction_key":"tangmen","required_level":60}},"thien la dia vong la tuyet chieu cua phai nao":{"question":"Thiên La Địa Võng là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":58,"faction_key":"tangmen","required_level":60}},"tieu ly phi dao la chieu thuc cua phai nao":{"question":"Tiểu Lý Phi Đao là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":249,"faction_key":"tangmen","required_level":60}},"tieu ly phi dao thuoc phai nao":{"question":"Tiểu Lý Phi Đao thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":249,"faction_key":"tangmen","required_level":60}},"tieu ly phi dao la tuyet chieu cua phai nao":{"question":"Tiểu Lý Phi Đao là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":249,"faction_key":"tangmen","required_level":60}},"tan hoa tieu la chieu thuc cua phai nao":{"question":"Tán Hoa Tiêu là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":341,"faction_key":"tangmen","required_level":60}},"tan hoa tieu thuoc phai nao":{"question":"Tán Hoa Tiêu thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":341,"faction_key":"tangmen","required_level":60}},"tan hoa tieu la tuyet chieu cua phai nao":{"question":"Tán Hoa Tiêu là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":341,"faction_key":"tangmen","required_level":60}},"bao vu le hoa thuoc phai nao":{"question":"Bạo Vũ Lê Hoa thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":302,"faction_key":"tangmen","required_level":80}},"bao vu le hoa la tuyet chieu cua phai nao":{"question":"Bạo Vũ Lê Hoa là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":302,"faction_key":"tangmen","required_level":80}},"nhiep hon nguyet anh la chieu thuc cua phai nao":{"question":"Nhiếp Hồn Nguyệt ảnh là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":339,"faction_key":"tangmen","required_level":80}},"nhiep hon nguyet anh thuoc phai nao":{"question":"Nhiếp Hồn Nguyệt ảnh thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":339,"faction_key":"tangmen","required_level":80}},"nhiep hon nguyet anh la tuyet chieu cua phai nao":{"question":"Nhiếp Hồn Nguyệt ảnh là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":339,"faction_key":"tangmen","required_level":80}},"cuu cung phi tinh thuoc phai nao":{"question":"Cửu Cung Phi Tinh thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":342,"faction_key":"tangmen","required_level":80}},"cuu cung phi tinh la tuyet chieu cua phai nao":{"question":"Cửu Cung Phi Tinh là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":342,"faction_key":"tangmen","required_level":80}},"loan hoan kich la chieu thuc cua phai nao":{"question":"Loạn Hoàn Kích là chiêu thức của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":351,"faction_key":"tangmen","required_level":80}},"loan hoan kich thuoc phai nao":{"question":"Loạn Hoàn Kích thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":351,"faction_key":"tangmen","required_level":80}},"loan hoan kich la tuyet chieu cua phai nao":{"question":"Loạn Hoàn Kích là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":351,"faction_key":"tangmen","required_level":80}},"vo anh xuyen thuoc phai nao":{"question":"Vô Ảnh Xuyên thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1069,"faction_key":"tangmen","required_level":150}},"vo anh xuyen la tuyet chieu cua phai nao":{"question":"Vô Ảnh Xuyên là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1069,"faction_key":"tangmen","required_level":150}},"thiet lien tu sat thuoc phai nao":{"question":"Thiết Liên Tứ Sát thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1070,"faction_key":"tangmen","required_level":150}},"thiet lien tu sat la tuyet chieu cua phai nao":{"question":"Thiết Liên Tứ Sát là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1070,"faction_key":"tangmen","required_level":150}},"can khon nhat trich thuoc phai nao":{"question":"Càn Khôn Nhất Trịch thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1071,"faction_key":"tangmen","required_level":150}},"can khon nhat trich la tuyet chieu cua phai nao":{"question":"Càn Khôn Nhất Trịch là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1071,"faction_key":"tangmen","required_level":150}},"ngu doc dao phap la chieu thuc cua phai nao":{"question":"Ngũ Độc Đao pháp là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":60,"faction_key":"wudu","required_level":10}},"ngu doc dao phap thuoc phai nao":{"question":"Ngũ Độc Đao pháp thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":60,"faction_key":"wudu","required_level":10}},"ngu doc dao phap la tuyet chieu cua phai nao":{"question":"Ngũ Độc Đao pháp là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":60,"faction_key":"wudu","required_level":10}},"ngu doc chuong phap la chieu thuc cua phai nao":{"question":"Ngũ Độc Chưởng Pháp là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":62,"faction_key":"wudu","required_level":10}},"ngu doc chuong phap thuoc phai nao":{"question":"Ngũ Độc Chưởng Pháp thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":62,"faction_key":"wudu","required_level":10}},"ngu doc chuong phap la tuyet chieu cua phai nao":{"question":"Ngũ Độc Chưởng Pháp là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":62,"faction_key":"wudu","required_level":10}},"doc sa chuong la chieu thuc cua phai nao":{"question":"Độc Sa chưởng là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":63,"faction_key":"wudu","required_level":1}},"doc sa chuong thuoc phai nao":{"question":"Độc Sa chưởng thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":63,"faction_key":"wudu","required_level":1}},"doc sa chuong la tuyet chieu cua phai nao":{"question":"Độc Sa chưởng là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":63,"faction_key":"wudu","required_level":1}},"huyet dao doc sat la chieu thuc cua phai nao":{"question":"Huyết Đao Độc Sát là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":65,"faction_key":"wudu","required_level":10}},"huyet dao doc sat thuoc phai nao":{"question":"Huyết Đao Độc Sát thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":65,"faction_key":"wudu","required_level":10}},"huyet dao doc sat la tuyet chieu cua phai nao":{"question":"Huyết Đao Độc Sát là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":65,"faction_key":"wudu","required_level":10}},"cuu thien cuong loi la chieu thuc cua phai nao":{"question":"Cửu Thiên Cuồng Lôi là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":67,"faction_key":"wudu","required_level":10}},"cuu thien cuong loi thuoc phai nao":{"question":"Cửu Thiên Cuồng Lôi thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":67,"faction_key":"wudu","required_level":10}},"cuu thien cuong loi la tuyet chieu cua phai nao":{"question":"Cửu Thiên Cuồng Lôi là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":67,"faction_key":"wudu","required_level":10}},"tap nan duoc kinh la chieu thuc cua phai nao":{"question":"Tạp Nan Dược Kinh là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":66,"faction_key":"wudu","required_level":20}},"tap nan duoc kinh thuoc phai nao":{"question":"Tạp Nan Dược Kinh thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":66,"faction_key":"wudu","required_level":20}},"tap nan duoc kinh la tuyet chieu cua phai nao":{"question":"Tạp Nan Dược Kinh là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":66,"faction_key":"wudu","required_level":20}},"xich diem thuc thien la chieu thuc cua phai nao":{"question":"Xích Diệm Thực Thiên là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":70,"faction_key":"wudu","required_level":20}},"xich diem thuc thien thuoc phai nao":{"question":"Xích Diệm Thực Thiên thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":70,"faction_key":"wudu","required_level":20}},"xich diem thuc thien la tuyet chieu cua phai nao":{"question":"Xích Diệm Thực Thiên là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":70,"faction_key":"wudu","required_level":20}},"bang lam huyen tinh la chieu thuc cua phai nao":{"question":"Băng Lam Huyền Tinh là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":64,"faction_key":"wudu","required_level":30}},"bang lam huyen tinh thuoc phai nao":{"question":"Băng Lam Huyền Tinh thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":64,"faction_key":"wudu","required_level":30}},"bang lam huyen tinh la tuyet chieu cua phai nao":{"question":"Băng Lam Huyền Tinh là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":64,"faction_key":"wudu","required_level":30}},"u minh kho lau la chieu thuc cua phai nao":{"question":"U Minh Khô Lâu là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":68,"faction_key":"wudu","required_level":30}},"u minh kho lau thuoc phai nao":{"question":"U Minh Khô Lâu thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":68,"faction_key":"wudu","required_level":30}},"u minh kho lau la tuyet chieu cua phai nao":{"question":"U Minh Khô Lâu là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":68,"faction_key":"wudu","required_level":30}},"vo hinh doc la chieu thuc cua phai nao":{"question":"Vô Hình Độc là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":69,"faction_key":"wudu","required_level":30}},"vo hinh doc thuoc phai nao":{"question":"Vô Hình Độc thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":69,"faction_key":"wudu","required_level":30}},"vo hinh doc la tuyet chieu cua phai nao":{"question":"Vô Hình Độc là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":69,"faction_key":"wudu","required_level":30}},"bach doc xuyen tam la chieu thuc cua phai nao":{"question":"Bách Độc Xuyên Tâm là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":384,"faction_key":"wudu","required_level":30}},"bach doc xuyen tam thuoc phai nao":{"question":"Bách Độc Xuyên Tâm thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":384,"faction_key":"wudu","required_level":30}},"bach doc xuyen tam la tuyet chieu cua phai nao":{"question":"Bách Độc Xuyên Tâm là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":384,"faction_key":"wudu","required_level":30}},"van doc thuc tam la chieu thuc cua phai nao":{"question":"Vạn Độc Thực Tâm là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":73,"faction_key":"wudu","required_level":40}},"van doc thuc tam thuoc phai nao":{"question":"Vạn Độc Thực Tâm thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":73,"faction_key":"wudu","required_level":40}},"van doc thuc tam la tuyet chieu cua phai nao":{"question":"Vạn Độc Thực Tâm là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":73,"faction_key":"wudu","required_level":40}},"xuyen y pha giap la chieu thuc cua phai nao":{"question":"Xuyên Y Phá Giáp là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":356,"faction_key":"wudu","required_level":40}},"xuyen y pha giap thuoc phai nao":{"question":"Xuyên Y Phá Giáp thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":356,"faction_key":"wudu","required_level":40}},"xuyen y pha giap la tuyet chieu cua phai nao":{"question":"Xuyên Y Phá Giáp là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":356,"faction_key":"wudu","required_level":40}},"xuyen tam doc thich la chieu thuc cua phai nao":{"question":"Xuyên Tâm Độc Thích là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":72,"faction_key":"wudu","required_level":50}},"xuyen tam doc thich thuoc phai nao":{"question":"Xuyên Tâm Độc Thích thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":72,"faction_key":"wudu","required_level":50}},"xuyen tam doc thich la tuyet chieu cua phai nao":{"question":"Xuyên Tâm Độc Thích là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":72,"faction_key":"wudu","required_level":50}},"thien cuong dia sat la chieu thuc cua phai nao":{"question":"Thiên Cương Địa Sát là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":71,"faction_key":"wudu","required_level":60}},"thien cuong dia sat thuoc phai nao":{"question":"Thiên Cương Địa Sát thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":71,"faction_key":"wudu","required_level":60}},"thien cuong dia sat la tuyet chieu cua phai nao":{"question":"Thiên Cương Địa Sát là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":71,"faction_key":"wudu","required_level":60}},"chu cap thanh minh la chieu thuc cua phai nao":{"question":"Chu Cáp Thanh Minh là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":74,"faction_key":"wudu","required_level":60}},"chu cap thanh minh thuoc phai nao":{"question":"Chu Cáp Thanh Minh thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":74,"faction_key":"wudu","required_level":60}},"chu cap thanh minh la tuyet chieu cua phai nao":{"question":"Chu Cáp Thanh Minh là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":74,"faction_key":"wudu","required_level":60}},"ngu doc ky kinh la chieu thuc cua phai nao":{"question":"Ngũ Độc Kỳ Kinh là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":75,"faction_key":"wudu","required_level":60}},"ngu doc ky kinh thuoc phai nao":{"question":"Ngũ Độc Kỳ Kinh thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":75,"faction_key":"wudu","required_level":60}},"ngu doc ky kinh la tuyet chieu cua phai nao":{"question":"Ngũ Độc Kỳ Kinh là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":75,"faction_key":"wudu","required_level":60}},"am phong thuc cot thuoc phai nao":{"question":"Âm Phong Thực Cốt thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":353,"faction_key":"wudu","required_level":80}},"am phong thuc cot la tuyet chieu cua phai nao":{"question":"Âm Phong Thực Cốt là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":353,"faction_key":"wudu","required_level":80}},"huyen am tram la chieu thuc cua phai nao":{"question":"Huyền Âm Trảm là chiêu thức của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":355,"faction_key":"wudu","required_level":80}},"huyen am tram thuoc phai nao":{"question":"Huyền Âm Trảm thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":355,"faction_key":"wudu","required_level":80}},"huyen am tram la tuyet chieu cua phai nao":{"question":"Huyền Âm Trảm là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":355,"faction_key":"wudu","required_level":80}},"doan can hu cot thuoc phai nao":{"question":"Đoạn Cân Hủ Cốt thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":390,"faction_key":"wudu","required_level":80}},"doan can hu cot la tuyet chieu cua phai nao":{"question":"Đoạn Cân Hủ Cốt là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":390,"faction_key":"wudu","required_level":80}},"hinh tieu cot lap thuoc phai nao":{"question":"Hình Tiêu Cốt Lập thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1066,"faction_key":"wudu","required_level":150}},"hinh tieu cot lap la tuyet chieu cua phai nao":{"question":"Hình Tiêu Cốt Lập là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1066,"faction_key":"wudu","required_level":150}},"u hon phe anh thuoc phai nao":{"question":"U Hồn Phệ Ảnh thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1067,"faction_key":"wudu","required_level":150}},"u hon phe anh la tuyet chieu cua phai nao":{"question":"U Hồn Phệ Ảnh là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1067,"faction_key":"wudu","required_level":150}},"nga mi kiem phap la chieu thuc cua phai nao":{"question":"Nga Mi Kiếm pháp là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":77,"faction_key":"emei","required_level":10}},"nga mi kiem phap thuoc phai nao":{"question":"Nga Mi Kiếm pháp thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":77,"faction_key":"emei","required_level":10}},"nga mi kiem phap la tuyet chieu cua phai nao":{"question":"Nga Mi Kiếm pháp là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":77,"faction_key":"emei","required_level":10}},"nga mi chuong phap la chieu thuc cua phai nao":{"question":"Nga Mi Chưởng pháp là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":79,"faction_key":"emei","required_level":10}},"nga mi chuong phap thuoc phai nao":{"question":"Nga Mi Chưởng pháp thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":79,"faction_key":"emei","required_level":10}},"nga mi chuong phap la tuyet chieu cua phai nao":{"question":"Nga Mi Chưởng pháp là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":79,"faction_key":"emei","required_level":10}},"phieu tuyet xuyen van la chieu thuc cua phai nao":{"question":"Phiêu Tuyết Xuyên Vân là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":80,"faction_key":"emei","required_level":1}},"phieu tuyet xuyen van thuoc phai nao":{"question":"Phiêu Tuyết Xuyên Vân thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":80,"faction_key":"emei","required_level":1}},"phieu tuyet xuyen van la tuyet chieu cua phai nao":{"question":"Phiêu Tuyết Xuyên Vân là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":80,"faction_key":"emei","required_level":1}},"nhat diep tri thu la chieu thuc cua phai nao":{"question":"Nhất Diệp Tri Thu là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":85,"faction_key":"emei","required_level":10}},"nhat diep tri thu thuoc phai nao":{"question":"Nhất Diệp Tri Thu thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":85,"faction_key":"emei","required_level":10}},"nhat diep tri thu la tuyet chieu cua phai nao":{"question":"Nhất Diệp Tri Thu là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":85,"faction_key":"emei","required_level":10}},"tu hang pho do la chieu thuc cua phai nao":{"question":"Từ Hàng Phổ Độ là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":93,"faction_key":"emei","required_level":20}},"tu hang pho do thuoc phai nao":{"question":"Từ Hàng Phổ Độ thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":93,"faction_key":"emei","required_level":20}},"tu hang pho do la tuyet chieu cua phai nao":{"question":"Từ Hàng Phổ Độ là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":93,"faction_key":"emei","required_level":20}},"tu tuong dong quy la chieu thuc cua phai nao":{"question":"Tứ Tượng Đồng Quy là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":82,"faction_key":"emei","required_level":30}},"tu tuong dong quy thuoc phai nao":{"question":"Tứ Tượng Đồng Quy thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":82,"faction_key":"emei","required_level":30}},"tu tuong dong quy la tuyet chieu cua phai nao":{"question":"Tứ Tượng Đồng Quy là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":82,"faction_key":"emei","required_level":30}},"mong diep la chieu thuc cua phai nao":{"question":"Mộng Điệp là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":89,"faction_key":"emei","required_level":30}},"mong diep thuoc phai nao":{"question":"Mộng Điệp thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":89,"faction_key":"emei","required_level":30}},"mong diep la tuyet chieu cua phai nao":{"question":"Mộng Điệp là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":89,"faction_key":"emei","required_level":30}},"thoi song vong nguyet la chieu thuc cua phai nao":{"question":"Thôi Song Vọng Nguyệt là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":385,"faction_key":"emei","required_level":30}},"thoi song vong nguyet thuoc phai nao":{"question":"Thôi Song Vọng Nguyệt thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":385,"faction_key":"emei","required_level":30}},"thoi song vong nguyet la tuyet chieu cua phai nao":{"question":"Thôi Song Vọng Nguyệt là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":385,"faction_key":"emei","required_level":30}},"luu thuy la chieu thuc cua phai nao":{"question":"Lưu Thủy là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":86,"faction_key":"emei","required_level":40}},"luu thuy thuoc phai nao":{"question":"Lưu Thủy thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":86,"faction_key":"emei","required_level":40}},"luu thuy la tuyet chieu cua phai nao":{"question":"Lưu Thủy là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":86,"faction_key":"emei","required_level":40}},"phat tam tu huu la chieu thuc cua phai nao":{"question":"Phật Tâm Từ Hữu là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":92,"faction_key":"emei","required_level":50}},"phat tam tu huu thuoc phai nao":{"question":"Phật Tâm Từ Hữu thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":92,"faction_key":"emei","required_level":50}},"phat tam tu huu la tuyet chieu cua phai nao":{"question":"Phật Tâm Từ Hữu là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":92,"faction_key":"emei","required_level":50}},"bat diet bat tuyet la chieu thuc cua phai nao":{"question":"Bất Diệt Bất Tuyệt là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":88,"faction_key":"emei","required_level":60}},"bat diet bat tuyet thuoc phai nao":{"question":"Bất Diệt Bất Tuyệt thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":88,"faction_key":"emei","required_level":60}},"bat diet bat tuyet la tuyet chieu cua phai nao":{"question":"Bất Diệt Bất Tuyệt là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":88,"faction_key":"emei","required_level":60}},"phat quang pho chieu la chieu thuc cua phai nao":{"question":"Phật Quang Phổ Chiếu là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":91,"faction_key":"emei","required_level":60}},"phat quang pho chieu thuoc phai nao":{"question":"Phật Quang Phổ Chiếu thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":91,"faction_key":"emei","required_level":60}},"phat quang pho chieu la tuyet chieu cua phai nao":{"question":"Phật Quang Phổ Chiếu là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":91,"faction_key":"emei","required_level":60}},"phat phap vo bien la chieu thuc cua phai nao":{"question":"Phật Pháp Vô Biên là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":252,"faction_key":"emei","required_level":60}},"phat phap vo bien thuoc phai nao":{"question":"Phật Pháp Vô Biên thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":252,"faction_key":"emei","required_level":60}},"phat phap vo bien la tuyet chieu cua phai nao":{"question":"Phật Pháp Vô Biên là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":252,"faction_key":"emei","required_level":60}},"thanh am phan xuong la chieu thuc cua phai nao":{"question":"Thanh Âm Phạn Xướng là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":282,"faction_key":"emei","required_level":60}},"thanh am phan xuong thuoc phai nao":{"question":"Thanh Âm Phạn Xướng thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":282,"faction_key":"emei","required_level":60}},"thanh am phan xuong la tuyet chieu cua phai nao":{"question":"Thanh Âm Phạn Xướng là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":282,"faction_key":"emei","required_level":60}},"tam nga te tuyet thuoc phai nao":{"question":"Tam Nga Tề Tuyết thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":328,"faction_key":"emei","required_level":80}},"tam nga te tuyet la tuyet chieu cua phai nao":{"question":"Tam Nga Tề Tuyết là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":328,"faction_key":"emei","required_level":80}},"pho do chung sinh thuoc phai nao":{"question":"Phổ Độ Chúng Sinh thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":332,"faction_key":"emei","required_level":80}},"pho do chung sinh la tuyet chieu cua phai nao":{"question":"Phổ Độ Chúng Sinh là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":332,"faction_key":"emei","required_level":80}},"phong suong toai anh la chieu thuc cua phai nao":{"question":"Phong Sương Toái ảnh là chiêu thức của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":380,"faction_key":"emei","required_level":80}},"phong suong toai anh thuoc phai nao":{"question":"Phong Sương Toái ảnh thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":380,"faction_key":"emei","required_level":80}},"phong suong toai anh la tuyet chieu cua phai nao":{"question":"Phong Sương Toái ảnh là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":380,"faction_key":"emei","required_level":80}},"kiem hoa van tinh thuoc phai nao":{"question":"Kiếm Hoa Vãn Tinh thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1061,"faction_key":"emei","required_level":150}},"kiem hoa van tinh la tuyet chieu cua phai nao":{"question":"Kiếm Hoa Vãn Tinh là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1061,"faction_key":"emei","required_level":150}},"bang vu lac tinh thuoc phai nao":{"question":"Băng Vũ Lạc Tinh thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1062,"faction_key":"emei","required_level":150}},"bang vu lac tinh la tuyet chieu cua phai nao":{"question":"Băng Vũ Lạc Tinh là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1062,"faction_key":"emei","required_level":150}},"ngoc tuyen tam kinh thuoc phai nao":{"question":"Ngọc Tuyền Tâm Kinh thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1114,"faction_key":"emei","required_level":150}},"ngoc tuyen tam kinh la tuyet chieu cua phai nao":{"question":"Ngọc Tuyền Tâm Kinh là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1114,"faction_key":"emei","required_level":150}},"thuy yen dao phap la chieu thuc cua phai nao":{"question":"Thúy Yên Đao pháp là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":95,"faction_key":"cuiyan","required_level":10}},"thuy yen dao phap thuoc phai nao":{"question":"Thúy Yên Đao pháp thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":95,"faction_key":"cuiyan","required_level":10}},"thuy yen dao phap la tuyet chieu cua phai nao":{"question":"Thúy Yên Đao pháp là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":95,"faction_key":"cuiyan","required_level":10}},"thuy yen song dao la chieu thuc cua phai nao":{"question":"Thúy Yên Song đao là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":97,"faction_key":"cuiyan","required_level":10}},"thuy yen song dao thuoc phai nao":{"question":"Thúy Yên Song đao thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":97,"faction_key":"cuiyan","required_level":10}},"thuy yen song dao la tuyet chieu cua phai nao":{"question":"Thúy Yên Song đao là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":97,"faction_key":"cuiyan","required_level":10}},"phong hoa tuyet nguyet la chieu thuc cua phai nao":{"question":"Phong Hoa Tuyết Nguyệt là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":99,"faction_key":"cuiyan","required_level":1}},"phong hoa tuyet nguyet thuoc phai nao":{"question":"Phong Hoa Tuyết Nguyệt thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":99,"faction_key":"cuiyan","required_level":1}},"phong hoa tuyet nguyet la tuyet chieu cua phai nao":{"question":"Phong Hoa Tuyết Nguyệt là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":99,"faction_key":"cuiyan","required_level":1}},"phong quyen tan tuyet la chieu thuc cua phai nao":{"question":"Phong Quyển Tàn Tuyết là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":102,"faction_key":"cuiyan","required_level":10}},"phong quyen tan tuyet thuoc phai nao":{"question":"Phong Quyển Tàn Tuyết thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":102,"faction_key":"cuiyan","required_level":10}},"phong quyen tan tuyet la tuyet chieu cua phai nao":{"question":"Phong Quyển Tàn Tuyết là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":102,"faction_key":"cuiyan","required_level":10}},"bang tam trai anh la chieu thuc cua phai nao":{"question":"Băng Tâm Trái ảnh là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":269,"faction_key":"cuiyan","required_level":20}},"bang tam trai anh thuoc phai nao":{"question":"Băng Tâm Trái ảnh thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":269,"faction_key":"cuiyan","required_level":20}},"bang tam trai anh la tuyet chieu cua phai nao":{"question":"Băng Tâm Trái ảnh là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":269,"faction_key":"cuiyan","required_level":20}},"vu da le hoa la chieu thuc cua phai nao":{"question":"Vũ Đả Lê Hoa là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":105,"faction_key":"cuiyan","required_level":30}},"vu da le hoa thuoc phai nao":{"question":"Vũ Đả Lê Hoa thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":105,"faction_key":"cuiyan","required_level":30}},"vu da le hoa la tuyet chieu cua phai nao":{"question":"Vũ Đả Lê Hoa là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":105,"faction_key":"cuiyan","required_level":30}},"phu van tan tuyet la chieu thuc cua phai nao":{"question":"Phù Vân Tán Tuyết là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":113,"faction_key":"cuiyan","required_level":30}},"phu van tan tuyet thuoc phai nao":{"question":"Phù Vân Tán Tuyết thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":113,"faction_key":"cuiyan","required_level":30}},"phu van tan tuyet la tuyet chieu cua phai nao":{"question":"Phù Vân Tán Tuyết là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":113,"faction_key":"cuiyan","required_level":30}},"ho the han bang la chieu thuc cua phai nao":{"question":"Hộ Thể Hàn Băng là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":100,"faction_key":"cuiyan","required_level":40}},"ho the han bang thuoc phai nao":{"question":"Hộ Thể Hàn Băng thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":100,"faction_key":"cuiyan","required_level":40}},"ho the han bang la tuyet chieu cua phai nao":{"question":"Hộ Thể Hàn Băng là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":100,"faction_key":"cuiyan","required_level":40}},"tuyet anh la chieu thuc cua phai nao":{"question":"Tuyết ảnh là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":109,"faction_key":"cuiyan","required_level":50}},"tuyet anh thuoc phai nao":{"question":"Tuyết ảnh thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":109,"faction_key":"cuiyan","required_level":50}},"tuyet anh la tuyet chieu cua phai nao":{"question":"Tuyết ảnh là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":109,"faction_key":"cuiyan","required_level":50}},"muc da luu tinh la chieu thuc cua phai nao":{"question":"Mục Dã Lưu Tinh là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":108,"faction_key":"cuiyan","required_level":60}},"muc da luu tinh thuoc phai nao":{"question":"Mục Dã Lưu Tinh thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":108,"faction_key":"cuiyan","required_level":60}},"muc da luu tinh la tuyet chieu cua phai nao":{"question":"Mục Dã Lưu Tinh là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":108,"faction_key":"cuiyan","required_level":60}},"bich hai trieu sinh la chieu thuc cua phai nao":{"question":"Bích Hải Triều Sinh là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":111,"faction_key":"cuiyan","required_level":60}},"bich hai trieu sinh thuoc phai nao":{"question":"Bích Hải Triều Sinh thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":111,"faction_key":"cuiyan","required_level":60}},"bich hai trieu sinh la tuyet chieu cua phai nao":{"question":"Bích Hải Triều Sinh là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":111,"faction_key":"cuiyan","required_level":60}},"bang cot tuyet tam la chieu thuc cua phai nao":{"question":"Băng Cốt Tuyết Tâm là chiêu thức của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":114,"faction_key":"cuiyan","required_level":60}},"bang cot tuyet tam thuoc phai nao":{"question":"Băng Cốt Tuyết Tâm thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":114,"faction_key":"cuiyan","required_level":60}},"bang cot tuyet tam la tuyet chieu cua phai nao":{"question":"Băng Cốt Tuyết Tâm là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":114,"faction_key":"cuiyan","required_level":60}},"bang tung vo anh thuoc phai nao":{"question":"Băng Tung Vô ảnh thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":336,"faction_key":"cuiyan","required_level":80}},"bang tung vo anh la tuyet chieu cua phai nao":{"question":"Băng Tung Vô ảnh là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":336,"faction_key":"cuiyan","required_level":80}},"bang tam tien tu thuoc phai nao":{"question":"Băng Tâm Tiên Tử thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":337,"faction_key":"cuiyan","required_level":80}},"bang tam tien tu la tuyet chieu cua phai nao":{"question":"Băng Tâm Tiên Tử là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":337,"faction_key":"cuiyan","required_level":80}},"bang tuoc hoat ky thuoc phai nao":{"question":"Băng Tước Hoạt Kỳ thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1063,"faction_key":"cuiyan","required_level":150}},"bang tuoc hoat ky la tuyet chieu cua phai nao":{"question":"Băng Tước Hoạt Kỳ là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1063,"faction_key":"cuiyan","required_level":150}},"thuy anh man tu thuoc phai nao":{"question":"Thủy Anh Man Tú thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1065,"faction_key":"cuiyan","required_level":150}},"thuy anh man tu la tuyet chieu cua phai nao":{"question":"Thủy Anh Man Tú là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1065,"faction_key":"cuiyan","required_level":150}},"cai bang bong phap la chieu thuc cua phai nao":{"question":"Cái Bang Bổng pháp là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":115,"faction_key":"gaibang","required_level":10}},"cai bang bong phap thuoc phai nao":{"question":"Cái Bang Bổng pháp thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":115,"faction_key":"gaibang","required_level":10}},"cai bang bong phap la tuyet chieu cua phai nao":{"question":"Cái Bang Bổng pháp là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":115,"faction_key":"gaibang","required_level":10}},"cai bang chuong phap la chieu thuc cua phai nao":{"question":"Cái Bang Chưởng Pháp là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":116,"faction_key":"gaibang","required_level":10}},"cai bang chuong phap thuoc phai nao":{"question":"Cái Bang Chưởng Pháp thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":116,"faction_key":"gaibang","required_level":10}},"cai bang chuong phap la tuyet chieu cua phai nao":{"question":"Cái Bang Chưởng Pháp là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":116,"faction_key":"gaibang","required_level":10}},"dien mon thac bat la chieu thuc cua phai nao":{"question":"Diên Môn Thác Bát là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":119,"faction_key":"gaibang","required_level":1}},"dien mon thac bat thuoc phai nao":{"question":"Diên Môn Thác Bát thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":119,"faction_key":"gaibang","required_level":1}},"dien mon thac bat la tuyet chieu cua phai nao":{"question":"Diên Môn Thác Bát là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":119,"faction_key":"gaibang","required_level":1}},"kien nhan than thu la chieu thuc cua phai nao":{"question":"Kiến Nhân Thần Thủ là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":122,"faction_key":"gaibang","required_level":10}},"kien nhan than thu thuoc phai nao":{"question":"Kiến Nhân Thần Thủ thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":122,"faction_key":"gaibang","required_level":10}},"kien nhan than thu la tuyet chieu cua phai nao":{"question":"Kiến Nhân Thần Thủ là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":122,"faction_key":"gaibang","required_level":10}},"hoa hiem vi di la chieu thuc cua phai nao":{"question":"Hóa Hiểm Vi Di là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":129,"faction_key":"gaibang","required_level":20}},"hoa hiem vi di thuoc phai nao":{"question":"Hóa Hiểm Vi Di thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":129,"faction_key":"gaibang","required_level":20}},"hoa hiem vi di la tuyet chieu cua phai nao":{"question":"Hóa Hiểm Vi Di là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":129,"faction_key":"gaibang","required_level":20}},"da cau bong phap la chieu thuc cua phai nao":{"question":"Đả Cẩu Bổng Pháp là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":124,"faction_key":"gaibang","required_level":30}},"da cau bong phap thuoc phai nao":{"question":"Đả Cẩu Bổng Pháp thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":124,"faction_key":"gaibang","required_level":30}},"da cau bong phap la tuyet chieu cua phai nao":{"question":"Đả Cẩu Bổng Pháp là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":124,"faction_key":"gaibang","required_level":30}},"giang long chuong la chieu thuc cua phai nao":{"question":"Giáng Long Chưởng là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":274,"faction_key":"gaibang","required_level":30}},"giang long chuong thuoc phai nao":{"question":"Giáng Long Chưởng thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":274,"faction_key":"gaibang","required_level":30}},"giang long chuong la tuyet chieu cua phai nao":{"question":"Giáng Long Chưởng là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":274,"faction_key":"gaibang","required_level":30}},"hoat bat luu thu la chieu thuc cua phai nao":{"question":"Hoạt Bất Lưu Thủ là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":277,"faction_key":"gaibang","required_level":40}},"hoat bat luu thu thuoc phai nao":{"question":"Hoạt Bất Lưu Thủ thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":277,"faction_key":"gaibang","required_level":40}},"hoat bat luu thu la tuyet chieu cua phai nao":{"question":"Hoạt Bất Lưu Thủ là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":277,"faction_key":"gaibang","required_level":40}},"bong da ac cau la chieu thuc cua phai nao":{"question":"Bổng Đả ác Cẩu là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":125,"faction_key":"gaibang","required_level":50}},"bong da ac cau thuoc phai nao":{"question":"Bổng Đả ác Cẩu thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":125,"faction_key":"gaibang","required_level":50}},"bong da ac cau la tuyet chieu cua phai nao":{"question":"Bổng Đả ác Cẩu là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":125,"faction_key":"gaibang","required_level":50}},"khang long huu hoi la chieu thuc cua phai nao":{"question":"Kháng Long Hữu Hối là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":128,"faction_key":"gaibang","required_level":50}},"khang long huu hoi thuoc phai nao":{"question":"Kháng Long Hữu Hối thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":128,"faction_key":"gaibang","required_level":50}},"khang long huu hoi la tuyet chieu cua phai nao":{"question":"Kháng Long Hữu Hối là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":128,"faction_key":"gaibang","required_level":50}},"tuy diep cuong vu la chieu thuc cua phai nao":{"question":"Túy Điệp Cuồng Vũ là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":130,"faction_key":"gaibang","required_level":60}},"tuy diep cuong vu thuoc phai nao":{"question":"Túy Điệp Cuồng Vũ thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":130,"faction_key":"gaibang","required_level":60}},"tuy diep cuong vu la tuyet chieu cua phai nao":{"question":"Túy Điệp Cuồng Vũ là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":130,"faction_key":"gaibang","required_level":60}},"tieu dieu cong la chieu thuc cua phai nao":{"question":"Tiêu Diêu Công là chiêu thức của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":360,"faction_key":"gaibang","required_level":60}},"tieu dieu cong thuoc phai nao":{"question":"Tiêu Diêu Công thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":360,"faction_key":"gaibang","required_level":60}},"tieu dieu cong la tuyet chieu cua phai nao":{"question":"Tiêu Diêu Công là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":360,"faction_key":"gaibang","required_level":60}},"phi long tai thien thuoc phai nao":{"question":"Phi Long Tại Thiên thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":357,"faction_key":"gaibang","required_level":80}},"phi long tai thien la tuyet chieu cua phai nao":{"question":"Phi Long Tại Thiên là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":357,"faction_key":"gaibang","required_level":80}},"thien ha vo cau la tuyet chieu cua phai nao":{"question":"Thiên Hạ Vô Cẩu là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":359,"faction_key":"gaibang","required_level":80}},"thoi thang luc long thuoc phai nao":{"question":"Thời Thặng Lục Long thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1073,"faction_key":"gaibang","required_level":150}},"thoi thang luc long la tuyet chieu cua phai nao":{"question":"Thời Thặng Lục Long là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1073,"faction_key":"gaibang","required_level":150}},"bong huynh luoc dia thuoc phai nao":{"question":"Bổng Huýnh Lược Địa thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1074,"faction_key":"gaibang","required_level":150}},"bong huynh luoc dia la tuyet chieu cua phai nao":{"question":"Bổng Huýnh Lược Địa là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1074,"faction_key":"gaibang","required_level":150}},"thien nhan dao phap la chieu thuc cua phai nao":{"question":"Thiên Nhẫn Đao pháp là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":131,"faction_key":"tianren","required_level":10}},"thien nhan dao phap thuoc phai nao":{"question":"Thiên Nhẫn Đao pháp thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":131,"faction_key":"tianren","required_level":10}},"thien nhan dao phap la tuyet chieu cua phai nao":{"question":"Thiên Nhẫn Đao pháp là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":131,"faction_key":"tianren","required_level":10}},"thien nhan mau phap la chieu thuc cua phai nao":{"question":"Thiên Nhẫn Mâu pháp là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":132,"faction_key":"tianren","required_level":10}},"thien nhan mau phap thuoc phai nao":{"question":"Thiên Nhẫn Mâu pháp thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":132,"faction_key":"tianren","required_level":10}},"thien nhan mau phap la tuyet chieu cua phai nao":{"question":"Thiên Nhẫn Mâu pháp là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":132,"faction_key":"tianren","required_level":10}},"tan duong nhu huyet la chieu thuc cua phai nao":{"question":"Tàn Dương Như Huyết là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":135,"faction_key":"tianren","required_level":1}},"tan duong nhu huyet thuoc phai nao":{"question":"Tàn Dương Như Huyết thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":135,"faction_key":"tianren","required_level":1}},"tan duong nhu huyet la tuyet chieu cua phai nao":{"question":"Tàn Dương Như Huyết là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":135,"faction_key":"tianren","required_level":1}},"hoa lien phan hoa la chieu thuc cua phai nao":{"question":"Hỏa Liên Phần Hoa là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":136,"faction_key":"tianren","required_level":10}},"hoa lien phan hoa thuoc phai nao":{"question":"Hỏa Liên Phần Hoa thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":136,"faction_key":"tianren","required_level":10}},"hoa lien phan hoa la tuyet chieu cua phai nao":{"question":"Hỏa Liên Phần Hoa là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":136,"faction_key":"tianren","required_level":10}},"don chi liet diem la chieu thuc cua phai nao":{"question":"Đơn Chỉ Liệt Diệm là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":145,"faction_key":"tianren","required_level":10}},"don chi liet diem thuoc phai nao":{"question":"Đơn Chỉ Liệt Diệm thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":145,"faction_key":"tianren","required_level":10}},"don chi liet diem la tuyet chieu cua phai nao":{"question":"Đơn Chỉ Liệt Diệm là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":145,"faction_key":"tianren","required_level":10}},"ao anh phi ho la chieu thuc cua phai nao":{"question":"Ảo ảnh Phi Hồ là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":137,"faction_key":"tianren","required_level":20}},"ao anh phi ho thuoc phai nao":{"question":"Ảo ảnh Phi Hồ thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":137,"faction_key":"tianren","required_level":20}},"ao anh phi ho la tuyet chieu cua phai nao":{"question":"Ảo ảnh Phi Hồ là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":137,"faction_key":"tianren","required_level":20}},"thoi son dien hai la chieu thuc cua phai nao":{"question":"Thôi sơn Điền Hải là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":138,"faction_key":"tianren","required_level":30}},"thoi son dien hai thuoc phai nao":{"question":"Thôi sơn Điền Hải thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":138,"faction_key":"tianren","required_level":30}},"thoi son dien hai la tuyet chieu cua phai nao":{"question":"Thôi sơn Điền Hải là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":138,"faction_key":"tianren","required_level":30}},"phi hong vo tich la chieu thuc cua phai nao":{"question":"Phi Hồng Vô Tích là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":140,"faction_key":"tianren","required_level":30}},"phi hong vo tich thuoc phai nao":{"question":"Phi Hồng Vô Tích thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":140,"faction_key":"tianren","required_level":30}},"phi hong vo tich la tuyet chieu cua phai nao":{"question":"Phi Hồng Vô Tích là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":140,"faction_key":"tianren","required_level":30}},"liet hoa tinh thien la chieu thuc cua phai nao":{"question":"Liệt Hỏa Tình Thiên là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":141,"faction_key":"tianren","required_level":30}},"liet hoa tinh thien thuoc phai nao":{"question":"Liệt Hỏa Tình Thiên thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":141,"faction_key":"tianren","required_level":30}},"liet hoa tinh thien la tuyet chieu cua phai nao":{"question":"Liệt Hỏa Tình Thiên là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":141,"faction_key":"tianren","required_level":30}},"bi to thanh phong la chieu thuc cua phai nao":{"question":"Bi Tô Thanh Phong là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":364,"faction_key":"tianren","required_level":40}},"bi to thanh phong thuoc phai nao":{"question":"Bi Tô Thanh Phong thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":364,"faction_key":"tianren","required_level":40}},"bi to thanh phong la tuyet chieu cua phai nao":{"question":"Bi Tô Thanh Phong là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":364,"faction_key":"tianren","required_level":40}},"lich ma doat hon la chieu thuc cua phai nao":{"question":"Lịch Ma Đoạt Hồn là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":143,"faction_key":"tianren","required_level":50}},"lich ma doat hon thuoc phai nao":{"question":"Lịch Ma Đoạt Hồn thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":143,"faction_key":"tianren","required_level":50}},"lich ma doat hon la tuyet chieu cua phai nao":{"question":"Lịch Ma Đoạt Hồn là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":143,"faction_key":"tianren","required_level":50}},"thau thien hoan nhat la chieu thuc cua phai nao":{"question":"Thâu Thiên Hoán Nhật là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":142,"faction_key":"tianren","required_level":60}},"thau thien hoan nhat thuoc phai nao":{"question":"Thâu Thiên Hoán Nhật thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":142,"faction_key":"tianren","required_level":60}},"thau thien hoan nhat la tuyet chieu cua phai nao":{"question":"Thâu Thiên Hoán Nhật là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":142,"faction_key":"tianren","required_level":60}},"ma diem that sat la chieu thuc cua phai nao":{"question":"Ma Diệm Thất Sát là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":148,"faction_key":"tianren","required_level":60}},"ma diem that sat thuoc phai nao":{"question":"Ma Diệm Thất Sát thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":148,"faction_key":"tianren","required_level":60}},"ma diem that sat la tuyet chieu cua phai nao":{"question":"Ma Diệm Thất Sát là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":148,"faction_key":"tianren","required_level":60}},"thien ma giai the la chieu thuc cua phai nao":{"question":"Thiên Ma Giải Thể là chiêu thức của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":150,"faction_key":"tianren","required_level":60}},"thien ma giai the thuoc phai nao":{"question":"Thiên Ma Giải Thể thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":150,"faction_key":"tianren","required_level":60}},"thien ma giai the la tuyet chieu cua phai nao":{"question":"Thiên Ma Giải Thể là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":150,"faction_key":"tianren","required_level":60}},"van long kich thuoc phai nao":{"question":"Vân Long Kích thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":361,"faction_key":"tianren","required_level":80}},"van long kich la tuyet chieu cua phai nao":{"question":"Vân Long Kích là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":361,"faction_key":"tianren","required_level":80}},"thien ngoai luu tinh thuoc phai nao":{"question":"Thiên Ngoại Lưu Tinh thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":362,"faction_key":"tianren","required_level":80}},"thien ngoai luu tinh la tuyet chieu cua phai nao":{"question":"Thiên Ngoại Lưu Tinh là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":362,"faction_key":"tianren","required_level":80}},"nhiep hon loan tam thuoc phai nao":{"question":"Nhiếp Hồn Loạn Tâm thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":391,"faction_key":"tianren","required_level":80}},"nhiep hon loan tam la tuyet chieu cua phai nao":{"question":"Nhiếp Hồn Loạn Tâm là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":391,"faction_key":"tianren","required_level":80}},"giang hai no lan thuoc phai nao":{"question":"Giang Hải Nộ Lan thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1075,"faction_key":"tianren","required_level":150}},"giang hai no lan la tuyet chieu cua phai nao":{"question":"Giang Hải Nộ Lan là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1075,"faction_key":"tianren","required_level":150}},"tat hoa lieu nguyen thuoc phai nao":{"question":"Tật Hỏa Liệu Nguyên thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1076,"faction_key":"tianren","required_level":150}},"tat hoa lieu nguyen la tuyet chieu cua phai nao":{"question":"Tật Hỏa Liệu Nguyên là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1076,"faction_key":"tianren","required_level":150}},"vo dang kiem phap la chieu thuc cua phai nao":{"question":"Võ Đang Kiếm pháp là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":151,"faction_key":"wudang","required_level":10}},"vo dang kiem phap thuoc phai nao":{"question":"Võ Đang Kiếm pháp thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":151,"faction_key":"wudang","required_level":10}},"vo dang kiem phap la tuyet chieu cua phai nao":{"question":"Võ Đang Kiếm pháp là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":151,"faction_key":"wudang","required_level":10}},"vo dang quyen phap la chieu thuc cua phai nao":{"question":"Võ Đang Quyền Pháp là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":152,"faction_key":"wudang","required_level":10}},"vo dang quyen phap thuoc phai nao":{"question":"Võ Đang Quyền Pháp thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":152,"faction_key":"wudang","required_level":10}},"vo dang quyen phap la tuyet chieu cua phai nao":{"question":"Võ Đang Quyền Pháp là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":152,"faction_key":"wudang","required_level":10}},"no loi chi la chieu thuc cua phai nao":{"question":"Nộ Lôi Chỉ là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":153,"faction_key":"wudang","required_level":1}},"no loi chi thuoc phai nao":{"question":"Nộ Lôi Chỉ thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":153,"faction_key":"wudang","required_level":1}},"no loi chi la tuyet chieu cua phai nao":{"question":"Nộ Lôi Chỉ là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":153,"faction_key":"wudang","required_level":1}},"thuong hai minh nguyet la chieu thuc cua phai nao":{"question":"Thương Hải Minh Nguyệt là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":155,"faction_key":"wudang","required_level":10}},"thuong hai minh nguyet thuoc phai nao":{"question":"Thương Hải Minh Nguyệt thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":155,"faction_key":"wudang","required_level":10}},"thuong hai minh nguyet la tuyet chieu cua phai nao":{"question":"Thương Hải Minh Nguyệt là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":155,"faction_key":"wudang","required_level":10}},"that tinh tran la chieu thuc cua phai nao":{"question":"Thất Tinh Trận là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":159,"faction_key":"wudang","required_level":20}},"that tinh tran thuoc phai nao":{"question":"Thất Tinh Trận thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":159,"faction_key":"wudang","required_level":20}},"that tinh tran la tuyet chieu cua phai nao":{"question":"Thất Tinh Trận là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":159,"faction_key":"wudang","required_level":20}},"kiem phi kinh thien la chieu thuc cua phai nao":{"question":"Kiếm Phi Kinh Thiên là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":158,"faction_key":"wudang","required_level":30}},"kiem phi kinh thien thuoc phai nao":{"question":"Kiếm Phi Kinh Thiên thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":158,"faction_key":"wudang","required_level":30}},"kiem phi kinh thien la tuyet chieu cua phai nao":{"question":"Kiếm Phi Kinh Thiên là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":158,"faction_key":"wudang","required_level":30}},"bac cap nhi phuc la chieu thuc cua phai nao":{"question":"Bác Cấp Nhi Phục là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":164,"faction_key":"wudang","required_level":30}},"bac cap nhi phuc thuoc phai nao":{"question":"Bác Cấp Nhi Phục thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":164,"faction_key":"wudang","required_level":30}},"bac cap nhi phuc la tuyet chieu cua phai nao":{"question":"Bác Cấp Nhi Phục là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":164,"faction_key":"wudang","required_level":30}},"the van tung la chieu thuc cua phai nao":{"question":"Thế Vân Tung là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":160,"faction_key":"wudang","required_level":40}},"the van tung thuoc phai nao":{"question":"Thế Vân Tung thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":160,"faction_key":"wudang","required_level":40}},"the van tung la tuyet chieu cua phai nao":{"question":"Thế Vân Tung là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":160,"faction_key":"wudang","required_level":40}},"toa vong vo nga la chieu thuc cua phai nao":{"question":"Tọa Vọng Vô Ngã là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":157,"faction_key":"wudang","required_level":50}},"toa vong vo nga thuoc phai nao":{"question":"Tọa Vọng Vô Ngã thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":157,"faction_key":"wudang","required_level":50}},"toa vong vo nga la tuyet chieu cua phai nao":{"question":"Tọa Vọng Vô Ngã là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":157,"faction_key":"wudang","required_level":50}},"vo nga vo kiem la chieu thuc cua phai nao":{"question":"Vô Ngã Vô Kiếm là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":165,"faction_key":"wudang","required_level":60}},"vo nga vo kiem thuoc phai nao":{"question":"Vô Ngã Vô Kiếm thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":165,"faction_key":"wudang","required_level":60}},"vo nga vo kiem la tuyet chieu cua phai nao":{"question":"Vô Ngã Vô Kiếm là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":165,"faction_key":"wudang","required_level":60}},"thai cuc than cong la chieu thuc cua phai nao":{"question":"Thái Cực Thần Công là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":166,"faction_key":"wudang","required_level":60}},"thai cuc than cong thuoc phai nao":{"question":"Thái Cực Thần Công thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":166,"faction_key":"wudang","required_level":60}},"thai cuc than cong la tuyet chieu cua phai nao":{"question":"Thái Cực Thần Công là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":166,"faction_key":"wudang","required_level":60}},"tam hoan thao nguyet la chieu thuc cua phai nao":{"question":"Tam Hoàn Thao Nguyệt là chiêu thức của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":267,"faction_key":"wudang","required_level":60}},"tam hoan thao nguyet thuoc phai nao":{"question":"Tam Hoàn Thao Nguyệt thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":267,"faction_key":"wudang","required_level":60}},"tam hoan thao nguyet la tuyet chieu cua phai nao":{"question":"Tam Hoàn Thao Nguyệt là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":267,"faction_key":"wudang","required_level":60}},"thien dia vo cuc thuoc phai nao":{"question":"Thiên Địa Vô Cực thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":365,"faction_key":"wudang","required_level":80}},"thien dia vo cuc la tuyet chieu cua phai nao":{"question":"Thiên Địa Vô Cực là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":365,"faction_key":"wudang","required_level":80}},"nhan kiem hop nhat thuoc phai nao":{"question":"Nhân Kiếm Hợp Nhất thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":368,"faction_key":"wudang","required_level":80}},"nhan kiem hop nhat la tuyet chieu cua phai nao":{"question":"Nhân Kiếm Hợp Nhất là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":368,"faction_key":"wudang","required_level":80}},"tao hoa thai thanh thuoc phai nao":{"question":"Tạo Hóa Thái Thanh thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1078,"faction_key":"wudang","required_level":150}},"tao hoa thai thanh la tuyet chieu cua phai nao":{"question":"Tạo Hóa Thái Thanh là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1078,"faction_key":"wudang","required_level":150}},"kiem thuy tinh ha thuoc phai nao":{"question":"Kiếm Thùy Tinh Hà thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1079,"faction_key":"wudang","required_level":150}},"kiem thuy tinh ha la tuyet chieu cua phai nao":{"question":"Kiếm Thùy Tinh Hà là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1079,"faction_key":"wudang","required_level":150}},"con lon dao phap la chieu thuc cua phai nao":{"question":"Côn Lôn Đao pháp là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":167,"faction_key":"kunlun","required_level":10}},"con lon dao phap thuoc phai nao":{"question":"Côn Lôn Đao pháp thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":167,"faction_key":"kunlun","required_level":10}},"con lon dao phap la tuyet chieu cua phai nao":{"question":"Côn Lôn Đao pháp là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":167,"faction_key":"kunlun","required_level":10}},"con lon kiem phap la chieu thuc cua phai nao":{"question":"Côn Lôn Kiếm pháp là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":168,"faction_key":"kunlun","required_level":10}},"con lon kiem phap thuoc phai nao":{"question":"Côn Lôn Kiếm pháp thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":168,"faction_key":"kunlun","required_level":10}},"con lon kiem phap la tuyet chieu cua phai nao":{"question":"Côn Lôn Kiếm pháp là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":168,"faction_key":"kunlun","required_level":10}},"ho phong phap la chieu thuc cua phai nao":{"question":"Hô Phong Pháp là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":169,"faction_key":"kunlun","required_level":1}},"ho phong phap thuoc phai nao":{"question":"Hô Phong Pháp thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":169,"faction_key":"kunlun","required_level":1}},"ho phong phap la tuyet chieu cua phai nao":{"question":"Hô Phong Pháp là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":169,"faction_key":"kunlun","required_level":1}},"thanh phong phu la chieu thuc cua phai nao":{"question":"Thanh Phong phù là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":171,"faction_key":"kunlun","required_level":10}},"thanh phong phu thuoc phai nao":{"question":"Thanh Phong phù thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":171,"faction_key":"kunlun","required_level":10}},"thanh phong phu la tuyet chieu cua phai nao":{"question":"Thanh Phong phù là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":171,"faction_key":"kunlun","required_level":10}},"cuong loi chan dia la chieu thuc cua phai nao":{"question":"Cuồng Lôi Chấn Địa là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":179,"faction_key":"kunlun","required_level":10}},"cuong loi chan dia thuoc phai nao":{"question":"Cuồng Lôi Chấn Địa thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":179,"faction_key":"kunlun","required_level":10}},"cuong loi chan dia la tuyet chieu cua phai nao":{"question":"Cuồng Lôi Chấn Địa là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":179,"faction_key":"kunlun","required_level":10}},"thuc phuoc chu la chieu thuc cua phai nao":{"question":"Thúc Phược Chú là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":392,"faction_key":"kunlun","required_level":10}},"thuc phuoc chu thuoc phai nao":{"question":"Thúc Phược Chú thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":392,"faction_key":"kunlun","required_level":10}},"thuc phuoc chu la tuyet chieu cua phai nao":{"question":"Thúc Phược Chú là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":392,"faction_key":"kunlun","required_level":10}},"ki ban phu la chieu thuc cua phai nao":{"question":"Ki Bán phù là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":174,"faction_key":"kunlun","required_level":20}},"ki ban phu thuoc phai nao":{"question":"Ki Bán phù thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":174,"faction_key":"kunlun","required_level":20}},"ki ban phu la tuyet chieu cua phai nao":{"question":"Ki Bán phù là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":174,"faction_key":"kunlun","required_level":20}},"thien te tan loi la chieu thuc cua phai nao":{"question":"Thiên Tế Tấn Lôi là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":172,"faction_key":"kunlun","required_level":30}},"thien te tan loi thuoc phai nao":{"question":"Thiên Tế Tấn Lôi thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":172,"faction_key":"kunlun","required_level":30}},"thien te tan loi la tuyet chieu cua phai nao":{"question":"Thiên Tế Tấn Lôi là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":172,"faction_key":"kunlun","required_level":30}},"thien thanh dia troc la chieu thuc cua phai nao":{"question":"Thiên Thanh Địa Trọc là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":173,"faction_key":"kunlun","required_level":30}},"thien thanh dia troc thuoc phai nao":{"question":"Thiên Thanh Địa Trọc thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":173,"faction_key":"kunlun","required_level":30}},"thien thanh dia troc la tuyet chieu cua phai nao":{"question":"Thiên Thanh Địa Trọc là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":173,"faction_key":"kunlun","required_level":30}},"nhat khi tam thanh la chieu thuc cua phai nao":{"question":"Nhất Khí Tam Thanh là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":178,"faction_key":"kunlun","required_level":30}},"nhat khi tam thanh thuoc phai nao":{"question":"Nhất Khí Tam Thanh thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":178,"faction_key":"kunlun","required_level":30}},"nhat khi tam thanh la tuyet chieu cua phai nao":{"question":"Nhất Khí Tam Thanh là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":178,"faction_key":"kunlun","required_level":30}},"bac minh dao hai la chieu thuc cua phai nao":{"question":"Bắc Minh Đáo Hải là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":393,"faction_key":"kunlun","required_level":30}},"bac minh dao hai thuoc phai nao":{"question":"Bắc Minh Đáo Hải thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":393,"faction_key":"kunlun","required_level":30}},"bac minh dao hai la tuyet chieu cua phai nao":{"question":"Bắc Minh Đáo Hải là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":393,"faction_key":"kunlun","required_level":30}},"khi han ngao tuyet la chieu thuc cua phai nao":{"question":"Khi Hàn Ngạo Tuyết là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":175,"faction_key":"kunlun","required_level":40}},"khi han ngao tuyet thuoc phai nao":{"question":"Khi Hàn Ngạo Tuyết thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":175,"faction_key":"kunlun","required_level":40}},"khi han ngao tuyet la tuyet chieu cua phai nao":{"question":"Khi Hàn Ngạo Tuyết là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":175,"faction_key":"kunlun","required_level":40}},"khi tam phu la chieu thuc cua phai nao":{"question":"Khí Tâm phù là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":181,"faction_key":"kunlun","required_level":40}},"khi tam phu thuoc phai nao":{"question":"Khí Tâm phù thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":181,"faction_key":"kunlun","required_level":40}},"khi tam phu la tuyet chieu cua phai nao":{"question":"Khí Tâm phù là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":181,"faction_key":"kunlun","required_level":40}},"me tung ao anh la chieu thuc cua phai nao":{"question":"Mê Tung ảo ảnh là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":90,"faction_key":"kunlun","required_level":50}},"me tung ao anh thuoc phai nao":{"question":"Mê Tung ảo ảnh thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":90,"faction_key":"kunlun","required_level":50}},"me tung ao anh la tuyet chieu cua phai nao":{"question":"Mê Tung ảo ảnh là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":90,"faction_key":"kunlun","required_level":50}},"cuong phong sau dien la chieu thuc cua phai nao":{"question":"Cuồng Phong Sậu Điện là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":176,"faction_key":"kunlun","required_level":50}},"cuong phong sau dien thuoc phai nao":{"question":"Cuồng Phong Sậu Điện thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":176,"faction_key":"kunlun","required_level":50}},"cuong phong sau dien la tuyet chieu cua phai nao":{"question":"Cuồng Phong Sậu Điện là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":176,"faction_key":"kunlun","required_level":50}},"ngu loi chanh phap la chieu thuc cua phai nao":{"question":"Ngũ Lôi Chánh Pháp là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":182,"faction_key":"kunlun","required_level":60}},"ngu loi chanh phap thuoc phai nao":{"question":"Ngũ Lôi Chánh Pháp thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":182,"faction_key":"kunlun","required_level":60}},"ngu loi chanh phap la tuyet chieu cua phai nao":{"question":"Ngũ Lôi Chánh Pháp là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":182,"faction_key":"kunlun","required_level":60}},"suong ngao con lon la chieu thuc cua phai nao":{"question":"Sương Ngạo Côn Lôn là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":275,"faction_key":"kunlun","required_level":60}},"suong ngao con lon thuoc phai nao":{"question":"Sương Ngạo Côn Lôn thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":275,"faction_key":"kunlun","required_level":60}},"suong ngao con lon la tuyet chieu cua phai nao":{"question":"Sương Ngạo Côn Lôn là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":275,"faction_key":"kunlun","required_level":60}},"huyen thien vo cuc la chieu thuc cua phai nao":{"question":"Huyền Thiên Vô Cực là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":630,"faction_key":"kunlun","required_level":60}},"huyen thien vo cuc thuoc phai nao":{"question":"Huyền Thiên Vô Cực thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":630,"faction_key":"kunlun","required_level":60}},"huyen thien vo cuc la tuyet chieu cua phai nao":{"question":"Huyền Thiên Vô Cực là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":630,"faction_key":"kunlun","required_level":60}},"ngao tuyet tieu phong thuoc phai nao":{"question":"Ngạo Tuyết Tiêu Phong thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":372,"faction_key":"kunlun","required_level":80}},"ngao tuyet tieu phong la tuyet chieu cua phai nao":{"question":"Ngạo Tuyết Tiêu Phong là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":372,"faction_key":"kunlun","required_level":80}},"loi dong cuu thien thuoc phai nao":{"question":"Lôi động Cửu Thiên thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":375,"faction_key":"kunlun","required_level":80}},"loi dong cuu thien la tuyet chieu cua phai nao":{"question":"Lôi động Cửu Thiên là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":375,"faction_key":"kunlun","required_level":80}},"tuy tien ta cot la chieu thuc cua phai nao":{"question":"Túy Tiên Tá Cốt là chiêu thức của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":394,"faction_key":"kunlun","required_level":80}},"tuy tien ta cot thuoc phai nao":{"question":"Túy Tiên Tá Cốt thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":394,"faction_key":"kunlun","required_level":80}},"tuy tien ta cot la tuyet chieu cua phai nao":{"question":"Túy Tiên Tá Cốt là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":394,"faction_key":"kunlun","required_level":80}},"cuu thien cuong phong thuoc phai nao":{"question":"Cửu Thiên Cương Phong thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1080,"faction_key":"kunlun","required_level":150}},"cuu thien cuong phong la tuyet chieu cua phai nao":{"question":"Cửu Thiên Cương Phong là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1080,"faction_key":"kunlun","required_level":150}},"thien loi chan nhac thuoc phai nao":{"question":"Thiên Lôi Chấn Nhạc thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1081,"faction_key":"kunlun","required_level":150}},"thien loi chan nhac la tuyet chieu cua phai nao":{"question":"Thiên Lôi Chấn Nhạc là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","skill_id":1081,"faction_key":"kunlun","required_level":150}},"dao hu thien thuoc phai nao":{"question":"Đảo Hư Thiên thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":708,"faction_key":"tianwang","required_level":120}},"dao hu thien la tuyet chieu cua phai nao":{"question":"Đảo Hư Thiên là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":708,"faction_key":"tianwang","required_level":120}},"dai thua nhu lai chu thuoc phai nao":{"question":"Đại Thừa Như Lai Chú thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":709,"faction_key":"shaolin","required_level":120}},"dai thua nhu lai chu la tuyet chieu cua phai nao":{"question":"Đại Thừa Như Lai Chú là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":709,"faction_key":"shaolin","required_level":120}},"me anh tung thuoc phai nao":{"question":"Mê Ảnh Tung thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":710,"faction_key":"tangmen","required_level":120}},"me anh tung la tuyet chieu cua phai nao":{"question":"Mê Ảnh Tung là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":710,"faction_key":"tangmen","required_level":120}},"hap tinh yem thuoc phai nao":{"question":"Hấp Tinh Yểm thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":711,"faction_key":"wudu","required_level":120}},"hap tinh yem la tuyet chieu cua phai nao":{"question":"Hấp Tinh Yểm là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":711,"faction_key":"wudu","required_level":120}},"be nguyet phat tran thuoc phai nao":{"question":"Bế Nguyệt Phất Trần thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":712,"faction_key":"emei","required_level":120}},"be nguyet phat tran la tuyet chieu cua phai nao":{"question":"Bế Nguyệt Phất Trần là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":712,"faction_key":"emei","required_level":120}},"ngu tuyet an thuoc phai nao":{"question":"Ngự Tuyết Ẩn thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":713,"faction_key":"cuiyan","required_level":120}},"ngu tuyet an la tuyet chieu cua phai nao":{"question":"Ngự Tuyết Ẩn là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":713,"faction_key":"cuiyan","required_level":120}},"hon thien khi cong thuoc phai nao":{"question":"Hỗn Thiên Khí Công thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":714,"faction_key":"gaibang","required_level":120}},"hon thien khi cong la tuyet chieu cua phai nao":{"question":"Hỗn Thiên Khí Công là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":714,"faction_key":"gaibang","required_level":120}},"ma am phe phach thuoc phai nao":{"question":"Ma Âm Phệ Phách thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":715,"faction_key":"tianren","required_level":120}},"ma am phe phach la tuyet chieu cua phai nao":{"question":"Ma Âm Phệ Phách là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":715,"faction_key":"tianren","required_level":120}},"xuat u bat nhiem thuoc phai nao":{"question":"Xuất Ứ Bất Nhiễm thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":716,"faction_key":"wudang","required_level":120}},"xuat u bat nhiem la tuyet chieu cua phai nao":{"question":"Xuất Ứ Bất Nhiễm là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":716,"faction_key":"wudang","required_level":120}},"luong nghi chan khi thuoc phai nao":{"question":"Lưỡng Nghi Chân Khí thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":717,"faction_key":"kunlun","required_level":120}},"luong nghi chan khi la tuyet chieu cua phai nao":{"question":"Lưỡng Nghi Chân Khí là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk120.js và /vl4/js/vlwin.js","skill_id":717,"faction_key":"kunlun","required_level":120}},"kim quyen la han thuoc phai nao":{"question":"Kim Quyên La Hán thuộc phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1220,"faction_key":"shaolin","required_level":180}},"kim quyen la han la tuyet chieu cua phai nao":{"question":"Kim Quyên La Hán là tuyệt chiêu của phái nào?","answer":"thieu lam","displayAnswer":"Thiếu Lâm","aliases":["thieu lam phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1220,"faction_key":"shaolin","required_level":180}},"chinh chien bat phuong thuoc phai nao":{"question":"Chinh Chiến Bát Phương thuộc phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1221,"faction_key":"tianwang","required_level":180}},"chinh chien bat phuong la tuyet chieu cua phai nao":{"question":"Chinh Chiến Bát Phương là tuyệt chiêu của phái nào?","answer":"thien vuong","displayAnswer":"Thiên Vương","aliases":["thien vuong bang","thien vuong phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1221,"faction_key":"tianwang","required_level":180}},"sam la doc hai thuoc phai nao":{"question":"Sâm La Độc Hải thuộc phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1222,"faction_key":"wudu","required_level":180}},"sam la doc hai la tuyet chieu cua phai nao":{"question":"Sâm La Độc Hải là tuyệt chiêu của phái nào?","answer":"ngu doc","displayAnswer":"Ngũ Độc","aliases":["ngu doc giao","ngu doc phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1222,"faction_key":"wudu","required_level":180}},"hap tinh tran thuoc phai nao":{"question":"Hấp Tinh Trận thuộc phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1223,"faction_key":"tangmen","required_level":180}},"hap tinh tran la tuyet chieu cua phai nao":{"question":"Hấp Tinh Trận là tuyệt chiêu của phái nào?","answer":"duong mon","displayAnswer":"Đường Môn","aliases":["duong mon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1223,"faction_key":"tangmen","required_level":180}},"ba la tam kinh thuoc phai nao":{"question":"Ba La Tâm Kinh thuộc phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1224,"faction_key":"emei","required_level":180}},"ba la tam kinh la tuyet chieu cua phai nao":{"question":"Ba La Tâm Kinh là tuyệt chiêu của phái nào?","answer":"nga my","displayAnswer":"Nga My","aliases":["nga my phai","nga mi"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1224,"faction_key":"emei","required_level":180}},"huyen bang vo tuc thuoc phai nao":{"question":"Huyền Băng Vô Tức thuộc phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1225,"faction_key":"cuiyan","required_level":180}},"huyen bang vo tuc la tuyet chieu cua phai nao":{"question":"Huyền Băng Vô Tức là tuyệt chiêu của phái nào?","answer":"thuy yen","displayAnswer":"Thúy Yên","aliases":["thuy yen mon","thuy yen phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1225,"faction_key":"cuiyan","required_level":180}},"liet hoa phan thien thuoc phai nao":{"question":"Liệt Hỏa Phẫn Thiên thuộc phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1226,"faction_key":"tianren","required_level":180}},"liet hoa phan thien la tuyet chieu cua phai nao":{"question":"Liệt Hỏa Phẫn Thiên là tuyệt chiêu của phái nào?","answer":"thien nhan","displayAnswer":"Thiên Nhẫn","aliases":["thien nhan giao","thien nhan phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1226,"faction_key":"tianren","required_level":180}},"o y quyet thuoc phai nao":{"question":"Ô Y Quyết thuộc phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1227,"faction_key":"gaibang","required_level":180}},"o y quyet la tuyet chieu cua phai nao":{"question":"Ô Y Quyết là tuyệt chiêu của phái nào?","answer":"cai bang","displayAnswer":"Cái Bang","aliases":["cai bang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1227,"faction_key":"gaibang","required_level":180}},"chan vu that tiet thuoc phai nao":{"question":"Chân Vũ Thất Tiệt thuộc phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1228,"faction_key":"wudang","required_level":180}},"chan vu that tiet la tuyet chieu cua phai nao":{"question":"Chân Vũ Thất Tiệt là tuyệt chiêu của phái nào?","answer":"vo dang","displayAnswer":"Võ Đang","aliases":["vo dang phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1228,"faction_key":"wudang","required_level":180}},"thien cuong khat kinh thuoc phai nao":{"question":"Thiên Cương Khất Kính thuộc phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1229,"faction_key":"kunlun","required_level":180}},"thien cuong khat kinh la tuyet chieu cua phai nao":{"question":"Thiên Cương Khất Kính là tuyệt chiêu của phái nào?","answer":"con lon","displayAnswer":"Côn Lôn","aliases":["con lon phai"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/jx/sk180.js và /vl4/js/vlwin.js","skill_id":1229,"faction_key":"kunlun","required_level":180}},"thieu lam thuoc he ngu hanh nao":{"question":"Thiếu Lâm thuộc hệ ngũ hành nào?","answer":"kim","displayAnswer":"Kim","aliases":["he kim","hanh kim"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"shaolin"}},"thien vuong thuoc he ngu hanh nao":{"question":"Thiên Vương thuộc hệ ngũ hành nào?","answer":"kim","displayAnswer":"Kim","aliases":["he kim","hanh kim"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"tianwang"}},"duong mon thuoc he ngu hanh nao":{"question":"Đường Môn thuộc hệ ngũ hành nào?","answer":"moc","displayAnswer":"Mộc","aliases":["he moc","hanh moc"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"tangmen"}},"ngu doc thuoc he ngu hanh nao":{"question":"Ngũ Độc thuộc hệ ngũ hành nào?","answer":"moc","displayAnswer":"Mộc","aliases":["he moc","hanh moc"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"wudu"}},"nga my thuoc he ngu hanh nao":{"question":"Nga My thuộc hệ ngũ hành nào?","answer":"thuy","displayAnswer":"Thủy","aliases":["he thuy","hanh thuy"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"emei"}},"thuy yen thuoc he ngu hanh nao":{"question":"Thúy Yên thuộc hệ ngũ hành nào?","answer":"thuy","displayAnswer":"Thủy","aliases":["he thuy","hanh thuy"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"cuiyan"}},"cai bang thuoc he ngu hanh nao":{"question":"Cái Bang thuộc hệ ngũ hành nào?","answer":"hoa","displayAnswer":"Hỏa","aliases":["he hoa","hanh hoa"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"gaibang"}},"thien nhan thuoc he ngu hanh nao":{"question":"Thiên Nhẫn thuộc hệ ngũ hành nào?","answer":"hoa","displayAnswer":"Hỏa","aliases":["he hoa","hanh hoa"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"tianren"}},"vo dang thuoc he ngu hanh nao":{"question":"Võ Đang thuộc hệ ngũ hành nào?","answer":"tho","displayAnswer":"Thổ","aliases":["he tho","hanh tho"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"wudang"}},"con lon thuoc he ngu hanh nao":{"question":"Côn Lôn thuộc hệ ngũ hành nào?","answer":"tho","displayAnswer":"Thổ","aliases":["he tho","hanh tho"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/vldata.js","reference":"fac[].series","faction_key":"kunlun"}},"con giap nao dung dau trong 12 con giap":{"question":"Con giáp nào đứng đầu trong 12 con giáp?","answer":"ty","displayAnswer":"Tý","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"reference":"Quy ước 12 con giáp theo ngữ cảnh"}},"con giap nao dung cuoi trong 12 con giap":{"question":"Con giáp nào đứng cuối trong 12 con giáp?","answer":"hoi","displayAnswer":"Hợi","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"reference":"Quy ước 12 con giáp theo ngữ cảnh"}},"con giap nao dung ngay sau thin":{"question":"Con giáp nào đứng ngay sau Thìn?","answer":"ty","displayAnswer":"Tỵ","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"reference":"Quy ước 12 con giáp theo ngữ cảnh"}},"theo 12 con giap viet nam con vat nao la bieu tuong cua nam mao":{"question":"Theo 12 con giáp Việt Nam, con vật nào là biểu tượng của năm Mão?","answer":"meo","displayAnswer":"Mèo","aliases":["con meo"],"saved":0,"source":"draft-for-review","evidence":{"reference":"Quy ước 12 con giáp theo ngữ cảnh"}},"theo 12 con giap trung quoc con vat nao la bieu tuong cua nam mao":{"question":"Theo 12 con giáp Trung Quốc, con vật nào là biểu tượng của năm Mão?","answer":"tho","displayAnswer":"Thỏ","aliases":["con tho"],"saved":0,"source":"draft-for-review","evidence":{"reference":"Quy ước 12 con giáp theo ngữ cảnh"}},"con vat nao la bieu tuong cua nam mao o trung quoc":{"question":"Con vật nào là biểu tượng của năm Mão ở Trung Quốc?","answer":"tho","displayAnswer":"Thỏ","aliases":["con tho"],"saved":0,"source":"draft-for-review","evidence":{"reference":"Quy ước 12 con giáp theo ngữ cảnh"}},"trong son ha xa tac noi mua que hoa tuu la":{"question":"Trong Sơn Hà Xã Tắc, nơi mua Quế Hoa Tửu là?","answer":"ky tran cac","displayAnswer":"Kỳ Trân Các","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: luck"}},"trong son ha xa tac noi mua tiem nang kinh la":{"question":"Trong Sơn Hà Xã Tắc, nơi mua Tiềm Năng Kinh là?","answer":"ky tran cac","displayAnswer":"Kỳ Trân Các","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: book"}},"trong son ha xa tac noi mua bi kip 8x la":{"question":"Trong Sơn Hà Xã Tắc, nơi mua Bí Kíp 8x là?","answer":"ky tran cac","displayAnswer":"Kỳ Trân Các","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"ktcWin: lx; giao diện kỹ năng VL4"}},"trong son ha xa tac noi mua binh mau va binh noi luc la":{"question":"Trong Sơn Hà Xã Tắc, nơi mua bình máu và bình nội lực là?","answer":"tap hoa","displayAnswer":"Tạp Hóa","aliases":[],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → js/bridge.js; js/vlwin.js","reference":"VLNPC.tap_hoa"}},"trong son ha xa tac npc da tau o thanh nao":{"question":"Trong Sơn Hà Xã Tắc, NPC Dã Tẩu ở thành nào?","answer":"ba lang huyen","displayAnswer":"Ba Lăng Huyện","aliases":["ba lang"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.da_tau"}},"npc tang kinh cac o thanh nao":{"question":"NPC Tàng Kinh Các ở thành nào?","answer":"ba lang huyen","displayAnswer":"Ba Lăng Huyện","aliases":["ba lang"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.tang_kinh"}},"npc tong kim bao danh o thanh nao":{"question":"NPC Tống Kim báo danh ở thành nào?","answer":"ba lang huyen","displayAnswer":"Ba Lăng Huyện","aliases":["ba lang"],"saved":0,"source":"draft-for-review","evidence":{"resource":"download1.har → /vl4/js/bridge.js","reference":"VLNPC.tong_kim"}},"ngua tuyet anh noi tieng la ngua cua ai":{"answer":"tao thao","question":"Ngựa Tuyệt Ảnh nổi tiếng là ngựa của ai?","saved":1794144656425,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-08.json"},"diem ky nang toi da cua mot nhan vat la bao nhieu":{"answer":"200","question":"Điểm kỹ năng tối đa của một nhân vật là bao nhiêu?","saved":1794144680539,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-08.json"},"vo dang phai thuoc he ngu hanh nao":{"answer":"tho","question":"Võ Đang phái thuộc hệ ngũ hành nào?","saved":1794144705438,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-08.json"},"tuyet anh la ngua cua ai":{"question":"Tuyệt Ảnh là ngựa của ai?","answer":"tao thao","displayAnswer":"Tào Tháo","aliases":["tao manh duc"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"chien ma tuyet anh thuoc ve ai":{"question":"Chiến mã Tuyệt Ảnh thuộc về ai?","answer":"tao thao","displayAnswer":"Tào Tháo","aliases":["tao manh duc"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"ngua tuyet anh gan lien voi nhan vat nao":{"question":"Ngựa Tuyệt Ảnh gắn liền với nhân vật nào?","answer":"tao thao","displayAnswer":"Tào Tháo","aliases":["tao manh duc"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"ai la chu nhan cua ngua tuyet anh":{"question":"Ai là chủ nhân của ngựa Tuyệt Ảnh?","answer":"tao thao","displayAnswer":"Tào Tháo","aliases":["tao manh duc"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"trong tam quoc tuyet anh la chien ma cua ai":{"question":"Trong Tam Quốc, Tuyệt Ảnh là chiến mã của ai?","answer":"tao thao","displayAnswer":"Tào Tháo","aliases":["tao manh duc"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"mot nhan vat co toi da bao nhieu diem ky nang":{"question":"Một nhân vật có tối đa bao nhiêu điểm kỹ năng?","answer":"200","displayAnswer":"200","aliases":["200 diem","200 diem ky nang"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"gioi han diem ky nang cua mot nhan vat la bao nhieu":{"question":"Giới hạn điểm kỹ năng của một nhân vật là bao nhiêu?","answer":"200","displayAnswer":"200","aliases":["200 diem","200 diem ky nang"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"tong diem ky nang toi da cua nhan vat la bao nhieu":{"question":"Tổng điểm kỹ năng tối đa của nhân vật là bao nhiêu?","answer":"200","displayAnswer":"200","aliases":["200 diem","200 diem ky nang"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"ngua dich lu noi tieng la ngua cua ai":{"question":"Ngựa Đích Lư nổi tiếng là ngựa của ai?","answer":"luu bi","displayAnswer":"Lưu Bị","aliases":["luu huyen duc","huyen duc"],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_34"},"dich lu la ngua cua ai":{"question":"Đích Lư là ngựa của ai?","answer":"luu bi","displayAnswer":"Lưu Bị","aliases":["luu huyen duc","huyen duc"],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_34"},"chien ma dich lu gan lien voi nhan vat nao":{"question":"Chiến mã Đích Lư gắn liền với nhân vật nào?","answer":"luu bi","displayAnswer":"Lưu Bị","aliases":["luu huyen duc","huyen duc"],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_34"},"ngua dich lu cuu ai vuot dan khe":{"question":"Ngựa Đích Lư cứu ai vượt Đàn Khê?","answer":"luu bi","displayAnswer":"Lưu Bị","aliases":["luu huyen duc","huyen duc"],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_34"},"luu bi cuoi ngua gi vuot dan khe":{"question":"Lưu Bị cưỡi ngựa gì vượt Đàn Khê?","answer":"dich lu","displayAnswer":"Đích Lư","aliases":[],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_34"},"con ngua nao giup luu bi thoat nan o dan khe":{"question":"Con ngựa nào giúp Lưu Bị thoát nạn ở Đàn Khê?","answer":"dich lu","displayAnswer":"Đích Lư","aliases":[],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_34"},"tao thao tang ngua xich tho cho ai":{"question":"Tào Tháo tặng ngựa Xích Thố cho ai?","answer":"quan vu","displayAnswer":"Quan Vũ","aliases":["quan cong","quan van truong"],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_25"},"quan vu duoc tao thao tang con ngua nao":{"question":"Quan Vũ được Tào Tháo tặng con ngựa nào?","answer":"xich tho","displayAnswer":"Xích Thố","aliases":[],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_25"},"ngua xich tho do tao thao tang quan vu truoc do la ngua cua ai":{"question":"Ngựa Xích Thố do Tào Tháo tặng Quan Vũ trước đó là ngựa của ai?","answer":"lu bo","displayAnswer":"Lữ Bố","aliases":["la bo","lu phung tien"],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_25"},"chien ma noi tieng cua lu bo ten la gi":{"question":"Chiến mã nổi tiếng của Lữ Bố tên là gì?","answer":"xich tho","displayAnswer":"Xích Thố","aliases":[],"source":"draft-for-review","saved":0,"evidence":"https://vi.wikisource.org/wiki/Tam_quốc_diễn_nghĩa_(Phan_Kế_Bính_dịch,_Bùi_Kỷ_hiệu_đính)/Hồi_25"},"ruong than ma duoc ban o dau":{"question":"Rương Thần Mã được bán ở đâu?","answer":"ky tran cac","displayAnswer":"Kỳ Trân Các","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"mua ruong than ma tai dau":{"question":"Mua Rương Thần Mã tại đâu?","answer":"ky tran cac","displayAnswer":"Kỳ Trân Các","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"muon mua ruong than ma can den dau":{"question":"Muốn mua Rương Thần Mã cần đến đâu?","answer":"ky tran cac","displayAnswer":"Kỳ Trân Các","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"ngua chua su dung duoc gui o dau":{"question":"Ngựa chưa sử dụng được gửi ở đâu?","answer":"ma truong","displayAnswer":"Mã trường","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"noi giu ngua khong ton cho hanh trang la dau":{"question":"Nơi giữ ngựa không tốn chỗ hành trang là đâu?","answer":"ma truong","displayAnswer":"Mã trường","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"npc nao quan ly ma truong":{"question":"NPC nào quản lý Mã trường?","answer":"ma phu","displayAnswer":"Mã Phu","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"muon mo ma truong can gap npc nao":{"question":"Muốn mở Mã trường cần gặp NPC nào?","answer":"ma phu","displayAnswer":"Mã Phu","aliases":[],"source":"draft-for-review","saved":0,"evidence":"download1.har / dữ liệu NPC ma_phu: work/tongkim-source-7.js"},"mon phai vo dang thuoc he nao":{"question":"Môn phái Võ Đang thuộc hệ nào?","answer":"tho","displayAnswer":"Thổ","aliases":["he tho"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"vo dang thuoc ngu hanh gi":{"question":"Võ Đang thuộc ngũ hành gì?","answer":"tho","displayAnswer":"Thổ","aliases":["he tho"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"mon phai con lon thuoc he nao":{"question":"Môn phái Côn Lôn thuộc hệ nào?","answer":"tho","displayAnswer":"Thổ","aliases":["he tho"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"con lon thuoc ngu hanh gi":{"question":"Côn Lôn thuộc ngũ hành gì?","answer":"tho","displayAnswer":"Thổ","aliases":["he tho"],"source":"draft-for-review","saved":0,"evidence":"Suy từ đáp án có source game-result trong log 2026-11-08"},"chiec banh truyen thong cua nguoi viet ngay tet hinh vuong la":{"answer":"banh chung","question":"Chiếc bánh truyền thống của người Việt ngày Tết hình vuông là?","saved":1794144605858,"source":"game-result","aliases":[],"evidence":"Ngân hàng xuất từ game do người dùng cung cấp và xác nhận đã được máy chủ xác thực; VL4_Hoa_Dang_ngan_hang_2026-11-08.json"}};
  const quizBank = { entries:{} };
  const zoneGuard = { saved: null };
  const bossTarget = { id: null, zone: null, lastAt: 0, sent: 0 };
  const bossHunt = { questKey: '', zone: '', visited: {}, forcedChannel: null, lastHave:null,
    channelSince: 0, bossSeenAt: 0, bossSig: '', swaps: 0, lastLogAt: 0 };
  const deathGuard={recent:[],lastZone:'',tripped:0,lastWarning:0};
  const metrics = { rebirths:0, quizWebLookups:0, quizWebHits:0, startedAt: 0, last: null, expObserved: 0, kills: 0, questSteps: 0,
    bossQuestDone: 0, bossWorldEntries: 0, bossWorldFinishes: 0, bossWorldDamage: 0, bossWorldBestRank: null, bossWorldJoinRequests: 0, bossWorldRejoinRequests: 0, bossSightings: 0,
    mapMoves: 0, channelMoves: 0, townReturns: 0, deathsObserved: 0,
    knLocal: 0, knLog: 0, lastKnN: null, seenLogKeys: [], lastDeath: false,
    lastZone: '', lastChannel: null, lastQuestStep: null, quizAnswered:0, quizKnown:0, quizGuessed:0, quizCorrect:0, quizWrong:0, quizLearned:0 };
  let sessionSerial = 0;
  // Luu trang thai kich hoat theo nhan vat, khong luu token/cookie. Reload chi tu bat
  // tren Tampermonkey/Userscript da cai; Console khong the tu nap lai sau F5.
  const RUN_KEY='vl4_dt_v37_run_v1', PREV_RUN_KEY='vl4_dt_v36_run_v1';
  const STALE_RUN_MS=24*3600*1000;
  let lastPersistAt=0;
  const watch={offlineAt:0,notReadyAt:0,lastWarning:0,lastRecovery:0,
    reconnectAttempts:0,helloAttempts:0,lastFrame:0,lastProgress:0,
    progressValue:'',lastSoftAction:0, reloadAttempts:0,reason:'Bình thường'};
  function charIdentity(){
    try {return typeof S!=='undefined'&&S?.fac&&S?.name
      ? String(S.name)+'|'+String(S.fac) : null;} catch(_){return null;}
  }
  function readSavedRun(){
    try {
      const v=JSON.parse(localStorage.getItem(RUN_KEY)||localStorage.getItem(PREV_RUN_KEY)||'null');
      if(!v||v.v!==1||!v.active||!v.at||Date.now()-v.at>STALE_RUN_MS)return null;
      return v;
    } catch(_){return null;}
  }
  function persistRun(force=false){
    if(!st.running || !cfg.resumeAfterReload) return;
    const now=Date.now();if(!force && now-lastPersistAt<5000)return;
    lastPersistAt=now;
    try {localStorage.setItem(RUN_KEY,JSON.stringify({
      v:1,active:true,at:now,identity:charIdentity(),
      completed:st.completed,baseStep:st.baseStep,questActive:st.questActive,lastReborns:st.lastReborns,
      startAt:metrics.startedAt||now,rebirthCount:rebirth.count||0,
      metrics:{questSteps:metrics.questSteps,kills:metrics.kills,expObserved:metrics.expObserved,
        deathsObserved:metrics.deathsObserved,bossWorldEntries:metrics.bossWorldEntries},
      options:{...cfg}
    }));localStorage.removeItem(PREV_RUN_KEY);}catch(e){if(now-watch.lastWarning>60000)console.warn('[DT] Khong luu duoc phien Auto',e);}
  }
  function deactivateSavedRun(reason){
    try {localStorage.removeItem(RUN_KEY);localStorage.removeItem(PREV_RUN_KEY);}catch(_){}
    if(reason)diagnostic('RESUME',reason);
  }
  function clientVersion(){
    try {
      const entry=performance.getEntriesByType('resource').find(x=>/\/vl4pre\.js(?:\?|$)/.test(x.name));
      return entry?new URL(entry.name).searchParams.get('v')||'không có tham số':null;
    }catch(_){return null;}
  }
  function checkCompatibility(){
    const needed={cmd:typeof cmd==='function',state:typeof S!=='undefined'&&!!S,
      runtime:typeof R!=='undefined'&&!!R,zones:typeof W!=='undefined'&&Array.isArray(W?.zones),
      socket:typeof NET!=='undefined'&&!!NET};
    const missing=Object.entries(needed).filter(([k,v])=>!v).map(([k])=>k);
    const optional={DY:typeof DY!=='undefined'&&!!DY, DG:typeof DG!=='undefined'&&!!DG, WB:typeof WB!=='undefined'&&!!WB, gsMsg:typeof gsMsg==='function', DY_DQ:typeof DY_DQ!=='undefined'&&Array.isArray(DY_DQ)};
    const optionalMissing=Object.keys(optional).filter(k=>!optional[k]);
    diagnostic('COMPAT',missing.length?'Chua san sang: '+missing.join(', '):'Co du cac thanh phan chinh',{missing,optionalMissing,vl4pre:clientVersion()});
    return missing;
  }
  function softPause(reason,initialMs=60000,claimWait=null){
    st.softClaimWait=claimWait;
    const now=Date.now();st.softTries=Math.min(8,(st.softTries||0)+1);
    const ms=Math.min(15*60000,initialMs*Math.pow(1.7,st.softTries-1));
    st.softUntil=now+ms;st.softFault=String(reason);
    st.action='';st.ackFailures=0;st.map.requested=null;
    townFlow.request=null;st.zoneRetryAt=now;
    diagnostic('SOFT_PAUSE',reason,{seconds:Math.ceil(ms/1000),tries:st.softTries});
    say('⚠️ Dã Tẩu tạm nghỉ '+Math.ceil(ms/1000)+' giây: '+reason+'. Boss và Hoa Đăng vẫn hoạt động.');
    persistRun(true);
    return true;
  }
  function resumeLateQuestClaim(s,token){
    const pending=st.softClaimWait;
    if(!st.softUntil || !pending || pending.token!==token || !pending.identity ||
      pending.identity!==charIdentity() || !s?.q || s.reborns!==pending.reborns ||
      !Number.isInteger(Number(s.q.step)) || Number(s.q.step)<=pending.step)return false;
    st.softUntil=0;st.softFault='';st.softClaimWait=null;st.softTries=0;st.ackFailures=0;
    diagnostic('QUEST_LATE_ACK','Đã đồng bộ kết quả trả Dã Tẩu sau khi tạm nghỉ',{from:pending.step,to:Number(s.q.step)});
    say('Máy chủ đã sang bước '+s.q.step+'; tiếp tục Dã Tẩu.');
    return true;
  }
  function finishQuestGoal(reason){
    if(!cfg.continueEventsAfterTarget)return stop(reason);
    if(!st.questActive)return true;
    st.questActive=false;st.action='';st.softUntil=0;st.softFault='';
    townFlow.request=null;restoreQuestBossPriority();resetBossHunt();
    diagnostic('MILESTONE',reason+'; giu cac su kien chay');
    say('✅ '+reason+'. Chuyển chế độ chờ sự kiện: Boss, Hoa Đăng, thưởng, giám sát túi.');
    persistRun(true);return true;
  }
  function watchdog(s){
    if(!st.running)return;
    const now=Date.now();
    let kicked=false, online=false, ready=false;
    try {kicked=typeof NET!=='undefined'&&!!NET.kick;online=isOnline();ready=typeof R!=='undefined'&&!!R.ready;}catch(_){}
    if(kicked){deactivateSavedRun('May chu thong bao kick: khong tu giành phien');stop('Bị máy chủ ngắt phiên, cần kiểm tra đăng nhập thủ công');return;}
    if(!online){
      const connectedAwaitingLogin=typeof NET!=='undefined'&&NET.ws?.readyState===1&&NET.inGame===false&&!NET.kick;
      watch.reason=connectedAwaitingLogin?'Có socket, chờ vào game':'Mất kết nối';watch.notReadyAt=0;
      if(!watch.offlineAt)watch.offlineAt=now;
      const elapsed=now-watch.offlineAt;
      if(connectedAwaitingLogin && elapsed>90000 && now-watch.lastRecovery>180000 && watch.helloAttempts<2 && typeof gsHello==='function'){
        watch.lastRecovery=now;watch.helloAttempts++;
        try{Promise.resolve(gsHello()).catch(e=>diagnostic('WATCHDOG','Đăng nhập lại: '+e.message));}
        catch(e){diagnostic('WATCHDOG','Đăng nhập lại: '+e.message);}
        diagnostic('WATCHDOG','Socket còn mở nhưng NET.inGame=false; thử gsHello có giới hạn',{attempt:watch.helloAttempts});
      }
      if(elapsed>90000 && now-watch.lastRecovery>150000){
        watch.lastRecovery=now;
        if(typeof NET!=='undefined' && !NET.ws && typeof gsConnect==='function' && watch.reconnectAttempts<2){
          watch.reconnectAttempts++;
          try {gsConnect();diagnostic('WATCHDOG','Kich hoat lai ket noi game sau 90s mat mang',{attempt:watch.reconnectAttempts});}
          catch(e){diagnostic('WATCHDOG','Ket noi lai that bai '+e.message);}
        }
      }
      if(now-watch.lastWarning>60000){watch.lastWarning=now;diagnostic('WATCHDOG','Dang cho game ket noi lai, khong reload vo han',{seconds:Math.floor(elapsed/1000)});}
      return;
    }
    watch.offlineAt=0;watch.reconnectAttempts=0;
    if(!ready){
      watch.reason='Đang chờ zone';
      if(!watch.notReadyAt)watch.notReadyAt=now;
      const elapsed=now-watch.notReadyAt;
      if(elapsed>90000 && now-watch.lastRecovery>180000 && typeof NET!=='undefined'&&!NET.inGame && typeof gsHello==='function' && watch.helloAttempts<2){
        watch.lastRecovery=now;watch.helloAttempts++;
        try{Promise.resolve(gsHello()).catch(e=>diagnostic('WATCHDOG','gsHello: '+e.message));}
        catch(e){diagnostic('WATCHDOG','gsHello: '+e.message);}
        diagnostic('WATCHDOG','Thu xin ve dang nhap lai khi WebSocket co ket noi, chua vao game',{attempt:watch.helloAttempts});
      }
      // Tu reload chi khi nguoi dung bat tuy chon, khong co kick, gioi han 1 lan/30 phut.
      if(cfg.watchdogReload && cfg.resumeAfterReload && elapsed>6*60000 && watch.reloadAttempts<1){
        try {
          const k='vl4_dt_v36_last_auto_reload';const last=Number(localStorage.getItem(k)||0);
          if(now-last>30*60000){watch.reloadAttempts++;localStorage.setItem(k,String(now));persistRun(true);
            diagnostic('WATCHDOG','Reload khi cho zone >6 phut (da bat cho phep)');location.reload();return;}
        }catch(_){}
      }
      if(now-watch.lastWarning>60000){watch.lastWarning=now;diagnostic('WATCHDOG','R.ready=false; cho may chu phuc hoi',{seconds:Math.floor(elapsed/1000)});}
      return;
    }
    watch.reason='Bình thường';watch.notReadyAt=0;watch.helloAttempts=0;
    if(!s)return;
    // PK / event activity does not advance ordinary quest or monster counters.
    // Keep connection/zone checks above active; suspend only quest-stall recovery.
    if(['tk','wb','vd'].includes(String(s.zone)) || (typeof tongKimOccupied==='function'&&tongKimOccupied())){
      watch.progressValue='';watch.lastProgress=now;watch.reason='Đang tham gia sự kiện; tạm ngừng kiểm tra treo Dã Tẩu';return;
    }
    if(!st.questActive || st.boss.phase!=='idle' || s.town || !s.took || s.need<=0 || s.have>=s.need){watch.progressValue='';return;}
    const count=Number(typeof S!=='undefined'?S.kills:NaN);
    const sig=[s.step,s.have,Number.isFinite(count)?count:'?'].join('|');
    if(sig!==watch.progressValue){watch.progressValue=sig;watch.lastProgress=now;st.softTries=0;return;}
    if(now-(watch.lastProgress||now)>5*60000 && now-watch.lastSoftAction>5*60000){
      watch.lastSoftAction=now;combatSync.forceSync=true;
      diagnostic('WATCHDOG','5 phut khong tang so quai/Da Tau; kiem tra lai Auto chien dau va kenh',{zone:s.zone,step:s.step});
      say('⚠️ Treo máy 5 phút không tăng tiến độ: đang kiểm tra lại Auto chiến đấu; không tải lại trang.');
    }
  }
  const bgDriver={worker:null,url:null,lastTick:0,hook:null,origMsg:null};
  const rewardRx={dy:null,wq:null}; // authoritative messages; DY/DG live inside vlwin closure
  const rewardNet={dySeq:0,wqSeq:0,lastSent:0,confirmed:0,timeouts:0,lastResult:'Chưa kiểm tra',lastCommand:'',active:false,scans:0,manualClicks:0,manualConfirmed:0,manualFailures:0,lastManual:''};
  function requestTick(){
    if(!st.running||Date.now()-bgDriver.lastTick<650)return;
    bgDriver.lastTick=Date.now();void tick();
  }
  // v1.0: Cho game nạp gsMsg muộn hoặc thay gsMsg sau khi nối lại.
  // Hook đồng bộ, bảo toàn bộ xử lý gốc và không bọc chồng lên chính mình.
  function ensureDispatchHook(){
    try {
      if(typeof gsMsg!=='function')return false;
      if(gsMsg===bgDriver.hook)return true;
      bgDriver.origMsg=gsMsg;
      const previousDispatch=gsMsg; // capture this generation; external wrappers may retain us
      bgDriver.hook=function(m){
        if(m && (['kick','left'].includes(m.t) || (m.t==='auth' && m.ok===false))){
          deactivateSavedRun('Máy chủ kết thúc phiên hoặc từ chối xác thực');
          stop('Máy chủ kết thúc phiên, chờ đăng nhập/chọn nhân vật thủ công');
        }
        if(m?.t==='f')captureRangeFrame(m);
        const result=previousDispatch.apply(this,arguments);
        if(typeof questLocationObserve==='function')questLocationObserve(m);
        if(m?.t!=='qz'&&m?.t!=='qzr'&&typeof auditMessage==='function')auditMessage(m);
        if(['party','pinv','dui','frinv','gdinv'].includes(m?.t))partyObserve(m);
        if(typeof partyFollowObserve==='function')partyFollowObserve(m);
        if(m?.t==='zone')bossApproachZone(m);
        if(m?.t==='tk'||(m?.t==='zone'&&String(m.id)==='tk'))tongKimMessage(m);
        if(m?.t==='dy'||m?.t==='wq')captureRewardMessage(m);
        if(m?.t==='dy')rewardNet.dySeq++;
        if(m?.t==='wq')rewardNet.wqSeq++;
        if(m && (m.t==='qz'||m.t==='qzr')){
          quizWire.dispatchHits++;
          quizOnMessageParsed(m,'dispatch');
        }
        if(m && ['char','zone','qc','wb','dy','wq','tk'].includes(m.t))
          Promise.resolve().then(requestTick);
        return result;
      };
      gsMsg=bgDriver.hook;
      diagnostic('QUIZ_RX','Đã gắn hook gsMsg, kể cả sau khi game tải muộn');
      return true;
    }catch(e){
      diagnostic('TIMER','Không gắn được hook gsMsg; vẫn nghe WebSocket: '+String(e?.message||e));
      bgDriver.hook=null;bgDriver.origMsg=null;
      return false;
    }
  }
  function startDriver(){
    ensureDispatchHook();
    fieldSafetyInstall();
    if(bgDriver.worker)return;
    try{
      const blob=new Blob(['setInterval(()=>postMessage(1),1000)'],{type:'text/javascript'});
      bgDriver.url=URL.createObjectURL(blob);
      bgDriver.worker=new Worker(bgDriver.url);
      bgDriver.worker.onmessage=()=>{if(document.hidden)requestTick();};
    }catch(e){diagnostic('TIMER','Worker khong kha dung; setInterval van hoat dong '+e.message);}
  }
  function stopDriver(){
    fieldSafetyUninstall();
    if(bgDriver.worker){try{bgDriver.worker.terminate();}catch(_){}bgDriver.worker=null;}
    if(bgDriver.url){URL.revokeObjectURL(bgDriver.url);bgDriver.url=null;}
    try{if(bgDriver.hook && gsMsg===bgDriver.hook)gsMsg=bgDriver.origMsg;}catch(_){}
    bgDriver.hook=null;bgDriver.origMsg=null;
  }
  const eventAudit={identity:'',rows:[],seen:new Set(),quiz:{},tk:null,wb:null,claim:null};
  function auditContext(){
    const id=charIdentity();if(!id)return false;
    if(id===eventAudit.identity)return true;
    Object.assign(eventAudit,{identity:id,rows:[],seen:new Set(),quiz:{},tk:null,wb:null,claim:null});
    try{const rows=JSON.parse(localStorage.getItem('auto_s4_events_v21:'+id)||'[]');if(Array.isArray(rows))eventAudit.rows=rows.slice(-500);}catch(_){}
    for(const r of eventAudit.rows)if(r.key)eventAudit.seen.add(r.key);
    return true;
  }
  function auditAdd(kind,text,data={},key=''){
    try{
      if(!auditContext()||(key&&eventAudit.seen.has(key)))return;
      if(key)eventAudit.seen.add(key);
      const row={at:new Date().toISOString(),kind,text:String(text),data,key};
      eventAudit.rows.push(row);if(eventAudit.rows.length>500)eventAudit.rows.shift();
      if(eventAudit.seen.size>1000)eventAudit.seen=new Set(eventAudit.rows.map(r=>r.key).filter(Boolean));
      try{localStorage.setItem('auto_s4_events_v21:'+eventAudit.identity,JSON.stringify(eventAudit.rows));}catch(_){}
      diagnostic('EVENT_'+kind,text,data);
    }catch(_){} // Logging must never interrupt the game's dispatcher.
  }
  function auditNumber(v){return v==null||!Number.isFinite(Number(v))?'chưa có dữ liệu':Number(v).toLocaleString('vi-VN');}
  function auditReward(m){return ['gold','fd','xp'].filter(k=>m[k]!=null).map(k=>auditNumber(m[k])+' '+({gold:'lượng',fd:'Phúc Duyên',xp:'EXP'}[k])).join(' + ')||'chưa có dữ liệu thưởng';}
  function auditQuizChoice(event,m,index,reason,comparison){
    auditAdd('HOA_DANG',`Câu ${Number(m.i)+1}: ${m.q} | Auto chọn ${index+1}: ${m.c[index]} | ${reason}`,
      {question:m.q,number:Number(m.i)+1,choices:m.c.slice(),selectedIndex:index,selected:m.c[index],reason,comparison},'quiz-choice:'+event);
  }
  function auditQuestClaim(s,option){
    if(!auditContext())return;
    const info=typeof R!=='undefined'?R.qc:null;
    eventAudit.claim={step:s.step,reborns:s.reborns,option,at:Date.now(),xp:info?.xp,gold:info?.gold};
    auditAdd('DA_TAU',`Gửi trả bước ${s.step}; chọn ${option}; chờ máy chủ xác nhận`,{...eventAudit.claim,displayedRewardOnly:true});
  }
  function auditMessage(m){
    try{
      if(!m||!auditContext())return;
      const day=new Date(Date.now()+7*3600000).toISOString().slice(0,10),name=typeof S!=='undefined'?S?.name:'';
      if(m.t==='qz'&&m.i!=null&&Array.isArray(m.c)){
        eventAudit.quiz[m.i]={day,q:m.q,c:m.c};
        const key=day+':'+m.i+':'+m.q;
        if(m.open===1)auditAdd('HOA_DANG',`Câu ${Number(m.i)+1}/${m.n??'?'}: ${m.q}`,{choices:m.c},'quiz-question:'+key);
        if(m.open===2&&Number.isInteger(m.ok)&&m.c[m.ok]!=null)auditAdd('HOA_DANG',`Câu ${Number(m.i)+1}: đáp án máy chủ ${m.c[m.ok]}`,{question:m.q,correctIndex:m.ok,correct:m.c[m.ok]},'quiz-correct:'+key);
      }
      if(m.t==='qzr'){
        const q=eventAudit.quiz[m.i],current=q?.day===day?q:null;
        auditAdd('HOA_DANG',`Câu ${Number(m.i)+1}: ${m.msg|| (m.right?'ĐÚNG':'SAI')} | ${auditReward(m)}`,
          {question:current?.q??null,right:m.right??null,gold:m.gold??null,fd:m.fd??null,message:m.msg??null},'quiz-result:'+day+':'+m.i+':'+JSON.stringify([m.right,m.gold,m.fd,m.msg]));
      }
      if(m.t==='tk'&&m.s==='st')eventAudit.tk={side:m.side,k:m.k,d:m.d,sc:m.sc};
      if(m.t==='tk'&&m.s==='out')eventAudit.tk=null;
      if(m.t==='tk'&&m.s==='end'){
        const rows=Array.isArray(m.rows)?m.rows:[],index=rows.findIndex(r=>r.n===name),me=index>=0?rows[index]:null;
        const side=m.side??eventAudit.tk?.side,result=m.win===0?'HÒA':side==null?'chưa rõ phe':m.win===side?'THẮNG':'THUA';
        const data={result,rank:index>=0?index+1:null,kills:me?.k??eventAudit.tk?.k??null,deaths:me?.d??eventAudit.tk?.d??null,score:me?.sc??eventAudit.tk?.sc??null,teamScores:m.pts??null,reason:m.why??null,rewardGold:null,rewardFd:null};
        auditAdd('TONG_KIM',`Kết thúc: ${result} | hạng ${auditNumber(data.rank)} | hạ ${auditNumber(data.kills)} | bị hạ ${auditNumber(data.deaths)} | điểm ${auditNumber(data.score)} | thưởng: xem thông báo máy chủ, chưa có số tiền trong gói kết quả`,data,'tk-end:'+day+':'+JSON.stringify([m.win,m.pts,m.rows]));
      }
      if(m.t==='wb'){
        const prior=eventAudit.wb;
        if(prior?.open&&!m.open&&!m.me)auditAdd('BOSS',`Lượt Boss đã đóng; sát thương quan sát cuối ${auditNumber(prior.damage)}, hạng quan sát cuối ${auditNumber(prior.rank)}; chưa có kết quả cá nhân cuối cùng`,{lastObserved:prior,finalResultMissing:true},'wb-closed:'+day+':'+prior.boss+':'+prior.end);
        const value={boss:m.boss,end:m.end,open:!!m.open,dead:!!m.dead,damage:m.me?.dmg??null,rank:m.me?.rank??null};
        eventAudit.wb=value;
        if(m.me&&(prior?.damage!==value.damage||prior?.rank!==value.rank||prior?.open!==value.open)){
          const ending=!m.open;const last=eventAudit.rows.filter(r=>r.kind==='BOSS').at(-1);
          if(ending||!last||Date.now()-Date.parse(last.at)>=30000)auditAdd('BOSS',`${ending?'Kết quả / trạng thái sau trận':'Đang đánh'}: sát thương ${auditNumber(value.damage)} | hạng ${auditNumber(value.rank)} | ${m.dead?'Boss đã bị hạ':'Boss chưa bị hạ'} | thưởng: chờ thông báo máy chủ`,value,'wb:'+day+':'+JSON.stringify(value));
        }
      }
      if(m.t==='char'&&m.S){
        const pending=eventAudit.claim,step=m.S.qc?.step;
        if(pending&&pending.reborns!=null&&m.S.reset!=null&&Number(m.S.reset)!==pending.reborns)eventAudit.claim=null;
        else if(pending&&Number(step)===Number(pending.step)+1){
          auditAdd('DA_TAU',`Máy chủ xác nhận qua bước ${pending.step} → ${step}; thưởng hiển thị trước khi trả: ${auditNumber(pending.xp)} EXP, ${auditNumber(pending.gold)} lượng (không phải tổng đã nhận); số thực nhận xem thông báo máy chủ`,{...pending,nextStep:step,actualExp:null,actualGold:null},'quest:'+day+':'+pending.step+':'+pending.at);
          eventAudit.claim=null;
        }else if(pending&&Number(step)>Number(pending.step)+1){
          eventAudit.claim=null;
        }else if(pending&&!pending.delayLogged&&Date.now()-pending.at>60000){
          pending.delayLogged=true;
          auditAdd('DA_TAU',`Bước ${pending.step}: chưa thấy xác nhận sau 60 giây; vẫn theo dõi bước máy chủ`,{});
        }
      }
      const texts=m.t==='f'?(m.ev||[]).filter(v=>v[0]==='l'||v[0]==='o').map(v=>v[1]):m.t==='msg'?[m.msg]:[];
      for(const raw of texts){
        const text=String(raw||'').replace(/<[^>]*>/g,'').slice(0,2000),n=qNorm(text);
        const kind=/tong kim/.test(n)?'TONG_KIM':/hoa dang/.test(n)?'HOA_DANG':/boss the gioi|vo lam dai hoi/.test(n)?'BOSS':/da tau/.test(n)?'DA_TAU':null;
        if(kind)auditAdd(kind,'Máy chủ: '+text,{serverText:text},'server-text:'+day+':'+text+':'+Math.floor(Date.now()/5000));
      }
    }catch(e){diagnostic('EVENT_ERROR',String(e?.message||e).slice(0,160));}
  }
  function auditText(){
    auditContext();return eventAudit.rows.slice(-100).map(r=>'['+new Date(r.at).toLocaleString('vi-VN')+'] '+r.kind+' — '+r.text).join('\n')||'Chưa nhận kết quả sự kiện. Nhật ký lưu tối đa 500 dòng cho mỗi nhân vật.';
  }

  function diagnostic(kind, detail, extra) {
    diag.records.push({ at: new Date().toISOString(), kind, detail: String(detail),
      ...(extra ? { extra } : {}) });
    if (diag.records.length > diag.max) diag.records.shift();
  }
  function isSession(token) { return st.running && token === sessionSerial && st.boss.phase==='idle' && !tongKimOccupied(); }
  function isOnline() {
    try {
      // Server 4: khong gui lenh khi WebSocket mat ket noi.
      if (typeof NET !== 'undefined')
        return !!(NET.ws && NET.ws.readyState === 1 && NET.inGame !== false && !NET.kick);
      return typeof cmd === 'function';
    } catch (_) { return false; }
  }
  function arenaNow() { try { return typeof R !== 'undefined' && String(R.vlZone) === 'wb'; } catch (_) { return false; } }
  function gameZoneAutoGuard() {
    const a = combatConfig();
    if (!a) return;
    const gameOpt = (typeof S!=='undefined' && S && S.opt) ? S.opt : null;
    const enabled = !!a.zone || !!gameOpt?.zoneAuto;
    if (zoneGuard.saved === null) zoneGuard.saved = enabled;
    if (enabled) {
      a.zone = false;
      if (gameOpt) gameOpt.zoneAuto = 0;
      if (isOnline() && typeof cmd === 'function') cmd('opt', { k: 'zoneAuto', v: 0 });
      diagnostic('MAP', 'Tat tu doi bai cua game, tranh xung dot voi Da Tau');
    }
  }
  function restoreGameZoneAuto() {
    if (zoneGuard.saved === null) return;
    const a = combatConfig();
    if (a && zoneGuard.saved) {
      a.zone = true;
      if (typeof S!=='undefined' && S?.opt) S.opt.zoneAuto = 1;
      if (isOnline() && typeof cmd === 'function') cmd('opt', { k: 'zoneAuto', v: 1 });
    }
    zoneGuard.saved = null;
  }
  function sampleMetrics(s) {
    if (!s) return;
    const now = Date.now();
    const lvl = Number(s.level) || 0;
    const exp = Number(typeof S !== 'undefined' ? (S.xp ?? S.exp) : NaN);
    const kills = Number(typeof S !== 'undefined' ? S.kills : NaN);
    const gold = Number(s.gold);
    const kn = Number(typeof S !== 'undefined' ? S.kn?.n : NaN);
    if (!metrics.startedAt) metrics.startedAt = now;
    if (metrics.last) {
      if (Number.isFinite(exp) && Number.isFinite(metrics.last.exp) && lvl === metrics.last.lv)
        metrics.expObserved += Math.max(0, exp - metrics.last.exp);
      if (Number.isFinite(kills) && Number.isFinite(metrics.last.kills))
        metrics.kills += Math.max(0, kills - metrics.last.kills);
      if (Number.isFinite(kn) && Number.isFinite(metrics.last.kn))
        metrics.knLocal += Math.max(0, kn - metrics.last.kn);
      if (s.q && metrics.last.qValid && s.step > metrics.last.step && metrics.last.step > 0) {
        metrics.questSteps += s.step - metrics.last.step;
        if (metrics.last.kind === 'boss') metrics.bossQuestDone++;
        diagnostic('QUEST', 'Buoc Da Tau da tang theo server', { from:metrics.last.step, to:s.step });
      }
      if (metrics.last.zone && metrics.last.zone !== s.zone) metrics.mapMoves++;
      if (metrics.last.zone && metrics.last.zone !== s.zone && s.town) metrics.townReturns++;
      const ch = Number(typeof R !== 'undefined' ? R.ch : NaN);
      if (metrics.last.ch != null && Number.isFinite(ch) && ch !== metrics.last.ch) metrics.channelMoves++;
    }
    const dead = !!(typeof R !== 'undefined' && R.deadT > 0);
    if (dead && !metrics.lastDeath){
      metrics.deathsObserved++;
      const zone=(!s.town && s.zone && s.zone!=='wb')?s.zone:
        (!metrics.last?.town && metrics.last?.zone!=='wb'?metrics.last?.zone:null);
      if(zone&&st.questActive&&st.boss.phase==='idle'){
        deathGuard.recent=deathGuard.recent.filter(x=>now-x.at<10*60000&&x.zone===zone);
        deathGuard.recent.push({zone,at:now});deathGuard.lastZone=zone;
        if(deathGuard.recent.length>=3 && now-deathGuard.lastWarning>10*60000){
          deathGuard.lastWarning=now;deathGuard.tripped++;
          diagnostic('DEATH_GUARD','Chết 3 lần / 10 phút trên cùng bãi; tạm nghỉ Dã Tẩu để bảo vệ nhân vật',{zone});
          softPause('Chết liên tục tại bãi '+zone+' (3 lần/10 phút); kiểm tra bãi/thuốc',600000);
        }
      }
    }
    metrics.lastDeath = dead;
    // R.logs chi duoc su dung de ghi nhan Kỳ Ngộ khi trong log thuc su co thong bao.
    const entries = (typeof R !== 'undefined' && Array.isArray(R.logs)) ? R.logs.slice(0,80) : [];
    const initializing=!metrics.lastLogPrimed;
    for (const x of entries) {
      const h = String(x?.h || '');
      if (!/kỳ\s*ngộ|ky\s*ngo/i.test(h)) continue;
      const key = h.slice(0,240);
      if (metrics.seenLogKeys.includes(key)) continue;
      metrics.seenLogKeys.push(key);
      if (metrics.seenLogKeys.length > 120) metrics.seenLogKeys.shift();
      if (initializing) continue;
      metrics.knLog++;
      diagnostic('KY_NGO', h.replace(/<[^>]+>/g, '').slice(0,250));
    }
    metrics.lastLogPrimed=true;
    metrics.last = { at: now, lv:lvl, exp, kills, gold, kn,
      step:s.step, qValid:!!s.q, kind:questKind(s.text), zone:s.zone, town:s.town, ch:Number.isFinite(Number(R.ch))?Number(R.ch):null };
  }
  function duration(t) { return t ? Math.floor((Date.now()-t)/60000)+'p '+Math.floor(((Date.now()-t)/1000)%60)+'s' : '0s'; }
  function metricsText() {
    const g = game(), m = metrics, prev = m.last;
    const goldNow = Number(g?.gold);
    return [
      'Thời gian: '+duration(m.startedAt),
      'Dã Tẩu: '+(cfg.daTauPaused?'Tạm dừng nhận/trả':st.questActive?'Đang làm':'Đã đạt mục tiêu - chỉ trực sự kiện')+' | watchdog: '+watch.reason,
      'Dã Tẩu: '+m.questSteps+' bước nhận diện · Boss nhiệm vụ: '+m.bossQuestDone,
      'Hạ quái: +'+m.kills+' (dựa theo S.kills)',
      'EXP tăng quan sát: ≥'+Math.floor(m.expObserved).toLocaleString('vi-VN')+' (không cộng phần vượt cấp)',
      'GOLD hiện tại: '+(Number.isFinite(goldNow)?goldNow.toLocaleString('vi-VN'):'?'),
      'Boss thế giới: vào '+m.bossWorldEntries+' · lượt kết thúc '+m.bossWorldFinishes + ' · sát thương ghi nhận '+Math.floor(m.bossWorldDamage).toLocaleString('vi-VN'),
      'Thứ hạng Boss tốt nhất: '+(m.bossWorldBestRank ?? 'chưa có')+' · lần yêu cầu vào/vào lại: '+m.bossWorldJoinRequests+'/'+m.bossWorldRejoinRequests,
      'Kỳ Ngộ có log: '+m.knLog+' · đếm client tăng: '+m.knLocal,
      'Chuyển sinh tự động: '+m.rebirths+' lần đã xác nhận',
      'Dã Tẩu sau chuyển sinh: '+questReborn.lastInfo,
      'Tra cứu Wikipedia: '+m.quizWebHits+'/'+m.quizWebLookups+' có kết quả đủ tin cậy',
      'Hoa Đăng: trả lời '+m.quizAnswered+' · biết trước '+m.quizKnown+' · đoán '+m.quizGuessed+' · đúng '+m.quizCorrect+' · sai '+m.quizWrong+' · học thêm '+m.quizLearned,
      'Boss nhìn thấy: '+m.bossSightings+' · chuyển bãi: '+m.mapMoves+' · chuyển kênh: '+m.channelMoves,
      'Nhận thưởng socket: '+rewardNet.confirmed+' xác nhận · '+rewardNet.timeouts+' quá hạn · '+rewardNet.scans+' lượt kiểm tra',
      'Về thành: '+m.townReturns+' · ghi nhận chết: '+m.deathsObserved+' · kết nối lại: '+netState.reconnects
    ].join('\n');
  }
  function exportDiagnostics() {
    const g = game();
    const safe = { version:'2.1.9', exportedAt:new Date().toISOString(),
      note:'Không chứa cookie, token, WebSocket URL hoặc thông tin đăng nhập. EXP quan sát chỉ là cận dưới.',
      settings:{ reward:cfg.reward, target:cfg.target, channelMode:cfg.channelMode, preferBossMaps:cfg.preferBossMaps, bossQuestEnabled:cfg.bossQuestEnabled, bossChannelRotate:cfg.bossChannelRotate,quizEnabled:cfg.quizEnabled,quizUnknown:cfg.quizUnknown,quizWebSearch:cfg.quizWebSearch,rebirthEnabled:cfg.rebirthEnabled,rebirthMode:cfg.rebirthMode,rebirthTarget:cfg.rebirthTarget,rebirthWaitQuest:cfg.rebirthWaitQuest,rebirthMaxPerRun:cfg.rebirthMaxPerRun },
      quiz:{ knownQuestions:Object.keys(quizBank.entries).length, ...quizRunStatus(),web:{status:quizWeb.status,confidence:quizWeb.confidence,source:quizWeb.source,evidence:quizWeb.evidence.slice(0,220)} },
      rebirth:{...rebirth}, nativeQuest:{...nativeQuest,savedZone:undefined},
      channelRanking:rankedChannels(),channelSelected:chooseChannel(),
      snapshot:g ? { level:g.level, step:g.step, took:g.took, have:g.have, need:g.need, text:g.text, zone:g.zone, channel:(typeof R!=='undefined'?R.ch:null) } : null,
      metrics:{...metrics, seenLogKeys:undefined}, network:{ reconnects:netState.reconnects, offlineAt:netState.offlineAt },
      boss:{ phase:st.boss.phase, slot:st.boss.slot, tries:st.boss.joinTries, bossName:st.boss.bossName, hp:st.boss.bossHp, max:st.boss.bossMax, myDmg:st.boss.lastDamage, bestRank:st.boss.bestRank, waitReason:st.boss.waitReason },
      bossHunt:{ zone:bossHunt.zone, swaps:bossHunt.swaps, forcedChannel:bossHunt.forcedChannel, visited:bossHunt.visited },
      range:{...rangeCombat,savedMelee:undefined,positions:undefined,samples:rangeCombat.samples.slice(-160)},
      rewardNetwork:{...rewardNet},deathGuard:{...deathGuard},
      watchdog:{...watch,vl4pre:clientVersion()},run:{questActive:st.questActive,completed:st.completed,softUntil:st.softUntil,softFault:st.softFault},
      map:{failures:st.map.failures, requested:st.map.requested},
      eventHistory:typeof eventAudit!=='undefined'?eventAudit.rows:[],
      records:diag.records };
    const blob = new Blob([JSON.stringify(safe,null,2)], { type:'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(blob), a=document.createElement('a');
    a.href=u; a.download='Auto_S4_v2.1.9_nhat_ky_'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),15000);
    say('Da xuat nhat ky chan doan TXT ('+diag.records.length+' su kien)');
  }

  // Hoa Dang VL4: qzState({open:1,i,n,q,c,end,now}) -> qzState({open:2,ok});
  // CMD qz {a:'ans',i,c}. Ket qua dung chi lo ra khi server cong bo -> hoc ngan hang local.
  const qNorm = v => String(v??'').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function quizClient() {
    try {
      const gameQuiz=typeof QZ!=='undefined' && QZ?.m ? QZ : null;
      if(!quizWire.m)return gameQuiz;
      if(!gameQuiz)return quizWire;
      const a=gameQuiz.m,b=quizWire.m;
      // Prefer the game's authoritative manual picks and result state whenever
      // both sources refer to the same round (timestamps can differ by ms).
      if(a.i===b.i && a.q===b.q && a.open===b.open)return gameQuiz;
      // If reconnect delivered a genuinely NEW round to either source, use it.
      return Number(gameQuiz.at||0)>quizWire.at+250 ? gameQuiz : quizWire;
    }catch(_){return quizWire.m?quizWire:null;}
  }
  function quizSavedEntries(entries) {
    const saved=Object.entries(entries).filter(([key,row])=>{
      const seed=BUNDLED_QUIZ_BANK[key];
      return !seed||row?.source!==seed.source||row.saved!==seed.saved||row.answer!==seed.answer||
        (Array.isArray(row.aliases)?row.aliases:[]).join('|')!==seed.aliases.join('|');
    });
    return saved.sort((a,b)=>(Number(a[1]?.saved)||0)-(Number(b[1]?.saved)||0)).slice(-1200);
  }
  function quizMergeEntry(key,value){
    const old=quizBank.entries[key];
    const verified=x=>['game-result','game-log'].includes(x?.source);
    if(!old || (verified(value)&&!verified(old)) ||
       (verified(value)===verified(old)&&Number(value.saved||0)>Number(old.saved||0))){
      quizBank.entries[key]={...value,aliases:[...(value.aliases||[])]};return true;
    }
    if(!verified(old)&&old.answer===value.answer)
      old.aliases=[...new Set([...(old.aliases||[]),...(value.aliases||[])])];
    return false;
  }
  function quizPriorityIndex(key,choices){
    const candidates=[quizBank.entries[key],BUNDLED_QUIZ_BANK[key]].filter(Boolean)
      .sort((a,b)=>Number(['game-result','game-log'].includes(b.source))-Number(['game-result','game-log'].includes(a.source))||Number(b.saved||0)-Number(a.saved||0));
    for(const entry of candidates){
      const index=quizKnownIndex(entry,choices);
      if(index>=0)return index;
    }
    return -1;
  }
  function quizLoad() {
    try {
      const obj=JSON.parse(localStorage.getItem(QUIZ_BANK_KEY)||'{}');
      const src=obj&&typeof obj==='object'&&obj.entries&&typeof obj.entries==='object'?obj.entries:{};
      quizBank.entries={};
      for(const [key,val] of quizSavedEntries(src)) {
        const normalizedKey=qNorm(key);
        if (normalizedKey && typeof val?.answer==='string' && qNorm(val.answer) && val.answer.length<500)
          quizMergeEntry(normalizedKey,{answer:qNorm(val.answer), question:String(val.question||'').slice(0,350),saved:val.saved||0,aliases:Array.isArray(val.aliases)?val.aliases.slice(0,20).map(qNorm):[],source:val.source||'saved'});
      }
    } catch(e) { diagnostic('QUIZ','Loi doc ngan hang Hoa Dang: '+e.message); }
    for(const [key,value] of Object.entries(BUNDLED_QUIZ_BANK)){
      quizMergeEntry(key,value);
    }
  }
  function quizKnownIndex(saved,choices){
    if(!saved)return -1;
    const accepted=new Set([saved.answer,...(saved.aliases||[])].map(qNorm).filter(Boolean));
    const matches=choices.map((value,index)=>accepted.has(qNorm(value))?index:-1).filter(index=>index>=0);
    return matches.length===1?matches[0]:-1;
  }
  function quizSave() {
    try { localStorage.setItem(QUIZ_BANK_KEY,JSON.stringify({version:1,entries:Object.fromEntries(quizSavedEntries(quizBank.entries))})); }
    catch(e) { diagnostic('QUIZ','Khong luu duoc ngan hang: '+e.message); }
  }
  function quizRunStatus() {
    const rows=Object.values(quizBank.entries);
    const verified=rows.filter(row=>['game-result','game-log'].includes(row?.source)).length;
    return { bank:rows.length, verified, unverified:rows.length-verified, answered:metrics.quizAnswered,
      known:metrics.quizKnown, guessed:metrics.quizGuessed, correct:metrics.quizCorrect,
      wrong:metrics.quizWrong, learned:metrics.quizLearned,
      mode:cfg.quizUnknown, enabled:cfg.quizEnabled, internet:cfg.quizWebSearch, webStatus:quizWeb.status, webEvidence:quizWeb.evidence,
      wire:{attached:!!quizWire.ws,dispatchHook:!!bgDriver.hook,seen:quizWire.seen,questions:quizWire.questions,
        announced:quizWire.announced,results:quizWire.results,duplicates:quizWire.duplicates,
        wsHits:quizWire.wsHits,dispatchHits:quizWire.dispatchHits,lastSource:quizWire.lastSource,
        lastAt:quizWire.lastAt,lastOpen:quizWire.lastOpen,lastQuestion:quizWire.lastQuestion,lastIssue:quizWire.lastIssue} }; 
  }
  function quizText() {
    const x=quizRunStatus();
    const q=quizClient(),m=q?.m;
    const phase=m?.open===1?'Đang nhận câu '+(Number(m.i)+1):m?.open===2?'Đang công bố đáp án':'Chưa có câu hỏi';
    return ['20:30 mỗi ngày (giờ VN). Trả lời dựa trên câu/đáp án do máy chủ gửi.',
      'Trạng thái: '+phase,
      'Hoa Đăng RX: '+(quizWire.ws?'WebSocket đang gắn':'chưa gắn WebSocket')+' · qua gsMsg '+quizWire.dispatchHits+' · qua WS '+quizWire.wsHits+' · trùng '+quizWire.duplicates,
      'Tin hợp lệ: '+quizWire.seen+' · câu hỏi '+quizWire.questions+' · công bố '+quizWire.announced+' · kết quả '+quizWire.results,
      'Tin gần nhất: '+(quizWire.lastAt?new Date(quizWire.lastAt).toLocaleTimeString('vi-VN'):'chưa có')+' · '+quizWire.lastIssue,
      'Câu gần nhất: '+(quizWire.lastQuestion||'chưa có'),
      'Ngân hàng: '+x.bank+' mục · '+x.verified+' xác thực · '+x.unverified+' dự kiến/chưa xác thực',
      'Phiên: '+x.answered+' câu gửi · '+x.known+' biết trước · '+x.guessed+' đoán',
      'Xác nhận: '+x.correct+' đúng · '+x.wrong+' sai · học thêm '+x.learned,
      'Tra cứu internet (Wikipedia): '+(x.internet?'BẬT':'TẮT')+' · '+quizWeb.status,
      (quizWeb.source?'Nguồn: '+quizWeb.source+' · điểm tin cậy '+quizWeb.confidence:'') ,
      (quizWeb.evidence?'Chứng cứ: '+quizWeb.evidence.slice(0,130):''),
      'Câu chưa biết sau khi tra cứu: '+(x.mode==='guess'?'ĐOÁN nếu thiếu chứng cứ':'CHỜ / không gửi'),
      'Internet không cam kết đúng; đáp án chính thức chỉ có khi máy chủ công bố.'].join('\n');
  }
  function quizHash(str) { let h=2166136261;for(const c of str){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0; }
  // Tin 'qz' den qua WebSocket khong phu thuoc setInterval (Chrome co the lam cham tab nen).
  // Giữ nguyên hàm game và chỉ gọi quizTick SAU khi game đã cập nhật QZ.m/QZ.res.
  function installQuizHook() {
    try {
      if (typeof qzState==='function' && qzState!==quizHook.wrapperState) {
        quizHook.originalState=qzState;
        const previousState=qzState;
        quizHook.wrapperState=function(...args) {
          const ret=previousState.apply(this,args);
          try {quizTick();}catch(e){diagnostic('QUIZ','Hook qzState: '+e.message);}
          return ret;
        };
        qzState=quizHook.wrapperState;
      }
      if(typeof qzRes==='function' && qzRes!==quizHook.wrapperRes) {
        quizHook.originalRes=qzRes;
        const previousRes=qzRes;
        quizHook.wrapperRes=function(...args) {
          const ret=previousRes.apply(this,args);
          try {quizTick();}catch(e){diagnostic('QUIZ','Hook qzRes: '+e.message);}
          return ret;
        };
        qzRes=quizHook.wrapperRes;
      }
    } catch(_) { /* Timer fallback if scripts loaded in isolated context */ }
  }
  function uninstallQuizHook() {
    try {
      if(quizHook.wrapperState && typeof qzState==='function' && qzState===quizHook.wrapperState)
        qzState=quizHook.originalState;
      if(quizHook.wrapperRes && typeof qzRes==='function' && qzRes===quizHook.wrapperRes)
        qzRes=quizHook.originalRes;
    } catch(_) {}
    quizHook.wrapperState=null;quizHook.wrapperRes=null;
  }

  // Wikipedia MediaWiki Action API supports unauthenticated CORS with origin=*.
  // This is evidence matching, NOT an AI oracle: only auto-select when one answer has distinct support.
  function wikiText(v) {
    const d=document.createElement('div');
    d.innerHTML=String(v||'').slice(0,9000); // strip MediaWiki snippet highlighting, never added to document
    return d.textContent || d.innerText || '';
  }
  function wikiQueryText(question, shorten=false) {
    let t=String(question||'').replace(/[?!.,:;]+/g,' ').replace(/\s+/g,' ').trim();
    if(shorten) t=t.replace(/^(ai|cai gi|điều gì|đâu là|ở đâu|khi nào|năm nào|tác giả của|chọn đáp án đúng|cho biết)\s+/i,'');
    return t.slice(0,125);
  }
  async function wikiSearch(term,lang,signal) {
    const params=new URLSearchParams({action:'query',list:'search',srsearch:term,srnamespace:'0',
      srlimit:'6',srprop:'snippet',format:'json',origin:'*'});
    const url='https://'+lang+'.wikipedia.org/w/api.php?'+params.toString();
    const r=await fetch(url,{method:'GET',credentials:'omit',signal,referrerPolicy:'no-referrer'});
    if(!r.ok) throw Error('HTTP '+r.status);
    const data=await r.json();
    return Array.isArray(data?.query?.search)?data.query.search:[];
  }
  function wikiScore(rows,choices) {
    const scores=choices.map(()=>0),evidence=choices.map(()=>[]),hits=choices.map(()=>0);
    for(let rank=0;rank<rows.length;rank++) {
      const page=rows[rank];
      const title=qNorm(page.title||''),snippet=qNorm(wikiText(page.snippet||''));
      for(let i=0;i<choices.length;i++) {
        const key=qNorm(choices[i]);
        // Ignore yes/no, one-character choices, and answer-all options that cannot be inferred.
        if(key.length<3 || /^(co|khong|dung|sai|tat ca|ca [abcd]|khong dap an nao)$/.test(key))continue;
        const exact=(text)=>(' '+text+' ').includes(' '+key+' ');
        const t=exact(title),s=exact(snippet);
        if(!t&&!s)continue;
        const weight=rank<3?1:0.65;
        const score=(t?5:0)+(s?3:0);
        scores[i]+=score*weight;hits[i]++;
        if(evidence[i].length<2)evidence[i].push(String(page.title||'').slice(0,80));
      }
    }
    const order=scores.map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v);
    const best=order[0],runner=order[1];
    const margin=best.v-(runner?.v||0);
    // Require strong *distinctive* evidence; never promise fully accurate responses.
    const qualified=best.v>=7 && margin>=4 && hits[best.i]>=1;
    return {index:qualified?best.i:-1,confidence:Math.round(best.v),margin:Math.round(margin),
      evidence:evidence[best.i].join(' · '),scores};
  }
  async function startQuizWebSearch(event,m) {
    quizWeb.event=event;quizWeb.index=-1;quizWeb.confidence=0;quizWeb.status='đang tra cứu';
    quizWeb.evidence='';quizWeb.source='';quizWeb.attempts++;
    const token=sessionSerial;
    const controller=new AbortController();quizWeb.abort=controller;
    // Cap all requests to 5.5 seconds: need time to submit answer before server closes.
    const timeout=setTimeout(()=>controller.abort(),5500);
    metrics.quizWebLookups++;
    try {
      let rows=await wikiSearch(wikiQueryText(m.q),'vi',controller.signal);
      let score=wikiScore(rows,m.c);
      if(score.index<0 && rows.length<3 && !controller.signal.aborted) {
        const short=wikiQueryText(m.q,true);
        if(short && short!==wikiQueryText(m.q)) {
          rows=await wikiSearch(short,'vi',controller.signal);
          score=wikiScore(rows,m.c);
        }
      }
      if(!st.running || token!==sessionSerial || quizWeb.event!==event)return;
      if(quizRun.answered.has(event)){quizWeb.status='đã trả lời trước khi tra cứu xong';return;}
      if(score.index>=0) {
        quizWeb.index=score.index;quizWeb.confidence=score.confidence;
        quizWeb.evidence=score.evidence;quizWeb.source='vi.wikipedia.org';quizWeb.status='tìm thấy bằng chứng';
        metrics.quizWebHits++;
        diagnostic('QUIZ_WEB','Wikipedia khớp một phương án',
          {question:String(m.q).slice(0,150),option:String(m.c[score.index]).slice(0,90),score:score.confidence,margin:score.margin,source:quizWeb.source});
      } else {
        quizWeb.status='không đủ chứng cứ';
        diagnostic('QUIZ_WEB','Không đủ chứng cứ để tự chọn',{question:String(m.q).slice(0,130),scores:score.scores});
      }
    } catch(e) {
      if(!st.running || token!==sessionSerial || quizWeb.event!==event)return;
      quizWeb.status=controller.signal.aborted?'hết thời gian':'tra cứu lỗi';
      diagnostic('QUIZ_WEB','Lỗi tra cứu Wikipedia: '+String(e?.message||e).slice(0,120));
    } finally {
      clearTimeout(timeout);
      if(quizWeb.abort===controller)quizWeb.abort=null;
      if(st.running && token===sessionSerial && quizWeb.event===event)quizTick();
    }
  }
  function abortQuizWeb() {
    try{quizWeb.abort?.abort();}catch(_){}
    quizWeb.abort=null;quizWeb.event='';quizWeb.status='idle';quizWeb.index=-1;
  }

  function quizTick() {
    if (!st.running || !cfg.quizEnabled || !isOnline()) {
      if(!st.running)quizWire.lastIssue='Auto chưa bật';
      else if(!cfg.quizEnabled)quizWire.lastIssue='Tự trả lời Hoa Đăng đang tắt';
      else quizWire.lastIssue='Mất kết nối máy chủ';
      return;
    }
    const q=quizClient(), m=q?.m;
    if (!q || !m || !Array.isArray(m.c) || !m.c.length || typeof m.q!=='string') {
      if(!quizWire.seen)quizWire.lastIssue='Chưa có tin câu hỏi; thông báo chat không phải gói câu hỏi';
      return;
    }
    const day=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
    if (quizRun.day!==day) {
      // QZ.pick và QZ.res của game không tự đặt lại theo ngày khi trang mở liên tục.
      // Chỉ xoá nếu script ĐÃ quan sát ngày cũ, tránh xoá câu người chơi vừa chọn hôm nay.
      if (quizRun.day && quizRun.day!==day) {
        // QZ is the game's own state; clearing only the selected fallback
        // object leaves old QZ.pick[i] in place and blocks the first round.
        q.pick={};q.res={};
        quizWire.pick={};quizWire.res={};
        try{if(typeof QZ!=='undefined' && QZ){QZ.pick={};QZ.res={};}}catch(_){}
        diagnostic('QUIZ','Ngay Hoa Dang moi: reset lua chon/ket qua cu de co the tra loi');
      }
      quizRun.day=day; quizRun.answered.clear();quizRun.learned.clear();quizRun.results.clear();
    }
    // Không xử lý tin qz còn nằm trong bộ nhớ nhiều giờ sau khi sự kiện kết thúc.
    if (Date.now()-Number(q.at||Date.now())>10*60000) {quizWire.lastIssue='Dữ liệu câu hỏi đã cũ';return;}
    const qKey=qNorm(m.q), event=day+':'+m.i+':'+qKey;
    if (!qKey || !Number.isInteger(Number(m.i))) return;
    if (m.open===2 && Number.isInteger(Number(m.ok)) && Number(m.ok)>=0 && Number(m.ok)<m.c.length) {
      if(!quizRun.learned.has(event)) {
        quizRun.learned.add(event);
        const correct=String(m.c[Number(m.ok)]), aNorm=qNorm(correct), old=quizBank.entries[qKey];
        if (aNorm && (!old || old.answer!==aNorm || !['game-result','game-log'].includes(old.source))) {
          quizBank.entries[qKey]={answer:aNorm,question:m.q.slice(0,350),saved:Date.now(),source:'game-result',
            aliases:old?.answer===aNorm?[...(old.aliases||[])]:[]};
          quizSave();metrics.quizLearned++;
          diagnostic('QUIZ','Da hoc dap an sau cong bo', { question:m.q.slice(0,120), answer:correct.slice(0,120) });
        }
      }
    }
    if (quizRun.answered.has(event) && q.res && Object.prototype.hasOwnProperty.call(q.res, m.i) && !quizRun.results.has(event)) {
      quizRun.results.add(event);
      if(q.res[m.i]===true || q.res[m.i]===1) metrics.quizCorrect++;
      else metrics.quizWrong++;
    }
    if (m.open!==1) { if (st.running && activeTab==='quiz') draw();return; }
    // Submit even in the final second if received late; never submit after the server deadline.
    const secs=Number(m.end)-Number(m.now)-(Date.now()-Number(q.at||Date.now()))/1000;
    if (!Number.isFinite(secs)||secs<=0) {quizWire.lastIssue='Hết thời gian câu hỏi / đồng hồ không hợp lệ';return;}
    if(quizRun.answered.has(event))return;
    // Respect user/manual choice; do not send twice for the same question.
    const gamePick=(()=>{try{return typeof QZ!=='undefined' && QZ?.m?.i===m.i ? QZ?.pick?.[m.i] : null;}catch(_){return null;}})();
    const nativePick=typeof quizNativePick==='function'?quizNativePick(m):null;
    if ((q.pick && q.pick[m.i]!=null) || gamePick!=null || nativePick!==null) {
      quizRun.answered.add(event);
      diagnostic('QUIZ','Da co lua chon tu giao dien; khong tra loi trung', { question:m.q.slice(0,120) });
      return;
    }
    // Start online work immediately while resolving the local candidate in this turn.
    const candidates=[quizBank.entries[qKey],BUNDLED_QUIZ_BANK[qKey]].filter(Boolean)
      .sort((a,b)=>Number(b.saved||0)-Number(a.saved||0));
    const confirmed=candidates.filter(e=>['game-result','game-log'].includes(e.source))
      .map(e=>({entry:e,index:quizKnownIndex(e,m.c)})).find(e=>e.index>=0);
    const hiddenFast=typeof document!=='undefined'&&document.hidden;
    if(!confirmed&&cfg.quizWebSearch&&typeof fetch==='function'&&quizWeb.event!==event&&secs>5){
      abortQuizWeb();startQuizWebSearch(event,{q:m.q,c:m.c.slice()});
    }
    const local=confirmed||candidates.map(e=>({entry:e,index:quizKnownIndex(e,m.c)})).find(e=>e.index>=0);
    const localIndex=local?.index??-1;
    const webIndex=quizWeb.event===event&&Number.isInteger(quizWeb.index)&&quizWeb.index>=0&&quizWeb.index<m.c.length?quizWeb.index:-1;
    // Keep a submission margin. Hidden tabs may not get another timer before expiry.
    if(!confirmed&&!hiddenFast&&quizWeb.event===event&&quizWeb.status==='đang tra cứu'&&secs>3.5)return;
    let idx=confirmed?.index??-1,known=!!confirmed,viaInternet=false;
    let reason=confirmed?'Đáp án đã được máy chủ xác nhận':'';
    if(!confirmed){
      if(localIndex>=0&&webIndex===localIndex){idx=localIndex;known=true;reason='Thư viện và Internet đồng ý';}
      else if(localIndex>=0&&webIndex>=0){
        // Generic web snippets must not override game-specific rules or skill data.
        const gameSpecific=/game-data/.test(local.entry.source||'')||/son ha xa tac|trong game|phuc duyen|ky nang|chieu|mon phai|phai nao|ma truong|ky tran cac|ruong than ma|tong kim|da tau/.test(qKey);
        const strongWeb=Number(quizWeb.confidence)>=12;
        viaInternet=!gameSpecific&&strongWeb;idx=viaInternet?webIndex:localIndex;known=!viaInternet;
        reason='Mâu thuẫn thư viện/Internet: '+(viaInternet?'chọn bằng chứng Internet mạnh':'giữ dữ liệu thư viện; bằng chứng mạng chưa đủ hoặc câu đặc thù game');
      }else if(localIndex>=0){idx=localIndex;known=true;reason='Chọn thư viện; Internet tắt, lỗi, chưa đủ chứng cứ hoặc hết thời gian chờ';}
      else if(webIndex>=0){idx=webIndex;viaInternet=true;reason='Chọn bằng chứng Internet; thư viện chưa có lựa chọn phù hợp';}
      else{idx=quizHash(qKey+'|'+m.c.map(qNorm).join('|'))%m.c.length;reason='Đoán: cả hai nguồn chưa có đáp án phù hợp';}
    }
    const comparison={localIndex,localSource:local?.entry?.source||null,webIndex,webStatus:quizWeb.event===event?quizWeb.status:'không tra cứu',webConfidence:quizWeb.event===event?quizWeb.confidence:null,webEvidence:quizWeb.event===event?quizWeb.evidence:null};
    if (typeof cmd!=='function') return;
    try {
      const path=dualExecute('quiz',1,()=>cmd('qz',{a:'ans',i:Number(m.i),c:idx}),()=>uiQuizAnswer(idx,m.i));
      if(!path)throw Error('Không có đường trả lời Hoa Đăng khả dụng');
      q.pick=q.pick||{};q.pick[m.i]=idx;
      quizRun.answered.add(event);
      quizWire.lastIssue='Đã gửi đáp án câu '+(Number(m.i)+1)+' (lựa chọn '+('ABCD'[idx]||idx)+')';
      if(typeof auditQuizChoice==='function')auditQuizChoice(event,m,idx,reason,comparison);
      metrics.quizAnswered++;if(known)metrics.quizKnown++;else if(!viaInternet)metrics.quizGuessed++;
      diagnostic('QUIZ',(known?'Tu tra loi tu ngan hang':viaInternet?'Tra loi theo bang chung Wikipedia (khong dam bao dung)':'Chua biet: tu chon dap an, co the sai'),
        { number:Number(m.i)+1,question:m.q, option:String(m.c[idx]), index:idx, reason,comparison,timeLeft:Math.round(secs) });
      // Native VL4 UI redraws on its own timer/result; global qzDraw is legacy.
      draw();
    } catch(e) { if(Date.now()-quizRun.lastError>10000){quizRun.lastError=Date.now();diagnostic('QUIZ','Loi gui cau tra loi: '+e.message);} }
  }
  function quizExport() {
    const content=JSON.stringify({version:1,entries:quizBank.entries},null,2);
    const blob=new Blob([content],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),el=document.createElement('a');
    el.href=url;el.download='VL4_Hoa_Dang_ngan_hang_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    say('Đã xuất ngân hàng '+Object.keys(quizBank.entries).length+' câu Hoa Đăng.');
  }
  function quizImportData(text) {
    const object=JSON.parse(text),raw=object?.entries;
    if(!raw || typeof raw!=='object'||Array.isArray(raw)) throw Error('File không có entries hợp lệ');
    let imported=0;
    for(const [key,val] of Object.entries(raw).slice(0,1500)) {
      const norm=qNorm(key), ans=qNorm(val?.answer);
      if (!norm || !ans || norm.length>400 || ans.length>350) continue;
      if(quizMergeEntry(norm,{answer:ans,question:String(val.question||'').slice(0,350),
        saved:Number.isFinite(Number(val.saved))?Number(val.saved):Date.now(),
        aliases:Array.isArray(val.aliases)?val.aliases.slice(0,20).map(qNorm):[],
        source:['game-result','game-log'].includes(val.source)?val.source:'import'}))imported++;
    }
    quizSave();diagnostic('QUIZ','Nhap ngan hang dap an',{imported});return imported;
  }
  quizLoad();
  try {
    const oldAt=typeof QZ!=='undefined'?Number(QZ?.at):0;
    if(oldAt>0 && oldAt<=Date.now()+2000 && Date.now()-oldAt<3*86400000)
      quizRun.day=new Date(oldAt+7*3600000).toISOString().slice(0,10);
  }catch(_){}
  const $ = q => document.querySelector(q);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function inBalangSafeArea() {
    if(typeof R==='undefined' || String(R.vlZone)!=='53') return false;
    try {
      // Cùng map 53 nhưng ngoài đa giác an toàn vẫn là bãi đánh quái.
      // H được game cập nhật trong gsFrame từ vị trí nhân vật do server gửi.
      if(typeof inTownPt==='function' && typeof H!=='undefined' &&
         typeof U_==='number' && U_>0 && Number.isFinite(H.x) && Number.isFinite(H.y) &&
         (Math.abs(H.x)+Math.abs(H.y)>0))
        return !!inTownPt(H.x/U_,H.y/U_);
      if(typeof VL!=='undefined' && typeof VL.inTown==='boolean') return VL.inTown;
    } catch(_){}
    // Không phỏng đoán đã ra thành khi chưa có tọa độ server.
    return true;
  }
  // Bãi 53 gồm cả nội thành và ngoại thành. Không dùng lệnh zone:53 để
  // khẳng định đã ra thành vì R.vlZone không đổi khi băng qua ranh giới.
  const townRecovery={active:false,identity:'',target:null,next:1,pending:0,phase:'channel',at:0,moveAt:0,
    tried:[],lastRestartAt:0,status:'Chưa cần phục hồi rời Ba Lăng'};
  function clearTownRecovery(){
    Object.assign(townRecovery,{active:false,identity:'',target:null,next:1,pending:0,phase:'channel',at:0,moveAt:0,tried:[],selectedChannel:null,channelPolicy:''});
  }
  function startTownRecovery(s,z,reason){
    if(!st.running||!s?.town||!z||!isOnline())return false;
    if(townRecovery.active)return true;
    Object.assign(townRecovery,{active:true,identity:charIdentity(),target:{...z},next:1,pending:0,
      phase:'channel',at:Date.now(),moveAt:0,tried:[],selectedChannel:null,channelPolicy:'',status:'Kẹt ở Ba Lăng: chốt kênh theo cấu hình rồi thử di chuyển lại'});
    st.action='';st.map.requested=null;st.zoneRetryAt=0;st.softUntil=0;townFlow.request=null;
    diagnostic('TOWN_RECOVERY_START',reason,{target:z.id});say(townRecovery.status);return true;
  }
  function restartFromTownRecovery(){
    const now=Date.now(),key='auto_s4_town_restart:'+charIdentity();
    let last=townRecovery.lastRestartAt;
    try{last=Math.max(last,Number(localStorage.getItem(key)||0));}catch(_){}
    if(last&&now-last<15*60000){
      clearTownRecovery();
      softPause('Đã thử phục hồi trên kênh đã chọn sau lần khởi động lại; tạm nghỉ 5 phút, không khởi động lặp liên tục',5*60000);
      return true;
    }
    townRecovery.lastRestartAt=now;
    try{localStorage.setItem(key,String(now));}catch(_){}
    const resume={identity:charIdentity(),baseStep:st.baseStep,completed:st.completed,questActive:st.questActive,
      lastReborns:st.lastReborns,startAt:metrics.startedAt,rebirthCount:rebirth.count,
      options:{...cfg},metrics:{questSteps:metrics.questSteps,kills:metrics.kills,expObserved:metrics.expObserved,
        deathsObserved:metrics.deathsObserved,bossWorldEntries:metrics.bossWorldEntries}};
    diagnostic('TOWN_RESTART','Đã thử lại 6 lần trên kênh đã chọn: khởi động lại Auto, giữ tiến độ',{completed:st.completed});
    clearTownRecovery();stop('Khởi động lại Auto do kẹt ở Ba Lăng');beginAuto(resume);
    return true;
  }
  function townRecoveryNext(now){
    townRecovery.next++;townRecovery.pending=0;townRecovery.phase='channel';townRecovery.at=now;townRecovery.moveAt=0;
    st.action='';st.map.requested=null;st.zoneRetryAt=0;
  }
  function townRecoveryTick(s,now){
    if(!townRecovery.active)return false;
    if(!st.running||townRecovery.identity!==charIdentity()){clearTownRecovery();return false;}
    if(!isOnline()||typeof R==='undefined'||!R.ready)return true;
    const z=townRecovery.target;
    if(!s.town&&(String(s.zone)===String(z.id)||String(s.zone)!=='53')){
      diagnostic('TOWN_RECOVERY_OK','Đã rời thành hoặc tới bãi',{zone:s.zone,channel:R.ch});
      clearTownRecovery();st.action='';st.map.requested=null;st.recoveryAt=0;st.recoveryAttempts=0;
      Object.assign(starterExit,{at:0,tries:0,cooldownUntil:0,rounds:0});
      st.channel.done=false;st.channel.pending=0;return false;
    }
    if(st.boss.phase!=='idle'||arenaNow()||rebirth.phase!=='idle')return false;
    if(rewardNet.active||sellFlow.sentAt||Number(R.deadT)>0)return true;
    if(townRecovery.next>6)return restartFromTownRecovery();
    if(townRecovery.channelPolicy!==cfg.channelMode){
      townRecovery.selectedChannel=null;townRecovery.pending=0;townRecovery.phase='channel';
      townRecovery.channelPolicy=cfg.channelMode;
    }
    if(!townRecovery.selectedChannel){
      const choice=chooseChannel();
      if(choice.error){townRecovery.status=choice.error;return true;}
      townRecovery.selectedChannel=choice.id;
    }
    const ch=townRecovery.selectedChannel;
    if(townRecovery.phase==='channel'){
      if(Number(R.ch)===ch){
        townRecovery.pending=0;townRecovery.phase='settle';townRecovery.at=now;
        if(!townRecovery.tried.includes(ch))townRecovery.tried.push(ch);
        townRecovery.status='Đã ở kênh '+ch+'; chuẩn bị thử di chuyển';return true;
      }
      if(townRecovery.pending){
        if(now-townRecovery.at<10000)return true;
        diagnostic('TOWN_CHANNEL_TIMEOUT','Chưa xác nhận kênh, thử lại kênh đã chọn',{channel:ch});
        townRecoveryNext(now);return true;
      }
      if(typeof cmd!=='function'){clearTownRecovery();return softPause('Thiếu lệnh đổi kênh để phục hồi',120000);}
      try{
        cmd('ch',{n:ch});townRecovery.pending=ch;townRecovery.at=now;
        townRecovery.status='Phục hồi Ba Lăng: giữ kênh '+ch+' · lần '+townRecovery.next+'/6';say(townRecovery.status);
      }catch(e){diagnostic('TOWN_CHANNEL_ERROR',String(e?.message||e));townRecoveryNext(now);}
      return true;
    }
    if(townRecovery.phase==='settle'){
      if(Number(R.ch)!==ch){townRecovery.phase='channel';townRecovery.pending=0;return true;}
      if(now-townRecovery.at<1800)return true;
      if(afkOn()){exitPowerSave('thử rời Ba Lăng sau đổi kênh');return true;}
      try{
        st.action='';st.map.requested=null;st.zoneRetryAt=0;
        if(String(z.id)==='53'){
          const point=townOutskirtsTarget(ch-1);
          if(point)cmd('go',{x:point.x,y:point.y});
          else if(typeof backFromTown==='function')backFromTown();
          else cmd('town',{go:0});
        }else changeZone(z,s);
        townRecovery.phase='moving';townRecovery.moveAt=now;
        townRecovery.status='Kênh '+ch+': đã yêu cầu đi tới '+(z.n||z.name||z.id)+'; chờ xác nhận';say(townRecovery.status);
      }catch(e){diagnostic('TOWN_MOVE_ERROR',String(e?.message||e));townRecoveryNext(now);}
      return true;
    }
    if(townRecovery.phase==='moving'){

      if(now-townRecovery.moveAt<20000)return true;
      diagnostic('TOWN_MOVE_TIMEOUT','Vẫn ở Ba Lăng; thử lại kênh đã chọn',{channel:ch,target:z.id});
      townRecoveryNext(now);return true;
    }
    return true;
  }

  const starterExit={at:0,tries:0,lastWarning:0,cooldownUntil:0,rounds:0,
    lastResult:'Chưa yêu cầu rời Ba Lăng'};
  function townOutskirtsTarget(variation=0){
    try {
      const poly=window.BL_MAP?.town;
      if(!Array.isArray(poly)||poly.length<3||typeof H==='undefined'||
         typeof U_!=='number'||U_<=0||typeof inTownPt!=='function')return null;
      const px=Number(H.x)/U_, py=Number(H.y)/U_;
      if(!Number.isFinite(px)||!Number.isFinite(py)||!inTownPt(px,py))return null;
      const center=poly.reduce((p,q)=>[p[0]+Number(q[0]),p[1]+Number(q[1])],[0,0])
        .map(x=>x/poly.length);
      const candidates=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length];
        const dx=b[0]-a[0],dy=b[1]-a[1];
        const t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1)));
        const edge={x:a[0]+t*dx,y:a[1]+t*dy};
        const dist=Math.hypot(edge.x-px,edge.y-py);
        const vx=edge.x-center[0],vy=edge.y-center[1],len=Math.hypot(vx,vy)||1;
        for(const off of [9,18,30]){
          const x=edge.x+vx/len*off,y=edge.y+vy/len*off;
          if(Number.isFinite(x)&&Number.isFinite(y)&&!inTownPt(x,y)){
            candidates.push({x:Math.round(x*100)/100,y:Math.round(y*100)/100,dist,i});
            break;
          }
        }
      }
      candidates.sort((a,b)=>a.dist-b.dist);
      // Lần thử sau chọn hướng rời thành khác, tránh kẹt cùng một vật cản.
      const unique=candidates.filter((p,i,arr)=>
        arr.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<12)===i);
      if(!unique.length)return null;
      return unique[Math.min(unique.length-1,Math.max(0,variation)%Math.min(unique.length,4))];
    }catch(_){return null;}
  }
  function exitStarterTown(s,z) {
    if(!s || !s.town || s.zone!=='53' || String(z?.id)!=='53') return false;
    if(!isOnline() || (typeof R!=='undefined' && Number(R.deadT)>0))return true;
    const now=Date.now();
    if(now<starterExit.cooldownUntil)return true;
    if(starterExit.tries>=4)return startTownRecovery(s,z,'Không ra khỏi vùng an toàn sau 4 lần');

    if(starterExit.at && now-starterExit.at<18000)return true;
    if(afkOn()){exitPowerSave('ra ngoai thanh luyen cap');return true;}
    starterExit.at=now;starterExit.tries++;
    try {
      // Ưu tiên cơ chế rời thành của game ở lần đầu, sau đó dùng lệnh đi
      // được bridge.js xác nhận để tìm đường ra ngoài đa giác an toàn.
      const useMove=starterExit.tries>=2;
      const target=useMove ? townOutskirtsTarget(starterExit.rounds+starterExit.tries-2) : null;
      if(target && typeof cmd==='function'){
        cmd('go',{x:target.x,y:target.y});
        starterExit.lastResult='Đi ra ngoại thành tới ('+target.x+','+target.y+')';
        diagnostic('MAP_TOWN','Gửi yêu cầu di chuyển ra ngoài đa giác',{attempt:starterExit.tries,round:starterExit.rounds,target});
      }else if(typeof backFromTown==='function'){
        backFromTown();
        starterExit.lastResult='Đã yêu cầu rời thành bằng backFromTown()';
        diagnostic('MAP_TOWN','Thử rời thành bằng lệnh town:go=0',{attempt:starterExit.tries,round:starterExit.rounds});
      }else if(typeof cmd==='function'){
        cmd('town',{go:0});
        starterExit.lastResult='Đã yêu cầu rời thành bằng town:go=0';
      }else return true;
      say('🚶 '+starterExit.lastResult+' ('+starterExit.tries+'/4); chờ máy chủ xác nhận tọa độ ngoài thành.');
    } catch(e){diagnostic('MAP_TOWN','Không gửi được lệnh rời thành: '+e.message);}
    return true;
  }
  function trainForRebornQuest(s, reason) {
    const now=Date.now();
    const farm=pickZone({...s,took:false,text:''},'loot');
    if(farm.error){if(now-st.map.reportAt>60000){st.map.reportAt=now;say('Chờ bãi luyện sau chuyển sinh: '+farm.error);}return true;}
    const z=farm.z;
    if (exitStarterTown(s,z))return true;
    if(s.town || s.zone!==z.id){
      if(st.zoneRetryAt && now-st.zoneRetryAt<ZONE_RETRY_MS)return true;
      st.zoneRetryAt=now;
      changeZone(z,s);return true;
    }
    if(st.map.requested?.id===s.zone)st.map.requested=null;
    if(!ensureChannel(s))return true;
    if(combatEnabled()!==true){syncCombatAuto(s);return true;}
    enterPowerSave(s);
    if(now-st.map.reportAt>60000){st.map.reportAt=now;
      say('☯️ Luyện cấp để mở bãi nhiệm vụ Dã Tẩu đang giữ: '+reason);}
    return true;
  }
  function game() {
    try {
      if (typeof S === 'undefined' || typeof R === 'undefined') return null;
      const q = S && S.qc;
      if (!S?.fac) return null;
      const lv = Number(S.lv ?? S.lvl ?? 0);
      // Duoi cap 40 chua co nhiem vu Da Tau: van cho Auto luyen cap.
      // Dang dong bo S.qc: giu phien Auto, khong coi la loi vinh vien.
      // Tick se cho game gui lai du lieu truoc khi gui lenh nhiem vu.
      const info = R.qc || {};
      return { q: q || null, info, step: Number(q?.step) || 1,
        took: !!q?.took && Number(q?.kind) >= 0,
        have: Number(q?.have) || 0, need: Number(q?.need) || 0,
        text: String(info.t || ''), town: inBalangSafeArea(),
        zone: String(R.vlZone || ''), level: lv,
        reborns: Math.max(0,Number(S.reset)||0), gold: Number(S.gold ?? S.zen ?? 0) };
    } catch (e) { console.error('[DT] game()', e); return null; }
  }
  // Du lieu nhan vat do may chu VL4 dong bo qua S; tinh % theo cong thuc UI goc.
  function characterInfo() {
    try {
      if (typeof S === 'undefined' || !S || !S.fac) return null;
      const name = String(S.name || '').trim() || 'Chưa có tên';
      const level = Number(S.lv ?? S.lvl);
      const xp = Number(S.xp ?? S.exp);
      let need = NaN;
      if (Number.isFinite(level) && level >= 1 && typeof expNeed === 'function')
        need = Number(expNeed(level));
      // Du phong khi expNeed khong duoc export ra window, nhung du lieu J.exp con san.
      else if (Number.isFinite(level) && level >= 1 && typeof J !== 'undefined' && Array.isArray(J.exp) && J.exp.length)
        need = Number(J.exp[Math.min(J.exp.length, Math.max(1, Math.floor(level)))-1]);
      const pct = Number.isFinite(xp) && Number.isFinite(need) && need > 0
        ? Math.max(0, Math.min(100, xp / need * 100)) : null;
      // Dữ liệu nhân vật do bridge.js đồng bộ. Dùng ?? để GOLD=0 không bị thay bằng giá trị khác.
      const goldRaw = S.gold ?? S.zen;
      const gold = goldRaw === undefined || goldRaw === null ? null : Number(goldRaw);
      const quest = S.qc && typeof S.qc === 'object' ? S.qc : null;
      const questStepRaw = quest?.step;
      const questStep = questStepRaw === undefined || questStepRaw === null ? null : Number(questStepRaw);
      return {name, level:Number.isFinite(level)?level:null, xp:Number.isFinite(xp)?xp:null,
        need:Number.isFinite(need)&&need>0?need:null, percent:pct,
        gold:Number.isFinite(gold)?gold:null,
        questStep:Number.isInteger(questStep)&&questStep>=1?questStep:null};
    } catch (_) { return null; }
  }
  // v1.0: VL4 co HAI giao thuc ban khac nhau:
  // - vj: server tu quyet theo bo loc server, co the tra "Khong co mon nao de ban".
  // - vsm: cua so "Ban theo loc" lay sellFilterList() tu client, gui UID theo lo.
  // Chi dung CHINH danh sach game da loc; khong tu suy dien trang bi rac.
  const sellFlow={sentAt:0,before:0,beforeIds:new Set(),pendingIds:new Set(),
    lastAt:0,blockedUntil:0,requests:0,confirmed:0,saved:0,noChange:0,lastWarn:0,
    lastResult:'Chưa bán',lastMode:'ui-filter',lastPreviewAt:0,lastPreviewCount:null,
    observedMissing:0,lastProgressAt:0,lastPreviewSafe:null,lastPreviewReason:'',lastRequested:0};
  function bagState(){
    try{
      if(typeof S==='undefined'||!S||!S.fac||!Array.isArray(S.vinv))return null;
      const count=S.vinv.length, bagLevel=Math.max(0,Math.min(4,Math.floor(Number(S.bag)||0)));
      const cap=60+10*bagLevel;
      const locked=S.vinv.filter(x=>x&&x.lk).length;
      return {count,cap,free:Math.max(0,cap-count),pct:cap?100*count/cap:0,locked};
    }catch(_){return null;}
  }
  function itemId(x){
    const id=Number(x?.uid??x?.u);
    return Number.isSafeInteger(id)&&id>0?id:null;
  }
  function explicitSellPlan(){
    const result={ids:[],eligible:0,excluded:0,reason:'',total:0};
    if(typeof sellFilterList!=='function'){
      result.reason='Game chưa cung cấp sellFilterList(); không tự bán.';return result;
    }
    if(typeof S==='undefined'||!Array.isArray(S.inv)||!Array.isArray(S.vinv)){
      result.reason='Túi chưa đồng bộ; chờ game.';return result;
    }
    if(S.inv.length!==S.vinv.length){
      result.reason='S.inv và S.vinv chưa đồng bộ ('+S.inv.length+'/'+S.vinv.length+').';return result;
    }
    let list;
    try{list=sellFilterList();}catch(e){result.reason='Bộ lọc game lỗi: '+String(e?.message||e);return result;}
    if(!Array.isArray(list)){result.reason='sellFilterList() không trả danh sách.';return result;}
    result.total=list.length;
    const invIds=new Set(S.vinv.map(itemId).filter(Boolean));
    const equipIds=new Set([...Object.values(S.veq||{}),...Object.values(S.eq||{})].map(itemId).filter(Boolean));
    const seen=new Set();
    for(const item of list){
      const id=itemId(item);
      if(!id||seen.has(id)||!invIds.has(id)||equipIds.has(id)){
        result.ids=[];result.reason='Danh sách Bán theo lọc có UID không hợp lệ hoặc túi đang đổi; hẹn kiểm tra lại.';return result;
      }
      seen.add(id);result.ids.push(id);
    }
    // Protection and loot rules are owned by the game's sellFilterList/sellProtected.
    // No extra rarity policy, no trimming: match the native button exactly.
    result.eligible=result.ids.length;
    return result;
  }

  function updateSellPreview(force=false){
    const now=Date.now();
    if(!force && now-sellFlow.lastPreviewAt<8000)return;
    const plan=explicitSellPlan();
    sellFlow.lastPreviewAt=now;
    sellFlow.lastPreviewCount=plan.total;
    sellFlow.lastPreviewSafe=plan.eligible;
    sellFlow.lastPreviewReason=plan.reason;
  }
  function sellStatusText(){
    const b=bagState();
    if(!b)return 'Túi: chờ máy chủ đồng bộ';
    updateSellPreview();
    const hold=sellFlow.blockedUntil>Date.now()?' · Tạm ngưng '+Math.ceil((sellFlow.blockedUntil-Date.now())/60000)+' phút':'';
    const preview=sellFlow.lastPreviewCount===null?'chưa đọc được':
      sellFlow.lastPreviewCount+' món theo lọc game, '+sellFlow.lastPreviewSafe+' UID hợp lệ';
    const reason=sellFlow.lastPreviewReason?'\n'+sellFlow.lastPreviewReason:'';
    const threshold=Math.min(Math.ceil(b.cap*cfg.autoSellPct/100),b.cap-cfg.autoSellMinFree);
    const waitForBag=cfg.autoSellEnabled&&b.count<threshold?' · Chờ túi đạt '+threshold+'/'+b.cap:'';

    return `Túi ${b.count}/${b.cap} (${b.pct.toFixed(1)}%) · Trống ${b.free} · Khóa ${b.locked}\n`+
      `Tự bán: ${cfg.autoSellEnabled?'BẬT':'TẮT'} · Ngưỡng ${cfg.autoSellPct}% hoặc còn ≤${cfg.autoSellMinFree} ô${waitForBag}\n`+
      `Có thể bán: ${preview} (đúng toàn bộ danh sách nút Bán theo lọc)\n`+
      `Gửi ${sellFlow.requests} lần · Túi giảm sau lệnh ${sellFlow.confirmed} lần · Tổng giảm ${sellFlow.saved}\n`+
      sellFlow.lastResult+hold+reason;
  }
  function sellTick(s,manual=false){
    const now=Date.now(),b=bagState();
    if(!b)return false;
    if(sellFlow.sentAt){
      if(sellFlow.identity!==charIdentity()){sellFlow.sentAt=0;sellFlow.pendingIds.clear();sellFlow.lastResult='Hủy theo dõi bán vì đã đổi nhân vật';return false;}
      if(!isOnline()||!Array.isArray(S.inv)||S.inv.length!==S.vinv.length)return false;
      const currentIds=new Set([...S.vinv,...Object.values(S.veq||{}),...Object.values(S.eq||{})]
        .map(itemId).filter(Boolean));
      let missing=0;
      for(const id of sellFlow.pendingIds)if(!currentIds.has(id))missing++;
      if(missing!==sellFlow.observedMissing){
        sellFlow.observedMissing=missing;
        sellFlow.lastProgressAt=now;
      }
      const elapsed=now-sellFlow.sentAt;
      const settled=elapsed>=60000||(elapsed>=30000&&now-sellFlow.lastProgressAt>=8000);
      if(missing!==sellFlow.pendingIds.size&&!settled)return false;
      if(missing>0){
        sellFlow.saved+=missing;sellFlow.confirmed++;sellFlow.noChange=0;sellFlow.blockedUntil=0;
        sellFlow.lastResult='Túi đã giảm '+missing+'/'+sellFlow.lastRequested+' UID đã gửi; sẽ lọc lại ở lượt sau.';
        diagnostic(missing===sellFlow.lastRequested?'SELL_OK':'SELL_PARTIAL',sellFlow.lastResult,
          {requested:sellFlow.lastRequested,removed:missing,before:sellFlow.before,after:b.count});
      }else{
        sellFlow.noChange=Math.min(4,sellFlow.noChange+1);
        const retryMinutes=Math.min(5,2**(sellFlow.noChange-1));
        sellFlow.blockedUntil=now+retryMinutes*60000;
        sellFlow.lastResult='Chưa thấy món đã gửi rời túi; tự kiểm tra lại sau '+retryMinutes+' phút.';
        diagnostic('SELL_TIMEOUT',sellFlow.lastResult,{attempt:sellFlow.noChange,requested:sellFlow.lastRequested});
      }
      sellFlow.sentAt=0;sellFlow.pendingIds.clear();sellFlow.beforeIds.clear();
      updateSellPreview(true);
    }
    if(typeof R!=='undefined'&&String(R.vlZone)==='tk')return false;
    if(!st.running||(!manual&&!cfg.autoSellEnabled)||!isOnline()||!s||s.town===undefined)return false;
    if(st.boss.phase!=='idle'||arenaNow()||st.action||rebirth.phase!=='idle'||st.startup==='running'||!S.vinv)return false;
    if(typeof SV!=='undefined'&&SV.on)return false;
    if(!manual && (now<sellFlow.blockedUntil||now-sellFlow.lastAt<cfg.autoSellCooldown*1000))return false;
    if(!manual && (b.count===0 || (b.pct<cfg.autoSellPct && b.free>cfg.autoSellMinFree)))return false;
    const plan=explicitSellPlan();
    updateSellPreview(true);
    if(plan.reason||!plan.eligible){
      sellFlow.lastResult=plan.reason || 'Không có món hợp lệ để bán: bộ lọc đang giữ toàn bộ hoặc chỉ còn đồ được bảo vệ.';
      if(now-sellFlow.lastWarn>120000){
        sellFlow.lastWarn=now;
        diagnostic('SELL_EMPTY',sellFlow.lastResult,{items:b.count,matched:plan.total,safe:plan.eligible});
      }
      // Không coi không có món bán là lỗi máy chủ; giữ công tắc và kiểm tra lại sau.
      sellFlow.blockedUntil=Math.max(sellFlow.blockedUntil,now+30000);
      return false;
    }
    if(typeof sellModal!=='function'){sellFlow.lastResult='Thiếu cửa sổ Bán đồ của game.';return false;}
    sellFlow.identity=charIdentity();
    sellFlow.before=b.count;
    sellFlow.beforeIds=new Set(S.vinv.map(itemId).filter(Boolean));
    sellFlow.pendingIds=new Set(plan.ids);
    sellFlow.lastRequested=plan.ids.length;
    sellFlow.sentAt=now;sellFlow.observedMissing=0;sellFlow.lastProgressAt=now;
    sellFlow.lastResult='Đã nhấn Bán theo lọc: '+plan.ids.length+' món; chờ máy chủ đồng bộ UID.';
    try{
      const path=uiSellExact(plan)?'ui':null;
      dualLog('selling',path||'unavailable','Bán theo lọc qua nút game');
      if(!path)throw Error('Không nhấn được Bán theo lọc hoặc danh sách vừa thay đổi');
      sellFlow.lastAt=now;sellFlow.requests++;
      diagnostic('SELL_VSM','Gửi đúng lệnh Bán theo lọc của cửa sổ game',
        {requested:plan.ids.length,eligible:plan.eligible,gameCount:plan.total,
          count:b.count,capacity:b.cap,manual:!!manual});
      return true;
    }catch(e){
      sellFlow.sentAt=0;sellFlow.pendingIds.clear();sellFlow.beforeIds.clear();sellFlow.blockedUntil=now+30000;
      sellFlow.lastResult='Lỗi gửi vsm: '+String(e?.message||e);
      return false;
    }
  }
  function goldCompact(value) {
    if (!Number.isFinite(value)) return '—';
    // M/K/B để không làm bảng Auto quá rộng, giữ nguyên số đầy đủ trong tooltip.
    const abs=Math.abs(value);
    const unit=abs>=1e9?1e9:abs>=1e6?1e6:abs>=1e3?1e3:1;
    const suffix=unit===1e9?'B':unit===1e6?'M':unit===1e3?'K':'';
    const digits=unit===1?0:abs/unit>=100?0:abs/unit>=10?1:2;
    return (value/unit).toLocaleString('vi-VN',{maximumFractionDigits:digits,minimumFractionDigits:0})+suffix;
  }
  function characterLabel() {
    const c=characterInfo();
    if (!c) return '👤 Chưa vào nhân vật';
    const quest = c.questStep===null?'Dã Tẩu: chờ đồng bộ':'Dã Tẩu: bước '+c.questStep;
    return '👤 '+c.name+' · Cấp '+(c.level ?? '—')+' · EXP '+(c.percent===null?'—':c.percent.toFixed(1)+'%')+
      '\n💰 '+goldCompact(c.gold)+' lượng · 📜 '+quest+' · Phiên '+st.completed+'/'+cfg.target;
  }
  const questProgressLog={key:'',at:0,complete:false};
  function sayQuestProgress(s,kind){
    const now=Date.now(),key=[s.zone,s.step,s.need,s.text].join('|');
    const msg='Dang lam: '+(s.text||(kind==='loot'?'Nhat trang bi':'Danh quai'))+' ('+s.have+'/'+s.need+')';
    const complete=s.need>0&&s.have>=s.need;
    st.status=msg; // UI remains current even when the diagnostic record is throttled.
    if(key!==questProgressLog.key||now-questProgressLog.at>=60000||(complete&&!questProgressLog.complete)){
      Object.assign(questProgressLog,{key,at:now,complete});say(msg);
    }
  }
  function say(msg) {
    st.status = msg;
    st.logs.unshift(new Date().toLocaleTimeString('vi-VN') + ' ' + msg);
    diagnostic('AUTO', msg);
    st.logs.length = Math.min(8, st.logs.length);
    draw();
    console.log('[AUTO S4]', msg);
  }
  // V2.3: Auto goc cua VL4 duoc SYNC qua AU().fight va R.afk.
  // Chi cmd('opt',...) la KHONG DU: syncTick()/sendCfg() co the bat lai theo AU().fight.
  const combatSync = { lastTry: 0, attempts: 0, locationKey: '', lastWarning: 0, lastTownEnforceAt:0,
    pendingValue: null, confirmAt: 0, lastConfirmed: null, lastLog: '', forceSync: true };
  function combatConfig() {
    try {
      const au = typeof AU === 'function' ? AU() :
        (typeof S !== 'undefined' && S ? S.au : null);
      return au && typeof au === 'object' ? au : null;
    } catch (e) { console.warn('[DT] Khong doc duoc AU()', e); return null; }
  }
  function combatEnabled() {
    const au = combatConfig();
    return au && (typeof au.fight === 'boolean' || au.fight === 0 || au.fight === 1)
      ? !!au.fight : null;
  }
  function visibleGameWindow(el) {
    if (!el || !el.isConnected || el.hidden || el.closest('[hidden]')) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
  }
  // Chi dong giao dien "Thiet lap Auto" ma game mo; khong dong bang Da Tau,
  // Boss, nhiem vu ngay/tuan hay bang Auto cua chung ta.
  function closeGameAutoSettings() {
    const roots = [...document.querySelectorAll('.win, #modal')];
    let closed = false;
    for (const root of roots) {
      if (!visibleGameWindow(root) || root.closest('#' + ID)) continue;
      const heading = root.querySelector('.wt, .wtitle, .win-title, h2, h3, .cwt');
      const title = (heading?.textContent || root.getAttribute('aria-label') || '').trim();
      const settingsId = /^(?:auto(?:settings|cfg|config|win)|wauto|autoModal)$/i.test(root.id || '');
      if (!settingsId && !/(?:Thiết\s*lập\s*Auto|Cài\s*đặt\s*Auto|Auto\s*(?:Settings|Configuration))/i.test(title)) continue;
      if (root.id === 'modal' && typeof closeModal === 'function') {
        closeModal(true); closed = true; continue;
      }
      const btn = root.querySelector('.wx, .wclose, [data-close], .close, button[aria-label="Close"], button[title="Đóng"]');
      if (btn) { btn.click(); closed = true; }
      else if (typeof winClose === 'function' && root.id) {
        try { winClose(root.id); closed = true; } catch (e) { console.warn('[DT] Khong dong duoc cua so Auto', e); }
      }
    }
    return closed;
  }
  function syncCombatAuto(s,holdTown=false) {
    if(!st.running||!cfg.keepGameAuto||!s||!isOnline())return false;
    const arena=arenaNow(),town=!arena&&!!s.town,returning=!!townFlow.request||town&&holdTown;
    const trainingAtTown=town&&!returning&&(cfg.daTauPaused||st.questActive&&(!questEligible(s)||st.levelMode==='training'||
      (typeof nativeQuestMode==='function'&&!!nativeQuestMode(s))));
    const desired=(!town||trainingAtTown)&&!returning&&!(typeof tkUnsafeTarget==='function'&&tkUnsafeTarget());
    // General tick and townCombatReady must share the same OFF handshake in town.
    // holdTown is an intent, not a new physical location: resetting here each tick
    // otherwise keeps pushing confirmAt forward and blocks a completed quest.
    const locationKey=town&&!trainingAtTown?'town':returning?'returning':arena?'boss':trainingAtTown?'town-training':'field';
    const now=Date.now();
    if(combatSync.locationKey!==locationKey){
      Object.assign(combatSync,{locationKey,attempts:0,lastTry:0,pendingValue:null,forceSync:true,lastConfirmed:null,retryAt:0});
    }
    if((town||returning)&&afkOn()){
      exitPowerSave('về thành, đồng bộ Auto chiến đấu');
      if(afkOn())return false;
    }
    const actual=combatEnabled(),button=combatControl(),shown=combatButtonState(button);
    combatSync.observed={config:actual,button:shown,desired,at:now};
    const matches=actual===desired&&(shown===null||shown===desired);
    if(!matches)combatSync.lastConfirmed=null;
    if(matches&&!combatSync.forceSync){
      if(combatSync.pendingValue!==null&&now<combatSync.confirmAt)return false;
      const verified=shown!==null;
      const signature=locationKey+':'+desired+':'+verified;
      combatSync.lastConfirmed=verified?desired:null;
      combatSync.pendingValue=null;
      if(combatSync.lastLog!==signature){
        combatSync.lastLog=signature;
        say(verified?('Đã xác nhận Auto game '+(desired?'BẬT':'TẮT')+' trên công tắc '+(town?'ở thành':'tại bãi/Boss')):
          'Cấu hình tự đánh '+(desired?'BẬT':'TẮT')+'; chưa đọc được trạng thái công tắc Auto');
      }
      if(!town)closeGameAutoSettings();
      return true;
    }
    if(combatSync.pendingValue!==null&&now<combatSync.confirmAt)return false;
    if(now<(combatSync.retryAt||0)||now-combatSync.lastTry<1500)return false;
    combatSync.lastTry=now;combatSync.attempts++;
    try{
      let sent=false,way='';
      if(cfg.dualRouteMode!=='command'&&(!matches||cfg.dualRouteMode==='ui')){
        sent=uiCombat(desired);way='ui';
        // A dispatched native click may settle on a later animation frame.
        if(!sent&&button&&shown!==null&&shown!==desired)sent=true;
      }
      if(!sent&&cfg.dualRouteMode!=='ui'){
        const au=combatConfig();
        if(!au||typeof cmd!=='function')throw Error('Thiếu cấu hình hoặc cmd của game');
        // The native master owns S.ctrl independently of AU().fight.
        // opt:auto alone never changes the master, so confirmation could loop forever.
        if(typeof S!=='undefined'&&['auto','manual'].includes(S.ctrl)&&
           S.ctrl!==(desired?'auto':'manual')){
          if(typeof setCtrl!=='function')throw Error('Thiếu setCtrl để đồng bộ công tắc Auto');
          setCtrl(desired?'auto':'manual',true);
        }
        au.fight=desired;
        if(typeof S!=='undefined'&&S?.au&&S.au!==au)S.au.fight=desired;
        cmd('opt',{k:'auto',v:desired?1:0});
        if(typeof sendCfg==='function'&&!afkOn())sendCfg();
        if(typeof R!=='undefined')R.dirty=true;
        if(typeof refresh==='function')refresh();
        sent=true;way='command';
      }
      if(!sent)throw Error('Chưa thao tác được công tắc tự đánh');
      dualLog('combat',way,'Đợi đối chiếu cấu hình và công tắc game');
      combatSync.forceSync=false;combatSync.pendingValue=desired;combatSync.confirmAt=now+700;
      if(combatSync.attempts>=3){combatSync.retryAt=now+30000;combatSync.attempts=0;}
      if(combatSync.attempts===1||now-combatSync.lastWarning>30000){
        combatSync.lastWarning=now;
        say('Đã yêu cầu Auto '+(desired?'BẬT':'TẮT')+'; đang chờ công tắc game xác nhận');
      }
    }catch(e){
      if(now-combatSync.lastWarning>30000){combatSync.lastWarning=now;say('Chưa đồng bộ Auto: '+e.message);}
    }
    return false;
  }

  const townCombatWait={at:0,key:''};
  function townCombatReady(s){
    if(!st.running||!s||!isOnline())return false;
    const key=String(s.step)+':'+String(s.zone);
    if(townCombatWait.key!==key){townCombatWait.key=key;townCombatWait.at=Date.now();}
    if(!townCombatWait.at)townCombatWait.at=Date.now();
    if(afkOn())exitPowerSave('chờ tắt chiến đấu trước khi về thành/nhận trả');
    if(cfg.keepGameAuto)syncCombatAuto(s,true);
    const shown=combatButtonState();
    const ready=!afkOn()&&combatEnabled()===false&&shown===false&&
      combatSync.pendingValue===null;
    if(ready){townCombatWait.at=0;townCombatWait.key='';return true;}
    if(Date.now()-townCombatWait.at>=30000){
      diagnostic('COMBAT_BLOCKED','Không xác nhận được tắt Auto sau 30 giây',
        {zone:s.zone,step:s.step,config:combatEnabled(),button:shown,afk:afkOn(),locationKey:combatSync.locationKey,pendingValue:combatSync.pendingValue,confirmAt:combatSync.confirmAt,lastTry:combatSync.lastTry});
      stop('Không xác nhận được tắt chiến đấu; kiểm tra công tắc Auto rồi bấm Bắt đầu lại');
    }
    return false;
  }
  function questLocationObserve(m){
    // Only a response to our pending NPC action can stop this run. Ordinary
    // quest-completion announcements are not location rejections.
    if(!st.running||!/^(?:Nhan nhiem vu|Tra nhiem vu)/.test(st.action)||
       Date.now()-st.actionAt>60000)return false;
    const texts=m?.t==='f'?(m.ev||[]).filter(v=>v[0]==='l'||v[0]==='o').map(v=>v[1]):
      m?.t==='msg'?[m.msg]:[];
    const rejected=texts.find(raw=>/^ve thanh ba lang gap npc da tau de (?:tra|nhan) nhiem vu$/.test(normalize(String(raw||'').replace(/<[^>]*>/g,''))));
    if(!rejected)return false;
    const snap=game();
    diagnostic('QUEST_LOCATION_REJECT',String(rejected),{action:st.action,step:snap?.step,
      zone:snap?.zone,clientTown:snap?.town,config:combatEnabled(),button:combatButtonState(),
      x:typeof H!=='undefined'?H.x:null,y:typeof H!=='undefined'?H.y:null,
      scale:typeof U_!=='undefined'?U_:null,afk:afkOn()});
    // The server contradicts our local polygon. Without a fresh authoritative
    // position contract, retrying or claiming that town was reached is unsafe.
    stop('Máy chủ từ chối vị trí Dã Tẩu: về Ba Lăng gặp NPC rồi bấm Bắt đầu lại');
    return true;
  }
  function safeGoTown(label, s) {
    if(tongKimInside())return false;
    if (s.town) { townFlow.request = null; return true; }
    if (!isOnline()) return false;
    const now=Date.now();
    if (!townFlow.request || townFlow.request.label !== label)
      townFlow.request = { label, at:now, sent:false, tries:0, sentAt:0 };
    if (afkOn()) { exitPowerSave('chuan bi ve thanh'); return false; }
    // Giai doan 1: tat Auto va cho it nhat 1 nhip dong bo truoc khi gui lenh town.
    syncCombatAuto(s);
    const au=combatConfig();
    if (au && au.fight) au.fight=false;
    if(!townCombatReady(s))return false;
    if (now-townFlow.request.at < 1900) return false;
    // Giai doan 2: gui lenh ve thanh mot lan; chi thu lai khi server khong xac nhan.
    if (townFlow.request.sent && now-townFlow.request.sentAt < 18000) return false;
    if (townFlow.request.tries >= 3) {
      diagnostic('ERROR','Ve thanh khong duoc server xac nhan sau 3 lan');
      return softPause('Về thành không được xác nhận sau 3 lần; kiểm tra kết nối',180000);
    }
    townFlow.request.sent=true;
    townFlow.request.tries++;
    townFlow.request.sentAt=now;
    try {
      // Khong goi perform: st.action chi theo doi ket qua zone cua server, khong chan loop 12 giay.
      const path=dualExecute('town',townFlow.request.tries,()=>cmd('town',{go:1}),uiTown);
      if(!path)return softPause('Không có đường về thành an toàn',120000);
      diagnostic('TOWN',label,{tries:townFlow.request.tries});
      say(label+' (yeu cau '+townFlow.request.tries+'/3, dang cho server xac nhan)');
      return false;
    } catch(e) { diagnostic('ERROR','Loi ve thanh '+e.message); return false; }
  }
  function stop(reason = 'Da dung') {
    resetPartyWait();
    townCombatWait.at=0;townCombatWait.key='';
    deactivateSavedRun('Auto da dung: '+reason);
    sessionSerial++;
    if(resumeTimer!==null){clearInterval(resumeTimer);resumeTimer=null;}
    rewardNet.active=false;
    rewardsRuntime.scope=null;
    abortQuizWeb();
    rebirth.phase='idle';
    sellFlow.sentAt=0; sellFlow.beforeIds.clear();sellFlow.pendingIds.clear();
    restoreQuestBossPriority();
    restoreRangedPolicy();
    restoreWorldBossCombat();
    releaseNativeQuest();
    restoreGameZoneAuto();
    townFlow.request = null;
    clearBossApproach('Đã dừng ưu tiên tọa độ Boss');
    resetFieldSafety();
    clearTownRecovery();
    tongKim.phase='idle';tongKim.uiWait=false;tongKim.state=null;tkCombatReset();
    startupField.active=false;
    bossHunt.forcedChannel = null;
    st.running = false; st.action = ''; st.busy = false;
    if (afkOn()) exitPowerSave('dung Auto');
    st.recoveryAt = 0; st.recoveryStatus = '';
    st.startupJob = null;
    st.startup = 'done';
    st.busyToken = null;
    st.boss.phase = 'idle'; st.boss.slot = '';
    say(reason);
  }
  function mark(action, snap) {
    st.action = action; st.actionAt = Date.now();
    st.checkpoint = snap ? [snap.step, snap.took, snap.have, snap.need, snap.town, snap.zone].join('|') : '';
  }
  function changed(s) {
    // Xac nhan doi bai BANG R.vlZone, khong su dung chi so have vi co the thay doi tren bai CU.
    if (st.action.startsWith('Chon bai '))
      return !!st.map.requested && String(s.zone)===String(st.map.requested.id) &&
        (String(s.zone)!=='53' || !s.town);
    if (st.action.startsWith('Nhan nhiem vu')) return !!s.took;
    if (st.action.startsWith('Tra nhiem vu')) {
      const old=Number(st.checkpoint.split('|')[0])||0;
      return s.step>old || !s.took;
    }
    return [s.step, s.took, s.have, s.need, s.town, s.zone].join('|') !== st.checkpoint;
  }
  function perform(fn, label, snap) {
    mark(label, snap);
    try { fn(); say(label); } catch(e) {
      console.error(e); diagnostic('ERROR','Tao lenh '+label+' that bai: '+e.message);
      st.action='';
      if (/Nhan nhiem vu|Tra nhiem vu/.test(label)) {
        st.ackFailures=(st.ackFailures||0)+1;
        if (st.ackFailures<3) { say('Giao dien nhiem vu chua san sang; se thu lai ('+st.ackFailures+'/3).'); return; }
      }
      softPause('Lỗi gửi lệnh: ' + e.message,120000);
    }
  }
  function openNpcQuest() {
    if (typeof vlNpcOpen !== 'function' || typeof NPCS === 'undefined')
      throw Error('Khong tim thay ham mo NPC');
    const npc = NPCS.find(n => n.k === 'da_tau');
    if (!npc) throw Error('Khong tim thay NPC da_tau');
    vlNpcOpen(npc);
    const btn = [...document.querySelectorAll('#mBody button[data-i]')]
      .find(b => b.dataset.i === '0');
    if (!btn) throw Error('Khong tim thay nut Nhiem vu Da Tau');
    btn.click();
  }
  // Chi dong giao dien nhiem vu Da Tau, khong dong cua so khac.
  function closeQuestModal() {
    const quest = document.querySelector('#mBody .questwin.vlqc');
    if (!quest) return false;
    if (typeof closeModal !== 'function') {
      console.warn('[AUTO S4] Thieu closeModal()');
      return false;
    }
    // closeModal(true) la cach game su dung khi dong cua so ma khong quay ve modalBack.
    closeModal(true);
    return true;
  }
  // Dã Tẩu VL4: UI NPC chi gui lenh socket. May chu xac nhan qua S.qc
  // Khong click DOM de tranh modal chua kip render, nham nut va loi tren mobile.
  // Server co quyen tu choi khi khong o Ba Lang / chua du cap / sai trang thai.
  let daTauHoldUntil=0;
  function questCommand(action, option) {
    if(cfg.daTauPaused)return false;
    if (!isOnline() || typeof cmd !== 'function') throw Error('WebSocket chua san sang de gui Da Tau');
    const snap=game();
    if (!snap || !snap.town || !questEligible(snap))
      throw Error('Dã Tẩu yêu cầu ở Ba Lăng và cấp phù hợp; nhân vật đã chuyển sinh được phép thử nhưng máy chủ quyết định');
    if (questRebornBlocked(snap)) throw Error('Dã Tẩu đang chờ mốc thử lại sau khi máy chủ chưa xác nhận');
    if (typeof R!=='undefined' && Number(R.deadT)>0)
      throw Error('Nhan vat dang hoi sinh, cho truoc khi nhan/tra');
    const path=dualExecute('quest',Math.max(1,(st.ackFailures||0)+1),
      ()=>cmd('qc', action==='claim'? {a:'claim',p:option} : {a:action}),()=>uiQuest(action,option));
    if(!path)throw Error('Không có đường nhận/trả Dã Tẩu khả dụng');
    if(action==='claim'&&typeof auditQuestClaim==='function')auditQuestClaim(snap,option);
    diagnostic('QUEST_SOCKET',action+' sent via '+path+'; cho S.qc tu may chu',{step:snap.step,have:snap.have,need:snap.need});
  }
  function claim(s) {
    if (!s.took || s.need<=0 || s.have<s.need) throw Error('Nhiem vu chua hoan thanh');
    questCommand('claim',cfg.reward); // Buoc chia het cho 10: may chu tu tra ca 3 qua.
  }
  function take() {
    const s=game();
    if (!s || s.took) throw Error('Nhiem vu da duoc nhan hoac chua dong bo');
    questCommand('take');
  }
  function questKind(text) {
    const t=normalize(text);
    // Thu tu quan trong: boss, tinh anh, vat pham, quai thuong.
    if (/\b(boss|trum|thu linh|dau linh|thu linh quai|boss hoang kim)\b/.test(t)) return 'boss';
    if (/\b(tinh anh|quai dac biet|quai tinh nhue)\b/.test(t)) return 'elite';
    if (/\b(nhat|thu thap|kiem|tim)\b.*\b(trang bi|vat pham|do xanh|mon do|do roi)\b/.test(t)) return 'loot';
    if (/\b(ha|danh|diet|tieu diet|ha guc|ha sat)\b.*\b(quai|thu|ke dich|yeu quai|monsters?)\b/.test(t)) return 'kill';
    // Neu server mo ta ngan gon theo so luong va cap ma khong ghi 'quai': de nghi xem lai neu chua ro.
    return null;
  }
  // Chuan hoa tieng Viet de so ten bai, ke ca khac dau/chu hoa.
  const normalize = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function questMinLevel(text) {
    const t=String(text||'').replace(/&ge;|\u2265/g,'>=');
    const m=t.match(/cấp\s*(?:>=|từ|trên|ít nhất|không dưới)\s*(\d+)/i)
      || t.match(/(?:lv|level)\s*(?:>=|từ)\s*(\d+)/i)
      || normalize(t).match(/(?:cap|level|lv)\s*(?:tu|it nhat|khong duoi)\s*(\d+)/);
    return m?Number(m[1]):null;
  }
  function questPlace(text) {
    const n=normalize(text).replace(/\s+(?:cap|level|lv)\s*(?:tu|it nhat|tren|>=)?\s*\d+.*$/,'').trim();
    // Nhận tên bãi thật trong bảng W.zones; không nuốt cả cụm 'để nhận thưởng'.
    const names=(typeof W!=='undefined' && Array.isArray(W.zones)?W.zones:[])
      .map(z=>normalize(z.n)).filter(name=>name.length>=5)
      .sort((a,b)=>b.length-a.length);
    for(const name of names){
      const starts=['tai ','o ','bai ','khu ','vung ','ban do ',
        'tai bai ','o bai ','tai khu ','o khu ','tai vung ','o vung ',
        'tai ban do ','o ban do '];
      if(starts.some(prefix=>(' '+n+' ').includes(' '+prefix+name+' ')))return name;
    }
    const m=n.match(/(?:o|tai)\s+(?:bai|khu|vung|ban do)\s+(.+)$/) || n.match(/(?:bai|ban do)\s+(.+)$/);
    return m?m[1].trim():null;
  }
  const bossApproach={context:'',since:0,target:null,attempts:0,lastMove:0,lastDistance:null,
    progressAt:0,blockedUntil:0,input:null,moveActive:false,holding:null,locked:null,status:'Chưa chọn tọa độ Boss'};

  const rangeCombat={profile:null,savedMelee:null,context:'',status:'Chờ dữ liệu tầm chiêu',casts:0,bossCasts:0,
    stops:0,moves:0,targetLocks:0,lastCastAt:0,lastCastTarget:null,positions:new Map(),samples:[],lastError:'',lastPolicySend:0};
  function activeRangeProfile(target=null){
    try{
      if(typeof R==='undefined'||!R.P)return null;
      const p=R.P,a=typeof combatConfig==='function'?combatConfig():null;
      const mana=Number(R.mana??(typeof S!=='undefined'?S.mp:NaN));
      let attack=a?.skill===false?p.basic:(typeof autoMain==='function'?autoMain(p):p.main);
      if(attack?.id&&a?.off?.[attack.id])attack=(p.actives||[]).filter(x=>!a.off[x.id]).sort((x,y)=>(y.dps||0)-(x.dps||0))[0]||p.basic;
      const hard=target?.cls==='boss'||target?.cls==='elite';
      if(!hard&&a?.skill!==false&&typeof S!=='undefined'&&S.rot!==false&&typeof rotPool==='function'){
        const pool=rotPool(p).filter(x=>Number(x.rad)>0&&!a?.off?.[x.id]);
        if(pool.length>1){const affordable=pool.filter(x=>!Number.isFinite(mana)||Number(x.cost||0)<=mana);
          attack=affordable.length?affordable.reduce((x,y)=>Number(x.rad)<Number(y.rad)?x:y):p.basic;}
      }
      if(attack&&Number.isFinite(mana)&&Number(attack.cost)>mana)attack=p.basic;
      const rad=Number(attack?.rad),unit=typeof U_==='number'&&Number.isFinite(U_)&&U_>0?U_:32;
      if(!attack||!Number.isFinite(rad)||rad<=0||rad>32768)return null;
      return {id:Number(attack.id)||0,name:String(attack.n||'Chiêu đang dùng'),rangePx:rad,unit,range:rad/unit,
        ranged:rad>120&&attack.melee!==true&&attack.around!==true,around:!!attack.around,hold:rad/unit*0.9,stand:rad/unit*0.8,resume:rad/unit*0.98};
    }catch(e){rangeCombat.lastError=String(e.message);return null;}
  }
  function restoreRangedPolicy(){
    const saved=rangeCombat.savedMelee;
    if(!saved)return;
    rangeCombat.savedMelee=null;
    if(saved.identity!==charIdentity())return;
    const a=typeof combatConfig==='function'?combatConfig():null;
    if(a&&a.melee===false){a.melee=saved.value;
      if(isOnline()&&typeof cmd==='function')cmd('opt',{k:'melee',v:saved.value?1:0});}
  }
  function rangedMovementTick(s){
    if(!cfg.rangedHoldEnabled||!st.running||!s||s.town||!isOnline()||arenaNow()||String(s.zone)==='tk'||st.boss.phase!=='idle'){
      restoreRangedPolicy();return;
    }
    const me=typeof VL!=='undefined'?VL.ents?.get?.(VL.meU):null;
    const target=typeof R!=='undefined'?R.enemies?.find(e=>Number(e.uid)===Number(me?.tg)):null;
    const profile=activeRangeProfile(target);rangeCombat.profile=profile;
    if(!profile?.ranged){restoreRangedPolicy();return;}
    const a=typeof combatConfig==='function'?combatConfig():null;
    if(a?.melee===true){
      if(!rangeCombat.savedMelee)rangeCombat.savedMelee={identity:charIdentity(),value:true};
      a.melee=false;
      if(typeof cmd==='function')cmd('opt',{k:'melee',v:0});
    }
    rangeCombat.status=profile.name+': tầm '+profile.range.toFixed(1)+' ô · giữ vị trí khi đủ tầm';
  }
  function captureRangeFrame(m){
    if(m?.t!=='f'||!st.running||!cfg.rangedHoldEnabled||typeof VL==='undefined')return;
    try{
      const now=Date.now(),context=charIdentity()+'|'+String(R.vlZone)+'|'+String(R.ch),unit=typeof U_==='number'&&U_>0?U_:32;
      if(rangeCombat.context!==context){rangeCombat.context=context;rangeCombat.positions.clear();}
      // Current native entity positions are a fallback; frame coordinates are exact map units /100.
      for(const e of R.enemies||[])rangeCombat.positions.set(Number(e.uid),{x:Number(e.x)/unit,y:Number(e.y)/unit,n:e.n,cls:e.cls,radius:Number(e.r||0)/unit});
      const self=VL.ents?.get?.(VL.meU);if(self)rangeCombat.positions.set(Number(VL.meU),{x:Number(self.x)/unit,y:Number(self.y)/unit});
      for(const row of m.e||[]){const old=rangeCombat.positions.get(Number(row[0]))||{};
        rangeCombat.positions.set(Number(row[0]),{...old,x:Number(row[row.length<=5?1:3])/100,y:Number(row[row.length<=5?2:4])/100});}
      const player=rangeCombat.positions.get(Number(VL.meU));
      if(!player)return;
      for(const ev of m.ev||[]){if(ev[0]!=='c'||Number(ev[1])!==Number(VL.meU))continue;
        rangeCombat.casts++;rangeCombat.lastCastAt=now;
        for(const uid of ev[4]||[]){const target=rangeCombat.positions.get(Number(uid));if(!target)continue;
          const distance=Math.hypot(target.x-player.x,target.y-player.y);if(!Number.isFinite(distance))continue;
          const skill=Number(ev[2])||0,attack=skill===0?R.P?.basic:(R.P?.actives||[]).find(a=>Number(a.id)===skill)||(R.P?.main?.id===skill?R.P.main:null);
          const row={at:now,skill,uid:Number(uid),name:target.n||'',cls:target.cls||'',distance,range:Number(attack?.rad)/unit,radius:target.radius||0,
            x:player.x,y:player.y,zone:String(R.vlZone),channel:Number(R.ch)};
          rangeCombat.lastCastTarget=row.uid;if(row.cls==='boss')rangeCombat.bossCasts++;
          rangeCombat.samples.push(row);if(rangeCombat.samples.length>160)rangeCombat.samples.shift();
        }
      }
      if(rangeCombat.positions.size>1000){const keep=new Set([Number(VL.meU),...(R.enemies||[]).map(e=>Number(e.uid))]);
        for(const id of rangeCombat.positions.keys())if(!keep.has(id))rangeCombat.positions.delete(id);}
    }catch(e){rangeCombat.lastError=String(e.message);}
  }
  function stopOwnedBossMove(player){
    const foreign=typeof INPUT!=='undefined'&&INPUT.target&&INPUT.target!==bossApproach.input;
    if(typeof INPUT!=='undefined'&&bossApproach.input&&INPUT.target===bossApproach.input)INPUT.target=null;
    bossApproach.input=null;
    if(!bossApproach.moveActive||!player||foreign){bossApproach.moveActive=false;return false;}
    try{
      if(cfg.dualRouteMode==='ui'&&typeof INPUT!=='undefined'){
        const unit=typeof U_==='number'&&U_>0?U_:32;
        bossApproach.input={x:player.x*unit,y:player.y*unit};INPUT.target=bossApproach.input;
      }else if(typeof cmd==='function')cmd('go',{x:player.x,y:player.y});
      bossApproach.moveActive=false;rangeCombat.stops++;return true;
    }catch(_){return false;}
  }

  function clearBossApproach(reason='Đã hủy ưu tiên tọa độ Boss'){
    if(typeof INPUT!=='undefined'&&bossApproach.input&&INPUT.target===bossApproach.input)INPUT.target=null;
    Object.assign(bossApproach,{context:'',since:0,target:null,attempts:0,lastMove:0,lastDistance:null,
      progressAt:0,blockedUntil:0,input:null,moveActive:false,holding:null,locked:null,reached:null,status:reason});
  }
  function bossApproachZone(message){
    // gsZone has just replaced R.enemies and VL.ents for this exact channel.
    if(message?.t==='zone')clearBossApproach('Đang đồng bộ tọa độ Boss theo bản đồ/kênh mới');
  }
  function bossMapPoint(entity){
    if(!entity)return null;
    const unit=typeof U_==='number'&&Number.isFinite(U_)&&U_>0?U_:32; // bridge.js U_=32
    const x=Number(entity.x),y=Number(entity.y);
    return Number.isFinite(x)&&Number.isFinite(y)?{x:x/unit,y:y/unit}:null;
  }
  function bossApproachTick(s){
    if(!st.running||!st.questActive||!cfg.bossPositionEnabled||!s||s.town||!isOnline()||arenaNow()||
       st.boss.phase!=='idle'||st.action||townFlow.request||rebirth.phase!=='idle'||st.startup==='running'||
       (s.took&&s.need>0&&s.have>=s.need)){
      if(bossApproach.context)clearBossApproach();return false;
    }
    if(typeof R==='undefined'||!R.ready||String(R.vlZone)!==String(s.zone)||st.channel.pending||!st.channel.done)return false;
    const channel=Number(R.ch);
    if(!Number.isInteger(channel)||channel<1)return false;
    const context=[charIdentity(),String(s.zone),channel].join('|'),now=Date.now();
    if(bossApproach.context!==context){
      clearBossApproach();Object.assign(bossApproach,{context,since:now,progressAt:now,
        status:'Chờ đồng bộ Boss của kênh '+channel});
    }
    if(now-bossApproach.since<1800)return true;
    if(now<bossApproach.blockedUntil)return false;
    if(typeof R.deadT==='number'&&R.deadT>0)return false;
    const me=typeof VL!=='undefined'&&VL.ents?.get?VL.ents.get(VL.meU):null;
    const player=bossMapPoint(me);
    if(!player){bossApproach.status='Chờ tọa độ nhân vật từ máy chủ';return false;}
    const bosses=(s.took&&questKind(s.text)==='boss'?matchingFieldBosses(s):fieldBosses())
      .map(entity=>({entity,point:bossMapPoint(entity)}))
      .filter(x=>x.point&&Number.isSafeInteger(Number(x.entity.uid))&&Number(x.entity.uid)>0);
    if(!bosses.length){
      stopOwnedBossMove(player); // Leave a UI stop intent for the native input loop to consume.
      bossApproach.target=null;bossApproach.attempts=0;bossApproach.lastMove=0;bossApproach.lastDistance=null;
      bossApproach.status='Chưa có Boss còn sống trong dữ liệu kênh '+channel+'; tiếp tục nhiệm vụ';return false;
    }
    let selected=bosses.find(x=>Number(x.entity.uid)===bossApproach.target?.uid);
    if(!selected)selected=bosses.sort((a,b)=>Math.hypot(a.point.x-player.x,a.point.y-player.y)-Math.hypot(b.point.x-player.x,b.point.y-player.y))[0];
    const {entity,point}=selected,uid=Number(entity.uid),distance=Math.hypot(point.x-player.x,point.y-player.y);
    if(bossApproach.target?.uid!==uid){
      bossApproach.holding=null;bossApproach.locked=null;
      Object.assign(bossApproach,{attempts:0,lastMove:0,lastDistance:distance,progressAt:now});
    }
    bossApproach.target={uid,name:entity.n||'Boss',zone:String(s.zone),channel,x:point.x,y:point.y};
    const profile=cfg.rangedHoldEnabled!==false?activeRangeProfile(entity):null;
    const ranged=!!profile?.ranged,holdDistance=ranged?(bossApproach.holding===uid?profile.resume:profile.hold):3;
    if(distance<=holdDistance){
      stopOwnedBossMove(player);
      bossApproach.holding=uid; // stopOwnedBossMove retains the one-shot UI stop until the next native frame.
      bossApproach.status=ranged?'Đủ tầm '+profile.name+' ('+distance.toFixed(1)+'/'+profile.range.toFixed(1)+' ô) · giữ vị trí đánh '+(entity.n||'Boss'):'Đã tới gần '+(entity.n||'Boss')+' · kênh '+channel;
      if(bossApproach.attempts>0){
        diagnostic('BOSS_POSITION_ARRIVED',bossApproach.status,{...bossApproach.target,distance});
        bossApproach.attempts=0;bossApproach.lastMove=0;
      }
      if(bossApproach.locked!==uid&&typeof cmd==='function'){cmd('tgt',{id:uid});bossApproach.locked=uid;rangeCombat.targetLocks++;}
      // For ordinary quests prioritize the location once, not an endless chase.
      bossApproach.reached=uid;
      return false;
    }
    if(bossApproach.reached===uid&&questKind(s.text)!=='boss')return false;
    bossApproach.holding=null;
    if(ranged&&questKind(s.text)!=='boss'){
      const current=(R.enemies||[]).find(e=>Number(e.uid)===Number(me?.tg)&&!e.dead&&!e.dead2&&Number(e.hp)>0);
      const cp=bossMapPoint(current);
      if(current&&Number(current.uid)!==uid&&cp&&Math.hypot(cp.x-player.x,cp.y-player.y)<=profile.hold&&rangeCombat.lastCastTarget===Number(current.uid)&&now-rangeCombat.lastCastAt<2500){
        stopOwnedBossMove(player);bossApproach.status='Đang đánh mục tiêu trong tầm · chưa chạy sang Boss xa';return false;
      }
    }
    if(typeof INPUT!=='undefined'&&INPUT.target&&INPUT.target!==bossApproach.input){bossApproach.status='Đang có lệnh di chuyển từ người chơi; chưa ghi đè';return false;}
    if(bossApproach.lastDistance===null||distance<bossApproach.lastDistance-0.5){
      bossApproach.lastDistance=distance;bossApproach.progressAt=now;
    }
    if(now-bossApproach.progressAt>25000&&bossApproach.attempts>=3){
      if(typeof INPUT!=='undefined'&&bossApproach.input&&INPUT.target===bossApproach.input)INPUT.target=null;
      bossApproach.input=null;
      bossApproach.blockedUntil=now+90000;bossApproach.attempts=0;bossApproach.progressAt=now;
      bossApproach.status='Chưa tới được Boss; tạm bỏ ưu tiên tọa độ 90 giây để tiếp tục nhiệm vụ';
      diagnostic('BOSS_POSITION_STALLED',bossApproach.status,bossApproach.target);say(bossApproach.status);return false;
    }
    if(afkOn()){exitPowerSave('đi tới tọa độ Boss');return true;}
    if(bossApproach.lastMove&&now-bossApproach.lastMove<10000)return true;
    // Stop a little short of the occupied Boss center; normal game movement/pathfinding.
    const dx=(player.x-point.x)/distance,dy=(player.y-point.y)/distance;
    const stand=ranged?profile.stand:1.5;
    const target={x:point.x+dx*stand,y:point.y+dy*stand};
    try{
      if(cfg.dualRouteMode==='ui'){
        if(typeof INPUT==='undefined')throw Error('Thiếu đường di chuyển của game');
        const unit=typeof U_==='number'&&U_>0?U_:32;
        bossApproach.input={x:target.x*unit,y:target.y*unit};INPUT.target=bossApproach.input;
      }else{
        if(typeof cmd!=='function')throw Error('Thiếu cmd di chuyển');cmd('go',target);
      }
      bossApproach.lastMove=now;bossApproach.attempts++;bossApproach.moveActive=true;rangeCombat.moves++;
      bossApproach.status='Đang đi tới '+(entity.n||'Boss')+' ('+point.x.toFixed(1)+', '+point.y.toFixed(1)+') · kênh '+channel;
      diagnostic('BOSS_POSITION_MOVE',bossApproach.status,{...bossApproach.target,target,distance,attempt:bossApproach.attempts});
      if(bossApproach.attempts===1)say(bossApproach.status);
      return true;
    }catch(e){bossApproach.blockedUntil=now+30000;bossApproach.status='Chưa di chuyển được tới Boss: '+e.message;diagnostic('BOSS_POSITION_ERROR',bossApproach.status);return false;}
  }

  function fieldBosses() {
    if (typeof R === 'undefined' || !Array.isArray(R.enemies)) return [];
    return R.enemies.filter(e => e && e.cls === 'boss' && !e.dead && !e.dead2 && Number(e.hp) > 0);
  }
  function matchingFieldBosses(s) {
    const minLv=questMinLevel(s.text), task=normalize(s.text);
    return fieldBosses().filter(e => {
      const lv=Number(e.L ?? e.lv);
      if (minLv != null && (!Number.isFinite(lv) || lv < minLv)) return false;
      // Ten Boss trong de bai: neu de bai chua ro chi dua vao cap va class= boss.
      const name=normalize(e.n);
      const hasExplicitName= name.length >= 5 && task.includes(name);
      const place=questPlace(s.text);
      return !place || hasExplicitName || String(R.vlZone)===s.zone;
    });
  }
  function resetBossHunt() {
    bossHunt.questKey=''; bossHunt.zone=''; bossHunt.visited={}; bossHunt.lastHave=null;
    bossHunt.forcedChannel=null; bossHunt.channelSince=0;
    bossHunt.bossSeenAt=0; bossHunt.bossSig=''; bossHunt.swaps=0;
  }
  function bossHuntTick(s, kind) {
    bossHunt.forcedChannel=null;

    if (!cfg.bossQuestEnabled || kind !== 'boss' || !s.took || s.have>=s.need || s.town) {
      if (bossHunt.questKey) resetBossHunt();
      return;
    }
    const key=[s.step,s.text].join('|'), now=Date.now();
    if (bossHunt.questKey!==key) { resetBossHunt(); bossHunt.questKey=key; }
    if (bossHunt.lastHave!==s.have) { bossHunt.lastHave=s.have; bossHunt.channelSince=now; }
    if (bossHunt.zone!==s.zone) {
      bossHunt.zone=s.zone; bossHunt.channelSince=now; bossHunt.forcedChannel=null;
      bossHunt.bossSeenAt=0;
    }
    const ch=Number(typeof R!=='undefined'?R.ch:0);
    const visit=bossHunt.visited[s.zone] || (bossHunt.visited[s.zone]=[]);
    if (ch && !visit.includes(ch)) visit.push(ch);
    const found=matchingFieldBosses(s);
    if (found.length) {
      const sig=s.zone+'|'+ch+'|'+found.map(e=>e.uid||e.id||e.n).join(',');
      if (sig!==bossHunt.bossSig) {
        bossHunt.bossSig=sig; bossHunt.bossSeenAt=now;
        metrics.bossSightings++;
        diagnostic('BOSS_QUEST','Boss nhin thay tren bai '+s.zone,{ monsters:found.map(e=>({ name:e.n, level:e.L })) });
        say('Phat hien Boss phu hop tai bai: '+found.map(e=>e.n+' (cap '+(e.L||'?')+')').join(', '));
      }
      // Chi giu qua 180 giay neu khong tang tien do thi moi bo qua, tranh ket vinh vien.
      if (now-bossHunt.bossSeenAt < 180000) {
        st.map.noProgressAt=now;
        return 'holding';
      }
      if (now-bossHunt.lastLogAt > 60000) {
        bossHunt.lastLogAt=now;
        say('Boss da hien qua 3 phut ma chua xong: xem lai sat thuong/duong di; se thu kenh khac.');
      }
    } else { bossHunt.bossSig=''; bossHunt.bossSeenAt=0; }
    // Boss observations are retained; channel selection belongs only to user / party policy.
    return;
  }

  // Chi khoa mot muc tieu Boss da duoc server gui den (uid), khong tu cast skill hay go/kc.
  // Tranh spam tgt: cung Boss thi toi da gui lai sau 20s neu can.
  function lockVisibleBoss(s, isWorld=false) {
    if (!isOnline() || !s || s.town || st.channel.pending || typeof cmd!=='function') return false;
    if (isWorld && !arenaNow()) return false;
    if (!isWorld && (!cfg.bossQuestEnabled || questKind(s.text)!=='boss')) return false;
    const bosses=isWorld?fieldBosses():matchingFieldBosses(s);
    const candidates=bosses.filter(e=>Number.isFinite(Number(e.uid))&&Number(e.uid)>0);
    if (!candidates.length) return false;
    const boss=candidates.sort((a,b)=>Number(a.hp)-Number(b.hp))[0];
    const id=Number(boss.uid), zone=String(s.zone), now=Date.now();
    if (bossTarget.id===id&&bossTarget.zone===zone&&bossTarget.channel===Number(R.ch)&&now-bossTarget.lastAt<20000) return true;
    // Khong spam khi server chưa xác nhận mục tiêu, nhưng cho doi qua Boss khac.
    bossTarget.id=id;bossTarget.zone=zone;bossTarget.channel=Number(R.ch);bossTarget.lastAt=now;
    try {
      if (typeof VL!=='undefined') VL.sel=id;
      cmd('tgt',{id});bossTarget.sent++;
      diagnostic('TARGET','Khoa Boss do server gui',{uid:id,name:boss.n,lv:boss.L,zone});
      return true;
    } catch(e) {diagnostic('TARGET','Khong khoa duoc Boss: '+e.message);return false;}
  }
  // Nhiem vu Boss: chi doi uu tien khi dang lam viec nay; tra ve tuy chon cu khi xong.
  // Uu tien Boss/tinh anh cua game la setting client co gui len server, khong sua phan thuong.
  function syncQuestBossPriority(s, kind) {
    const isBoss = cfg.bossQuestEnabled && kind === 'boss' && s?.took && s.have < s.need;
    const au = combatConfig();
    if (!au) return;
    if (isBoss) {
      if (questBoss.activeStep !== s.step) {
        restoreQuestBossPriority();
        questBoss.activeStep = s.step;
        questBoss.savedPrio = !!au.prio;
      }
      if (au.prio !== true) {
        au.prio = true;
        try { if (typeof cmd === 'function') cmd('opt', { k: 'prio', v: 1 }); }
        catch(e) { console.warn('[DT] uu tien Boss', e); }
        say('Nhiem vu Boss: bat Uu tien Boss/Tinh anh khi tu danh.');
      }
    } else restoreQuestBossPriority();
  }
  function restoreQuestBossPriority() {
    if (questBoss.savedPrio !== null) {
      const au = combatConfig();
      if (au && !!au.prio !== questBoss.savedPrio) {
        au.prio = questBoss.savedPrio;
        try { if (typeof cmd === 'function') cmd('opt', { k: 'prio', v: questBoss.savedPrio ? 1 : 0 }); }
        catch(e) { console.warn('[DT] khoi phuc uu tien Boss', e); }
      }
    }
    questBoss.savedPrio = null;
    questBoss.activeStep = null;
    questBoss.lastSeen = '';
    resetBossHunt();
  }
  // UI Bản đồ thực tế (vl4_sources_all.js, panelBtn('map')):
  //   S.lv >= z.lo - 2 || W.zones.indexOf(z) <= (S.zmax || 0).
  // Không khóa cứng bằng zmax, cũng không bắt buộc phải đủ đúng z.lo.
  function zoneUnlocked(z,s) {
    // Conservative entry policy: UI preview / old zmax is not a server entry acknowledgement.
    return !!z&&!!s&&Number.isFinite(Number(s.level))&&Number.isFinite(Number(z.lo))&&Number(s.level)>=Number(z.lo);
  }
  function availableZones(s) {
    if (typeof W === 'undefined' || !Array.isArray(W.zones)) return [];
    return W.zones.map((z, index) => ({
      id: String(z.id), n: String(z.n || ''), lo: Number(z.lo),
      hi: Number(z.hi), index, boss: z.boss == null ? null : Number(z.boss)
    })).filter(z => z.id && z.n &&
      Number.isFinite(z.lo) && Number.isFinite(z.hi) && z.lo <= z.hi &&
      zoneUnlocked(z,s));
  }
  function lootZoneFloor(s,zones){
    const bestReachable=Math.max(...zones.map(z=>Math.min(z.hi,s.level)));
    return bestReachable-10;
  }
  // Chi cho phep giu bai neu dieu kien cua nhiem vu HOP LE, khong chi vi dang o bai.
  function canQuestProgressHere(s,kind) {
    if(!s || s.town || s.zone==='wb' || !s.zone || !s.took || s.need<=0 || s.have>=s.need || !kind) return false;
    const zones=availableZones(s);
    const z=zones.find(x=>x.id===s.zone);
    if(!z)return false;
    const place=questPlace(s.text);
    if(place){const here=normalize(z.n);if(!(here===place || here.includes(place)||place.includes(here)))return false;}
    const min=questMinLevel(s.text);
    if(min!=null && z.hi<min) return false;
    if(kind==='loot'&&!place&&z.hi<lootZoneFloor(s,zones))return false;
    if(kind==='boss'){
      if(!Number.isFinite(z.boss)||z.boss<0)return false;
      const mon=typeof MON!=='undefined'?normalize(MON[z.boss]?.n||''):'';
      // If named boss appears in quest and this zone's boss is a different named boss, do not claim it is valid.
      const all=availableZones(s).filter(x=>Number.isFinite(x.boss)&&x.boss>=0);
      const named=all.filter(x=>{const nm=typeof MON!=='undefined'?normalize(MON[x.boss]?.n||''):'';return nm.length>=5 && normalize(s.text).includes(nm);});
      if(named.length && !named.some(x=>x.id===z.id))return false;
    }
    return true;
  }
  function startupZoneChoice(s,kind) {
    if(!startupField.active || startupField.step!==s.step || startupField.zone!==s.zone || startupField.kind!==kind)
      return null;
    if(st.map.failures[s.zone] && Date.now()<st.map.failures[s.zone].until){startupField.active=false;return null;}
    if(fieldMapAvoided(s.zone,s)||!canQuestProgressHere(s,kind)) {startupField.active=false;return null;}
    return availableZones(s).find(z=>z.id===s.zone)||null;
  }
  function pickZone(s, kind, exclude=null) {
    const existing=exclude?null:startupZoneChoice(s,kind);
    if (existing) return {z:existing,match:'Giu bai dang luyen hop le sau khi nhan Bat dau',startupStay:true};
    const all = availableZones(s);
    if (!all.length) return { error: 'Khong doc duoc danh sach bai W.zones (hoac game chua dong bo)' };
    const available = all.filter(z => z.id!==exclude&&!fieldMapAvoided(z.id,s)&&
      (!st.map.failures[z.id] || Date.now() > st.map.failures[z.id].until));

    // Estimate suitability from the declared monster level interval, not ten-level bands.
    const band=s.level, bandEnd=s.level+5;
    const trainingScore = z => {
      const count=Math.max(1,z.hi-z.lo+1);
      const overlap=Math.max(0,Math.min(z.hi,bandEnd)-Math.max(z.lo,band)+1);
      if(overlap>0)return 100*(1-overlap/count)+Math.abs((z.lo+z.hi)/2-(s.level+2.5));
      const gap=z.hi<band?band-z.hi:z.lo-bandEnd;
      return 200+gap*20+(z.lo>bandEnd?40:0);
    };
    const sortTraining = (a, b) => trainingScore(a) - trainingScore(b) || b.lo - a.lo || a.index - b.index;
    const hasBoss = z => Number.isFinite(z.boss) && z.boss >= 0;
    const selectTraining = (pool, description) => {
      if (!pool.length) return { error: 'Khong co bai kha dung dap ung nhiem vu (kiem tra cap, mo khoa, map tam bo qua)' };
      // v1.0: Ưu tiên BÃI ĐÚNG CẤP trước, chỉ chọn Boss khi độ phù hợp gần bằng.
      // Lỗi cũ: lọc Boss trước khiến cấp 26 luyện ở bãi 10–20 có Boss,
      // dù bãi 20–30 thường đang mở, làm giảm EXP hoặc kẹt ở bản đồ 53.
      const baseline = [...pool].sort(sortTraining)[0];
      const baselineScore = trainingScore(baseline);
      const bossZones = cfg.preferBossMaps
        ? pool.filter(z => hasBoss(z) && trainingScore(z) <= baselineScore + 12)
        : [];
      const choices = bossZones.length ? bossZones : pool;
      const ordered = [...choices].sort(sortTraining);
      const best = ordered[0];
      // Khong bo ngang bai dang co Boss con song khi bai do van hop cap va hop nhiem vu.
      // Chi giu neu cung nhom uu tien de tranh co dinh o bai qua thap khi len cap.
      const here = choices.find(z => z.id === s.zone);
      if (here && fieldBosses().length && trainingScore(here) <= trainingScore(best) + 10) {
        return { z:here, match:description + ' · giu bai co Boss dang song', bossVisible:true };
      }
      return { z:best, match:description + (bossZones.length ? ' · uu tien bai co Boss' : ' · khong co bai Boss hop le, chon bai thuong'), bossVisible:false };
    };
    const place = s.took ? questPlace(s.text) : null;
    // Nhiem vu bat buoc dung TEN bai LUON co uu tien cao nhat,
    // khong phu thuoc loai boss/kill/loot/elite va tuy chon uu tien Boss.
    if (place) {
      const exact = z => normalize(z.n) === place;
      const named = z => {
        const name=normalize(z.n);
        return exact(z) || name.includes(place) || place.includes(name);
      };
      const matches = all.filter(named).sort((a,b) => Number(exact(b))-Number(exact(a)));
      if (!matches.length) {
        const locked = (typeof W !== 'undefined' && Array.isArray(W.zones)) ? W.zones.find(named) : null;
        if (locked && s.level < Number(locked.lo)) {
          return { error: 'Nhiem vu yeu cau bai ' + locked.n + ' tu cap ' + locked.lo + ', nhan vat moi cap ' + s.level + '. Khong vao map qua cap.' };
        }
        return { error: 'Nhiem vu yeu cau dung bai "' + place + '" nhung bai chua mo khoa/khong tim thay' };
      }
      const requiredMin=questMinLevel(s.text);
      if(requiredMin!==null && matches[0].hi<requiredMin)
        return {error:'Bãi '+matches[0].n+' có quái đến cấp '+matches[0].hi+
          ', chưa đáp ứng yêu cầu quái cấp >= '+requiredMin+'; cần kiểm tra nội dung nhiệm vụ'};
      const failed=st.map.failures[matches[0].id];
      if(failed && Date.now()<failed.until)
        return {error:'Bãi bắt buộc '+matches[0].n+' chưa xác nhận chuyển thành công; thử lại sau '+
          Math.ceil((failed.until-Date.now())/60000)+' phút'};
      return { z:matches[0], match:'Bai bat buoc ' + matches[0].n, required:true };
    }

    const minLv = s.took ? questMinLevel(s.text) : null;
    // Boss Da Tau: uu tien bai co ma Boss; gioi han cap, khong xep hien Boss o bai thuong.
    if (kind === 'boss' && cfg.bossQuestEnabled) {
      const bossZones = available.filter(z => hasBoss(z) && (minLv === null || z.hi >= minLv));
      if (!bossZones.length) return { error:'Chua co bai hop cap va co cau hinh Boss phu hop nhiem vu' };
      const live = matchingFieldBosses(s);
      const here = bossZones.find(z => z.id === s.zone);
      if (here && live.length) return { z:here, match:'Boss phu hop dang song tai ' + here.n, bossVisible:true };
      const named = bossZones.filter(z => {
        const n=typeof MON !== 'undefined' ? normalize(MON[z.boss]?.n || '') : '';
        return n && n.length >= 5 && normalize(s.text).includes(n);
      });
      return selectTraining(named.length ? named : bossZones, 'Bai Boss danh cho nhiem vu');
    }

    // Neu tat tu san Boss (khong doi kenh, khong uu tien chien dau), van chon bai
    // co Boss hop le de tranh bao loi "nhiem vu khong ho tro".
    if (kind === 'boss') {
      const bossZones = available.filter(z => hasBoss(z) && (minLv === null || z.hi >= minLv));
      if (!bossZones.length) return { error:'Chua co bai Boss hop cap de thuc hien nhiem vu' };
      return selectTraining(bossZones, 'Bai co Boss (tu san Boss dang tat)');
    }
    // Khi nhiem vu yeu cau quai cap >=N, bai luon phai co dai quai dap ung N.
    // Moi nhiem vu thuong/nhat do/tinh anh cung uu tien bai co Boss neu hop le.
    if (kind === 'kill' && minLv !== null) {
      const choices = available.filter(z => z.hi >= minLv);
      if (!choices.length) return { error:'Khong co bai kha dung voi quai cap >= ' + minLv };
      return selectTraining(choices, 'Quai cap >= ' + minLv);
    }
    if (kind === 'kill' && minLv === null && s.took)
      return selectTraining(available, 'Danh quai tai bai theo cap (nhiem vu khong chi ro cap)');
    if (kind === 'loot' && s.took) {
      const floor=Math.max(minLv??0,lootZoneFloor(s,all));
      const choices=available.filter(z=>z.hi>=floor);
      if(!choices.length)return {waitForLoot:true,error:'Chưa có bãi nhặt đồ xanh khả dụng với quái đến ít nhất cấp '+floor};
      return selectTraining(choices,'Bãi nhặt đồ xanh phù hợp cấp '+band);
    }
    if (kind === 'loot' || kind === 'elite')
      return selectTraining(available, 'Bai luyen dai cap ' + band + '-' + bandEnd);
    // Duoi cap 40 (khong co nhiem vu) cung su dung logic uu tien bai Boss.
    if (!s.took) return selectTraining(available, 'Luyen cap ' + band + '-' + bandEnd);
    return { error: 'Chua ho tro dieu kien nhiem vu: ' + s.text };
  }
  // R.chs[k-1] = so nguoi dang o KENH SO k (server). R.ch = so kenh hien tai.
  // "Dong thu 6" la hang 6 sau sap xep so nguoi giam dan, KHONG phai kenh so 6.
  // Neu nhieu kenh bang nguoi, thu hang trong nhom bang nhau chi la quy uoc;
  // uu tien giu kenh hien tai neu no thuoc nhom dong hang, tranh doi vo ich.
  const CHANNEL_CAP = 50;
  function channelCounts() {
    try {
      if (typeof R==='undefined' || !Array.isArray(R.chs)) return [];
      return R.chs.map((v,i)=>({ id:i+1, count:Number(v) }))
        .filter(x=>Number.isFinite(x.count)&&x.count>=0&&Number.isInteger(x.count));
    } catch(_) { return []; }
  }
  function rankedChannels() {
    return [...channelCounts()].sort((a,b)=>b.count-a.count||a.id-b.id)
      .map((ch,i)=>({...ch,rank:i+1}));
  }
  function channelRankText() {
    const list=rankedChannels(), now=Number(typeof R!=='undefined'?R.ch:NaN);
    if (!list.length) return 'Chua co R.chs tu may chu. Cho dong bo, khong tu doan kenh.';
    const mode=cfg.channelMode;
    const head='Da sap xep theo SO NGUOI, khong theo SO KENH:';
    const lines=list.map(x=>(x.rank+'. Kenh '+x.id+' — '+x.count+'/'+CHANNEL_CAP+' nguoi'+(x.id===now?' (dang o)':'')));
    const chosen=chooseChannel();
    return [head,...lines,'', 'Lua chon: '+mode+' -> '+(chosen.error?chosen.error:chosen.label),
      ...(new Set(list.map(x=>x.count)).size===1?['Moi kenh co cung so nguoi: moi kenh deu dong hang.']:[])].join('\n');
  }
  function chooseChannel() {
    const list=rankedChannels();
    const team=typeof partyChannelChoice==='function'?partyChannelChoice(typeof game==='function'?game():null,list):null;
    if(team)return team;
    const current=Number(typeof R!=='undefined'?R.ch:NaN);
    if (!list.length) return {error:'Server chua cap nhat R.chs, khong co co so de xep hang'};
    if (typeof R!=='undefined' && Array.isArray(R.chs) && R.chs.length!==list.length)
      return {error:'Danh sach kenh dang thieu so lieu; cho server dong bo'};
    const mode=String(cfg.channelMode||'rank3');
    if (mode.startsWith('fixed')) {
      const id=Number(mode.slice(5));
      const found=list.find(x=>x.id===id);
      if (!found) return {error:'Kenh co dinh '+id+' khong ton tai'};
      if (found.count>=CHANNEL_CAP && current!==id)
        return {error:'Kenh '+id+' da day '+found.count+'/'+CHANNEL_CAP};
      return {id,label:'Co dinh: kenh '+id+' ('+found.count+'/'+CHANNEL_CAP+' nguoi)',ranking:list};
    }
    const match=/^rank([1-9][0-9]*)$/.exec(mode);
    if (!match) return {error:'Che do kenh khong hop le: '+mode};
    const nth=Number(match[1]);
    if (nth>list.length) return {error:'Chon hang '+nth+' nhung server chi co '+list.length+' kenh'};
    const requested=list[nth-1];
    // Tie: current within same population group has exactly equivalent crowdedness.
    const peer=list.find(x=>x.id===current&&x.count===requested.count);
    let selected=peer || requested;
    if(selected.count>=CHANNEL_CAP&&selected.id!==current)return {error:'Kênh đúng thứ hạng đang đầy; chờ chỗ trống'};
    const same=list.filter(x=>x.count===requested.count);
    const tie=same.length>1?' (dong hang '+same.map(x=>x.id).join(',')+')':'';
    return {id:selected.id,
      label:'Dong thu '+nth+' theo nguoi: kenh '+selected.id+' ('+selected.count+'/'+CHANNEL_CAP+')'+tie+
        (selected.id!==requested.id&&selected.count!==requested.count?' · thay the kenh day':'')+
        (selected.id===current&&selected.id!==requested.id?' · giu kenh hien tai do bang nguoi':''),
      ranking:list, requestedId:requested.id, tied:same.length>1};
  }
  function ensureChannel(s){
    if(!ensureChannelSelection(s))return false;
    return !bossApproachTick(s);
  }
  function ensureChannelSelection(s) {
    const c = st.channel;
    if (s.town) {
      c.key = ''; c.done = false; c.pending = 0; c.tries = 0;
      return true;
    }
    if (c.key !== s.zone) {
      c.key = s.zone; c.done = false; c.pending = 0;c.selectedId=null;c.policy='';c.retryAt=0;
      c.tries = 0; c.enteredAt = Date.now(); c.label = '';
    }
    const team=typeof partyChannelChoice==='function'?partyChannelChoice(s):null;
    const policy=team?'party:'+team.id:'configured:'+cfg.channelMode;
    if(c.policy!==policy){c.policy=policy;c.done=false;c.selectedId=null;c.tries=0;c.pending=0;c.retryAt=0;}
    bossHunt.forcedChannel=null;
    if(c.done&&Number(R.ch)!==c.selectedId)c.done=false;
    if(c.retryAt && Date.now()<c.retryAt)return false;
    if (c.done && Number(R.ch)===c.selectedId) return true;
    if (c.done && bossHunt.forcedChannel) c.done = false;
    // Cho server dong bo thong tin kenh khi vua chuyen bai.
    if (Date.now() - c.enteredAt < 1800) return false;
    if (c.pending) {
      if (Number(R.ch) === c.pending) {
        c.label = 'Dang o kenh ' + c.pending;
        c.pending = 0; c.done = true;
        say('Da xac nhan chuyen sang kenh ' + R.ch);
        return true;
      }
      if (Date.now() - c.sentAt < 10000) return false;
      c.pending = 0;
      if (c.tries >= 2) {
        c.done=false;c.tries=0;c.retryAt=Date.now()+30000;
        say('Chưa xác nhận đúng kênh; nghỉ 30 giây rồi thử lại');return false;
      }
    }
    const choice = team || chooseChannel();
    if (choice.error) {
      c.done=false;c.retryAt=Date.now()+15000;c.label=choice.error;
      say('Chờ đúng kênh đã chọn: '+choice.error);return false;
    }
    c.label = choice.label;c.selectedId=choice.id;
    if (Number(R.ch) === choice.id) {
      c.done = true;
      diagnostic('CHANNEL','Kenh hien tai da phu hop',{mode:cfg.channelMode,now:Number(R.ch),counts:channelCounts(),sorted:rankedChannels()});
      say('Kenh phu hop: ' + choice.label);
      return true;
    }
    if (typeof cmd !== 'function') {
      c.done=false;c.retryAt=Date.now()+15000;return false;
    }
    c.tries++;
    c.pending = choice.id; c.sentAt = Date.now();
    try {
      diagnostic('CHANNEL','Quyet dinh theo so nguoi server',{mode:cfg.channelMode,from:Number(R.ch),to:choice.id,counts:channelCounts(),sorted:rankedChannels()});
      const path=dualExecute('channel',c.tries,()=>cmd('ch',{n:choice.id}),()=>uiChannel(choice.id));
      if(!path)throw Error('Không có đường đổi kênh khả dụng');
      say('Yeu cau chuyen kenh ('+path+'): ' + choice.label);
    } catch (e) {
      c.done=false;c.pending=0;c.retryAt=Date.now()+15000;
      say('Chờ thử lại đúng kênh: '+e.message);return false;
    }
    return false;
  }
  // Map controller: phan biet 'da gui lenh' voi 'server da vao map'.
  // Chi danh dau map hong khi khong the xac nhan, hoac dang danh qua lau khong tien do.
  function mapFailure(z, reason, required = false) {
    if (!z) return;
    if(startupField.zone===z.id) startupField.active=false;
    const old = st.map.failures[z.id] || { count: 0 };
    st.map.failures[z.id] = { count: old.count + 1,
      until: Date.now() + MAP_FAILURE_COOLDOWN_MS, reason };
    st.map.rotations++;
    st.map.requested = null;
    st.map.noProgressAt = 0; st.map.noProgressHave = null;
    st.zoneRetryAt = 0; st.action = '';
    say('Map ' + z.n + ' gap su co: ' + reason +
      (required ? '. Nhiem vu bat buoc map nay, khong tu doi bai.' : '. Thu bai khac phu hop.'));
  }
  function refreshMapQuest(s) {
    if (st.map.questStep !== s.step || st.map.questText !== s.text) {
      st.map.questStep = s.step; st.map.questText=s.text;
      st.map.failures = {}; st.map.requested = null;
      st.map.noProgressAt = Date.now(); st.map.noProgressHave = s.have;
      st.map.rotations = 0;
      if (startupField.step!==s.step) startupField.active=false;
    }
    if (st.map.noProgressHave !== s.have) {
      st.map.noProgressHave = s.have;
      st.map.noProgressAt = Date.now();
    }
  }
  function changeZone(z, s) {
    if(tongKimInside())return false;
    if(!z || !s)return false;
    // Khi đang trên map 53 và vẫn trong nội thành, gửi zone:53 sẽ không
    // di chuyển qua ranh giới. Bắt buộc xử lý ra ngoại thành riêng.
    if(String(z.id)===String(s.zone)){
      if(String(z.id)==='53' && s.town) return exitStarterTown(s,z);
      if(!s.town)return true;
    }
    if (!zoneUnlocked(z,s)) {
      const reason='Bãi '+z.n+' chưa mở theo UI game (cấp '+s.level+', cần từ '+
        Math.max(1,Number(z.lo))+'; không dùng tiến độ mở bãi cũ để vượt cấp).';
      if(Date.now()-st.map.reportAt>30000){st.map.reportAt=Date.now();say(reason);}
      return false;
    }
    if (typeof R!=='undefined' && Number(R.deadT)>0)return false;
    if (typeof cmd !== 'function') return softPause('Game chưa cung cấp cmd để đổi bãi',120000);
    st.chosenZone = { id: z.id, name: z.n, lo: z.lo, hi: z.hi };
    st.fieldHave = null;
    st.fieldAt = 0;
    st.zoneRetryAt = Date.now();
    st.map.requested = { id: z.id, name: z.n, at: Date.now(), attempts: (st.map.requested?.id === z.id ? st.map.requested.attempts : 0) + 1 };
    return perform(() => {
      const path=dualExecute('zone',st.map.requested.attempts,()=>cmd('zone',{id:z.id}),()=>uiZone(z.id));
      if(!path)throw Error('Không thể mở/chuyển bãi '+z.n);
    }, 'Chon bai ' + z.n + ' (cap ' + z.lo + '-' + z.hi + ')', s);
  }
  // Nhận thưởng: không đánh dấu "xong" nếu không xác nhận trạng thái từ game.
  // Ngày theo giờ Việt Nam; tuần bắt đầu thứ Hai. Cờ chỉ lưu khi THẬT SỰ hoàn tất.
  const rewardCacheKey = 'vl4_dt_reward_v401'; // invalidate flags from older optimistic scans
  function vnDate() {
    return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  }
  function vnWeek() {
    const d = new Date(vnDate() + 'T00:00:00Z');
    const off = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - off);
    return d.toISOString().slice(0, 10);
  }
  function rewardKeyForCharacter() {
    const identity = (typeof S !== 'undefined' && S) ? String(S.name || S.n || S.fac || 'player') : 'player';
    const srv = (typeof S !== 'undefined' && S) ? String(S.srv || S.server || 'vl4') : 'vl4';
    return rewardCacheKey + ':' + srv + ':' + identity;
  }
  function readRewards() {
    try {
      const saved = JSON.parse(localStorage.getItem(rewardKeyForCharacter()) || '{}');
      return { sign: saved.sign === vnDate(), daily: saved.daily === vnDate(), weekly: saved.weekly === vnWeek(), spin: saved.spin === vnDate(),
               raw: saved };
    } catch { return { sign:false, daily:false, weekly:false,spin:false, raw:{} }; }
  }
  function recordRewardDone(type) {
    const r = readRewards().raw;
    r[type] = type === 'weekly' ? vnWeek() : vnDate();
    try { localStorage.setItem(rewardKeyForCharacter(), JSON.stringify(r)); } catch(e) { console.warn('[DT] Khong luu duoc co thuong',e); }
  }
  function allRewardsDone() { const r=readRewards(); return r.sign && r.daily && (!cfg.rewardDirectEnabled || !cfg.rewardFreeSpin || r.spin); }
  const rewardsRuntime = { lastTownScan:0, scanDay:'', lastTownDone:false, retryNeeded:false, failures:0, scope:null, identity:'', day:'', initialChecked:false, nextAt:0 };
  function rewardScopeValid(token){
    const scope=rewardsRuntime.scope;
    return isSession(token) && isOnline() && !arenaNow() &&
      (!scope || (scope.token===token && scope.identity===charIdentity() &&
       scope.day===vnDate() && scope.week===vnWeek()));
  }
  const rewardThresholdFallback=[1000,5,60,1,4];
  function visible(el) {
    return !!(el && el.isConnected && !el.hidden && el.getClientRects().length &&
      getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]'));
  }
  function rewardWindows() {
    return [...document.querySelectorAll('.win, #modal')].filter(visible);
  }
  // VL4 de "Nhiem vu ngay" ben trong cua so "Qua · Hoat dong", khong phai tieu de cua so.
  // Tim dung cua so Qua (giftWin), sau do chi tim nut NHAN trong noi dung tab da mo.
  function rewardPanel(type) {
    const roots = rewardWindows();
    if (type === 'weekly') {
      const exact = document.getElementById('wWq');
      if (visible(exact)) return exact;
      return roots.find(root => /nhiệm vụ tuần/i.test(
        root.querySelector('.wt,.wtitle,h2,h3,.cwt')?.textContent || '')) || null;
    }
    const idMatches = ['wGift','wGifts','wGiftWin','wQua'];
    for (const id of idMatches) {
      const el = document.getElementById(id);
      if (visible(el)) return el;
    }
    return roots.find(root => {
      const title = (root.querySelector('.wt,.wtitle,.win-title,h2,h3,.cwt')?.textContent || '').trim();
      return /quà\s*[·-]\s*hoạt động|quà\s*hoạt động|điểm danh|nhiệm vụ ngày/i.test(title)
        || (root.querySelectorAll('button').length >= 3 &&
          /điểm danh/i.test(root.textContent || '') && /nhiệm vụ ngày/i.test(root.textContent || '') &&
          /vòng quay|thành tựu|giftcode/i.test(root.textContent || ''));
    }) || null;
  }
  function closeRewardWindows() {
    for (const w of rewardWindows()) {
      const title = w.querySelector('.wt,.wtitle,h2,h3,.cwt')?.textContent || '';
      if (w.id !== 'wWq' && !/điểm danh|nhiệm vụ ngày|nhiệm vụ tuần|phần thưởng|quà\s*[·-]\s*hoạt động/i.test(title)) continue;
      if (w.id === 'modal' && typeof closeModal === 'function') { closeModal(true); continue; }
      const close = w.querySelector('.wx,.wclose,[data-close],button[title="Đóng"]');
      if (close) close.click();
      else if (typeof winClose === 'function' && w.id) try { winClose(w.id); } catch{}
    }
  }
  function openRewardNpc() {
    if (typeof vlNpcOpen !== 'function' || typeof NPCS === 'undefined') return false;
    const npc = NPCS.find(n => n.k === 'phan_thuong');
    if (!npc) return false;
    vlNpcOpen(npc);
    return true;
  }
  function claimableButtons(panel, type) {
    if (!panel) return [];
    if (type === 'weekly') return [...panel.querySelectorAll('[data-wq],#wqMid,#wqAll')]
      .filter(b => visible(b) && !b.disabled && !/đã nhận/i.test(b.textContent));
    // Chỉ các nút phần thưởng, không bấm nút đổi, mua hay nút mở tab.
    return [...panel.querySelectorAll('button')].filter(b => {
      if (!visible(b) || b.disabled || b.closest('.dtabs,.tabs,.gift-tabs')) return false;
      const t = (b.textContent || '').trim();
      if (/đã nhận|đổi|mua|quay|tiếp tục|bỏ qua|chọn|nạp|nhận nhiệm vụ/i.test(t)) return false;
      return /^(?:[🎁📅⭐\s]*)?(?:Nhận|Điểm danh|Lĩnh thưởng|Lĩnh quà)/i.test(t);
    });
  }
  function weeklyCompletedFromServer() {
    try {
      if (typeof DG === 'undefined' || !DG?.wq) return false;
      const q = DG.wq;
      if (!Array.isArray(q.list) || !q.list.length || !q.all || !q.mid) return false;
      return q.list.every(x => Array.isArray(x) && !!x[4]);
    } catch { return false; }
  }
  function explicitAllClaimed(panel, type) {
    if (type === 'weekly' && weeklyCompletedFromServer()) return true;
    if (!panel) return false;
    const body = panel.textContent || '';
    // Tín hiệu chắc chắn; không suy luận "xong" chỉ vì không có nút nhận.
    if (type === 'sign') return /(?:hôm nay\s+đã\s+điểm\s+danh|đã\s+điểm\s+danh\s+hôm\s+nay|hôm nay\s+đã\s+nhận)/i.test(body);
    if (type === 'daily') {
      if (/(?:đã\s+hoàn\s+thành\s+tất\s+cả\s+nhiệm\s+vụ\s+ngày|đã\s+nhận\s+toàn\s+bộ\s+thưởng\s+ngày)/i.test(body)) return true;
      // VL4: 4 nhiem vu va mot moc "Hoan thanh ca 4 viec tren".
      // Chi luu co xong khi tat ca cac nut thuong hien la "Da nhan".
      const buttons = [...panel.querySelectorAll('button')].filter(b =>
        !b.closest('.dtabs,.tabs,.gift-tabs') &&
        /^(?:Nhận|Đã nhận)$/i.test((b.textContent || '').trim()));
      return buttons.length >= 5 && buttons.every(b => /đã\s*nhận/i.test((b.textContent || '').trim()));
    }
    if (type === 'weekly') return /(?:đã\s+nhận\s+toàn\s+bộ\s+thưởng\s+tuần)/i.test(body);
    return false;
  }
  // Protocol from game daily.js / dg.js. Every action is limited by an authoritative
  // dy/wq server response; no DOM labels, no optimistic success and no repeated claim.
  function captureRewardMessage(message){
    if(!message||!['dy','wq'].includes(message.t))return;
    const scope=rewardsRuntime.scope;
    if(scope&&(scope.identity!==charIdentity()||scope.day!==vnDate()||scope.week!==vnWeek()))return;
    try{
      rewardRx[message.t]={data:JSON.parse(JSON.stringify(message)),identity:charIdentity(),
        day:vnDate(),week:vnWeek(),at:Date.now()};
      rewardNet.lastRx={type:message.t,at:Date.now(),signType:typeof message.sign,
        dailyCount:Array.isArray(message.dq)?message.dq.length:null,weeklyCount:Array.isArray(message.list)?message.list.length:null};
    }catch(e){diagnostic('REWARD_RX_ERROR',String(e?.message||e));}
  }
  function rewardServer(type){
    const protocol=type==='weekly'||type==='wq'?'wq':'dy',rx=rewardRx[protocol];
    if(rx&&rx.identity===charIdentity()&&rx.day===vnDate()&&rx.week===vnWeek())return rx.data;
    // Compatibility with builds that expose public state. Current vlwin does not.
    try{return protocol==='wq'?(typeof DG!=='undefined'?DG?.wq:null):
      (typeof DY!=='undefined'?DY?.st:null);}catch(_){return null;}
  }

  function rewardDone(type,state){
    if(!state||typeof state!=='object')return false;
    if(type==='sign')return !!state.sign;
    if(type==='daily')return Array.isArray(state.dq) && state.dq.length>=5 &&
      state.dq.every(x=>Array.isArray(x) && !!x[1]);
    if(type==='weekly')return Array.isArray(state.list)&&state.list.length>0 &&
      state.list.every(x=>Array.isArray(x)&&!!x[4]) && !!state.mid && !!state.all;
    return false;
  }
  function rewardSeq(type){return (type==='weekly'||type==='wq')?rewardNet.wqSeq:rewardNet.dySeq;}
  // v1.0: game DY.st/DG.wq la trang thai may chu da duoc client xu ly.
  // Tampermonkey/extension co the khong bat duoc gsMsg tu mot so bundle,
  // nen so sanh trang thai THUC TE thay vi chi cho bo dem hook tang.
  function rewardFingerprint(type){
    const state=rewardServer(type);
    if(!state || typeof state!=='object')return null;
    try{
      if(type!=='weekly'&&type!=='wq')return JSON.stringify({sign:state.sign,streak:state.streak,
        next:state.next,dq:state.dq,spin:state.spin});
      return JSON.stringify({list:state.list,mid:state.mid,all:state.all,midN:state.midN});
    }catch(_){return null;}
  }
  function rewardValidState(type,state){
    if(!state || typeof state!=='object')return false;
    return type==='dy' ? ((typeof state.sign==='boolean'||state.sign===0||state.sign===1) && Array.isArray(state.dq)) :
      (Array.isArray(state.list) && state.list.length>0);
  }
  async function rewardSend(type, opts, token){
    if(!rewardScopeValid(token)||typeof cmd!=='function')return false;
    const waitMs=Math.max(0,450-(Date.now()-rewardNet.lastSent));
    if(waitMs)await wait(waitMs);
    if(!rewardScopeValid(token))return false;
    try{
      const beforeSeq={seq:rewardSeq(type),fingerprint:rewardFingerprint(type),state:rewardServer(type)};
      rewardNet.lastSent=Date.now();
      rewardNet.lastCommand=type+':'+String(opts.a||'?');
      cmd(type,opts);
      diagnostic('REWARD_TX','Lệnh nhận thưởng chờ xác nhận',{t:type,a:opts.a,k:opts.k,i:opts.i});
      return beforeSeq;
    }catch(e){rewardNet.lastResult='Gửi lệnh thất bại: '+e.message;
      diagnostic('REWARD_ERR',rewardNet.lastResult);return false;}
  }
  async function rewardAwait(type,before,token,timeoutMs=5000,allowCachedStatus=false,accept=null){
    const until=Date.now()+timeoutMs;
    const initial=Date.now();
    while(Date.now()<until){
      if(!rewardScopeValid(token))return null;
      const data=rewardServer(type),fingerprint=rewardFingerprint(type);
      const byHook=rewardSeq(type)>before.seq;
      const byState=fingerprint!==null && fingerprint!==before.fingerprint;
      const byReference=data!==before.state;
      if(rewardValidState(type,data) && (byHook||byState||byReference) && (!accept||accept(data))){
        rewardNet.lastAckMode=byHook?'hook':'state';
        if(!byHook)diagnostic('REWARD_STATE_ACK','Xác nhận từ dữ liệu game (không qua gsMsg hook)',{type});
        return data;
      }
      // Hoi 'st' co the khong tra tin moi trong mot so phien. Trang thai
      // da ton tai trong DY.st/DG.wq la du lieu do server gui cho GAME,
      // khong phai so lieu tu DOM hay tu user. Chi dung cho LENH HOI,
      // KHONG BAO GIO dung cache de xac nhan mot lenh NHAN thuong.
      if(allowCachedStatus && Date.now()-initial>=1100 && rewardValidState(type,data)){
        rewardNet.lastAckMode='cached';
        rewardNet.cachedStatuses=(rewardNet.cachedStatuses||0)+1;
        diagnostic('REWARD_CACHE','Không thấy ACK st; dùng trạng thái có sẵn của game để quyết định mục đủ điều kiện',{type,seq:rewardSeq(type)});
        return data;
      }
      await wait(120);
    }
    rewardNet.timeouts++;
    rewardNet.lastResult='Máy chủ chưa xác nhận '+type+'; hẹn lần kiểm tra tiếp theo';
    diagnostic('REWARD_TIMEOUT',rewardNet.lastResult,{lastCommand:rewardNet.lastCommand});
    return null;
  }
  async function rewardCommandAndAck(type,params,token,ms=5000){
    const before=await rewardSend(type,params,token);
    if(before===false)return null;
    const accept=params.a==='st'?null:(state)=>{
      if(type==='dy'){
        if(params.a==='sign')return !!state.sign;
        if(params.a==='dq')return !!state.dq?.[params.i]?.[1];
      }
      if(type==='wq'){
        if(params.a==='claim')return !!state.list?.find(x=>x?.[0]===params.k)?.[4];
        if(params.a==='mid'||params.a==='all')return !!state[params.a];
      }
      return false;
    };
    const reply=await rewardAwait(type,before,token,ms,false,accept);
    if(reply && rewardNet.lastAckMode!=='cached'){
      rewardNet.confirmed++;
      rewardNet.lastResult='Máy chủ đã xác nhận '+type+':'+params.a;
    }
    return reply;
  }
  function dailyRequirements(){
    return typeof DY_DQ!=='undefined' && Array.isArray(DY_DQ) && DY_DQ.length>=5
      ?DY_DQ.map(x=>Number(x?.[1])):rewardThresholdFallback;
  }
  function dailyRows(){
    const data=rewardServer('dy'),req=dailyRequirements();
    return req.map((need,i)=>{
      const pair=data?.dq?.[i],have=Number(pair?.[0]);
      const valid=Array.isArray(pair)&&pair.length>=2&&Number.isFinite(have)&&
        Number.isFinite(need)&&need>0&&(typeof pair[1]==='boolean'||pair[1]===0||pair[1]===1);
      return {i,have:valid?have:null,need,got:valid&&!!pair[1],valid,
        ready:valid&&!pair[1]&&have>=need};
    });
  }
  async function drainDailyRewards(token,useUI){
    const attempted=new Set();
    let failed=false;
    // Re-evaluate after each server render, including newly unlocked final reward.
    // Each index can be sent at most ONCE per scan, even after a lost ACK.
    for(let pass=0;pass<3 && rewardScopeValid(token);pass++){
      let progressed=false;
      for(let i=0;i<dailyRequirements().length;i++){
        if(!rewardScopeValid(token))return false;
        const row=dailyRows()[i];
        if(!row.valid){failed=true;diagnostic('REWARD_UNKNOWN','Dữ liệu ngày không hợp lệ',{i});continue;}
        if(!row.ready||attempted.has(i))continue;
        attempted.add(i);
        let ok=false;
        if(useUI){
          // Rebuild from current state and reacquire the actual game button.
          giftWin('dq');await wait(180);
          if(!rewardScopeValid(token))return false;
          if(manualRewardState('daily',i))continue;
          ok=await manualRewardClick('daily',i,token);
        }else{
          const next=await rewardCommandAndAck('dy',{a:'dq',i},token);
          ok=!!next?.dq?.[i]?.[1];
        }
        if(ok){progressed=true;say('🎁 Xác nhận thưởng ngày '+(i+1));}
        else {failed=true;diagnostic('REWARD_PENDING','Mục ngày chưa xác nhận; tiếp tục mục khác',{i});}
      }
      if(!rewardScopeValid(token))return false;
      // Read-only reconciliation catches late ACKs and dependent milestone updates.
      if(!await rewardCommandAndAck('dy',{a:'st'},token)){failed=true;break;}
      if(!progressed && !dailyRows().some(r=>r.ready&&!attempted.has(r.i)))break;
    }
    if(!rewardScopeValid(token))return false;
    const rows=dailyRows();
    rewardNet.lastDaily={at:Date.now(),attempted:[...attempted],rows};
    rewardNet.lastResult='Ngày: '+rows.filter(r=>r.got).length+'/'+rows.length+
      ' đã nhận · '+rows.filter(r=>r.ready).length+' đủ điều kiện chưa nhận';
    if(rewardDone('daily',rewardServer('dy')))recordRewardDone('daily');
    return rewardScopeValid(token)&&!failed&&!rows.some(r=>r.ready||!r.valid);
  }

  async function rewardCheckDirect(type,token){
    if(!isSession(token)||!isOnline())return;
    const protocol=type==='weekly'?'wq':'dy';
    // Force fresh status once per scan; do not trust cached DY.st / DG.wq
    // from previous day or before character change.
    let data=await rewardCommandAndAck(protocol,{a:'st'},token);
    if(!data){say('Quà '+type+': chưa nhận trạng thái từ máy chủ; bỏ qua lần này');return false;}
    if(type==='sign' && !data.sign){
      data=await rewardCommandAndAck('dy',{a:'sign'},token);
      if(!data||!data.sign){diagnostic('REWARD_UNCONFIRMED','Điểm danh chưa được xác nhận');return false;}
      say('📅 Điểm danh đã được máy chủ xác nhận');
    }else if(type==='daily'){
      return drainDailyRewards(token,false);
    }else if(type==='weekly'){
      if(!Array.isArray(data.list)||data.list.length===0){
        diagnostic('REWARD_UNKNOWN','Thiếu danh sách tuần; không gửi lệnh');return;
      }
      for(const entry of [...data.list]){
        if(!isSession(token)||!isOnline())return;
        if(!Array.isArray(entry)||entry.length<5){
          diagnostic('REWARD_UNKNOWN','Mục tuần thiếu dữ liệu; ngừng',{entry});break;
        }
        const [k,,need,have,got]=entry;
        if(got||!Number.isFinite(Number(need))||Number(have)<Number(need))continue;
        if(typeof k!=='string'||!k){diagnostic('REWARD_UNKNOWN','Mã tuần không hợp lệ');break;}
        const next=await rewardCommandAndAck('wq',{a:'claim',k},token);
        const updated=next?.list?.find(x=>Array.isArray(x)&&x[0]===k);
        if(!next||!updated||!updated[4]){
          diagnostic('REWARD_UNCONFIRMED','Thưởng tuần chưa xác nhận, ngừng vòng này',{k});return;
        }
        data=next;say('🎁 Server xác nhận thưởng tuần '+k);
      }
      const taken=Array.isArray(data.list)?data.list.filter(x=>Array.isArray(x)&&!!x[4]).length:0;
      if(!data.mid && Number(data.midN)>0 && taken>=Number(data.midN)){
        const next=await rewardCommandAndAck('wq',{a:'mid'},token);
        if(next&&!!next.mid){data=next;say('🎁 Server xác nhận mốc giữa tuần');}
        else {diagnostic('REWARD_UNCONFIRMED','Mốc giữa tuần chưa được xác nhận');return;}
      }
      if(!data.all&&Array.isArray(data.list)&&data.list.length>0&&data.list.every(x=>Array.isArray(x)&&!!x[4])){
        const next=await rewardCommandAndAck('wq',{a:'all'},token);
        if(next&&!!next.all){data=next;say('🎁 Server xác nhận rương tuần');}
        else diagnostic('REWARD_UNCONFIRMED','Rương tuần chưa được xác nhận');
      }
    }
    if(rewardDone(type,data)){
      recordRewardDone(type);
      rewardNet.lastResult='Đã xác nhận hoàn tất '+type+' theo trạng thái máy chủ';
      diagnostic('REWARD_DONE',rewardNet.lastResult);
      say('✅ '+rewardNet.lastResult);
    }else{
      rewardNet.lastResult=type+': còn mục chưa đủ điều kiện/chưa nhận';
    }
  }
  async function rewardCheckFreeSpin(token){
    if(!cfg.rewardFreeSpin||!isSession(token)||!isOnline())return;
    let data=await rewardCommandAndAck('dy',{a:'st'},token);
    // Cost only applies when spin>=1; never request a paid turn.
    if(!data||!Number.isFinite(Number(data.spin)))return;
    if(Number(data.spin)>0){recordRewardDone('spin');return;}
    // A free-spin button and a direct cmd are separate paths. The game UI
    // changes to a PAID spin after the first success; never click it then.
    const sentBefore={seq:rewardSeq('dy'),fingerprint:rewardFingerprint('dy')};
    const pause=Math.max(0,450-(Date.now()-rewardNet.lastSent));
    if(pause)await wait(pause);
    if(!isSession(token)||!isOnline()||Number(rewardServer('dy')?.spin)!==0)return;
    const path=dualExecute('freeSpin',rewardNet.timeouts+1,()=>{
      if(typeof cmd!=='function')return false;
      cmd('dy',{a:'spin'});return true;
    },()=>{
      if(typeof giftWin!=='function')return false;
      giftWin('spin');
      const b=document.getElementById('dySpin');
      return !!b && /quay miễn phí/i.test(b.textContent||'') && clickGame(b);
    });
    if(!path){diagnostic('REWARD_SPIN','Không có đường quay MIỄN PHÍ an toàn');return;}
    rewardNet.lastSent=Date.now();rewardNet.lastCommand='dy:spin';
    const next=await rewardAwait('dy',sentBefore,token,4600);
    if(next&&Number(next.spin)>=1){
      recordRewardDone('spin');
      diagnostic('REWARD_SPIN','Vòng quay miễn phí đã được xác nhận');
      say('🎡 Server xác nhận 1 lượt vòng quay miễn phí');
    }else diagnostic('REWARD_UNCONFIRMED','Vòng quay miễn phí chưa được xác nhận; không thử lại trong lần quét này');
  }
  // v1.0: Manual UI path uses exactly the controls bound by game giftWin/wqWin.
  // It NEVER clicks generic text-based buttons (which might buy/spend currency).
  // Clicking does not constitute success; game state or a server-rendered "Da nhan"
  // must change before another click is sent.
  function manualRewardPanel(type) {
    const id=type==='weekly'?'wWq':'wGift';
    const panel=document.getElementById(id);
    return visible(panel)?panel:null;
  }
  function manualRewardState(type,index){
    const d=rewardServer(type);
    if(!d)return false;
    if(type==='sign')return !!d.sign;
    if(type==='daily')return !!d.dq?.[index]?.[1];
    if(type==='weekly'){
      if(index==='mid')return !!d.mid;
      if(index==='all')return !!d.all;
      return !!d.list?.find(x=>Array.isArray(x)&&String(x[0])===String(index))?.[4];
    }
    return false;
  }
  function manualRewardSelector(type,index){
    if(type==='sign')return '#dySign';
    if(type==='daily')return '[data-q="'+Number(index)+'"]';
    if(index==='mid')return '#wqMid';
    if(index==='all')return '#wqAll';
    return '[data-wq="'+String(index).replace(/["\\]/g,'')+'"]';
  }
  function manualRewardClaimedDOM(type,index){
    const panel=manualRewardPanel(type);
    if(!panel)return false;
    if(type==='sign')return !panel.querySelector('#dySign') &&
       /hôm nay đã điểm danh/i.test(panel.textContent||'');
    const el=panel.querySelector(manualRewardSelector(type,index));
    return !!el && /đã\s*nhận/i.test((el.textContent||'').trim());
  }
  async function manualRewardOpen(type,token){
    if(!rewardScopeValid(token))return false;
    const protocol=type==='weekly'?'wq':'dy';
    try{
      const open=()=>{
        if(type==='weekly'){
          if(typeof wqWin!=='function')throw Error('Thiếu wqWin');
          wqWin();
        }else{
          if(typeof giftWin!=='function')throw Error('Thiếu giftWin');
          giftWin(type==='sign'?'sign':'dq');
        }
      };
      // Open first: the exported game functions own their private DY/DG state.
      open();
      const data=await rewardCommandAndAck(protocol,{a:'st'},token);
      if(!rewardScopeValid(token))return false;
      if(!data){
        const rx=rewardRx[protocol];
        rewardNet.lastManual='Không có trạng thái mới '+protocol+'; nhận được: '+
          (rx?Object.keys(rx.data).join(','):'chưa có tin');
        diagnostic('REWARD_OPEN_NO_STATE',rewardNet.lastManual,{type});
        say(rewardNet.lastManual);return false;
      }
      open();await wait(180);
      if(!rewardScopeValid(token))return false;
      const panel=manualRewardPanel(type);
      if(!panel){
        rewardNet.lastManual='Đã có dữ liệu '+protocol+' nhưng không thấy '+(type==='weekly'?'wWq':'wGift');
        diagnostic('REWARD_OPEN_NO_PANEL',rewardNet.lastManual);say(rewardNet.lastManual);
      }
      return !!panel;
    }catch(e){
      rewardNet.lastManual='Mở '+type+': '+String(e?.message||e);
      diagnostic('REWARD_MANUAL_OPEN',rewardNet.lastManual);say(rewardNet.lastManual);return false;
    }
  }

  async function manualRewardClick(type,index,token){
    if(!rewardScopeValid(token))return false;
    const pause=Math.max(0,450-(Date.now()-rewardNet.lastSent));
    if(pause)await wait(pause);
    if(!rewardScopeValid(token))return false;
    const panel=manualRewardPanel(type);
    const selector=manualRewardSelector(type,index);
    const btn=panel?.querySelector(selector);
    if(!btn||!visible(btn)||btn.disabled||manualRewardState(type,index))return false;
    const caption=(btn.textContent||'').trim();
    if(type==='sign'?!/điểm danh/i.test(caption):!/^(nhận|lĩnh)/i.test(caption))return false;
    const before=rewardFingerprint(type==='weekly'?'wq':'dy');
    rewardNet.manualClicks++;
    rewardNet.lastManual=type+':'+index;
    diagnostic('REWARD_MANUAL_TX','Nhấn nút game và đợi xác nhận',{type,index,caption});
    rewardNet.lastSent=Date.now();
    if(!clickGame(btn))return false;
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      if(!rewardScopeValid(token))return false;
      if(manualRewardState(type,index)){
        rewardNet.manualConfirmed++;
        diagnostic('REWARD_MANUAL_ACK','Game xác nhận nút đã nhận',{type,index});
        say('🎁 Đã nhận qua nút game: '+type+' '+index);
        return true;
      }
      // Re-render may happen after dyState/wqState; no optimistic success.
      await wait(140);
    }
    rewardNet.manualFailures++;
    diagnostic('REWARD_MANUAL_NO_ACK','Không có xác nhận sau khi nhấn nút; dừng mục này',{type,index,changed:rewardFingerprint(type==='weekly'?'wq':'dy')!==before});
    return false;
  }
  async function rewardCheckManual(type,token){
    if(!isSession(token)||!isOnline())return;
    const opened=await manualRewardOpen(type,token);
    if(!opened){say('Quà '+type+': không mở được Quà Hoạt động; chờ lịch sau');return false;}
    if(type==='sign'){
      if(!manualRewardState('sign',0) && !await manualRewardClick('sign',0,token))return false;
    }else if(type==='daily'){
      return drainDailyRewards(token,true);
    }else if(type==='weekly'){
      const panel=manualRewardPanel('weekly');
      if(!panel)return;
      const entries=[...panel.querySelectorAll('[data-wq]')].map(x=>x.dataset.wq).filter(Boolean);
      for(const k of entries){
        if(!isSession(token)||!isOnline())return;
        if(manualRewardState('weekly',k))continue;
        const b=manualRewardPanel('weekly')?.querySelector(manualRewardSelector('weekly',k));
        if(b&&!b.disabled&&visible(b)&&!await manualRewardClick('weekly',k,token))return false;
      }
      for(const k of ['mid','all']){
        if(!isSession(token)||!isOnline())return;
        if(manualRewardState('weekly',k))continue;
        const b=manualRewardPanel('weekly')?.querySelector(manualRewardSelector('weekly',k));
        if(b&&!b.disabled&&visible(b)&&!await manualRewardClick('weekly',k,token))return false;
      }
    }
    if(rewardDone(type,rewardServer(type))){
      recordRewardDone(type);
      diagnostic('REWARD_DONE','Đã nhận đủ qua giao diện game',{type});
    }
    rewardNet.lastResult='Đã quét bằng nút giao diện: '+type;
    return true;
  }
  // Failure only schedules the other route for the NEXT scan (never two claims
  // in the same round). Reset on confirmation, so no infinite ping-pong loop.
  const rewardDual={switchNext:{},lastWay:{},switches:0};
  async function checkRewardType(type, token, forceManual=false) {
    if (!isSession(token)) return;
    const mode=cfg.dualRouteMode;
    const wantUI=forceManual||mode==='ui'||(mode==='auto' &&
      (rewardDual.switchNext[type]?!cfg.rewardManualMode:cfg.rewardManualMode));
    const prevWay=rewardDual.lastWay[type];
    if(wantUI){
      rewardDual.lastWay[type]='ui';
      const before=rewardNet.manualFailures;
      dualLog('reward','ui',type);
      const result=await rewardCheckManual(type,token);
      if(result===false || rewardNet.manualFailures>before){
        if(mode==='auto'&&!forceManual){rewardDual.switchNext[type]=!rewardDual.switchNext[type];rewardDual.switches++;}
      }else if(result===true)rewardDual.switchNext[type]=false;
      return result;
    }
    if(cfg.rewardDirectEnabled){
      rewardDual.lastWay[type]='command';
      const before=rewardNet.timeouts;
      dualLog('reward','command',type);
      const result=await rewardCheckDirect(type,token);
      if(rewardNet.timeouts>before && mode==='auto'){rewardDual.switchNext[type]=!rewardDual.switchNext[type];rewardDual.switches++;}
      else if(rewardDone(type,rewardServer(type)))rewardDual.switchNext[type]=false;
      return result===false||rewardNet.timeouts>before?false:result;
    }
    const read = readRewards();
    if (read[type]) { say('Bo qua '+type+': da hoan tat chu ky'); return; }
    const open = type === 'weekly' ? 'wq' : type === 'daily' ? 'dq' : 'sign';
    if (type === 'weekly') {
      if (typeof wqWin !== 'function') return say('Thieu wqWin, khong kiem tra tuan');
      wqWin(); if (typeof cmd === 'function') cmd('wq',{a:'st'});
    } else {
      if (typeof giftWin !== 'function') return say('Thieu giftWin, khong kiem tra '+type);
      giftWin(open);
    }
    await wait(1400);
      if (!isSession(token) || !isOnline()) return;
      let panel = rewardPanel(type);
    if (!panel) return say('Khong thay giao dien '+type+'; se kiem tra lai lan sau');
    const tried = new Set();
    let clicks = 0;
    for (let i=0; i<45 && isSession(token) && isOnline(); i++) {
      panel = rewardPanel(type) || panel;
      if (explicitAllClaimed(panel,type)) break;
      const btn = claimableButtons(panel,type).find(b => {
        const key = type==='weekly' ? (b.dataset.wq || b.id) : (b.dataset.k || b.dataset.id || b.outerHTML.slice(0,220));
        return !tried.has(key);
      });
      if (!btn) break;
      const key = type==='weekly' ? (btn.dataset.wq || btn.id) : (btn.dataset.k || btn.dataset.id || btn.outerHTML.slice(0,220));
      tried.add(key);
      const caption = (btn.textContent || '').trim().slice(0,55);
      btn.click(); clicks++;
      say(type+': bam '+caption+' (cho may chu xac nhan)');
      await wait(1350); // chờ máy chủ cập nhật; tránh click lặp khi kết quả chưa về
      if (!isSession(token) || !isOnline()) return;
      if (type==='weekly' && typeof wqWin==='function') wqWin();
      else if (type!=='weekly' && typeof giftWin==='function') giftWin(open);
      await wait(400);
      if (!isSession(token) || !isOnline()) return;
    }
    panel = rewardPanel(type) || panel;
    if (explicitAllClaimed(panel,type)) {
      recordRewardDone(type); say(type+': da hoan tat chu ky, se khong kiem tra lai');
    } else say(type+': da thu '+clicks+' luot nhan; chua xac nhan hoan tat toan bo, se kiem tra lai khi ve thanh');
    closeRewardWindows();
  }
  function rememberRewardProgress(){
    const data=rewardServer('dy');
    if(!data||!Array.isArray(data.dq))return;
    const saved=readRewards().raw;
    saved.progress={day:vnDate(),at:Date.now(),sign:!!data.sign,
      dq:data.dq.map(pair=>Array.isArray(pair)?[Number(pair[0]),!!pair[1]]:null)};
    try{localStorage.setItem(rewardKeyForCharacter(),JSON.stringify(saved));}catch(_){}
  }
  function rewardCheckRecorded(now){
    const saved=readRewards().raw;saved.checkedAt=now;saved.checkedDay=vnDate();
    try{localStorage.setItem(rewardKeyForCharacter(),JSON.stringify(saved));}catch(_){}
    rewardsRuntime.initialChecked=true;rewardsRuntime.lastTownScan=now;
    rewardsRuntime.scanDay=vnDate();rewardsRuntime.nextAt=now+60*60000;
  }
  async function runStartupRewards(token,forceManual=false){
    if(!isSession(token)||rewardNet.active)return;
    if(allRewardsDone()){st.startup='done';return;}
    rewardsRuntime.scope={token,identity:charIdentity(),day:vnDate(),week:vnWeek()};
    rewardNet.active=true;rewardNet.scans++;rewardsRuntime.retryNeeded=false;
    rewardCheckRecorded(Date.now());
    let usedUI=false;
    try{
      // Only read status first. No NPC and no reward panel when nothing is claimable.
      let daily=await rewardCommandAndAck('dy',{a:'st'},token);
      if(!daily){rewardsRuntime.retryNeeded=true;return;}
      if(rewardDone('sign',daily))recordRewardDone('sign');
      if(rewardDone('daily',daily))recordRewardDone('daily');
      for(const type of ['sign','daily','weekly']){
        if(!rewardScopeValid(token))break;
        if(readRewards()[type])continue;
        let ready=false;
        if(type==='sign')ready=!daily.sign;
        else if(type==='daily')ready=dailyRows().some(row=>row.ready);
        else{
          const weekly=await rewardCommandAndAck('wq',{a:'st'},token);
          if(!weekly){rewardsRuntime.retryNeeded=true;continue;}
          if(rewardDone('weekly',weekly)){recordRewardDone('weekly');continue;}
          const taken=weekly.list.filter(x=>Array.isArray(x)&&!!x[4]).length;
          ready=weekly.list.some(x=>Array.isArray(x)&&!x[4]&&Number.isFinite(Number(x[2]))&&Number.isFinite(Number(x[3]))&&Number(x[3])>=Number(x[2]))||
            (!weekly.mid&&Number(weekly.midN)>0&&taken>=Number(weekly.midN))||
            (!weekly.all&&weekly.list.length>0&&taken===weekly.list.length);
        }
        if(!ready)continue;
        usedUI=forceManual||cfg.dualRouteMode==='ui'||(cfg.dualRouteMode==='auto'&&cfg.rewardManualMode)||!cfg.rewardDirectEnabled;
        const result=await checkRewardType(type,token,forceManual);
        if(result===false)rewardsRuntime.retryNeeded=true;
        daily=rewardServer('dy')||daily;
      }
      if(rewardScopeValid(token)&&cfg.rewardDirectEnabled&&cfg.rewardFreeSpin&&!readRewards().spin)await rewardCheckFreeSpin(token);
      if(rewardScopeValid(token))say(allRewardsDone()?'Đã nhận đủ thưởng ngày; ngừng kiểm tra đến 0 giờ Việt Nam':'Đã kiểm tra thưởng; lần tự kiểm tra tiếp theo sau 60 phút');
    }catch(e){rewardsRuntime.retryNeeded=true;diagnostic('REWARD_ERROR',String(e?.message||e));}
    finally{
      if(!st.running||token!==sessionSerial)return;
      rewardNet.active=false;
      if(rewardScopeValid(token))rememberRewardProgress();
      if(usedUI)closeRewardWindows();
      st.startup='done';st.startupAt=Date.now();st.startupJob=null;
    }
  }
  // One initial scan and a 60-minute read-only probe. Town arrival is irrelevant.
  const rewardTownGuard={lastTown:false,lastDay:'',lastStartAt:0,reason:''};
  function requestRewardScan(forceManual=false){
    if(!st.running||!isOnline()||allRewardsDone()||rewardNet.active||st.startup==='running'||
       st.boss.phase!=='idle'||arenaNow()||rebirth.phase!=='idle'||sellFlow.sentAt||townRecovery.active)return false;
    st.startup='running';st.startupJob=runStartupRewards(sessionSerial,forceManual);return true;
  }
  function rewardSchedule(s,now){
    if(!st.running||!s||!isOnline())return false;
    if(rewardNet.active||st.startup==='running')return true;
    const identity=charIdentity(),day=vnDate();
    if(rewardsRuntime.identity!==identity||rewardsRuntime.day!==day){
      Object.assign(rewardsRuntime,{identity,day,initialChecked:false,nextAt:0,scope:null});
    }
    if(allRewardsDone()){st.startup='done';rewardTownGuard.reason='Đã nhận đủ ngày; chờ 0 giờ';return false;}
    if(rewardsRuntime.initialChecked&&now<rewardsRuntime.nextAt)return false;
    if(st.boss.phase!=='idle'||arenaNow()||String(s.zone)==='vd'||rebirth.phase!=='idle'||st.action||sellFlow.sentAt||townRecovery.active)return false;
    if(afkOn()){exitPowerSave('kiểm tra thưởng theo lịch 60 phút');return true;}
    rewardTownGuard.reason=rewardsRuntime.initialChecked?'Đến lịch 60 phút':'Kiểm tra lần đầu/ngày mới';
    rewardTownGuard.lastStartAt=now;rewardTownGuard.lastDay=day;
    st.startup='running';st.startupJob=runStartupRewards(sessionSerial);return true;
  }

  // Chế độ tiết kiệm pin: chỉ kích hoạt khi game đang tại đúng bãi luyện,
  // và thoát trước khi hoàn thành Dã Tẩu/về thành/chuẩn bị Boss.
  const afkSync = { lastTry:0, expected:null, warningAt:0 };
  function afkOn() { try { return !!(typeof R !== 'undefined' && R?.afk); } catch{return false;} }
  function exitPowerSave(reason) {
    if (!afkOn()) return true;
    if (Date.now()-afkSync.lastTry < 4000) return false;
    afkSync.lastTry=Date.now(); afkSync.expected=false;
    try {
      const path=dualExecute('powerSave',1,()=>typeof vlAfkOff==='function' ? (vlAfkOff(),true) : false,()=>uiPowerSave(false));
      if(!path){say('Chưa có đường thoát Treo máy hợp lệ.');return false;}
      say('Thoat Treo may: '+reason);
    } catch(e) { say('Loi thoat Treo may: '+e.message); }
    return !afkOn();
  }
  function enterPowerSave(s) {
    if (!cfg.powerSaveAfk || s.town || !st.running || st.boss.phase!=='idle'||fieldSafety.kite.active) return;
    if (afkOn() || Date.now()-afkSync.lastTry < 15000) return;
    afkSync.lastTry=Date.now(); afkSync.expected=true;
    try {
      const path=dualExecute('powerSave',1,()=>typeof vlAfkOn==='function' ? (vlAfkOn(),true) : false,()=>uiPowerSave(true));
      if(!path){if(Date.now()-afkSync.warningAt>60000){afkSync.warningAt=Date.now();say('Không có nút/hàm Treo máy khả dụng');}return;}
      say('Da yeu cau bat Treo may tai '+(st.chosenZone?.name||s.zone)); }
    catch(e) { say('Loi bat Treo may: '+e.message); }
  }
  // v2.7: WorldBoss.cs (server) quyet dinh trang thai tham chien, sinh Boss, sat thuong, thuong.
  // VL4 gui cmd('wb',{a:'st'|'join'}), nhan tin 'wb' -> WB.st. R.vlZone==='wb' moi la ACK vao.
  // Server tra now/end/next theo giay Unix, hours la phut gio Viet Nam.
  const tongKim={phase:'idle',identity:'',day:'',info:null,infoAt:0,infoSeq:0,refreshRequired:false,slot:'',lastPoll:0,polls:0,
    attempts:0,sentAt:0,retryAt:0,uiWait:false,uiSeq:0,uiUntil:0,lastWay:'',finished:{},
    joined:false,sawZone:false,state:null,status:'Chờ Tống Kim 12:30 / 22:00 (giờ Việt Nam)',lastLog:''};
  const tkCombat = {lastAction:0,lastMove:0,lastEscape:0,input:null,chase:null,holding:false,hp:[],evadeUntil:0,moveWatch:null,status:'Chờ trận bắt đầu'};
  const TK_COUNTERS = {0:1, 1:4, 4:2, 2:3, 3:0};
  const TK_ELEMENTS = ['Kim','Mộc','Thủy','Hỏa','Thổ'];
  function tkChaseHold(hold){
    const combat=typeof combatConfig==='function'?combatConfig():null;
    if(!combat)return;
    if(hold && tkCombat.chase===null){
      tkCombat.chase=combat.chase!==false;
      if(!tkCombat.chase)return;
      combat.chase=false;
      if(isOnline()&&typeof cmd==='function')cmd('opt',{k:'chase',v:0});
    }else if(!hold && tkCombat.chase!==null){
      const previous=tkCombat.chase;
      tkCombat.chase=null;
      if(combat.chase===previous)return;
      combat.chase=previous;
      if(isOnline()&&typeof cmd==='function')cmd('opt',{k:'chase',v:previous?1:0});
    }
  }
  function tkReleaseMovement(){
    tkChaseHold(false);
    if(tkCombat.input&&typeof INPUT!=='undefined'&&INPUT.target===tkCombat.input)INPUT.target=null;
    Object.assign(tkCombat,{input:null,holding:false,hp:[],evadeUntil:0,moveWatch:null});
  }
  const tkDrinkAt={hp:0,mp:0};
  function tkCombatReset(){
    tkDrinkAt.hp=0;tkDrinkAt.mp=0;
    tkReleaseMovement();
    Object.assign(tkCombat,{lastAction:0,lastMove:0,lastEscape:0,input:null,chase:null,holding:false,hp:[],evadeUntil:0,moveWatch:null,status:'Chờ trận bắt đầu'});
  }
  function tkSeries(faction){
    const series=typeof FAC!=='undefined'?FAC[faction]?.series:undefined;
    return Number.isInteger(series) && series>=0 && series<=4 ? series : null;
  }
  function tkDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function tkInCamp(p,camp,r){
    return Array.isArray(camp)&&camp.length>=2&&tkDistance(p,{x:camp[0],y:camp[1]})<=r;
  }
  function tkMovementPoint(me,direction,length,camps,radius,threats,unit,accept=()=>true,jump=false){
    const map=typeof window!=='undefined'?window.JMO?.tk:null;
    if(!(map?.w>0&&map?.h>0))return null;
    const initial=threats.length?Math.min(...threats.map(e=>tkDistance(me,e))):0;
    for(const step of (jump?[length]:[length,length*0.6,length*0.3]))for(const offset of [0,Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI]){
      const angle=direction+offset;
      const point={x:me.x+Math.cos(angle)*step,y:me.y+Math.sin(angle)*step};
      if(point.x<1||point.y<1||point.x>map.w/unit-1||point.y>map.h/unit-1)continue;
      if(camps.some(camp=>tkInCamp(point,camp,radius+1)))continue;
      if(threats.some(e=>tkDistance(point,e)<initial+2))continue;
      const dx=point.x-me.x,dy=point.y-me.y;
      if(!jump&&threats.some(e=>{
        const t=Math.max(0,Math.min(1,((e.x-me.x)*dx+(e.y-me.y)*dy)/(step*step)));
        return Math.hypot(me.x+t*dx-e.x,me.y+t*dy-e.y)<Math.min(2.5,tkDistance(me,e))-0.01;
      }))continue;
      const x=point.x*unit,y=point.y*unit;
      if(typeof obsWalk==='function'&&!obsWalk(x,y))continue;
      if(typeof obsLine==='function'&&!obsLine(me.x*unit,me.y*unit,x,y))continue;
      if(accept(point))return point;
    }
    return null;
  }
  function tkSendMove(point,unit,now,status){
    if(!point||!cfg.tongKimCombatEnabled)return false;
    if(cfg.dualRouteMode==='ui'){
      if(typeof INPUT==='undefined')return false;
      tkCombat.input={x:point.x*unit,y:point.y*unit};INPUT.target=tkCombat.input;
    }else{
      if(typeof cmd!=='function')return false;
      cmd('go',point);
    }
    const hero=typeof VL!=='undefined'?VL.ents?.get?.(VL.meU):null;
    const watch=tkCombat.moveWatch;
    if(!hero)tkCombat.moveWatch=null;
    else if(!watch||Math.hypot(hero.x/unit-watch.x,hero.y/unit-watch.y)>=0.5)
      tkCombat.moveWatch={at:now,x:hero.x/unit,y:hero.y/unit,point};
    else watch.point=point;
    if(!tkCombat.lastMove)diagnostic('TK_MOVE','Tống Kim bắt đầu di chuyển',{status,x:point.x,y:point.y});
    tkCombat.lastMove=now;tkCombat.status=status;return true;
  }
  function tryGameJump(point,unit,ownedInput){
    if(!point||typeof kcJump!=='function'||typeof KC==='undefined'||typeof INPUT==='undefined'||
      typeof CAM==='undefined'||KC.j||KC.cd>performance.now()/1000||
      (typeof rideShown==='function'&&rideShown()))return false;
    const oldAim=INPUT.aimS,oldTarget=INPUT.target;
    const x=point.x*unit,y=point.y*unit;
    try{
      INPUT.aimS=[x-CAM.x,y-CAM.y];INPUT.target={x,y};
      kcJump(); // Game checks cooldown, mount and path, then sends the normal kc request.
      return !!KC.j;
    }finally{
      INPUT.aimS=oldAim;
      INPUT.target=KC.j&&oldTarget===ownedInput?null:oldTarget;
    }
  }
  function tkHealthEmergency(hero,now){
    const max=Number(hero.mhp??hero.max);
    if(!(max>0))return false;
    const hp=hero.hp/max;
    tkCombat.hp=tkCombat.hp.filter(p=>now-p.at<=2500).slice(-6);
    const rapid=tkCombat.hp.some(p=>p.max===max&&p.hp-hero.hp>=0.2*max);
    tkCombat.hp.push({at:now,hp:hero.hp,max});
    return hp<=0.25||rapid;
  }
  function tkUnsafeTarget(){
    if(!cfg.tongKimCombatEnabled||typeof R==='undefined'||R.vlZone!=='tk'||typeof VL==='undefined')return false;
    const hero=VL.ents?.get?.(VL.meU),target=VL.ents?.get?.(hero?.tg);
    const max=Number(hero?.mhp??hero?.max);
    return !!(hero&&hero.hp>0&&max>0&&hero.hp/max<0.6&&target?.pl&&target.hp>0&&
      TK_COUNTERS[tkSeries(target.pl.fac)]===tkSeries(typeof S!=='undefined'?S.fac:null));
  }
  function tkDrink(hero,now){
    const pools=[['hp','life',hero.hp,hero.mhp??hero.max,cfg.tongKimHpPct],
      ['mp','mana',hero.mp,hero.mmp??hero.maxMp,cfg.tongKimMpPct]];
    for(const [key,native,value,max,threshold] of pools){
      if(!(threshold>0)||!(max>0)||!Number.isFinite(value)||value<0||value*100>=max*threshold||
        now-tkDrinkAt[key]<2500||Number(R.potCd?.[native])>0)continue;
      if(typeof drinkNow!=='function'&&typeof cmd!=='function')continue;
      tkDrinkAt[key]=now;
      if(typeof drinkNow==='function')drinkNow(native);
      else cmd('drink',{k:key});
    }
  }
  function tkFightTick(now){
    const autoMove=cfg.tongKimCombatEnabled;
    const state=tongKim.state || (typeof vlTkS!=='undefined'?vlTkS:null);
    if(state?.ph!==1 || ![1,2].includes(state.side) || typeof VL==='undefined' || !R.ready)return;
    const hero=VL.ents?.get?.(VL.meU);
    if(!hero||hero.dead2||!(hero.hp>0))return;
    tkDrink(hero,now);
    if(typeof INPUT!=='undefined' && INPUT.target && INPUT.target!==tkCombat.input)return;
    const own=tkSeries(typeof S!=='undefined'?S.fac:null);
    if(own===null||!hero||hero.dead2||!(hero.hp>0)||!Number.isFinite(hero.x)||!Number.isFinite(hero.y))return;
    const unit=typeof U_==='number'&&U_>0?U_:32;
    const me={x:hero.x/unit,y:hero.y/unit};
    const camps=Array.isArray(state.camp)?state.camp:[];
    const radius=Number(state.cr)>0?Number(state.cr):7;
    const ids=Array.isArray(state.ids)?new Map(state.ids):null;
    const ownCamp=camps[state.side-1], otherCamp=camps[2-state.side];
    const enemies=[],allies=[];
    for(const e of VL.ents.values()){
      if(!e.pl||e.uid===VL.meU||e.dead2||!(e.hp>0)||!Number.isSafeInteger(e.uid)||e.uid<=0)continue;
      const side=Number(ids?ids.get(e.uid):state.ids?.[e.uid]);
      if(side===state.side&&Number.isFinite(e.x)&&Number.isFinite(e.y))allies.push({x:e.x/unit,y:e.y/unit});
      if(side!==3-state.side)continue;
      const series=tkSeries(e.pl.fac);
      if(!Number.isFinite(e.x)||!Number.isFinite(e.y))continue;
      const max=Number(e.mhp??e.max);
      const p={entity:e,series,x:e.x/unit,y:e.y/unit,hpPct:max>0?e.hp/max:1};
      p.distance=tkDistance(me,p);
      if(p.distance<=24&&!camps.some(camp=>tkInCamp(p,camp,radius)))enemies.push(p);
    }
    enemies.sort((a,b)=>a.distance-b.distance);
    const danger=enemies.filter(e=>e.distance<=14);
    const crowded=danger.length>=(tkCombat.holding?2:3);
    const threats=enemies.filter(e=>TK_COUNTERS[e.series]===own);
    const nearby=threats.find(e=>e.distance<=9||(e.entity.tg===VL.meU&&e.distance<=14));
    const inCamp=tkInCamp(me,ownCamp,radius);
    const emergency=autoMove&&tkHealthEmergency(hero,now);
    const maxHp=Number(hero.mhp??hero.max), lowHp=maxHp>0&&hero.hp/maxHp<0.6;
    const watch=tkCombat.moveWatch;
    const stuck=watch&&now-watch.at>=1200&&now-watch.at<6000&&tkDistance(me,watch)<0.5&&tkDistance(me,watch.point)>2;
    const retreatCamps=Array.isArray(otherCamp)?[otherCamp]:[];
    const retreatPoint=(length,jump=false)=>{
      const threat=danger[0]||nearby;
      if(!threat)return null;
      const behind=allies.filter(a=>tkDistance(a,me)<=20&&tkDistance(a,threat)>tkDistance(me,threat)+2)
        .sort((a,b)=>tkDistance(a,me)-tkDistance(b,me));
      const goals=[...behind,...(Array.isArray(ownCamp)?[{x:ownCamp[0],y:ownCamp[1]}]:[])];
      for(const goal of goals){
        const direction=Math.atan2(goal.y-me.y,goal.x-me.x);
        const point=tkMovementPoint(me,direction,length,retreatCamps,radius,danger,unit,
          p=>tkDistance(p,goal)<tkDistance(me,goal),jump);
        if(point)return point;
      }
      return tkMovementPoint(me,Math.atan2(me.y-threat.y,me.x-threat.x),length,retreatCamps,radius,danger,unit,()=>true,jump);
    };
    if(autoMove&&now<tkCombat.evadeUntil)return;
    const awayFrom=e=>Math.atan2(me.y-e.y,me.x-e.x);
    if(autoMove && (emergency||stuck) && !inCamp && danger.length){
      if(now-tkCombat.lastEscape<2500)return;
      tkCombat.lastEscape=now;
      const away=awayFrom(danger[0]);
      const jump=retreatPoint((typeof KC_DIST==='number'?KC_DIST:280)/unit,true);
      if(tryGameJump(jump,unit,tkCombat.input)){
        tkChaseHold(true);tkCombat.lastMove=now;tkCombat.evadeUntil=now+1800;
        tkCombat.status='Đã kích hoạt khinh công né đòn';return;
      }
      if(tkSendMove(retreatPoint(9),unit,now,'Rút về đồng đội hoặc doanh trại')){
        tkChaseHold(true);tkCombat.evadeUntil=now+1800;return;
      }
      tkChaseHold(true);tkCombat.status='Máu nguy hiểm, chờ đường lùi an toàn';return;
    }
    if(autoMove && crowded && !tkCombat.holding){
      tkCombat.holding=true;
      tkChaseHold(true);
      tkSendMove(me,unit,now,'Giữ vị trí trước '+danger.length+' địch');
    }else if(autoMove && !crowded){tkCombat.holding=false;if(!nearby)tkChaseHold(false);}
    if(autoMove && nearby && !inCamp && (lowHp||!crowded)){
      tkChaseHold(true);
      // syncCombatAuto disables the native attack while a counter target remains selected at low HP.
      if(now-tkCombat.lastMove>=1000){
        const point=retreatPoint(9);
        if(point){tkSendMove(point,unit,now,'Né đối thủ hệ '+TK_ELEMENTS[nearby.series]);return;}
        const jump=retreatPoint((typeof KC_DIST==='number'?KC_DIST:280)/unit,true);
        if(now-tkCombat.lastEscape>=2500&&tryGameJump(jump,unit,tkCombat.input)){
          tkCombat.lastEscape=now;tkCombat.evadeUntil=now+1200;
          tkCombat.status='Khinh công thoát góc về phía an toàn';return;
        }
      }
      if(lowHp){tkCombat.status='Tránh giao chiến trực diện với hệ khắc';return;}
    }
    if(inCamp){
      if(!autoMove){tkCombat.status='Game hoặc người chơi điều khiển trong doanh trại';return;}
      if(emergency){tkChaseHold(true);tkCombat.status='Chờ hồi máu nguy cấp trong doanh trại';return;}
      tkChaseHold(false);
      if(crowded||!Array.isArray(otherCamp)||now-tkCombat.lastMove<1200)return;
      const outward=Math.atan2(otherCamp[1]-me.y,otherCamp[0]-me.x);
      tkSendMove(tkMovementPoint(me,outward,2*radius+3,camps,radius,threats,unit),unit,now,'Rời doanh trại để tìm đối thủ');return;
    }
    const profile=typeof activeRangeProfile==='function'?activeRangeProfile():null;
    const range=profile?.range||0;
    const target=enemies.filter(e=>e.series!==null&&(!lowHp||TK_COUNTERS[e.series]!==own)&&
      ((!autoMove||crowded)?e.distance<=range:!threats.some(threat=>tkDistance(threat,e)<=8)))
      .sort((a,b)=>Number(b.hpPct<0.25&&b.distance<=range)-Number(a.hpPct<0.25&&a.distance<=range)||
        Number(b.distance<=range)-Number(a.distance<=range)||
        (a.hpPct<0.25&&b.hpPct<0.25&&a.distance<=range&&b.distance<=range?a.entity.hp-b.entity.hp:0)||
        Number(b.series===TK_COUNTERS[own])-Number(a.series===TK_COUNTERS[own])||a.distance-b.distance)[0];
    if(!target){
      if(autoMove&&!enemies.length&&!crowded&&Array.isArray(ownCamp)&&Array.isArray(otherCamp)&&now-tkCombat.lastMove>=1200){
        const rally={x:(ownCamp[0]+otherCamp[0])/2,y:(ownCamp[1]+otherCamp[1])/2};
        const distance=tkDistance(me,rally);
        if(distance>4&&tkSendMove(tkMovementPoint(me,Math.atan2(rally.y-me.y,rally.x-me.x),
          Math.min(12,distance),camps,radius,[],unit,p=>tkDistance(p,rally)<distance),unit,now,'Tiến về giữa chiến trường'))return;
      }
      tkCombat.status=crowded?'Giữ vị trí, chờ địch vào tầm':'Chờ đối thủ phù hợp trong tầm quan sát';return;
    }
    if(hero.tg!==target.entity.uid && now-tkCombat.lastAction>=1000){
      tkCombat.lastAction=now;
      const path=dualExecute('tongKimTarget',1,()=>cmd('tgt',{id:target.entity.uid}),()=>{
        if(typeof vlTkClick!=='function'||typeof vlTkS==='undefined'||vlTkS?.ids?.[target.entity.uid]!==3-state.side)return false;
        vlTkClick(target.entity);return true;
      });
      if(path)tkCombat.status=(target.hpPct<0.25?'Ưu tiên kết liễu ':'Đã chọn ')+(target.entity.pl.n||'đối thủ');
      return;
    }
    if(autoMove&&!crowded&&!nearby&&hero.tg===target.entity.uid&&range>0&&target.distance>range&&now-tkCombat.lastMove>=1200){
      tkSendMove(tkMovementPoint(me,Math.atan2(target.y-me.y,target.x-me.x),
        Math.min(10,target.distance-range+1),camps,radius,[],unit,
        p=>tkDistance(p,target)<target.distance&&!threats.some(e=>tkDistance(p,e)<8)),unit,now,'Tiến vào tầm đánh');
      return;
    }
    if(autoMove && !crowded && !nearby && hero.tg===target.entity.uid && profile?.ranged &&
      target.distance<=range && now-Math.max(tkCombat.lastMove,tkCombat.lastAction)>=5000){
      const side=awayFrom(target)+Math.PI/2;
      const keepRange=p=>tkDistance(p,target)<=range && tkDistance(p,target)>=target.distance-0.5;
      tkSendMove(tkMovementPoint(me,side,3,camps,radius,threats,unit,keepRange),unit,now,'Đổi góc đánh, giữ đối thủ trong tầm');
    }
  }
  function tongKimInside(){return typeof R!=='undefined'&&String(R.vlZone)==='tk';}
  function tongKimOccupied(){return tongKimInside()||tongKim.phase!=='idle';}
  function tongKimSchedule(now=Date.now()){
    const i=tongKim.info,age=now-tongKim.infoAt;
    // Old evening metadata must not suppress discovery of the new noon round.
    if(i&&age>=0&&age<60000&&Number(i.now)>1e9){
      const t=Number(i.now)+age/1000,fight=Number(i.fight),next=Number(i.next);
      const len=Number(i.len)>0?Number(i.len):15;
      const fightEnd=Number(i.end)>fight?Number(i.end):fight+len*60;
      const start=fight>1e9&&t<fightEnd+60?fight:next;
      if(start>1e9){
        const sign=Number.isFinite(Number(i.sign))?Math.max(0,Number(i.sign)):5;
        return {start,end:start===fight?fightEnd:start+len*60,sign,t,source:'server'};
      }
    }
    const day=vietnamClock(now).day,midnight=Date.parse(day+'T00:00:00+07:00')/1000,t=now/1000;
    const slots=[12*60+30,22*60].map(m=>midnight+m*60);
    const start=slots.find(s=>t<s+16*60)??midnight+86400+(12*60+30)*60;
    return {start,end:start+15*60,sign:5,t,source:'fallback'};
  }
  function tongKimSlot(){return charIdentity()+'|'+String(tongKimSchedule().start);}
  function tongKimWindow(now=Date.now()){
    const s=tongKimSchedule(now);return s.t>=s.start-(s.sign+1)*60&&s.t<s.end+60;
  }
  function tongKimCanJoin(info){
    if(!info||!info.on||info.ph!==0||info.in||info.left)return false;
    const need=Number(info.reset),mine=Number(info.myReset);
    if(!Number.isFinite(need)||!Number.isFinite(mine)||mine<need)return false;
    if(Array.isArray(info.n)&&Number(info.max)>0&&info.n.reduce((sum,n)=>sum+Number(n||0),0)>=Number(info.max))return false;
    return true;
  }
  function tongKimMessage(m){
    if(!m)return;
    const identity=charIdentity();tongKim.day=vietnamClock().day;
    if(m.t==='zone'&&String(m.id)==='tk'){
      tongKim.identity=identity;tongKim.phase='inside';tongKim.joined=true;tongKim.sawZone=true;tongKim.slot=tongKimSlot();
      tongKim.uiWait=false;tongKim.status='Máy chủ xác nhận đã vào bản đồ Tống Kim';return;
    }
    if(m.t!=='tk')return;
    if(m.s==='info'){
      tongKim.identity=identity;tongKim.info=JSON.parse(JSON.stringify(m));tongKim.infoAt=Date.now();tongKim.infoSeq++;tongKim.refreshRequired=false;tongKim.polls=0;
      if(m.left){tongKim.finished[tongKimSlot()]=true;tongKim.status='Đã rời trận này; không báo danh lại';}
    }else if(m.s==='st'){
      tongKim.identity=identity;tongKim.state=JSON.parse(JSON.stringify(m));tongKim.joined=true;tongKim.phase='inside';
      tongKim.slot=tongKim.slot||tongKimSlot();tongKim.uiWait=false;
      tongKim.status=m.ph===0?'Đã báo danh, chờ trận bắt đầu':m.ph===1?'Đang trong Tống Kim':'Chờ máy chủ đưa ra khỏi trận';
    }else if(m.s==='end'){
      tkCombatReset();tongKim.state=null;
      tongKim.phase='ending';tongKim.finished[tongKim.slot||tongKimSlot()]=true;
      tongKim.status='Tống Kim kết thúc; chờ máy chủ trả về, không tự rời';
    }else if(m.s==='out'){
      tkCombatReset();tongKim.state=null;
      tongKim.finished[tongKim.slot||tongKimSlot()]=true;tongKim.phase='returning';tongKim.uiWait=false;
      tongKim.status='Đã ra Tống Kim; chờ bản đồ đồng bộ để tiếp tục';
    }
  }
  function tongKimOpenUI(){
    if(typeof vlNpcOpen==='function'&&typeof NPCS!=='undefined'&&Array.isArray(NPCS)){
      const npc=NPCS.find(n=>n.k==='tong_kim');if(npc){vlNpcOpen(npc);return true;}
    }
    if(typeof vlTkWin==='function'){vlTkWin();return true;}
    return false;
  }
  function tongKimCloseInfo(){
    const join=document.getElementById('tkJoin'),close=document.getElementById('tkX');
    if(join&&close&&visible(close))clickGame(close);
  }
  function tongKimPoll(now,viaUI=false){
    if(now-tongKim.lastPoll<5000)return false;
    tongKim.lastPoll=now;tongKim.polls++;
    try{
      if(viaUI){if(!tongKimOpenUI())throw Error('Thiếu NPC và vlTkWin');}
      else{if(typeof cmd!=='function')throw Error('Thiếu cmd');cmd('tk',{a:'st'});}
      return true;
    }catch(e){tongKim.status='Chưa đọc được lịch Tống Kim: '+e.message;diagnostic('TK_STATUS_ERROR',tongKim.status);return false;}
  }
  function tongKimTick(s){
    if(!st.running||!s||!isOnline())return false;
    const now=Date.now(),identity=charIdentity();
    if(tongKim.identity&&tongKim.identity!==identity){
      tkCombatReset();
      Object.assign(tongKim,{phase:'idle',info:null,infoAt:0,infoSeq:0,slot:'',attempts:0,uiWait:false,joined:false,state:null});
    }
    const day=vietnamClock(now).day;
    if(tongKim.day&&tongKim.day!==day){Object.assign(tongKim,{phase:'idle',info:null,infoAt:0,slot:'',attempts:0,uiWait:false,joined:false,sawZone:false,lastPoll:0,polls:0,retryAt:0});}
    tongKim.day=day;tongKim.identity=identity;
    if(tongKimInside()){
      if(!['ending','returning'].includes(tongKim.phase))tongKim.phase='inside';tongKim.joined=true;tongKim.sawZone=true;tongKim.slot=tongKim.slot||tongKimSlot();
      if(cfg.tongKimCombatEnabled&&afkOn())exitPowerSave('ở trong Tống Kim');
      if(Number(R.deadT)>0){tkCombatReset();tongKim.status='Chờ hồi sinh trong doanh trại; không báo danh lại';return true;}
      if(tongKim.phase==='inside'){
        if(cfg.tongKimCombatEnabled)syncCombatAuto(s);
        tkFightTick(now);
      }
      return true;
    }
    if(['inside','ending','returning'].includes(tongKim.phase)){
      // st may precede zone during entry; do not mistake that for leaving.
      if(tongKim.phase==='inside'&&!tongKim.sawZone){
        tongKim.status='Đã có trạng thái tham gia; chờ zone Tống Kim, không gửi join lại';
        tongKimPoll(now,cfg.dualRouteMode==='ui');return true;
      }
      tongKim.finished[tongKim.slot||tongKimSlot()]=true;
      tongKim.phase='idle';tongKim.joined=false;tongKim.uiWait=false;tongKim.state=null;tkCombatReset();
      st.action='';st.map.requested=null;st.channel.done=false;st.channel.pending=0;st.fieldAt=0;
      tongKim.status='Đã ra chiến trường; tiếp tục Auto theo tiến độ cũ';return true;
    }
    if(!cfg.tongKimEnabled){tongKim.phase='idle';return false;}
    if(!tongKimWindow(now)){
      tongKim.phase='idle';tongKim.uiWait=false;tongKim.attempts=0;tongKim.polls=0;return false;
    }
    if(st.boss.phase!=='idle'||rebirth.phase!=='idle'||String(s.zone)==='vd')return false;
    if(now<tongKim.retryAt&&tongKim.phase==='idle')return false;
    if(tongKim.finished[tongKimSlot()]){tongKim.phase='idle';return false;}
    if(tongKim.phase==='idle'){
      if(s.reborns<1){tongKim.status='Tống Kim cần ít nhất 1 lần chuyển sinh';return false;}
      if(tongKim.slot!==tongKimSlot())tongKim.attempts=0;
      tongKim.phase='preparing';tongKim.polls=0;tongKim.sawZone=false;tongKim.slot=tongKimSlot();
      st.action='';st.map.requested=null;townFlow.request=null;clearTownRecovery();clearBossApproach('Chuẩn bị Tống Kim');
      if(st.startup==='running')st.startup='done';
      diagnostic('TK_PREPARE','Tạm dừng Dã Tẩu, chuẩn bị báo danh Tống Kim');
    }
    if(afkOn()){exitPowerSave('chuẩn bị Tống Kim');return true;}
    if(rewardNet.active||sellFlow.sentAt)return true;
    const fresh=tongKim.info&&!tongKim.refreshRequired&&now-tongKim.infoAt<8000;
    if(!fresh){
      if(tongKim.polls>=3&&now-tongKim.lastPoll<30000){
        tongKim.retryAt=tongKim.lastPoll+30000;tongKim.phase='idle';
        tongKim.status='Chưa nhận trạng thái Tống Kim; tiếp tục Dã Tẩu và hỏi lại sau';return false;
      }
      if(tongKim.polls>=3)tongKim.polls=0;
      tongKimPoll(now,cfg.dualRouteMode==='ui');return true;
    }
    const info=tongKim.info;tongKim.slot=tongKimSlot();
    if(!info.on||info.left||Number(info.myReset)<Number(info.reset)){
      tongKim.status=!info.on?'Máy chủ đang tắt Tống Kim':info.left?'Đã rời trận; không vào lại':'Chưa đủ chuyển sinh theo máy chủ';
      if(info.left)tongKim.finished[tongKim.slot]=true;
      tongKim.retryAt=now+30000;tongKim.phase='idle';tongKimCloseInfo();return false;
    }
    if(info.in){tongKim.status='Đã được máy chủ ghi nhận trong trận; chờ bản đồ';return true;}
    if(info.ph!==0){
      if(info.ph===1){tongKim.finished[tongKim.slot]=true;tongKim.phase='idle';tongKim.status='Đã đóng báo danh; không gửi join';tongKimCloseInfo();return false;}
      tongKim.status='Chờ giờ mở báo danh do máy chủ xác nhận';
      if(!s.town){tongKimCloseInfo();safeGoTown('Về Ba Lăng chuẩn bị Tống Kim',s);}
      return true;
    }
    if(!tongKimCanJoin(info)){
      tongKim.status='Tống Kim chưa nhận thêm người hoặc chưa đủ điều kiện';return true;
    }
    if(!s.town){if(st.softUntil&&now<st.softUntil)return true;tongKimCloseInfo();safeGoTown('Về Ba Lăng báo danh Tống Kim',s);return true;}
    if(tongKim.phase==='joining'){
      if(now-tongKim.sentAt<10000)return true;
      tongKim.phase='preparing';tongKim.uiWait=false;tongKim.refreshRequired=true;tongKim.retryAt=now+2000;
      diagnostic('TK_JOIN_TIMEOUT','Chưa có st/zone xác nhận; hỏi lại trạng thái trước khi thử đường khác');return true;
    }
    if(now<tongKim.retryAt)return true;
    if(tongKim.attempts>=3){tongKim.status='Đã thử 3 lần chưa vào được; ngừng báo danh trận này';tongKim.finished[tongKim.slot]=true;tongKim.phase='idle';return false;}
    const attempt=tongKim.attempts+1;
    const way=cfg.dualRouteMode==='ui'?'ui':cfg.dualRouteMode==='command'?'command':attempt%2===0?'ui':'command';
    if(way==='ui'){
      if(!tongKim.uiWait){
        tongKim.uiSeq=tongKim.infoSeq;tongKim.uiUntil=now+5000;tongKim.uiWait=true;
        if(!tongKimOpenUI()){tongKim.uiWait=false;tongKim.attempts++;tongKim.retryAt=now+5000;tongKim.status='Không có đường NPC/giao diện Tống Kim';}
        return true;
      }
      if(tongKim.infoSeq<=tongKim.uiSeq){
        if(now<tongKim.uiUntil)return true;
        tongKim.uiWait=false;tongKim.attempts++;tongKim.retryAt=now+5000;return true;
      }
      const button=document.getElementById('tkJoin');
      if(!button||button.disabled||!visible(button)||!/báo danh|vào lại chiến trường/i.test(button.textContent||'')||!tongKimCanJoin(tongKim.info)){
        tongKim.uiWait=false;tongKim.attempts++;tongKim.retryAt=now+5000;tongKim.status='Chưa có nút Báo danh khả dụng';return true;
      }
      tongKim.phase='joining';tongKim.sentAt=now;tongKim.attempts++;tongKim.uiWait=false;tongKim.lastWay='ui';
      if(!clickGame(button)){tongKim.phase='preparing';tongKim.retryAt=now+5000;}
    }else{
      if(typeof cmd!=='function')return true;
      tongKim.phase='joining';tongKim.sentAt=now;tongKim.attempts++;tongKim.lastWay='command';
      try{cmd('tk',{a:'join'});}catch(e){tongKim.phase='preparing';tongKim.retryAt=now+5000;diagnostic('TK_JOIN_ERROR',String(e?.message||e));}
    }
    dualLog('tongKim',way,'Báo danh, chờ st/zone');
    tongKim.status='Đã yêu cầu báo danh Tống Kim qua '+way+'; chờ máy chủ xác nhận';
    say(tongKim.status);return true;
  }

  function vietnamClock(epochMs = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
    }).formatToParts(new Date(epochMs));
    const d = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return {day:`${d.year}-${d.month}-${d.day}`, minute:Number(d.hour)*60+Number(d.minute),
      second:Number(d.second), epoch:epochMs};
  }
  function serverBossClock() {
    try {
      if (typeof WB !== 'undefined' && WB.st && Number.isFinite(Number(WB.st.now)) &&
          WB.st.now > 1000000000 && Number.isFinite(Number(WB.at)) &&
          Date.now()-WB.at >= 0 && Date.now()-WB.at < 30000) {
        return vietnamClock(Number(WB.st.now)*1000 + (Date.now()-WB.at));
      }
    } catch (_) {}
    return vietnamClock();
  }
  function bossWindow() {
    if (!cfg.bossWorldEnabled) return null;
    const clock = serverBossClock();
    // Tin WB.hours co 2 khung theo may chu; neu chua co tin thi dung 12h/21h mac dinh.
    let hours = [720,1260];
    try { if (typeof WB !== 'undefined' && WB.st && Array.isArray(WB.st.hours) &&
      WB.st.hours.length >= 2 && WB.st.hours.slice(0,2).every(x => Number.isFinite(+x) && +x>=0 && +x<1440))
      hours = WB.st.hours.slice(0,2).map(Number); } catch (_) {}
    const slots = [[hours[0], cfg.bossAt12], [hours[1], cfg.bossAt21]];
    for (const [minute,enabled] of slots) {
      if (!enabled) continue;
      const label = String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
      const key = clock.day+'|'+label;
      if (clock.minute >= minute-Math.max(0,cfg.bossPrepareMinutes) && clock.minute < minute+16 &&
          !st.boss.finished[key]) {
        return {key,label,live:clock.minute>=minute,expired:clock.minute>=minute+15,
          clock,startMinute:minute,elapsedSeconds:clock.minute>=minute
            ? (clock.minute-minute)*60+clock.second : -1};
      }
    }
    return null;
  }
  function bossServer() {
    try {
      if (typeof WB === 'undefined' || !WB.st || !Number.isFinite(Number(WB.at))) return null;
      return Date.now() - WB.at >= 0 && Date.now() - WB.at < 10000 ? WB.st : null;
    } catch (_) { return null; }
  }
  function requestBossStatus(force=false) {
    if (!isOnline() || typeof cmd !== 'function') return false;
    if (!force && Date.now()-st.boss.lastPoll < 4500) return false;
    st.boss.lastPoll=Date.now();
    try {cmd('wb',{a:'st'});return true;} catch(e) {diagnostic('WB','Loi hoi trang thai: '+e.message);return false;}
  }
  function bossNowSeconds(status) {
    try {
      const at = typeof WB !== 'undefined' ? Number(WB.at) : NaN;
      if (status && Number.isFinite(+status.now) && Number.isFinite(at))
        return Number(status.now) + Math.max(0,Date.now()-at)/1000;
    } catch(_){}
    return Date.now()/1000;
  }
  function worldBossName(status) {
    try { const entry = typeof WB_BOSS !== 'undefined' ? WB_BOSS[Number(status?.boss)] : null;
      return entry && entry[1] ? String(entry[1]) : ''; } catch(_){return '';}
  }
  function monitorBossStatus(status) {
    if (!status || st.boss.phase==='idle') return;
    const b=st.boss;
    b.lastStatusAt=Date.now();
    b.bossName=worldBossName(status) || b.bossName;
    b.bossHp=Number.isFinite(+status.hp) ? +status.hp : null;
    b.bossMax=Number.isFinite(+status.max) ? +status.max : null;
    b.participantCount=Number.isFinite(+status.n) ? +status.n : null;
    b.endAt=Number(status.end)||0;
    if (status.me) {
      const dmg=Number(status.me.dmg);
      const rank=Number(status.me.rank);
      if (Number.isFinite(dmg) && dmg>=0) {
        metrics.bossWorldDamage+=Math.max(0,dmg-b.lastDamage);
        b.lastDamage=Math.max(b.lastDamage,dmg);
      }
      if (Number.isInteger(rank) && rank>0) {
        b.bestRank=b.bestRank===null?rank:Math.min(b.bestRank,rank);
        metrics.bossWorldBestRank=metrics.bossWorldBestRank===null?rank:Math.min(metrics.bossWorldBestRank,rank);
      }
    }
    if (Date.now()-b.lastStatusLogAt > 45000 && status.open && b.hadJoined) {
      b.lastStatusLogAt=Date.now();
      diagnostic('WB','Tinh hinh tran Boss',{name:b.bossName,hp:b.bossHp,max:b.bossMax,
        participants:b.participantCount,dmg:b.lastDamage,rank:b.bestRank});
    }
  }
  function bossWait(reason) {
    const b=st.boss;
    b.waitReason=reason;
    const now=Date.now();
    if (now-b.lastWaitLog >= 30000) { b.lastWaitLog=now; diagnostic('WB',reason);
      say('Boss The Gioi: '+reason); }
    return true;
  }
  function restoreWorldBossCombat() {
    if (!worldCombat.saved) return;
    const au=combatConfig(), saved=worldCombat.saved;
    worldCombat.saved=null;
    if (!au) return;
    au.prio=saved.prio;
    au.chase=saved.chase;
    if (isOnline() && typeof sendCfg==='function') try {sendCfg();} catch(e) {diagnostic('WB','Loi phuc hoi cau hinh Boss: '+e.message);}
  }
  function boostWorldBossCombat() {
    if (!cfg.worldBossCombatPriority || !cfg.keepGameAuto) return;
    const au=combatConfig(); if (!au) return;
    if (!worldCombat.saved) worldCombat.saved={prio:au.prio,chase:au.chase};
    if (au.prio!==true || au.chase!==true) {
      au.prio=true; au.chase=true;
      if (isOnline() && typeof sendCfg==='function') try {sendCfg();} catch(e){diagnostic('WB','Loi uu tien Boss: '+e.message);}
      diagnostic('WB','Uu tien Boss, tu tim muc tieu trong dau truong');
    }
  }
  function bossFinish(reason) {
    const b=st.boss;
    if (b.phase==='returning' || b.phase==='idle') return;
    if (b.slot) b.finished[b.slot]=true;
    if (b.hadJoined) metrics.bossWorldFinishes++;
    b.phase='returning';b.lastMessage=reason;b.waitReason='';
    st.action='';st.fieldAt=0;st.zoneRetryAt=0;
    townFlow.request=null;
    restoreWorldBossCombat();
    diagnostic('WB','Ket thuc luot Boss',{slot:b.slot,reason,hadJoined:b.hadJoined,
      damage:b.lastDamage,rank:b.bestRank});
    say('Boss The Gioi: '+reason+'. Quay lai Da Tau.');
  }
  const BOSS_RESPAWN_WAIT=7500;
  const BOSS_MAX_FIRST_JOIN=12; // sau nhieu lan server khong cho vao, quay ve Da Tau
  const BOSS_MAX_REJOIN=16;
  function bossJoinInterval(attempts) { return attempts < 3 ? 10000 : attempts < 7 ? 16000 : 26000; }
  function bossTick(s) {
    const b=st.boss,now=Date.now();
    if (!s || !Number.isFinite(s.level) || s.level <= 0) {
      if (b.phase!=='idle') return bossWait('Doi du lieu nhan vat sau ket noi lai');
      return false;
    }
    if (!worldBossEligible(s)) {
      if (b.phase!=='idle') { restoreWorldBossCombat();b.phase='idle';b.slot='';st.action='';
        say('Boss Thế Giới yêu cầu cấp '+MIN_WORLD_BOSS_LEVEL+' hoặc đã chuyển sinh'); }
      return false;
    }
    const windowNow=bossWindow();
    // Da o dau truong nhung Auto vua bat: cho nhan dien phien hien tai de khoi bo mac Boss.
    if (b.phase==='idle') {
      if (!st.running || !windowNow) return false;
      b.phase='preparing';b.slot=windowNow.key;b.requestedAt=now;b.joinedAt=0;
      b.lastPoll=0;b.lastJoin=0;b.joinTries=0;b.deathAt=0;b.reentries=0;
      b.hadJoined=false;b.joiningSince=0;b.lastArenaAt=0;b.lastRecoveryLog=0;
      b.lastStatusAt=0;b.lastStatusLogAt=0;b.lastDamage=0;b.bestRank=null;
      b.bossName='';b.bossHp=null;b.bossMax=null;b.participantCount=null;
      b.endAt=0;b.waitReason='';b.lastWaitLog=0;b.rejectedSince=0;b.downInsideAt=0;
      b.wasRunning=st.running;
      // Boss la tac vu cao nhat: khong cho lenh ve thanh / chuyen bai Da Tau cu can thiep.
      townFlow.request=null;st.action='';st.fieldAt=0;st.map.requested=null;
      st.channel.pending=0;st.channel.done=false;
      bossHunt.forcedChannel=null;
      if (st.startup==='running') st.startup='pending'; // reward job se tu huy khi thay phase Boss
      closeQuestModal(); closeRewardWindows(); // tranh modal nhiem vu che dau truong Boss
      diagnostic('WB','Bat dau chuan bi',{slot:b.slot,at:windowNow.label});
      say('Tam dung Da Tau de chuan bi Boss The Gioi '+windowNow.label);
    }
    if (b.phase==='returning') {
      if (typeof R!=='undefined' && R.deadT>0) return bossWait('Cho nhan vat hoi sinh roi moi ve thanh');
      if (!s.town) { safeGoTown('Ve Ba Lang sau Boss',s);return true; }
      b.phase='idle';b.slot='';b.requestedAt=0;b.deathAt=0;b.joiningSince=0;
      st.action='';st.fieldAt=0;st.recoveryAt=0;st.zoneRetryAt=0;
      st.map.noProgressAt=0;st.map.noProgressHave=null;
      if (!cfg.resumeDaTau) {finishQuestGoal('Boss kết thúc; không trở lại Dã Tẩu theo cài đặt');return true;}
      say('Da ve Ba Lang va tiep tuc Da Tau theo tien do may chu');
      return true;
    }
    if (!st.running) return true;
    // Khi game chua xac nhan zone sau reconnect khong tu doan da ra khoi Boss.
    if (typeof R!=='undefined' && !R.ready) return bossWait('Cho may chu xac nhan ban do sau ket noi lai');
    const inArena=arenaNow();
    requestBossStatus();
    const status=bossServer();
    monitorBossStatus(status);
    const live=!!(windowNow && windowNow.key===b.slot && windowNow.live);
    const serverNow=status?bossNowSeconds(status):Date.now()/1000;
    const remaining=status && status.open && Number.isFinite(+status.end)
      ? Number(status.end)-serverNow : null;

    if (!windowNow || windowNow.expired) {bossFinish('het khung 15 phut theo lich');return true;}
    // Server quyet dinh het Boss, nhung doi it nhat 60 giay sau gio mo
    // de tranh nham phan hoi open:false cua phien TRUOC.
    // end phai thuoc chinh luot 12h/21h hien tai; khong nham dead cua luot truoc.
    const slotStart=windowNow ? Math.floor(windowNow.clock.epoch/1000)-windowNow.elapsedSeconds : 0;
    const thisSlot=live && status && Number.isFinite(+status.end) &&
      Number(status.end)>=slotStart+30 && Number(status.end)<=slotStart+20*60;
    if (thisSlot && windowNow.elapsedSeconds>=30 &&
        (status.dead===true || status.open===false)) {
      bossFinish(status.dead ? 'may chu xac nhan Boss da bi ha' : 'may chu da dong dau truong');
      return true;
    }
    if (live && status && status.open===true && remaining!==null && remaining<=0) {
      bossFinish('may chu xac nhan het gio');return true;
    }
    if (inArena) {
      b.lastArenaAt=now;
      // Ban do wb tu server la ACK tham chien, ke ca vua vao da guc.
      if (!b.hadJoined) {b.hadJoined=true;metrics.bossWorldEntries++;b.joinedAt=now;}
      const dead=!!(typeof R!=='undefined' && R.deadT>0);
      if (dead) {
        if (!b.downInsideAt) {b.downInsideAt=now;diagnostic('WB','Nhan vat guc trong dau truong, cho may chu hoi sinh');}
        b.phase='respawning';
        if (!b.deathAt) b.deathAt=now;
        return bossWait('Nhan vat dang guc trong dau truong, cho hoi sinh');
      }
      if (b.phase!=='fighting') {
        const reenter=b.reentries>0 || b.deathAt>0 || b.downInsideAt>0;
        b.phase='fighting';b.hadJoined=true;b.joinedAt=now;b.deathAt=0;b.joiningSince=0;b.joinTries=0;
        b.waitReason='';
        say(reenter?'Da vao lai dau truong Boss sau hoi sinh':'Da xac nhan vao dau truong Boss tu may chu');
      }
      b.downInsideAt=0;
      boostWorldBossCombat();
      lockVisibleBoss(s,true);
      return true;
    }
    // Roi khoi dau truong, khong phan biet chac chan chet hay bi server tra ve.
    if (b.hadJoined && b.phase!=='respawning') {
      b.phase='respawning';b.deathAt=now;b.lastJoin=0;b.joinTries=0;b.joiningSince=0;
      say('Da roi dau truong Boss, cho hoi sinh / dong bo roi thu vao lai');
    }
    if (afkOn()) {exitPowerSave('chuan bi Boss The Gioi');return bossWait('Cho thoat Treo may');}
    if (!live) return bossWait('Dang cho gio mo Boss '+windowNow.label);
    // v3.5: Khong khoa cung chuc nang tham chien neu yeu cau wb:st khong duoc
    // phan hoi kip. Chu dong thu *yeu cau* wb:join co gioi han sau gio mo;
    // may chu van kiem tra lich, cap/chuyen sinh va la noi xac nhan duy nhat.
    // Tranh chuyen ngay vao Boss khi du lieu WB.st cu co open=false.
    const missingStatus=!status;
    const elapsed=windowNow.elapsedSeconds;
    // Neu server da gui trang thai tu CHINH luot nay va dong/chet, phai ton trong.
    if (status && (!status.open || status.dead))
      return bossWait('Boss chua mo hoac da ket thuc (theo may chu)');
    if (missingStatus && elapsed<8)
      return bossWait('Dang hoi WB.st; doi may chu mo dau truong');
    // Khong tu thu join ngay giay dau neu WB.st khong tra loi. Sau 8s moi fallback.
    // Nhan biet theo giay thuc cua khung Boss va gio may chu neu co.
    if (missingStatus && now-b.lastWaitLog>30000)
      diagnostic('WB','Khong co WB.st moi; thu wb:join gioi han, cho xac nhan zone wb',
        {slot:b.slot, elapsedSeconds:elapsed, lastPoll:b.lastPoll,
         wsReady:typeof NET!=='undefined'?NET.ws?.readyState:null});
    const minLevel=status && Number.isFinite(+status.minLv)
      ? Math.max(MIN_WORLD_BOSS_LEVEL,+status.minLv):MIN_WORLD_BOSS_LEVEL;
    if (!worldBossEligible(s,status)) {bossFinish('máy chủ yêu cầu cấp '+minLevel+' hoặc đã chuyển sinh');return true;}
    if (typeof R!=='undefined' && R.deadT>0) {
      if (!b.deathAt) b.deathAt=now;
      return bossWait('Nhan vat dang trong thuong, cho hoi sinh');
    }
    if (b.hadJoined && !cfg.bossRejoinOnDeath)
      return bossWait('Da tat chuc nang vao lai Boss sau khi roi dau truong');
    if (b.phase==='respawning' && b.deathAt && now-b.deathAt<BOSS_RESPAWN_WAIT)
      return bossWait('Doi hoan tat hoi sinh truoc khi vao lai');
    if (b.joinTries >= (b.hadJoined?BOSS_MAX_REJOIN:BOSS_MAX_FIRST_JOIN)) {
      bossFinish('da thu tham chien qua nhieu lan nhung chua duoc xac nhan');
      return true;
    }
    if (b.lastJoin && now-b.lastJoin < bossJoinInterval(b.joinTries)) return true;
    if (!isOnline()) return true;
    b.lastJoin=now;b.joinTries++;b.joiningSince=now;
    try {
      const path=dualExecute('worldBoss',b.joinTries,()=>cmd('wb',{a:'join'}),uiWorldBossJoin);
      if(!path)throw Error('Không có đường vào Boss khả dụng');
      if (b.hadJoined) { b.reentries++;metrics.bossWorldRejoinRequests++;b.phase='respawning'; }
      else { metrics.bossWorldJoinRequests++;b.phase='joining'; }
      if (b.joinTries===1 || b.joinTries%3===0)
        say((b.hadJoined?'Thu tham chien lai Boss':'Gui yeu cau tham chien Boss')+
          ' (lan '+b.joinTries+'); dang doi server chuyen sang wb');
      diagnostic('WB','Gui wb:join',{try:b.joinTries,returning:b.hadJoined,
        fallbackNoFreshStatus:missingStatus,zone:typeof R!=='undefined'?R.vlZone:null});
    } catch(e) {diagnostic('WB','Loi gui wb:join '+e.message);}
    return true;
  }
  let bossPreflightAt=0;
  function preflightBossStatus(s) {
    if (!cfg.bossWorldEnabled || !st.running || !worldBossEligible(s) ||
        st.boss.phase!=='idle' || !isOnline()) return;
    if (Date.now()-bossPreflightAt<60000) return;
    bossPreflightAt=Date.now();
    requestBossStatus(true);
  }
  function bossUiText() {
    const b=st.boss,status=bossServer(),clock=serverBossClock(),windowNow=bossWindow();
    const parts=[
      'Giờ Việt Nam: '+String(Math.floor(clock.minute/60)).padStart(2,'0')+':'+String(clock.minute%60).padStart(2,'0')+':'+String(clock.second).padStart(2,'0'),
      'Cấp nhân vật: '+(game()?.level ?? '?')+' · chuyển sinh: '+(game()?.reborns ?? '?')+
        ' · điều kiện Boss: '+(worldBossEligible(game(),status)?'ĐỦ (cấp hoặc chuyển sinh)':'CHƯA ĐỦ'),
      'Pha: '+b.phase+(b.slot?' · '+b.slot:'')+(arenaNow()?' · trong đấu trường':'')
    ];
    if (status) {
      const left=status.open&&Number.isFinite(+status.end)?Math.max(0,Math.floor(+status.end-bossNowSeconds(status))):0;
      parts.push('Server: '+(status.open?'ĐANG MỞ':status.dead?'ĐÃ HẠ':'CHƯA MỞ')+
        (status.open?' · còn '+Math.floor(left/60)+'p '+left%60+'s':'')+
        ' · Boss: '+(worldBossName(status)||'?'));
      parts.push('Máu Boss: '+(Number.isFinite(+status.hp)?Math.max(0,+status.hp).toLocaleString('vi-VN'):'?')+
        ' / '+(Number.isFinite(+status.max)?(+status.max).toLocaleString('vi-VN'):'?')+
        ' · '+(Number.isFinite(+status.n)?status.n:'?')+' người');
      parts.push('Bạn gây: '+(Number.isFinite(+status.me?.dmg)?(+status.me.dmg).toLocaleString('vi-VN'):'chưa có')+
        ' · hạng: '+(Number.isInteger(+status.me?.rank)&&+status.me.rank>0?status.me.rank:'--'));
    } else parts.push('Trạng thái server: chưa có tin WB.st mới');
    if (windowNow && b.phase==='idle') parts.push('Khung sắp/đang mở: '+windowNow.label);
    if (b.waitReason) parts.push('Đang chờ: '+b.waitReason);
    parts.push('Yêu cầu vào/vào lại: '+metrics.bossWorldJoinRequests+'/'+metrics.bossWorldRejoinRequests);
    return parts.join('\n');
  }
  // Server 4 rebirth: requirement min(400,100+20*S.reset), command reset, server char confirms.
  // Irreversible: do not call unless opt-in, in safe town, not during WB or Hoa Dang.
  function gameRebirthNeed(n) {return Math.min(400,100+20*Math.max(0,Math.floor(n)||0));}
  function rebirthThreshold() {
    const n=Number(typeof S!=='undefined' ? S.reset : 0)||0;
    const need=gameRebirthNeed(n);
    return cfg.rebirthMode==='custom'?Math.max(need,Math.max(100,Math.min(500,Number(cfg.rebirthTarget)||100))):need;
  }
  function rebirthUiText() {
    const lv=Number(typeof S!=='undefined'?(S.lv??S.lvl):NaN),n=Number(typeof S!=='undefined'?S.reset:NaN);
    return [
      'Hiện tại: cấp '+(Number.isFinite(lv)?lv:'?')+' · Chuyển sinh '+(Number.isFinite(n)?n:'?')+' lần',
      'Máy chủ yêu cầu: cấp '+gameRebirthNeed(n)+' · Ngưỡng Auto: cấp '+rebirthThreshold(),
      'Tự chuyển sinh: '+(cfg.rebirthEnabled?'BẬT':'TẮT (mặc định)')+
        ' · phiên này '+rebirth.count+'/'+(cfg.rebirthMaxPerRun||'không giới hạn'),
      'Giai đoạn: '+rebirth.phase+' · '+rebirth.lastStatus,
      rebirth.lastError?'Lỗi gần nhất: '+rebirth.lastError:'',
      'Hành động chuyển sinh đưa nhân vật về CẤP 1; đợi server xác nhận rồi mới luyện tiếp.',
      'Dã Tẩu sau chuyển sinh: '+questReborn.lastInfo,
      'Boss Thế Giới: '+(worldBossEligible(game(),bossServer())?'ĐỦ điều kiện cấp/chuyển sinh':'Chưa đủ cấp hoặc chưa chuyển sinh')
    ].filter(Boolean).join('\n');
  }
  function rebirthTick(s) {
    const now=Date.now();
    const n=Number(typeof S!=='undefined'?S.reset:NaN);
    if(!Number.isFinite(n) || n<0)return false;
    if(rebirth.phase==='sent') {
      // Char snapshot from server is authoritative; do not infer success from UI.
      if(n>rebirth.before && s.level<rebirth.prevLevel) {
        const prev=rebirth.before;
        rebirth.phase='idle';rebirth.retries=0;rebirth.count++;metrics.rebirths++;
        rebirth.lastStatus='Đã xác nhận chuyển sinh '+prev+' → '+n;
        st.action='';st.map.requested=null;townFlow.request=null;
        st.zoneRetryAt=0;st.recoveryAt=0;st.fieldAt=0;
        st.channel.done=false;st.channel.pending=0;
        combatSync.forceSync=true;
        questReborn.blockedAction='';questReborn.waitLevel=0;questReborn.until=0;
        questReborn.noDataAt=0;questReborn.rejected=0;
        questReborn.lastInfo='Đã chuyển sinh; tiếp tục kiểm tra Dã Tẩu qua tiến độ máy chủ';
        if(s.q) st.baseStep=s.step-st.completed; // Không đánh mất số bước hoàn thành trong phiên khi step được đặt lại.
        diagnostic('REBIRTH','Máy chủ xác nhận chuyển sinh',{from:prev,to:n,level:s.level,
          questState:s.q?{step:s.step,took:s.took,have:s.have,need:s.need}:'đang chờ đồng bộ'});
        say('☯️ Chuyển sinh thành công: '+prev+' → '+n+' lần. Cấp '+s.level+', tiếp tục luyện cấp theo bãi.');
        return true;
      }
      if(now-rebirth.sentAt<18000)return true;
      if(rebirth.retries>=2) {
        cfg.rebirthEnabled=false;saveExtraPrefs();
        rebirth.phase='idle';rebirth.lastError='Không được xác nhận sau 2 yêu cầu, đã tự TẮT';
        say('☯️ Máy chủ chưa xác nhận chuyển sinh sau 2 lần. Auto chuyển sinh đã TẮT, Dã Tẩu vẫn chạy.');
        return false;
      }
      rebirth.phase='town';rebirth.lastStatus='Chưa được xác nhận; kiểm tra lại trước khi thử lần cuối';
      return true;
    }
    if(!cfg.rebirthEnabled)return false;
    if(cfg.rebirthMaxPerRun>0 && rebirth.count>=cfg.rebirthMaxPerRun)return false;
    if(s.level<rebirthThreshold()) {rebirth.phase='idle';return false;}
    if(arenaNow() || st.boss.phase!=='idle' || (worldBossEligible(s) && bossWindow()))return false;
    const q=quizClient();
    if(q?.m?.open===1 && (Date.now()-Number(q.at||0))<60000)return false;
    if(st.startup==='running' || st.action.startsWith('Nhan nhiem vu') || st.action.startsWith('Tra nhiem vu'))return false;
    if(cfg.rebirthWaitQuest && s.took && s.need>0)return false;
    if(rebirth.phase==='idle') {
      rebirth.phase='town';rebirth.startedAt=now;rebirth.retries=0;
      rebirth.lastStatus='Đủ cấp, chuẩn bị về thành để chuyển sinh';
      diagnostic('REBIRTH','Đủ cấp theo cấu hình; vào quy trình an toàn',{level:s.level,reset:n,threshold:rebirthThreshold()});
      say('☯️ Đã đủ cấp '+s.level+' để chuyển sinh. Về Ba Lăng Huyện và chờ máy chủ xác nhận.');
    }
    if(!s.town) {
      if(now-rebirth.startedAt>90000) {
        rebirth.lastError='Không thể về thành trong 90 giây';rebirth.phase='idle';
        cfg.rebirthEnabled=false;saveExtraPrefs();
        say('☯️ Không về thành được; đã tắt tự chuyển sinh để tránh vòng lặp.');
        return false;
      }
      safeGoTown('Ve thanh de chuyen sinh',s);
      return true;
    }
    if(afkOn()) {exitPowerSave('chuan bi chuyen sinh');return true;}
    syncCombatAuto(s);
    if(rebirth.retries===0 && now-rebirth.startedAt<2300)return true;
    if(!isOnline())return true;
    rebirth.before=n;rebirth.prevLevel=s.level;rebirth.sentAt=now;
    rebirth.retries++;rebirth.phase='sent';
    try {
      const path=dualExecute('rebirth',rebirth.retries,()=>cmd('reset'),uiRebirth);
      if(!path)throw Error('Không có đường chuyển sinh khả dụng');
      rebirth.lastStatus='Đã gửi reset '+rebirth.retries+'/2, chờ nhân vật từ máy chủ';
      diagnostic('REBIRTH','Đã gửi yêu cầu chuyển sinh',{from:n,level:s.level,attempt:rebirth.retries});
      say('☯️ Đã yêu cầu chuyển sinh, chờ xác nhận ('+rebirth.retries+'/2)');
    } catch(e) {
      rebirth.phase='town';rebirth.lastError=String(e?.message||e);
      diagnostic('REBIRTH','Không gửi được reset: '+rebirth.lastError);
    }
    return true;
  }

  // Party invitations use server membership, never leave or fill an existing team.
  const partyNamesPref={mode:'prefer',names:[]};
  const partyNameKey=value=>String(value||'').normalize('NFC').trim();
  function partyNamesSave(mode,text){
    if(!['prefer','only'].includes(mode))throw Error('Chế độ mời không hợp lệ');
    const names=[...new Set(String(text||'').split(/\r?\n/).map(partyNameKey).filter(Boolean))];
    if(names.length>100||names.some(n=>n.length>80))throw Error('Tối đa 100 tên, mỗi tên không quá 80 ký tự');
    localStorage.setItem('auto_s4_party_names_v1',JSON.stringify({mode,names}));
    partyNamesPref.mode=mode;partyNamesPref.names=names;
  }
  function partyNamesOrder(players){
    const priority=new Map(partyNamesPref.names.map((name,index)=>[name,index]));
    return players.filter(x=>partyNamesPref.mode!=='only'||priority.has(partyNameKey(x.n)))
      .map((x,index)=>({x,index,rank:priority.get(partyNameKey(x.n))??Infinity}))
      .sort((a,b)=>a.rank-b.rank||a.index-b.index).map(row=>row.x);
  }
  try{
    const saved=JSON.parse(localStorage.getItem('auto_s4_party_names_v1')||'null');
    if(saved&&['prefer','only'].includes(saved.mode)&&Array.isArray(saved.names)){
      partyNamesPref.mode=saved.mode;partyNamesPref.names=[...new Set(saved.names.slice(0,100).filter(n=>typeof n==='string').map(partyNameKey).filter(Boolean))];
    }
  }catch(_){}

  const partyInvite={identity:'',pending:null,nextAt:0,recent:[],seen:new Map(),attempts:0,joined:0,status:'Chưa kiểm tra',
    location:'',locationAt:0,partyKey:'',away:new Map(),mutation:null,mutationAt:0,mutationTries:0,mutationWindowAt:0,departures:0,kicks:0,lastRx:0,raw:null};
  const partyWorldChat={status:'Thông báo thế giới đang tắt',sent:0};
  function partyWorldAnnounce(target,now=Date.now()){
    if(!cfg.partyWorldChat||!cfg.partyInviteEnabled||!st.running||!isOnline())return false;
    const s=game(),snap=partySnapshot(now);
    if(!s||s.town||!snap.fresh||!snap.leader||snap.members.length<1||snap.members.length>=5||
      st.boss.phase!=='idle'||arenaNow()||['wb','tk','vd'].includes(String(s.zone))||
      (cfg.partyWaitEnabled!==false&&typeof partyWait!=='undefined'&&partyWait.phase!=='done')||
      (typeof partyFollow!=='undefined'&&partyFollow.target))return false;
    const map=typeof W!=='undefined'&&W.zones?.find(z=>String(z.id)===String(s.zone));
    if(!map||!Number.isInteger(Number(R.ch))||Number(R.ch)<1||Number(R.ch)>6)return false;
    let nearby=[];try{nearby=window.vlNear().filter(x=>!snap.members.some(m=>m.n===x.n));}catch(_){}
    if(typeof partyNamesOrder==='function')nearby=partyNamesOrder(nearby);
    const crowded=nearby.length>=3;
    target=target||(!crowded&&nearby.length?{name:nearby[0].n}:null);
    const name=String(crowded||!target?.name?'các cụ đang':target.name).normalize('NFC').replace(/[\x00-\x1f\x7f]/g,' ').trim();
    const self=String(typeof S!=='undefined'?S.name||'':'').replace(/[\x00-\x1f\x7f]/g,' ').trim();
    if(!name||!self)return false;
    const text='[S4-PT] Mời '+name+' ở '+map.n+' | kênh '+R.ch+' | đội '+snap.members.length+'/5 vào PT luyện cấp nào!';
    if(text.length>200){partyWorldChat.status='Tên quá dài; bỏ thông báo thế giới';return false;}
    const key='auto_s4_party_world_v1:'+charIdentity();
    try{
      const old=JSON.parse(localStorage.getItem(key)||'{}');
      const recent=Array.isArray(old.recent)?old.recent.filter(x=>x&&typeof x.name==='string'&&Number.isFinite(x.at)&&now-x.at<300000).slice(-100):[];
      if(Number.isFinite(old.last)&&now-old.last<120000||name!=='các cụ đang'&&recent.some(x=>x.name===name)){
        partyWorldChat.status='Đã mời đội; bỏ chat lặp (2 phút / người cũ 5 phút)';return false;
      }
      let send;
      if(cfg.dualRouteMode!=='ui'&&typeof cmd==='function')send=()=>cmd('say',{m:text,ch:'w'});
      else{
        const form=[...document.querySelectorAll('form.chatin')].find(f=>!['party','guild'].includes(f.dataset.k)&&
          ['world','w',undefined,''].includes(f.dataset.k)&&f.getClientRects().length>0);
        const input=form?.querySelector('.chattxt');
        if(!input||input.value||typeof form.requestSubmit!=='function'){
          partyWorldChat.status='Không có ô chat thế giới trống; bỏ thông báo';return false;
        }
        send=()=>{input.value=text;form.requestSubmit();};
      }
      // Persist before dispatch so reloads and uncertain sends cannot repeat announcements.
      localStorage.setItem(key,JSON.stringify({last:now,recent:[...recent,{name,at:now}]}));
      send();partyWorldChat.sent++;
      partyWorldChat.status='Đã gửi yêu cầu chat thế giới mời '+name+'; game quyết định hiển thị';
      diagnostic('PARTY_WORLD',partyWorldChat.status);return true;
    }catch(e){partyWorldChat.status='Không gửi thông báo: '+String(e.message);return false;}
  }
  const partyFollow={offers:new Map(),target:null,holdUntil:0,blocked:new Map(),status:'Theo tuyển đội đang tắt'};
  function partyFollowReset(){partyFollow.offers.clear();partyFollow.target=null;partyFollow.blocked.clear();}
  function partyFollowObserve(message){
    if(!cfg.partyFollowWorld||!st.running||message?.t!=='say'||!Array.isArray(message.l)||typeof partyNamesPref==='undefined')return;
    const now=Date.now();
    for(const row of message.l.slice(-100)){
      if(!row||row.p||row.gd||row.to||row.sys||row.loa)continue;
      const name=String(row.n||'').normalize('NFC').trim();
      if(name===S.name||!partyNamesPref.names.includes(name))continue;
      const at=Number(row.at)>1e11?Number(row.at):Number(row.at)*1000;
      if(!Number.isFinite(at)||now-at>45000||at>now+5000)continue;
      const match=/^\[S4-PT\] Mời .+ ở (.+) \| kênh ([1-6]) \| đội ([1-4])\/5 vào PT luyện cấp nào!$/.exec(String(row.m||''));
      if(!match)continue;
      const zone=typeof W!=='undefined'&&Array.isArray(W.zones)?W.zones.find(z=>z.n===match[1]):null;
      if(!zone||['53','wb','tk','vd'].includes(String(zone.id)))continue;
      const old=partyFollow.offers.get(name);
      if(old&&at<=old.serverAt)continue;
      partyFollow.offers.set(name,{name,zone:String(zone.id),ch:Number(match[2]),size:Number(match[3]),at:now,serverAt:at});
    }
    for(const [name,offer] of partyFollow.offers)if(now-offer.at>180000||!partyNamesPref.names.includes(name))partyFollow.offers.delete(name);
  }
  function partyFollowSafe(s){
    return cfg.partyFollowWorld&&cfg.partyInviteEnabled&&st.running&&st.questActive&&isOnline()&&
      s&&!s.town&&typeof R!=='undefined'&&R.ready&&!R.deadT&&!['53','wb','tk','vd'].includes(String(s.zone))&&
      st.boss.phase==='idle'&&!arenaNow()&&(typeof rebirth==='undefined'||rebirth.phase==='idle');
  }
  function partyFollowCancel(reason,now){
    if(partyFollow.target)partyFollow.blocked.set(partyFollow.target.name,now+300000);
    partyFollow.target=null;partyFollow.status=reason;
  }
  function partyFollowPlan(s,now=Date.now()){
    if(!partyFollowSafe(s)){partyFollow.target=null;return null;}
    const snap=partySnapshot(now);if(!snap.fresh)return null;
    const target=partyFollow.target;
    if(target){
      if(snap.others.some(m=>m.n===target.name)){
        partyFollow.holdUntil=now+300000;partyFollow.target=null;partyFollow.status='Đã vào đội cùng người tuyển · giữ đội ít nhất 5 phút';
        try{localStorage.setItem('auto_s4_party_follow_hold:'+charIdentity(),String(partyFollow.holdUntil));}catch(_){}
        return null;
      }
      if(target.zone!==String(s.zone)||typeof partyNamesPref==='undefined'||!partyNamesPref.names.includes(target.name)||
        now-target.started>180000||target.arrived&&now-target.arrived>=120000){partyFollowCancel('Hủy tập hợp: đổi map, hết hạn hoặc quá 2 phút chờ',now);return null;}
      // A fresh later announcement may update count only; do not chase a moving recruiter.
      const update=partyFollow.offers.get(target.name);
      if(update&&update.serverAt>target.serverAt){
        if(update.zone!==target.zone||update.ch!==target.ch){partyFollowCancel('Người tuyển đổi vị trí; tiếp tục cấu hình thường',now);return null;}
        Object.assign(target,{at:update.at,serverAt:update.serverAt,size:update.size});
      }
      if(snap.membership==='grouped'&&snap.members.length>=target.size){partyFollowCancel('Đội hiện tại không ít hơn đội tuyển',now);return null;}
      return target;
    }
    if(st.action||st.map.requested||st.channel.pending||rewardNet.active||sellFlow.sentAt)return null;
    try{partyFollow.holdUntil=Math.max(partyFollow.holdUntil,Number(localStorage.getItem('auto_s4_party_follow_hold:'+charIdentity()))||0);}catch(_){}
    if(now<partyFollow.holdUntil)return null;
    const count=snap.membership==='none'?0:snap.members.length;
    const offers=[...partyFollow.offers.values()].filter(o=>o.zone===String(s.zone)&&now-o.at<=45000&&o.size>count&&o.size<5&&
      now>=(partyFollow.blocked.get(o.name)||0)&&!snap.members.some(m=>m.n===o.name));
    offers.sort((a,b)=>b.size-a.size||partyNamesPref.names.indexOf(a.name)-partyNamesPref.names.indexOf(b.name));
    const choice=offers.find(o=>channelCounts().some(ch=>ch.id===o.ch&&(ch.count<CHANNEL_CAP||Number(R.ch)===o.ch)));
    if(!choice)return null;
    partyFollow.target={...choice,started:now,arrived:0,acceptAt:0};partyFollow.status='Tập hợp cùng map: theo '+choice.name+' · kênh '+choice.ch;
    return partyFollow.target;
  }
  function partyFollowChannel(s,list){
    const target=partyFollowPlan(s);if(!target)return null;
    const channel=list.find(c=>c.id===target.ch);
    if(!channel||channel.count>=CHANNEL_CAP&&Number(R.ch)!==target.ch){partyFollowCancel('Kênh tuyển đã đầy',Date.now());return null;}
    return {id:target.ch,party:true,label:'Theo tuyển đội '+target.name+' · '+target.size+'/5 · kênh '+target.ch,ranking:list};
  }
  function partyFollowCanLeave(s,snap,now){
    const t=partyFollow.target;
    if(!partyFollowSafe(s)||!t||t.zone!==String(s.zone)||Number(R.ch)!==t.ch||now-t.at>45000||
      snap.members.length>=t.size||!snap.fresh)return false;
    let near=[];try{near=window.vlNear();}catch(_){}
    return near.some(x=>x.n===t.name);
  }
  function partyFollowTick(s,snap,now){
    const target=partyFollowPlan(s,now);if(!target)return false;
    if(!target.arrived)target.arrived=now;
    partyInvite.status=partyFollow.status='Chờ vào đội '+target.name+' · kênh '+target.ch;
    if(snap.membership==='grouped'){
      if(partyFollowCanLeave(s,snap,now))partySendMutation('leave',0,snap,now,s);
      return true;
    }
    const invitation=partyWait.incoming;
    if(invitation&&invitation.from===target.name&&now-invitation.at<20000&&!target.acceptAt){
      const box=document.getElementById('vlPtInv'),button=document.getElementById('vlPtY');
      if(box&&button&&box.textContent.includes('Mời vào tổ đội')&&
        String(box.querySelector('p .n')?.textContent||'').normalize('NFC').trim()===target.name&&clickGame(button)){
        target.acceptAt=now;partyWait.incoming=null;partyInvite.status='Đã nhận lời mời '+target.name+' · chờ máy chủ';
      }
    }
    return true;
  }

  const partyWait={key:'',phase:'new',until:0,incoming:null};
  function resetPartyWait(){if(typeof partyFollowReset==='function')partyFollowReset();Object.assign(partyWait,{key:'',phase:'new',until:0,incoming:null});}
  function partyObserve(m){
    if(m?.t==='party')partyInvite.lastRx=Date.now();
    if(['pinv','dui','frinv','gdinv'].includes(m?.t))
      partyWait.incoming=m.t==='pinv'?{from:String(m.from||'').normalize('NFC').trim(),at:Date.now()}:null;
  }
  function partyWaitTick(s,snap,now){
    if(cfg.partyWaitEnabled===false)return false;
    const key=charIdentity()+'|'+String(s.zone);
    if(partyWait.key!==key)Object.assign(partyWait,{key,phase:'new',until:0,incoming:null});
    if(snap.membership==='grouped'&&snap.others.length){partyWait.phase='done';partyWait.incoming=null;return false;}
    if(partyWait.phase==='done')return false;
    if(snap.membership==='grouped'){
      if(snap.members.length!==1||!snap.me||!snap.leader)return true;
      partyWait.phase='leave';
      partySendMutation('leave',0,snap,now,s);
      partyInvite.status='Đội chỉ có mình · chờ máy chủ xác nhận rời đội trước khi chờ lời mời';return true;
    }
    if(snap.membership!=='none')return true;
    if(partyWait.phase==='new'||partyWait.phase==='leave'){
      partyWait.phase='waiting';partyWait.until=now+300000;partyInvite.pending=null;
    }
    const invitation=partyWait.incoming;
    if(invitation&&now-invitation.at<20000){
      const allowed=typeof partyNamesPref==='undefined'||partyNamesPref.mode!=='only'||partyNamesPref.names.includes(invitation.from);
      const box=document.getElementById('vlPtInv'),button=document.getElementById('vlPtY');
      if(allowed&&box&&button&&box.textContent.includes('Mời vào tổ đội')&&
        String(box.querySelector('p .n')?.textContent||'').normalize('NFC').trim()===invitation.from){
        if(clickGame(button)){
          partyWait.incoming=null;partyWait.phase='accepting';partyWait.ackUntil=now+15000;
          partyInvite.status='Đã nhận lời mời từ '+invitation.from+' · chờ máy chủ';return true;
        }
      }
    }
    if(partyWait.phase==='accepting'&&now<partyWait.ackUntil){partyInvite.status='Chờ máy chủ xác nhận vào đội';return true;}
    if(partyWait.phase==='accepting')partyWait.phase='waiting';
    if(now<partyWait.until){
      partyInvite.status=partyWait.phase==='accepting'?'Chờ máy chủ xác nhận vào đội':
        'Chờ lời mời tổ đội · còn '+Math.ceil((partyWait.until-now)/1000)+' giây / 300';return true;
    }
    partyWait.phase='done';partyInvite.nextAt=now;
    partyInvite.status='Hết 5 phút chờ · bắt đầu tự mời lập đội';return false;
  }
  function partyMembership(){
    if(typeof R==='undefined')return 'unknown';
    if(R.party!==undefined&&R.party!==null)return 'grouped';
    if(!R.ready)return 'unknown';
    if(R.party===null)return 'none';
    const label=document.getElementById('vlParty')?.textContent||'';
    return /^\s*👥\s*Mời tổ đội(?:\s*·\s*\d+\s*người gần)?\s*$/.test(label)?'none':'unknown';
  }
  function partySnapshot(now=Date.now()){
    const membership=partyMembership(),p=typeof R!=='undefined'?R.party:null;
    if(p&&p!==partyInvite.raw){partyInvite.raw=p;partyInvite.lastRx=now;}
    const members=Array.isArray(p?.m)?p.m:[],me=members.find(m=>m.n===S.name);
    return {membership,p,members,me,others:members.filter(m=>m.n!==S.name),
      leader:!!me&&String(me.acc)===String(p?.lead),fresh:membership==='none'||(!!p&&!!me&&members.length<=5&&Number.isSafeInteger(Number(p.id))&&Number(p.id)>0&&now-partyInvite.lastRx<=15000),
      key:p?String(p.id)+'|'+String(p.lead)+'|'+String(me?.acc||''):''};
  }
  function partyMemberRoom(m){
    const rk=/^([^|]+)\|([1-6])$/.exec(String(m?.rk||''));
    let zone=rk?rk[1]:null,ch=Number(m?.ch);
    if(!Number.isInteger(ch)||ch<1||ch>6)ch=rk?Number(rk[2]):null;
    if(rk&&ch!==Number(rk[2]))return {zone:null,ch:null};
    if(!zone&&m?.z){
      try{const z=typeof ZONES!=='undefined'?ZONES.find(x=>x.n===m.z):null;if(z)zone=String(z.id);}catch(_){}
    }
    return {zone,ch};
  }
  function partyChannelChoice(s,list=channelCounts()){
    const follow=typeof partyFollowChannel==='function'?partyFollowChannel(s,list):null;if(follow)return follow;
    if(!cfg.partyInviteEnabled||!cfg.partyPreferChannel||!st.running||!st.questActive||!s||s.town||String(s.zone)==='tk'||arenaNow())return null;
    const snap=partySnapshot();if(!snap.fresh||snap.members.length<4||snap.members.length>5)return null;
    const groups=new Map();
    for(const m of snap.others){const room=partyMemberRoom(m);if(room.zone!==String(s.zone)||!room.ch)continue;
      const available=list.find(c=>c.id===room.ch);if(!available||(available.count>=CHANNEL_CAP&&Number(R.ch)!==room.ch))continue;
      const g=groups.get(room.ch)||{id:room.ch,count:0,lead:false};g.count++;g.lead=g.lead||String(m.acc)===String(snap.p.lead);groups.set(room.ch,g);
    }
    const group=[...groups.values()].sort((a,b)=>b.count-a.count||Number(b.lead)-Number(a.lead)||Number(b.id===Number(R.ch))-Number(a.id===Number(R.ch))||a.id-b.id)[0];
    return group?{id:group.id,party:true,label:'Ưu tiên đội '+snap.members.length+'/5: kênh '+group.id+' ('+group.count+' đồng đội cùng map)',ranking:list}:null;
  }
  function partyCanInvite(snap=partySnapshot()){
    return snap.membership==='none'||(snap.membership==='grouped'&&snap.fresh&&snap.leader&&snap.members.length>0&&snap.members.length<5);
  }
  function partyCanInviteId(id){const snap=partySnapshot();return partyCanInvite(snap)&&!snap.members.some(m=>Number(m.uid)===id);}
  function partyInviteUI(id){
    if(typeof panelOpen!=='function'||!partyCanInviteId(id))return false;
    panelOpen('team');
    try{
      if(!partyCanInviteId(id))return false;
      return clickGame([...document.querySelectorAll('#mBody [data-ni]')].find(x=>Number(x.dataset.ni)===id&&!x.disabled));
    }finally{if(typeof closeModal==='function')closeModal();}
  }
  function partyMutationAllowed(type,acc,key,s,now){
    const snap=partySnapshot(now);
    if(!snap.fresh||snap.key!==key||!partySettled(s,now)||!cfg.partyInviteEnabled||!st.running||!st.questActive||!isOnline()||!R.ready||R.deadT>0||s.town||st.action||st.boss.phase!=='idle'||rewardNet.active||sellFlow.sentAt)return false;
    if(type==='leave'&&typeof partyFollowCanLeave==='function'&&partyFollowCanLeave(s,snap,now))return true;
    if(type==='leave'&&cfg.partyWaitEnabled!==false&&partyWait.phase==='leave'&&snap.members.length===1&&snap.me&&snap.leader)return true;
    if(type==='leave')return cfg.partyLeaveOtherMap&&snap.others.length>0&&snap.others.every(m=>{const room=partyMemberRoom(m);return room.zone&&room.zone!==String(s.zone);});
    const member=snap.others.find(m=>Number(m.acc)===acc),room=partyMemberRoom(member),away=partyInvite.away.get(String(acc));
    return cfg.partyKickAway&&snap.leader&&!!member&&!!room.ch&&room.ch!==Number(R.ch)&&!!away&&now-away.since>=300000;
  }
  function partyMutationUI(type,acc,key,s,now){
    if(typeof panelOpen!=='function')return false;
    panelOpen('team');
    try{
      const snap=partySnapshot();if(!partyMutationAllowed(type,acc,key,s,now))return false;
      if(type==='leave')return clickGame(document.getElementById('pLeave'));
      if(!snap.leader||!snap.others.some(m=>Number(m.acc)===acc))return false;
      return clickGame([...document.querySelectorAll('#mBody [data-kick]')].find(b=>Number(b.dataset.kick)===acc&&!b.disabled));
    }finally{if(typeof closeModal==='function')closeModal();}
  }
  function partySettled(s,now){
    const c=st.channel,choice=partyChannelChoice(s);
    const policy=choice?'party:'+choice.id:'configured:'+cfg.channelMode;
    return c.policy===policy&&String(R.vlZone)===String(s.zone)&&c.key===s.zone&&c.done&&!c.pending&&!st.map.requested&&Number.isInteger(c.selectedId)&&Number(R.ch)===c.selectedId&&
      (!choice||choice.id===Number(R.ch))&&now-partyInvite.locationAt>=8000;
  }
  function partySendMutation(type,acc,snap,now,s){
    if(!partyMutationAllowed(type,acc,snap.key,s,now)||visible(document.getElementById('modal')))return false;
    if(now-partyInvite.mutationWindowAt>=600000){partyInvite.mutationWindowAt=now;partyInvite.mutationTries=0;}
    if(now-partyInvite.mutationAt<60000||partyInvite.mutationTries>=3)return false;
    const ui=cfg.dualRouteMode==='ui'||(cfg.dualRouteMode==='auto'&&partyInvite.mutationTries%2===1);
    let sent=false,route=ui?'ui':'command';
    try{
      if(ui)sent=partyMutationUI(type,acc,snap.key,s,now);
      else if(typeof cmd==='function'){cmd(type==='leave'?'pleave':'pkick',type==='leave'?{}:{acc});sent=true;}
      if(!sent&&cfg.dualRouteMode==='auto'){
        if(ui&&typeof cmd==='function'){cmd(type==='leave'?'pleave':'pkick',type==='leave'?{}:{acc});sent=true;route='command';}
        else{sent=partyMutationUI(type,acc,snap.key,s,now);route='ui';}
      }
    }catch(e){diagnostic('PARTY','Lỗi quản lý đội',{error:String(e.message)});}
    partyInvite.mutationAt=now;partyInvite.mutationTries++;
    if(!sent){partyInvite.status='Không có đường '+(type==='leave'?'rời đội':'mời ra')+' khả dụng';return false;}
    partyInvite.pending=null;partyInvite.mutation={type,acc,key:snap.key,at:now,route};
    partyInvite.status=type==='leave'?'Đã yêu cầu rời đội · chờ máy chủ':'Đã yêu cầu mời ra thành viên khác kênh quá 5 phút · chờ máy chủ';
    diagnostic('PARTY',partyInvite.status,{acc,route});return true;
  }
  function partyInviteTick(s,now=Date.now()){
    const identity=charIdentity();
    if(partyInvite.identity!==identity){Object.assign(partyInvite,{identity,pending:null,nextAt:now+5000,recent:[],seen:new Map(),attempts:0,joined:0,
      location:'',locationAt:now,partyKey:'',away:new Map(),mutation:null,mutationAt:0,mutationTries:0,mutationWindowAt:0,departures:0,kicks:0,lastRx:0,raw:null});}
    const snap=partySnapshot(now),location=String(s?.zone)+'|'+String(typeof R!=='undefined'?R.ch:'');
    if(partyInvite.location!==location||partyInvite.partyKey!==snap.key){
      partyInvite.location=location;partyInvite.locationAt=now;partyInvite.partyKey=snap.key;partyInvite.away.clear();
    }
    if(partyInvite.mutation){const m=partyInvite.mutation;
      if((m.type==='leave'&&snap.membership==='none')||(m.type==='kick'&&snap.fresh&&(snap.membership==='none'||(snap.key===m.key&&!snap.members.some(x=>Number(x.acc)===m.acc))))){
        if(m.type==='leave')partyInvite.departures++;else partyInvite.kicks++;
        diagnostic('PARTY_ACK','Máy chủ xác nhận '+(m.type==='leave'?'rời đội':'thành viên đã ra khỏi đội'),{type:m.type,acc:m.acc,key:m.key,membership:snap.membership});
        partyInvite.mutation=null;partyInvite.mutationTries=0;partyInvite.away.clear();partyInvite.nextAt=now+5000;
      }else if(now-m.at<15000)return false;
      else{partyInvite.mutation=null;partyInvite.status='Chưa có xác nhận đổi đội; chờ tối thiểu 60 giây';return false;}
    }
    if(snap.membership==='unknown'||!snap.fresh){partyInvite.away.clear();partyInvite.status='Chờ dữ liệu đội mới từ máy chủ';return false;}
    const safe=cfg.partyInviteEnabled&&st.running&&st.questActive&&identity&&isOnline()&&typeof R!=='undefined'&&R.ready&&s&&(cfg.daTauPaused||(typeof nativeQuest!=='undefined'&&nativeQuest.active)||(s.took&&s.need>0&&s.have<s.need))&&!s.town&&
      !arenaNow()&&String(s.zone)!=='tk'&&st.boss.phase==='idle'&&!st.action&&!st.map.requested&&!st.channel.pending&&!rewardNet.active&&!sellFlow.sentAt&&!(R.deadT>0);
    if(!safe){partyInvite.away.clear();return false;}
    if(!partySettled(s,now)){partyInvite.away.clear();partyInvite.status='Chờ đến đúng kênh đã chọn rồi mới xét đội';return false;}
    if(typeof partyFollowTick==='function'&&partyFollowTick(s,snap,now))return false;
    if(partyWaitTick(s,snap,now))return false;
    if(snap.membership==='grouped'){
      const rooms=snap.others.map(m=>partyMemberRoom(m));
      if(cfg.partyLeaveOtherMap&&rooms.length&&rooms.every(r=>r.zone&&r.zone!==String(s.zone))){
        return partySendMutation('leave',0,snap,now,s);
      }
      if(cfg.partyKickAway&&snap.leader){
        const present=new Set(snap.others.map(m=>String(m.acc)));
        for(const key of partyInvite.away.keys())if(!present.has(key))partyInvite.away.delete(key);
        for(const member of snap.others){const room=partyMemberRoom(member),key=String(member.acc);
          if(!room.ch||room.ch===Number(R.ch)){partyInvite.away.delete(key);continue;}
          if(!partyInvite.away.has(key))partyInvite.away.set(key,{since:now,ch:room.ch});
          // Different foreign channels still count as continuous absence from OUR channel.
          if(now-partyInvite.away.get(key).since>=300000&&Number.isSafeInteger(Number(member.acc))&&Number(member.acc)>0){
            if(visible(document.getElementById('modal')))return false;
            return partySendMutation('kick',Number(member.acc),snap,now,s);
          }
        }
      }else partyInvite.away.clear();
      if(partyInvite.pending&&snap.members.some(m=>Number(m.uid)===partyInvite.pending.id||m.n===partyInvite.pending.name)){
        partyInvite.joined++;partyInvite.pending=null;partyInvite.nextAt=Math.min(partyInvite.nextAt,now+5000);
      }
      if(snap.members.length>=5){partyInvite.pending=null;partyInvite.status='Đội đủ 5/5 · giữ đội';return false;}
      if(!snap.leader){partyInvite.pending=null;partyInvite.status='Đang có đội · chỉ đội trưởng có quyền mời/mời ra';return false;}
    }
    partyWorldAnnounce(null,now);
    if(partyInvite.pending){
      if(now-partyInvite.pending.at<20000){partyInvite.status='Đã gửi lời mời · chờ đồng ý để mời tiếp';return false;}
      partyInvite.pending=null;
    }
    if(now<partyInvite.nextAt)return false;
    partyInvite.recent=partyInvite.recent.filter(at=>now-at<600000);
    for(const [id,at] of partyInvite.seen)if(now-at>=120000)partyInvite.seen.delete(id);
    if(partyInvite.recent.length>=12){partyInvite.status='Đã mời 12 lượt/10 phút · tạm nghỉ chống gửi dồn';return false;}
    if(visible(document.getElementById('modal')))return false;
    let nearby;try{nearby=typeof window.vlNear==='function'?window.vlNear():[];}catch(_){nearby=[];}
    const candidates=typeof partyNamesOrder==='function'?partyNamesOrder(nearby):nearby;
    const target=candidates.find(x=>Number.isSafeInteger(Number(x.id))&&Number(x.id)>0&&x.n&&x.n!==S.name&&
      !snap.members.some(m=>m.n===x.n||Number(m.uid)===Number(x.id))&&!partyInvite.seen.has(Number(x.id)));
    partyInvite.nextAt=now+20000;
    if(!target){partyInvite.status='Đội '+(snap.members.length||1)+'/5 · '+(typeof partyNamesPref!=='undefined'&&partyNamesPref.mode==='only'?'chưa thấy người hợp lệ trong danh sách':'chưa có người phù hợp ở gần');return false;}
    const id=Number(target.id),preferUI=cfg.dualRouteMode==='ui'||(cfg.dualRouteMode==='auto'&&partyInvite.attempts%2===1);
    let sent=false,route='';
    try{
      if(preferUI){sent=partyInviteUI(id);route='ui';}
      else if(typeof cmd==='function'&&partyCanInviteId(id)){cmd('pinv',{id});sent=true;route='command';}
      if(!sent&&cfg.dualRouteMode==='auto'&&partyCanInviteId(id)){
        if(preferUI&&typeof cmd==='function'){cmd('pinv',{id});sent=true;route='command';}else{sent=partyInviteUI(id);route='ui';}
      }
    }catch(e){diagnostic('PARTY','Lỗi gửi lời mời',{error:String(e.message)});}
    if(!sent){partyInvite.status='Không gửi được lời mời qua lệnh/giao diện';return false;}
    partyInvite.pending={id,name:target.n,at:now,route};partyInvite.seen.set(id,now);partyInvite.recent.push(now);partyInvite.attempts++;
    partyWorldAnnounce({name:target.n,id},now);
    partyInvite.status='Đã mời '+target.n+' ('+route+') · tiếp tục đến khi đủ 5';
    diagnostic('PARTY',partyInvite.status,{id});return true;
  }

  const fieldSafety={
    identity:'', portal:null, exp:null, rotation:null, avoided:new Map(),
    kite:{key:'',hp:[],lastMove:0,lastCast:0,lastTarget:0,jumpUntil:0,input:null,active:false},
    command:null, originalCommand:null,
  };
  const LOW_EXP_TOWN='EXP mỗi quái chỉ 0–1: về Ba Lăng để đổi bãi';

  const fieldKitePref={identity:null,enabled:true};
  const fieldKitePrefKey=identity=>'auto_s4_field_kite:'+identity;
  function fieldKiteEnabled(){
    const identity=charIdentity();
    if(identity!==fieldKitePref.identity){
      fieldKitePref.identity=identity;fieldKitePref.enabled=true;
      try{
        if(identity)fieldKitePref.enabled=localStorage.getItem(fieldKitePrefKey(identity))!=='0';
      }catch(_){}
    }
    return fieldKitePref.enabled;
  }
  function setFieldKiteEnabled(enabled){
    fieldKiteEnabled();
    const {identity}=fieldKitePref;
    if(!identity)return false;
    fieldKitePref.enabled=enabled;
    try{localStorage.setItem(fieldKitePrefKey(identity),enabled?'1':'0');}
    catch(e){diagnostic('FIELD_KITE','Không lưu được tùy chọn né quái: '+e.message);}
    if(!enabled)clearFieldKite();
    return true;
  }

  function clearFieldKite(){
    const kite=fieldSafety.kite;
    if(typeof INPUT!=='undefined'&&kite.input&&INPUT.target===kite.input)INPUT.target=null;
    Object.assign(kite,{key:'',hp:[],lastMove:0,lastCast:0,lastTarget:0,jumpUntil:0,input:null,active:false});
  }
  function resetFieldSafety(){
    clearFieldKite();
    Object.assign(fieldSafety,{identity:'',portal:null,exp:null,rotation:null});
    fieldSafety.avoided.clear();
  }
  function fieldSafetyInstall(){
    if(typeof cmd!=='function'||cmd===fieldSafety.command)return;
    const original=cmd;
    const wrapped=function(type,args){
      const result=original.apply(this,arguments);
      if(type==='town'&&Number(args?.go)===1&&st.running&&!townFlow.request&&isOnline()){
        const s=game(),hero=fieldHero();
        if(s?.zone&&!s.town&&!arenaNow()&&!tongKimOccupied()&&hero&&!hero.dead2&&hero.hp>0){
          fieldSafety.portal={identity:charIdentity(),origin:s.zone,at:Date.now(),arrived:0,
            tries:0,lastSend:0};
        }
      }
      return result;
    };
    try{cmd=wrapped;fieldSafety.command=wrapped;fieldSafety.originalCommand=original;}catch(_){}
  }
  function fieldSafetyUninstall(){
    try{if(cmd===fieldSafety.command)cmd=fieldSafety.originalCommand;}catch(_){}
    fieldSafety.command=null;fieldSafety.originalCommand=null;
  }
  function fieldHero(){
    return typeof VL!=='undefined'?VL.ents?.get?.(VL.meU):null;
  }
  function fieldVitals(hero){
    const maxHp=Number(hero?.mhp??hero?.max??R.SP?.mhp);
    const maxMp=Number(hero?.mmp??R.SP?.mmp);
    if(!hero||hero.dead2||!(maxHp>0)||!(maxMp>=0)||!Number.isFinite(hero.hp)||!Number.isFinite(hero.mp))return null;
    return {hp:hero.hp,mp:hero.mp,maxHp,maxMp};
  }
  function uiBackToField(){
    if(typeof vlXaPhu!=='function')return false;
    vlXaPhu();
    return clickGame(document.getElementById('xpBack'));
  }
  function portalRecoveryTick(s,now){
    const p=fieldSafety.portal;
    if(!p)return false;
    if(st.questActive&&!cfg.daTauPaused&&questEligible(s)&&!questRebornBlocked(s)&&
       (!s.took||(s.need>0&&s.have>=s.need))){
      diagnostic('PORTAL_QUEST','Ưu tiên gặp Dã Tẩu; hủy tự Về chỗ cũ',{step:s.step});
      fieldSafety.portal=null;return false;
    }
    if(p.identity!==charIdentity()||(!s.town&&(p.arrived||now-p.at>25000||s.zone!==p.origin||fieldHero()?.dead2))){
      if(p.arrived&&!s.town)diagnostic('PORTAL_BACK','Máy chủ đã xác nhận rời Ba Lăng',{expected:p.origin,actual:s.zone});
      fieldSafety.portal=null;return false;
    }
    if(!s.town)return true;
    if(!p.arrived){
      p.arrived=now;st.action='';st.map.requested=null;st.recoveryAt=0;
      clearTownRecovery();clearBossApproach('Hồi phục sau khi dùng Thổ Địa Phù');
      ensureChannelSelection(s);
    }
    gameZoneAutoGuard();syncCombatAuto(s,true);
    const v=fieldVitals(fieldHero());
    if(!v||v.hp<v.maxHp||v.mp<v.maxMp){
      st.status=v?'Thổ Địa Phù: chờ đầy máu '+v.hp+'/'+v.maxHp+' và mana '+v.mp+'/'+v.maxMp:
        'Thổ Địa Phù: chờ máy chủ cập nhật máu và mana';
      return true;
    }
    if(p.lastSend&&now-p.lastSend<12000)return true;
    if(p.tries>=3){
      diagnostic('PORTAL_BACK','Xa Phu chưa xác nhận sau 3 lần; dùng luồng rời thành thông thường');
      fieldSafety.portal=null;return false;
    }
    p.tries++;p.lastSend=now;
    const path=dualExecute('townBack',p.tries,()=>cmd('town',{go:0}),uiBackToField);
    st.status='Đã đầy máu và mana · '+(path?'chờ xác nhận Về chỗ cũ':'chưa mở được Về chỗ cũ');
    diagnostic('PORTAL_BACK',st.status,{origin:p.origin,try:p.tries,path});
    return true;
  }
  function fieldMapAvoided(id,s){
    const mark=fieldSafety.avoided.get(String(id));
    return !!mark&&mark.level===s.level&&mark.until>Date.now();
  }
  function lowExpObserved(s,now){
    const hero=fieldHero(),kills=Number(S.kills??NaN),xp=Number(S.xp??S.exp??NaN);
    if(s.town||!st.questActive||hero?.dead2||R.deadT>0||st.channel.pending||st.action||
       !Number.isFinite(kills)||!Number.isFinite(xp)){
      fieldSafety.exp=null;return false;
    }
    const key=[s.zone,R.ch,s.level,s.reborns].join('|'),prev=fieldSafety.exp;
    if(!prev||prev.key!==key||kills<prev.kills||xp<prev.xp){
      fieldSafety.exp={key,kills,xp,since:now,lowKills:0,lowXp:0};return false;
    }
    const gainedKills=kills-prev.kills,gainedXp=xp-prev.xp;
    prev.kills=kills;prev.xp=xp;
    if(!gainedKills){
      // A late EXP update belongs to the kills already sampled.
      if(prev.lowKills)prev.lowXp+=gainedXp;
    }else{
      if(!prev.lowKills)prev.since=now;
      prev.lowKills+=gainedKills;prev.lowXp+=gainedXp;
    }
    if(prev.lowXp>prev.lowKills){prev.lowKills=0;prev.lowXp=0;return false;}
    return prev.lowKills>=5&&now-prev.since>=15000;
  }
  function lowExpRotationTick(s,now,nativeMode){
    const move=fieldSafety.rotation;
    if(move){
      if(!s.town&&s.zone!==move.from){
        fieldSafety.rotation=null;fieldSafety.exp=null;
        st.action='';st.map.requested=null;
        diagnostic('LOW_EXP','Máy chủ xác nhận đã đổi bãi',{from:move.from,to:s.zone});return false;
      }
      if(now-move.at>90000||(st.softUntil&&now<st.softUntil)){
        fieldSafety.rotation=null;fieldSafety.exp=null;
        if(st.map.requested?.id===move.target.id){st.action='';st.map.requested=null;}
        if(townFlow.request?.label===LOW_EXP_TOWN)townFlow.request=null;
        return false;
      }
      gameZoneAutoGuard();
      if(!s.town){safeGoTown(LOW_EXP_TOWN,s);return true;}
      syncCombatAuto(s,true);
      if(st.action&&st.map.requested?.id===move.target.id&&now-st.map.requested.at<ZONE_RETRY_MS)return true;
      if(move.sentAt&&now-move.sentAt<ZONE_RETRY_MS)return true;
      if(!st.map.requested&&move.sentAt)st.action='';
      move.sentAt=now;
      changeZone(move.target,s);return true;
    }
    if(townFlow.request||st.map.requested||now<st.softUntil||!lowExpObserved(s,now))return false;
    if(now<(fieldSafety.exp.nextCheck||0))return false;
    fieldSafety.exp.nextCheck=now+60000;
    // A named Dã Tẩu map still needs that exact map. In free training use the normal level picker.
    const unfinished=s.took&&s.need>0&&s.have<s.need&&!cfg.daTauPaused;
    if(unfinished&&questPlace(s.text)){
      diagnostic('LOW_EXP','EXP thấp nhưng Dã Tẩu yêu cầu đúng bãi',{zone:s.zone});return false;
    }
    const training=!unfinished||nativeMode&&nativeMode!=='inherited';
    const candidate=pickZone(training?{...s,took:false}:s,training?'loot':questKind(s.text),s.zone).z;
    if(!candidate||candidate.id===s.zone){
      diagnostic('LOW_EXP','EXP thấp nhưng chưa có bãi thay thế phù hợp',{zone:s.zone});return false;
    }
    fieldSafety.avoided.set(s.zone,{level:s.level,until:now+600000});
    fieldSafety.rotation={from:s.zone,target:candidate,at:now,sentAt:0};
    clearBossApproach('Đổi bãi do EXP thấp');clearFieldKite();
    gameZoneAutoGuard();safeGoTown(LOW_EXP_TOWN,s);
    diagnostic('LOW_EXP',LOW_EXP_TOWN,{from:s.zone,to:candidate.id});
    return true;
  }
  function kiteRetreatPoint(me,near,threat,profile,unit,jumpTiles=0){
    if(typeof WORLD==='undefined'||!(WORLD.w>0&&WORLD.h>0))return null;
    const angle=Math.atan2(me.y-threat.y,me.x-threat.x);
    const before=near[0].distance, distance=threat.distance;
    const runLength=profile?.ranged?Math.max(3.5,Math.min(8,profile.stand-distance)):6;
    const lengths=jumpTiles?[jumpTiles]:[runLength,3,1.8];
    let best=null,bestScore=-Infinity;
    for(const length of lengths){
      for(let i=0;i<16;i++){
        const heading=angle+i*Math.PI/8;
        const dx=Math.cos(heading)*length,dy=Math.sin(heading)*length;
        const x=me.x+dx,y=me.y+dy;
        if(x<1||y<1||x>WORLD.w/unit-1||y>WORLD.h/unit-1)continue;
        if(jumpTiles&&typeof clampWorld==='function'){
          const [safeX,safeY]=clampWorld(x*unit,y*unit);
          if(Math.hypot(safeX-x*unit,safeY-y*unit)>1)continue;
        }
        const gap=Math.min(...near.map(e=>Math.hypot(x-e.x,y-e.y)));
        const targetGap=Math.hypot(x-threat.x,y-threat.y);
        if(gap<Math.max(2.4,before+0.6)||targetGap<distance+0.5)continue;
        if(!jumpTiles&&near.some(e=>{
          const progress=Math.max(0,Math.min(1,((e.x-me.x)*dx+(e.y-me.y)*dy)/(length*length)));
          return Math.hypot(me.x+dx*progress-e.x,me.y+dy*progress-e.y)+0.001<Math.min(2.4,e.distance);
        }))continue;
        if(typeof obsWalk==='function'&&!obsWalk(x*unit,y*unit))continue;
        if(typeof obsLine==='function'&&!obsLine(me.x*unit,me.y*unit,x*unit,y*unit))continue;
        const outOfRange=!jumpTiles&&profile?.ranged?Math.max(0,targetGap-profile.hold):0;
        // Prefer a clear landing, then keep a target in range when safety permits.
        const score=(gap>=4?20:0)+Math.min(8,gap)-Math.min(4,outOfRange);
        if(score>bestScore){best={x,y};bestScore=score;}
      }
    }
    return best;
  }
  function fieldKiteTick(s,now){
    if(!fieldKiteEnabled()){
      if(fieldSafety.kite.key||fieldSafety.kite.input)clearFieldKite();
      return false;
    }
    const hero=fieldHero(),v=fieldVitals(hero),me=bossMapPoint(hero),kite=fieldSafety.kite;
    if(s.town||!me||!v||v.hp<=0||st.action||townFlow.request||st.channel.pending){
      clearFieldKite();return false;
    }
    const key=[s.zone,R.ch].join('|');
    if(kite.key!==key){clearFieldKite();kite.key=key;}
    const previous=kite.hp.at(-1);
    kite.hp=kite.hp.filter(row=>now-row.at<=8000);
    if(previous&&now-previous.at<=4000&&previous.max===v.maxHp&&previous.hp>v.hp)
      kite.hp.push({at:now,drop:previous.hp-v.hp,max:v.maxHp,hp:v.hp});
    else kite.hp.push({at:now,drop:0,max:v.maxHp,hp:v.hp});
    const hits=kite.hp.filter(row=>row.drop>0&&row.max===v.maxHp);
    const unit=typeof U_==='number'&&U_>0?U_:32;
    const nearby=(R.enemies||[]).filter(e=>!e.dead&&!e.dead2&&e.hp>0).map(e=>{
      const p=bossMapPoint(e);return p?{...p,e,distance:Math.hypot(p.x-me.x,p.y-me.y)}:null;
    }).filter(p=>p&&p.distance<=18).sort((a,b)=>a.distance-b.distance);
    const boss=nearby.find(p=>['boss','elite'].includes(p.e.cls)&&
      (p.distance<=9||Number(p.e.tg)===Number(VL.meU)||Number(hero.tg)===Number(p.e.uid)));
    const loss=hits.reduce((sum,row)=>sum+row.drop,0);
    const rapidLoss=hits.filter(row=>now-row.at<=3000).reduce((sum,row)=>sum+row.drop,0);
    const pressure=nearby.filter(p=>p.distance<=6&&(p.distance<=3||Number(p.e.tg)===Number(VL.meU)));
    const urgent=hits.length>0&&(v.hp<=v.maxHp*0.40||rapidLoss>=v.maxHp*0.18);
    const threat=boss||((urgent||pressure.length>=2)?pressure[0]:null);
    const inDanger=urgent||hits.length>=2&&loss>=v.maxHp*0.06||hits.length>0&&v.hp<=v.maxHp*0.45;
    if(!threat||!inDanger||!cfg.keepGameAuto){
      if(kite.active)clearFieldKite();
      return false;
    }
    if(typeof INPUT!=='undefined'&&INPUT.target&&INPUT.target!==kite.input&&INPUT.target!==bossApproach.input)return false;
    if(!kite.active){
      clearBossApproach('Lùi giữ khoảng cách với Boss');
      kite.active=true;diagnostic('FIELD_KITE','Mất máu khi quái áp sát',{name:threat.e.n,hp:v.hp,max:v.maxHp});
    }
    if(afkOn()){exitPowerSave('né quái đang áp sát');return true;}
    gameZoneAutoGuard();syncCombatAuto(s);rangedMovementTick(s);
    const profile=activeRangeProfile(threat.e);
    const close=nearby[0].distance;
    const keep=profile?.ranged?Math.max(3.5,Math.min(8,profile.range*0.65)):4.5;
    if(now<kite.jumpUntil||(typeof KC!=='undefined'&&KC.j))return true;
    let retreatStatus='Giữ khoảng cách';
    const needsRetreat=close<keep||threat.distance<keep+0.5||urgent&&close<keep+2;
    if(needsRetreat&&now-kite.lastMove>=700){
      const point=kiteRetreatPoint(me,nearby,threat,profile,unit);
      if(point){
        if(cfg.dualRouteMode==='ui'&&typeof INPUT!=='undefined'){
          kite.input={x:point.x*unit,y:point.y*unit};INPUT.target=kite.input;
        }else cmd('go',point);
        kite.lastMove=now;
        retreatStatus='Vừa đánh vừa rút';
      }else{
        const jumpTiles=(typeof KC_DIST==='number'?KC_DIST:280)/unit;
        const jump=kiteRetreatPoint(me,nearby,threat,profile,unit,jumpTiles);
        if(tryGameJump(jump,unit,kite.input)){
          kite.input=null;kite.lastMove=now;kite.jumpUntil=now+850;
          st.status='Khinh công né '+(threat.e.n||'quái')+' · máu '+Math.round(v.hp/v.maxHp*100)+'%';
          diagnostic('FIELD_KITE_JUMP',st.status,{x:jump.x,y:jump.y});
          return true;
        }
        retreatStatus='Chờ đường rút';
      }
    }
    const uid=Number(threat.e.uid);
    const inRange=profile&&threat.distance<=profile.hold&&
      (typeof obsLine!=='function'||obsLine(me.x*unit,me.y*unit,threat.x*unit,threat.y*unit));
    if(inRange&&Number.isSafeInteger(uid)&&uid>0&&now-kite.lastCast>=1400){
      if(Number(hero.tg)!==uid&&now-kite.lastTarget>=2000){cmd('tgt',{id:uid});kite.lastTarget=now;}
      else if(Number(hero.tg)===uid&&profile.id>0){cmd('cast',{id:String(profile.id)});kite.lastCast=now;}
    }
    st.status=retreatStatus+' · '+(threat.e.n||'quái')+' · máu '+Math.round(v.hp/v.maxHp*100)+'%';
    return true;
  }
  function fieldSafetyTick(s,now,nativeMode,nativeSafe){
    const identity=charIdentity();
    if(fieldSafety.identity!==identity){
      const pending=fieldSafety.portal?.identity===identity?fieldSafety.portal:null;
      resetFieldSafety();fieldSafety.identity=identity;fieldSafety.portal=pending;
    }
    if(!nativeSafe||['wb','vd','tk'].includes(s.zone)){
      fieldSafety.exp=null;clearFieldKite();return false;
    }
    if(nativeMode){
      fieldSafety.portal=null;fieldSafety.rotation=null;fieldSafety.exp=null;clearFieldKite();
      return false;
    }
    if(portalRecoveryTick(s,now))return true;
    if(townRecovery.active||sellFlow.sentAt||rewardNet.active)return false;
    if(fieldSafety.rotation)return lowExpRotationTick(s,now,nativeMode);
    if(fieldKiteTick(s,now))return true;
    return lowExpRotationTick(s,now,nativeMode);
  }


  async function tick() {
    if (!st.running || st.busy) return;
    st.busy = true;
    const token=sessionSerial;
    st.busyToken=token;
    try {
      const now=Date.now();
      watchdog(null);
      if(!st.running)return;
      if (!isOnline()) {
        if (!netState.offlineAt) { netState.offlineAt=now; diagnostic('NET','Mat ket noi WebSocket, dung gui lenh'); say('Tam ngung Auto: mat ket noi may chu, cho tu ket noi lai.'); }
        else if (now-netState.warningAt>60000) { netState.warningAt=now; diagnostic('NET','Van dang cho WebSocket ket noi'); }
        return;
      }
      if (netState.offlineAt) {
        fieldSafety.exp=null;clearFieldKite();
        clearBossApproach('Kết nối lại: đọc tọa độ Boss mới');
        netState.reconnects++; netState.offlineAt=0; netState.resumeAt=now+3500;
        st.action=''; st.map.requested=null; townFlow.request=null;
        st.channel.pending=0; st.channel.done=false;
        combatSync.forceSync=true;
        diagnostic('NET','Ket noi tro lai, cho du lieu char/zone dong bo');
        say('Da ket noi lai may chu; cho 3,5 giay dong bo roi tiep tuc.');
      }
      if (now<netState.resumeAt) return;
      if (typeof R!=='undefined' && !R.ready) {
        if (now-netState.warningAt>30000) {netState.warningAt=now;diagnostic('NET','Cho zone tu server: R.ready=false');}
        return;
      }
      const s = game();
      if (s) {sampleMetrics(s);watchdog(s);if(tongKimTick(s))return;sellTick(s);preflightBossStatus(s);persistRun();}
      // Trong Boss, doi khi server tam thoi chua gui lai S.qc khi hoi sinh.
      // Khong dung Boss vi mat du lieu nhiem vu trong khoang ngan.
      if (!s) {
        if (st.boss.phase !== 'idle') {
          if (typeof R !== 'undefined') syncCombatAuto({ town: String(R.vlZone) === '53' });
          diagnostic('WB','Dang cho char cua may chu, chua gui lenh Boss'); return; }
        if (now-netState.warningAt>30000) { netState.warningAt=now; say('Chua co nhan vat, cho may chu dong bo; khong gui lenh.'); }
        return;
      }
      if (s.town) townFlow.request=null;
      if(s.zone!=='53' || !s.town){
        if(starterExit.tries || starterExit.rounds)
          diagnostic('MAP_TOWN','Máy chủ xác nhận đã rời vùng an toàn / chuyển map',{zone:s.zone,level:s.level});
        Object.assign(starterExit,{at:0,tries:0,cooldownUntil:0,rounds:0,lastResult:'Đã rời vùng an toàn'});
      }
      if (!s.zone || s.zone==='undefined') {
        if (now-netState.warningAt>30000) { netState.warningAt=now; say('Doi dong bo ban do tu may chu; chua bat Auto chien dau.'); }
        return;
      }
      updateNativeQuest(s);
      if(nativeQuest.record?.skipSent)skipInheritedQuestTick(s);
      const pauseTraining=cfg.daTauPaused&&(!s.q||!s.took||s.need<=0||s.have>=s.need);
      const nativeMode=pauseTraining?'paused':updateNativeQuest(s);
      const nativeSafe=st.boss.phase==='idle'&&!arenaNow()&&!tongKimInside()&&
        !(worldBossEligible(s)&&bossWindow())&&rebirth.phase==='idle';
      if(fieldSafetyTick(s,now,nativeMode,nativeSafe))return;
      if(nativeMode && nativeSafe){
        if(cfg.daTauPaused){
          if(rewardSchedule(s,now)||rebirthTick(s))return;
          nativeQuestTick(s,nativeMode);
          partyInviteTick(s,now);
          if(st.channel.done&&!st.channel.pending&&combatEnabled()===true)enterPowerSave(s);
        }else{
          skipInheritedQuestTick(s);
          nativeQuestTick(s,updateNativeQuest(s));
          rewardSchedule(s,now);
        }
        if(!cfg.daTauPaused)partyInviteTick(s,now);
        return;
      }
      if(!nativeMode || !nativeSafe)releaseNativeQuest(s);
      if(townRecoveryTick(s,now))return;
      if(rewardSchedule(s,now))return;
      // Sau chuyển sinh, yêu cầu S.qc có thể đến muộn; không đứng chờ mãi.
      if (!s.q && s.reborns>0 && !questReborn.noDataAt) questReborn.noDataAt=now;
      if (s.q) questReborn.noDataAt=0;
      const rebornQuestNoData = !s.q && s.reborns>0 && questReborn.noDataAt>0 &&
        now-questReborn.noDataAt>=15000;
      if (!cfg.daTauPaused && st.questActive && questEligible(s) && !s.q && !rebornQuestNoData) {
        if (now-netState.warningAt>30000) { netState.warningAt=now; say('Doi dong bo du lieu Da Tau S.qc; chua gui lenh Da Tau.'); }
        syncCombatAuto(s);
        if (st.boss.phase!=='idle' || (worldBossEligible(s) && bossWindow())) bossTick(s);
        return;
      }
      gameZoneAutoGuard();
      syncCombatAuto(s);
      if (afkOn() && ((worldBossEligible(s) && bossWindow()) || s.town || (s.took && s.need > 0 && s.have >= s.need))) {
        exitPowerSave('can dieu khien nhan vat'); return;
      }
      if (bossTick(s)) return;
      rangedMovementTick(s);
      partyInviteTick(s,now);
      // Ưu tiên xử lý thưởng lúc về thành dù nhiệm vụ đang dở, cấp dưới 40,
      // hoặc recoveryAt còn hiệu lực. runStartupRewards chỉ gửi lệnh khi đã online.
      if (!st.questActive) {
        // Dã Tẩu đã đạt mục tiêu: không đổi bản đồ/nhận nhiệm vụ, nhưng vẫn
        // giữ Boss, Hoa Đăng, thống kê và nhận quà khi về thành tự nhiên.
        if(st.startup==='running')return;

        st.status='Đã đủ '+cfg.target+' bước. Chờ Boss/Hoa Đăng; không nhận thêm Dã Tẩu.';
        return;
      }
      if (rebirthTick(s)) return;
      resumeLateQuestClaim(s,token);
      if(st.softUntil && now<st.softUntil){st.status='Dã Tẩu tạm nghỉ: '+st.softFault+' ('+Math.ceil((st.softUntil-now)/1000)+'s)';return;}
      if(st.softUntil){st.softUntil=0;st.softFault='';st.softClaimWait=null;st.action='';}
      if (st.baseStep === null && s.q) st.baseStep = s.step;
      // Chỉ điều chỉnh mốc bước khi S.reset đã thực sự tăng (máy chủ xác nhận).
      // Không trừ tiến độ vì một bản tin S.qc cũ sau khi tải lại trang.
      if (s.q && Number(s.reborns)>st.lastReborns){
        if(st.baseStep!==null){
          st.baseStep=s.step-st.completed;
          diagnostic('REBORN_QUEST','Máy chủ xác nhận chuyển sinh; giữ tổng bước phiên');
        }
        st.lastReborns=Number(s.reborns);
      }
      if (s.q && st.baseStep!==null && s.step<st.baseStep){
        if(now-netState.warningAt>60000){netState.warningAt=now;diagnostic('QUEST','Bước nhiệm vụ nhỏ hơn mốc gốc nhưng chưa thấy reset tăng; không tính lùi tiến độ');}
        return;
      }
      if (st.baseStep!==null && s.q)st.completed=Math.max(st.completed, Math.max(0,s.step-st.baseStep));
      refreshMapQuest(s);
      // Hoan thanh/doi nhiem vu: tra lai tuy chon Uu tien Boss cu.
      if (!s.took || s.need <= 0 || s.have >= s.need || questKind(s.text) !== 'boss') restoreQuestBossPriority();
      // Dong bo map theo xac nhan thuc te cua server, reset dong ho khi chuyen map.
      if (st.map.lastZone !== s.zone) {
        st.map.lastZone = s.zone;
        st.map.noProgressAt = Date.now();
        st.map.noProgressHave = s.have;
        if (!s.town && st.map.requested) {
          if(String(st.map.requested.id)!==String(s.zone))
            diagnostic('MAP','Máy chủ đưa sang bãi khác với bãi yêu cầu',
              {requested:st.map.requested.id,actual:s.zone});
          // Keep the request until changed(s) consumes the server's map acknowledgement.
          if(!st.action.startsWith('Chon bai '))st.map.requested = null;
        }
      }
      if (!cfg.daTauPaused && st.completed >= cfg.target) return finishQuestGoal('Hoàn tất '+st.completed+' bước Dã Tẩu theo mục tiêu');

      // Quan sat chuyen tu bai ve thanh khi nhiem vu dang do: kha nang cao la trong thuong.
      // Khong cho rang day la viec nhan/tra nhiem vu; chi ap dung khi DA NHAN va CHUA XONG.
      if (s.took && s.need > 0 && s.have < s.need && s.town && st.lastTown === false) {
        st.recoveryAt = Date.now();
        st.recoveryAttempts = 0;
        st.recoveryStep = s.step;
        st.recoveryStatus = 'Dang cho hoi sinh ve thanh';
        st.action = ''; // lenh zone truoc do khong con hop le sau khi chet
        st.fieldHave = null;
        st.fieldAt = 0; // khong tinh thoi gian chet vao bo dem dung yen
        say('Phat hien ve thanh giua nhiem vu (co the bi ha). Cho hoi sinh roi quay lai bai.');
      }
      if (s.town) ensureChannel(s);
      st.lastTown = s.town;
      if (st.action) {
        const elapsed = Date.now() - st.actionAt;
        if (changed(s)) {
          if(st.action.startsWith('Chon bai '))st.map.requested=null;
          st.action='';st.ackFailures=0;closeQuestModal();
          await wait(200);if(!isSession(token))return;
        }
        else if (elapsed < 12000) return;
        else if (st.action.startsWith('Chon bai ')) {
          // Doi bai co the khong duoc chap nhan khi dang chet/hoi sinh.
          // Cho thu lai, khong dung toan bo Auto sau 12 giay.
          st.action = '';
          if (!s.town) st.recoveryAttempts++;
          st.fieldAt = 0;
          const request = st.map.requested;
          const attempts = request?.attempts || 1;
          if (attempts >= ZONE_RETRY_MAX && request) {
            const failed = { id: request.id, n: request.name };
            const required = !!questPlace(s.text);
            mapFailure(failed, 'server khong xac nhan vao bai sau ' + attempts + ' lenh', required);
            if (required) return softPause('Không thể vào bãi bắt buộc '+failed.n+'; tạm nghỉ và thử lại',180000);
            return;
          }
          st.zoneRetryAt = Date.now();
          return say('Server chua xac nhan vao map ' + (request?.name || '?') + ' (' + attempts + '/' + ZONE_RETRY_MAX + '). Cho thu lai.');
        } else {
          const action=st.action; st.action='';
          if (/^(?:Nhan nhiem vu|Tra nhiem vu)/.test(action)) {
            st.ackFailures=(st.ackFailures||0)+1;
            // Server Quest.cs không có trong gói mã; không giả định cấp 1 sau chuyển sinh luôn nhận/trả được.
            // Sau hai lần gửi không có phản hồi, ưu tiên farm lên mốc kế tiếp thay vì dừng toàn bộ Auto.
            if(s.reborns>0 && s.level<MIN_DA_TAU_LEVEL && st.ackFailures>=2) {
              const kind=action.startsWith('Nhan')?'take':'claim';
              questRebornDefer(s,kind);
              return;
            }
            if(st.ackFailures>=3) return softPause('Máy chủ chưa xác nhận '+action,180000,
              action.startsWith('Tra nhiem vu') ? {token,identity:charIdentity(),reborns:s.reborns,step:Number(st.checkpoint.split('|')[0])||s.step} : null);
            say('Chua co xac nhan cho '+action+'; se thu lai ('+st.ackFailures+'/3).');
            return;
          }
          say('Lenh '+action+' qua han; chuyen sang kiem tra lai trang thai server.');
          return;
        }
      }
      if (!st.running) return;
      if(st.startup==='running')return;

      // Chỉ người CHƯA chuyển sinh và chưa có nhiệm vụ mới bị hạn chế theo cấp.
      // Người đã chuyển sinh: thử Dã Tẩu ngay; nếu máy chủ từ chối, luyện lên 30/40 rồi thử lại.
      // Khi S.qc chưa đồng bộ quá 15 giây cũng luyện tạm, không kẹt chờ vô hạn.
      const rebornQuestWaiting=questRebornBlocked(s);
      if (!questEligible(s) || rebornQuestWaiting || rebornQuestNoData) {
        if (st.levelMode !== 'training') {
          st.levelMode = 'training';
          st.action = ''; st.recoveryAt = 0; st.fieldAt = 0;
          st.map.requested = null;
          say(rebornQuestWaiting ? '☯️ '+questReborn.lastInfo :
            rebornQuestNoData ? '☯️ Chưa có dữ liệu Dã Tẩu sau chuyển sinh; luyện cấp và kiểm tra lại khi server đồng bộ.' :
            'Nhân vật chưa chuyển sinh cấp '+s.level+': luyện đến cấp '+MIN_DA_TAU_LEVEL+' để làm Dã Tẩu.');
        }
        // Neu ve thanh, cho hoi sinh (neu co) roi chon bai theo cap.
        const choice = pickZone(s, 'loot');
        if (choice.error) {
          if (Date.now() - st.map.reportAt > 60000) {
            st.map.reportAt = Date.now(); say('Luyen cap: ' + choice.error);
          }
          return;
        }
        const z = choice.z;
        if(exitStarterTown(s,z))return;
        if (s.town || s.zone !== z.id) {
          if (st.zoneRetryAt && Date.now() - st.zoneRetryAt < ZONE_RETRY_MS) return;
          st.zoneRetryAt = Date.now();
          return changeZone(z, s);
        }
        st.map.requested = null;
        if (!ensureChannel(s)) return;
        // Duoi cap 40 van BAT tu danh quai khi da den bai.
        // Chi bat Treo may sau khi game DA XAC NHAN Auto chien dau.
        // Neu chua xac nhan: thu dong bo lai, khong co tinh cho la da bat.
        if (combatEnabled() !== true) {
          syncCombatAuto(s);
          if (Date.now() - combatSync.lastWarning > 60000) {
            combatSync.lastWarning = Date.now();
            say('Dang cho game xac nhan Tu danh quai tai bai luyen (cap ' + s.level + ').');
          }
          return;
        }
        enterPowerSave(s);
        return;
      }
      if (st.levelMode === 'training') {
        st.levelMode = 'quest';
        st.action = ''; st.fieldAt = 0; st.map.requested = null;
        say('Có thể tiếp tục Dã Tẩu (cấp '+s.level+', chuyển sinh '+s.reborns+'), kiểm tra tiến độ máy chủ.');
        if (afkOn()) { exitPowerSave('du cap bat dau Da Tau'); return; }
      }
      if (st.recoveryAt && s.step !== st.recoveryStep) {
        st.recoveryAt = 0; st.recoveryStatus = '';
      }
      if (st.recoveryAt && !s.town) {
        st.recoveryAt = 0; st.recoveryStatus = '';
        st.recoveryAttempts = 0;
        st.fieldAt = 0;
        say('Da roi thanh, tiep tuc nhiem vu buoc ' + s.step);
      }
      // Server da ghi nhan nhiem vu: dong bang de hien ban do va cho phep tu chien dau.
      if (s.took && s.need > 0 && s.have < s.need) closeQuestModal();
      if ((cfg.daTauPaused || now<daTauHoldUntil) && (!s.took || s.have>=s.need)) return;
      if (!s.took) {
        if (!s.town) {
          if (typeof goTown !== 'function') return softPause('Game chưa cung cấp goTown',120000);
          return safeGoTown('Ve thanh de nhan nhiem vu', s);
        }
        if(!townCombatReady(s))return;
        return perform(take, 'Nhan nhiem vu buoc ' + s.step, s);
      }
      if (s.need <= 0) return softPause('Dữ liệu số lượng nhiệm vụ chưa hợp lệ; đợi máy chủ đồng bộ',120000);
      if (s.have >= s.need) {
        if (!s.town) {
          if (typeof goTown !== 'function') return softPause('Game chưa cung cấp goTown',120000);
          return safeGoTown('Nhiem vu hoan thanh - ve thanh', s);
        }
        if(!townCombatReady(s))return;
        return perform(() => claim(s), 'Tra nhiem vu ' + s.step + ' - nhan ' + cfg.reward, s);
      }
      const kind = questKind(s.text);
      if (!kind && !s.text) {
        if (now-netState.warningAt>30000) {netState.warningAt=now;say('Dang cho noi dung nhiem vu R.qc tu may chu; giu nguyen bai hien tai.');}
        return;
      }
      if (!kind) return softPause('Nhiệm vụ chưa hỗ trợ: '+(s.text||'Không rõ loại'),600000);
      if (kind === 'loot' || kind === 'elite') {
        // Không tự đổi bộ lọc vật phẩm của người chơi để tránh nhặt/trang bị ngoài ý muốn.
        // Bộ lọc nhặt đồ quá nghiêm ngặt có thể khiến nhiệm vụ không tăng tiến độ.
        if (typeof AU === 'function') {
          const a = AU();
          if (a && a.fight === false && now-combatSync.lastWarning>30000) { combatSync.lastWarning=now; say('Dang cho bat Tu danh quai tai bai.'); }
        }
      }
      syncQuestBossPriority(s, kind);
      // Neu R.qc.t den muon sau luc bam Bat dau, xac nhan lai bai hien tai.
      if(!startupField.active && startupField.kind===null && !s.town &&
         startupField.step===s.step && startupField.zone===s.zone &&
         canQuestProgressHere(s,kind)) {
        startupField.kind=kind;startupField.active=true;
        diagnostic('START','Nhiem vu dong bo muon, giu lai bai hien tai',{zone:s.zone,step:s.step});
      }
      // Với nhiệm vụ hạ quái theo cấp, phải chọn đúng bãi,
      // không chỉ gọi backFromTown() vì game có thể trở về bãi cũ.
      const choice = pickZone(s, kind);
      if (choice.error) {
        if(choice.waitForLoot)return softPause(choice.error,60000);
        // The server can preserve a high-level quest across rebirth. Never stop merely
        // because the freshly reborn level-1 hero cannot reach its old quest map yet.
        if(s.reborns>0 && !s.town && !questRebornBlocked(s))
          return trainForRebornQuest(s,choice.error);
        if(s.reborns>0 && s.town)
          return trainForRebornQuest(s,choice.error);
        return softPause('Không chọn được bãi: '+choice.error,180000);
      }
      const { z } = choice;
      // Khi chet tro ve thanh, giu nguyen nhiem vu dang do va tu ve bai.
      if (s.town) {
        if(exitStarterTown(s,z))return;
        if (!st.recoveryAt) {
          st.recoveryAt = Date.now();
          st.recoveryStep = s.step;
          st.recoveryStatus = 'Dang cho co the roi thanh';
          st.fieldAt = 0;
          say('Dang o thanh voi nhiem vu dang do: se tro lai bai ' + z.n);
        }
        const elapsed = Date.now() - st.recoveryAt;
        if (elapsed > RECOVERY_MAX_MS) {
          st.recoveryAt=0;st.recoveryAttempts=0;st.zoneRetryAt=0;
          return startTownRecovery(s,z,'Ở thành quá 3 phút chưa rời được');
        }
        if (elapsed < RESPAWN_WAIT_MS) return;
        if (st.zoneRetryAt && Date.now() - st.zoneRetryAt < ZONE_RETRY_MS) return;
        st.recoveryAttempts++;
        st.zoneRetryAt = Date.now();
        // Gui lenh chuyen bai thong qua duong di chinh thuc cua game.
        return changeZone(z, s);
      }
      if (s.zone !== z.id) {
        if (st.zoneRetryAt && Date.now() - st.zoneRetryAt < ZONE_RETRY_MS) return;
        return changeZone(z, s);
      }
      // Da vao map dich: reset bo dem lenh map va xac nhan vi tri thuc te.
      if (st.map.requested?.id === s.zone) st.map.requested = null;
      st.recoveryAttempts = 0;
      // Neu vao duoc map nhung khong co tien do trong thoi gian dai, thu bai khac
      // CHI doi voi nhiem vu tu do (nhat, tinh anh, quai theo cap).
      // Nhiem vu chi dinh ten map thi khong duoc doi bai vi se khong tinh tien do.
      // Kiem tra Boss phu hop theo e.L va chuyen kenh thong minh neu chua gap.
      const huntStatus=bossHuntTick(s,kind);
      if (huntStatus==='rotating') return;
      if (kind==='boss') lockVisibleBoss(s,false);
      const elapsedIdle = Date.now() - st.map.noProgressAt;
      const maxIdle = kind === 'boss' ? STALLED_QUEST_BOSS_MS : kind === 'elite' ? STALLED_ELITE_MS : STALLED_KILL_MS;
      // Boss that su hien tren map: giu bai, uu tien auto danh, khong doi bai luc boss con song.
      if (kind === 'boss' && matchingFieldBosses(s).length && !s.town && huntStatus==='holding') {
        const names = matchingFieldBosses(s).map(e => e.n).slice(0, 2).join(', ');
        if (questBoss.lastSeen !== s.zone + ':' + names) {
          questBoss.lastSeen = s.zone + ':' + names;
          say('Da phat hien Boss dang song tren bai ' + z.n + ': ' + names + '. Giu bai de danh.');
        }
        st.map.noProgressAt = Date.now();
      }
      if (!s.town && !st.channel.pending && st.map.noProgressHave === s.have && Date.now() - st.map.noProgressAt > maxIdle) {
        if (questPlace(s.text)) {
          if (Date.now() - st.map.reportAt > 60000) {
            st.map.reportAt = Date.now();
            say('Da o dung bai ' + z.n + ' nhung ' + Math.round(elapsedIdle / 1000) + ' giay chua tang tien do. Kiem tra Auto chien dau / spawn / vat can tren map.');
          }
          st.map.noProgressAt = Date.now(); // tiep tuc cho, khong vo han spam log
        } else {
          if (st.map.rotations >= Math.max(1, availableZones(s).length - 1)) {
            st.map.noProgressAt = Date.now();
            if (Date.now() - st.map.reportAt > 60000) {
              st.map.reportAt = Date.now();
              say('Da thu nhieu bai nhung chua tang tien do; giu bai hien tai, khong lap doi bai lien tuc.');
            }
          } else {
            mapFailure(z, (kind === 'boss' ? 'chua gap/ha Boss hop le' : 'khong tang tien do') + ' trong ' + Math.round(elapsedIdle / 1000) + ' giay');
            return;
          }
        }
      }
      // Chon kenh ngay sau khi vao dung bai, truoc khi tiep tuc theo doi tien do.
      // Hoi sinh ve thanh se reset c.key, cho lan vao bai tiep theo.
      if (!ensureChannel(s)) return;
      if (cfg.keepGameAuto && combatEnabled() !== true) { syncCombatAuto(s); return; }
      // Khi san Boss Da Tau: khong bat Treo may de con quan sat Boss xuat hien va doi bai.
      if (kind === 'boss' && cfg.bossQuestEnabled) {
        if (afkOn()) { exitPowerSave('dang san Boss Da Tau'); return; }
      } else enterPowerSave(s);
      if (st.fieldHave !== s.have) {
        st.fieldHave = s.have; st.fieldAt = Date.now();
        sayQuestProgress(s,kind);
      }
    } catch (e) { console.error(e);diag.errors++;softPause('Lỗi tick: '+e.message,120000); }
    finally { if (st.busyToken===token) st.busy = false; draw(); }
  }
  const css = document.createElement('style'); css.id = ID + '-css';
  css.textContent = `#${ID}{position:fixed;top:110px;left:14px;z-index:2147483000;width:295px;background:#111b22f5;color:#f2f4f8;border:1px solid #c69a45;border-radius:10px;padding:12px;font:13px Arial,sans-serif;box-shadow:0 7px 22px #0009}#${ID} *{box-sizing:border-box}#${ID} h3{margin:0 0 10px;font-size:15px;color:#ffd46f}#${ID} label{display:flex;justify-content:space-between;align-items:center;margin:8px 0;gap:8px}#${ID} select,#${ID} input{background:#25313a;color:white;border:1px solid #62727b;border-radius:4px;padding:5px;width:145px}#${ID} button{background:#355a74;color:white;border:0;border-radius:5px;padding:8px;cursor:pointer}#${ID} button:hover{filter:brightness(1.2)}#${ID} .actions{display:flex;gap:5px}#${ID} .actions button{flex:1}#${ID} .dt-stop{background:#8d3131}#${ID} .dt-log{background:#080e12;padding:8px;border-radius:5px;margin-top:9px;font:11px/1.45 monospace;min-height:55px;max-height:115px;overflow:auto;white-space:pre-wrap}#${ID} .dt-status{color:#abdfb9;line-height:1.4;margin:9px 0}#${ID}.dt-mini{width:270px}#${ID}.dt-mini .dt-body{display:none}#${ID} .dt-header{display:flex;align-items:center;justify-content:space-between;gap:4px}#${ID} .dt-header h3{margin:0;font-size:14px}#${ID} .dt-topbtn{background:transparent;padding:3px 6px;font-size:17px}#${ID} .dt-boss{margin:10px 0;padding:8px;border:1px solid #445764;border-radius:6px;background:#16252c}#${ID} .dt-boss h4{margin:0 0 6px;color:#ffd46f;font-size:12px}#${ID} .dt-boss label{margin:6px 0}#${ID} .dt-boss input[type=checkbox]{width:16px;height:16px;accent-color:#d8ae57}#${ID} .dt-boss select{width:145px}#${ID} .dt-boss .dt-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;min-height:26px}#${ID} .dt-boss button.dt-toggle{display:inline-block;position:relative;pointer-events:auto!important;cursor:pointer!important;flex:0 0 75px;width:75px;min-height:27px;padding:4px 7px;font-weight:700;background:#653e3e!important;color:#fff!important;border:1px solid #956060!important;border-radius:5px}#${ID} .dt-boss button.dt-toggle.is-on{background:#246a4e!important;border-color:#71c69c!important;color:white!important}#${ID} .dt-mini-status{display:none;font-size:11px;color:#b2e9bb;margin-top:7px}#${ID}.dt-mini .dt-mini-status{display:block}#${ID} .dt-stats{border:1px solid #445764;border-radius:6px;margin:8px 0;padding:7px;background:#15242b}#${ID} .dt-stats summary{cursor:pointer;color:#ffdf92;font-weight:700}#${ID} .dt-stats pre{font:11px/1.55 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;color:#c8d7e4;margin:8px 0 0}#${ID} button.dt-export{width:100%;margin:7px 0 2px;background:#3b6247}#${ID} .dt-wb-live{white-space:pre-wrap;overflow-wrap:anywhere;background:#08171e;padding:8px;border:1px solid #324450;border-radius:5px;font:11px/1.55 monospace;max-height:180px;overflow:auto}`;
  css.textContent += `
#${ID}{max-width:calc(100vw - 16px);max-height:calc(100dvh - 20px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
#${ID} select,#${ID} input,#${ID} button{touch-action:manipulation}
#${ID} .dt-boss button.dt-toggle{min-height:34px;flex-basis:82px}
@media(max-width:640px){#${ID}{top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));width:min(306px,calc(100vw - 16px));padding:10px;font-size:13px}#${ID} select,#${ID} input{width:135px;max-width:53%;font-size:16px;min-height:35px}#${ID} .dt-topbtn{min-width:35px;min-height:35px}#${ID} .actions button{min-height:43px}#${ID} .dt-log{max-height:90px}#${ID} .dt-boss .dt-toggle-row{min-height:38px}}`;
  css.textContent += `
#${ID}{--dt-top:clamp(8px,16dvh,110px);top:var(--dt-top);width:320px;padding:10px;max-height:calc(100dvh - var(--dt-top) - 8px);display:flex;flex-direction:column;overflow-y:auto}
#${ID} .dt-body{display:flex;flex-direction:column;min-height:0}
#${ID} .dt-body>:not(.dt-tab-viewport){flex-shrink:0}
#${ID} .dt-body>.dt-status{max-height:112px;overflow:auto;margin:8px 0 9px;font-size:11px;line-height:1.45}
#${ID} .dt-body>.actions{margin-bottom:9px}
#${ID} .dt-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;margin-bottom:9px}
#${ID} .dt-tabs .dt-tab{min-width:0;padding:8px 2px;border:1px solid #516577;border-radius:5px;background:#25313a;color:#c9d6e4;font-size:10px;font-weight:700;white-space:nowrap}
#${ID} .dt-tabs .dt-tab.is-active{background:#8e6a31;color:#fff7d9;border-color:#e3c17d}
#${ID} .dt-tabs .dt-tab:focus-visible{outline:2px solid #ffe8a4;outline-offset:1px}
#${ID} .dt-tab-viewport{min-height:min(90px,20dvh);max-height:490px;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}
#${ID} .dt-tab-content{display:none}
#${ID} .dt-tab-content.is-active{display:block}
#${ID} .dt-help{font-size:11px;color:#bfcedb;line-height:1.48;margin:10px 0}
#${ID} .dt-stats h4{margin:0 0 7px;color:#ffd46f;font-size:12px}
#${ID} .dt-boss{margin:8px 0}
#${ID} .dt-boss .dt-toggle-row span{flex:1;min-width:0}
#${ID} .dt-log{min-height:170px;max-height:320px;margin-top:0}
#${ID}.dt-mini{width:270px}
@media(max-width:640px){#${ID}{width:min(320px,calc(100vw - 16px));--dt-top:max(8px,env(safe-area-inset-top));left:8px}#${ID} .dt-body>.dt-status{max-height:85px}#${ID} .dt-tabs .dt-tab{font-size:10px;min-height:35px}}
`;
  css.textContent += `#${ID} .dt-ch-live{white-space:pre-wrap;overflow-wrap:anywhere;background:#08171e;padding:7px;border:1px solid #324450;border-radius:5px;font:11px/1.5 monospace;max-height:200px;overflow:auto;margin:5px 0}`;
  css.textContent += `#${ID} .dt-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}#${ID} .dt-quick-btn{min-width:0;white-space:normal;padding:9px 5px;line-height:1.35;border:1px solid #5c7082;background:#203b43;color:#f5e9d1;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}#${ID} .dt-quick-btn:focus-visible{outline:2px solid #ffd37b;outline-offset:1px}#${ID} .dt-quick-btn:hover{background:#34525c}#${ID} .dt-quick-btn[disabled]{opacity:.55;cursor:not-allowed}`;
  css.textContent += `#${ID} .dt-character{white-space:pre-line;font-size:12px;line-height:1.5;color:#f7dfa8;background:#1a2b32;border:1px solid #516577;border-radius:6px;margin:8px 0 3px;padding:6px 8px;overflow-wrap:anywhere;font-weight:700}#${ID}.dt-mini .dt-character{font-size:11px;margin:6px 0 0;padding:5px 7px}`;
  document.head.appendChild(css);
  const p = document.createElement('div'); p.id = ID;
  // Tab giao dien: luon giu nut Bat dau/Dung va trang thai ben ngoai khu cau hinh.
  p.innerHTML = `
    <div class="dt-header"><h3>📜 Auto S4 v2.1.9</h3><div>
      <button type="button" class="dt-topbtn" id="dt-mini" title="Thu nhỏ / Mở rộng">−</button>
      <button type="button" class="dt-topbtn" id="dt-x" title="Gỡ Auto">✕</button>
    </div></div>
    <div class="dt-character" id="dt-character" aria-label="Thông tin nhân vật">👤 Đang đọc thông tin nhân vật…</div>
    <div id="dt-mini-status" class="dt-mini-status"></div>
    <div class="dt-body">
      <div class="dt-status" id="dt-status" aria-live="polite"></div>
      <div class="actions"><button type="button" id="dt-start">▶ Bắt đầu</button>
        <button type="button" class="dt-stop" id="dt-stop">■ Dừng</button></div>
      <div class="dt-tabs" role="tablist" aria-label="Nhóm tính năng Auto">
        <button type="button" class="dt-tab is-active" id="dt-nav-general" role="tab" aria-selected="true" aria-controls="dt-pane-general" data-dt-tab="general">Chung</button>
        <button type="button" class="dt-tab" id="dt-nav-farm" role="tab" aria-selected="false" aria-controls="dt-pane-farm" data-dt-tab="farm">Bãi luyện</button>
        <button type="button" class="dt-tab" id="dt-nav-party" role="tab" aria-selected="false" aria-controls="dt-pane-party" data-dt-tab="party">Tổ đội</button>
        <button type="button" class="dt-tab" id="dt-nav-tk" role="tab" aria-selected="false" aria-controls="dt-pane-tk" data-dt-tab="tk">Tống Kim</button>
        <button type="button" class="dt-tab" id="dt-nav-world" role="tab" aria-selected="false" aria-controls="dt-pane-world" data-dt-tab="world">Boss TG</button>
        <button type="button" class="dt-tab" id="dt-nav-quiz" role="tab" aria-selected="false" aria-controls="dt-pane-quiz" data-dt-tab="quiz">Hoa Đăng</button>
        <button type="button" class="dt-tab" id="dt-nav-rebirth" role="tab" aria-selected="false" aria-controls="dt-pane-rebirth" data-dt-tab="rebirth">Chuyển sinh</button>
        <button type="button" class="dt-tab" id="dt-nav-bag" role="tab" aria-selected="false" aria-controls="dt-pane-bag" data-dt-tab="bag">Hành trang</button>
        <button type="button" class="dt-tab" id="dt-nav-stats" role="tab" aria-selected="false" aria-controls="dt-pane-stats" data-dt-tab="stats">Thống kê</button>
        <button type="button" class="dt-tab" id="dt-nav-quick" role="tab" aria-selected="false" aria-controls="dt-pane-quick" data-dt-tab="quick">Truy cập nhanh</button>
        <button type="button" class="dt-tab" id="dt-nav-logs" role="tab" aria-selected="false" aria-controls="dt-pane-logs" data-dt-tab="logs">Nhật ký</button>
      </div>
      <div class="dt-tab-viewport">
        <section class="dt-tab-content is-active" id="dt-pane-general" data-dt-pane="general" role="tabpanel" aria-labelledby="dt-nav-general">
          <label>Phần thưởng <select id="dt-reward"><option value="xp">Kinh nghiệm</option><option value="gold">Ngân lượng</option><option value="item">Vật phẩm</option></select></label>
          <label>Số bước <input id="dt-target" type="number" min="1" max="1000" value="200"></label>
          <div class="dt-boss"><h4>🛡️ Hoạt động dài hạn / Phục hồi</h4>
            <div class="dt-toggle-row"><span>Tạm dừng nhận và trả Dã Tẩu</span><button type="button" id="dt-da-tau-pause" class="dt-toggle" aria-pressed="false">✕ TẮT</button></div>
            <div class="dt-toggle-row"><span>Tự chạy lại sau F5 (Tampermonkey)</span><button type="button" id="dt-resume-on" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Đủ bước vẫn trực Boss/Hoa Đăng</span><button type="button" id="dt-events-on" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Watchdog cho phép reload khi kẹt >6 phút</span><button type="button" id="dt-watch-reload" class="dt-toggle" aria-pressed="false">✕ TẮT</button></div>
            <div class="dt-toggle-row"><span>Dùng nút Quà Hoạt động để nhận thưởng</span><button type="button" id="dt-rewards-manual" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Dùng socket nếu tắt chế độ bấm nút</span><button type="button" id="dt-rewards-direct" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <button type="button" class="dt-export" id="dt-reward-manual-now">🎁 Kiểm tra thưởng ngay (mọi bản đồ)</button>
            <small>Chỉ bấm đúng nút game #dySign / data-q / data-wq; bỏ qua nút bị vô hiệu, không chạm quay có phí. Chờ xác nhận từ game sau từng lần bấm.</small>
            <div class="dt-toggle-row"><span>Vòng quay MIỄN PHÍ hằng ngày</span><button type="button" id="dt-free-spin" class="dt-toggle" aria-pressed="false">✕ TẮT</button></div>
            <pre class="dt-wb-live" id="dt-reward-live"></pre>
            <pre class="dt-wb-live" id="dt-watch-live"></pre>
            <small>Chỉ tự chạy lại sau khi người dùng đã Bắt đầu; Dừng sẽ hủy. Không cố giành phiên nếu máy chủ kick. Console không thể tự nạp sau reload. Reload watchdog mặc định TẮT và giới hạn 1 lần/30 phút.</small>
          </div>
          <div class="dt-help">Dã Tẩu từ cấp 40 · Boss Thế Giới từ cấp 60. Tùy chọn ở các tab khác vẫn được áp dụng khi Auto đang chạy.</div>
          <div class="dt-help">Mặc định: 200 bước, trả thưởng EXP, chọn kênh đông thứ 3. Sau chuyển sinh: đổi tối đa 1 nhiệm vụ cấp/map ≥80 nếu đủ lượng.</div>
        </section>
        <section class="dt-tab-content" id="dt-pane-farm" data-dt-pane="farm" role="tabpanel" aria-labelledby="dt-nav-farm" hidden>
          <div class="dt-boss"><h4>Chiến đấu ở bãi luyện</h4>
            <div class="dt-toggle-row"><span>Né quái áp sát</span><button type="button" id="dt-field-kite" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <small>Khi mất máu và bị áp sát, Auto vừa đánh vừa rút về hướng thoáng. Chỉ khinh công khi không có đường chạy an toàn. Lựa chọn lưu theo nhân vật.</small>
          </div>
          <label>Chọn kênh luyện <select id="dt-channel">
            <option value="rank1">Đông nhất</option><option value="rank2">Đông thứ 2</option>
            <option value="rank3" selected>Đông thứ 3</option><option value="rank4">Đông thứ 4</option>
            <option value="rank5">Đông thứ 5</option><option value="rank6">Đông thứ 6</option>
            <option value="fixed1">Cố định: Kênh 1</option><option value="fixed2">Cố định: Kênh 2</option>
            <option value="fixed3">Cố định: Kênh 3</option><option value="fixed4">Cố định: Kênh 4</option>
            <option value="fixed5">Cố định: Kênh 5</option><option value="fixed6">Cố định: Kênh 6</option>
          </select></label>
          <div class="dt-boss"><h4>🔀 Hai đường điều khiển độc lập</h4>
            <label>Chế độ thao tác <select id="dt-dual-mode"><option value="auto">Tự động: lệnh trước, UI khi thử lại</option><option value="command">Chỉ lệnh game</option><option value="ui">Chỉ giao diện (nếu có nút)</option></select></label>
            <pre class="dt-wb-live" id="dt-dual-live"></pre>
            <small>Không gửi đồng thời hai đường. Lần thử lại chỉ diễn ra sau khi thiếu xác nhận từ máy chủ. Chức năng thiếu nút thật sẽ báo không khả dụng, không bấm mò. Bán đồ giữ lớp bảo vệ UID, không tự chọn Bán tất cả.</small>
          </div>
          <div class="dt-boss"><h4>📶 Thứ hạng kênh THỰC TẾ</h4>
            <pre id="dt-ch-live" class="dt-ch-live" aria-live="polite"></pre>
            <button type="button" id="dt-ch-recheck" class="dt-export">↻ Chọn lại theo số người mới</button>
            <small>Kênh đông thứ N được tính từ R.chs do máy chủ gửi. Nếu nhiều kênh bằng người, ưu tiên giữ kênh đang ở. Đổi kênh chỉ khi dữ liệu hợp lệ.</small>
          </div>
          <div class="dt-boss"><h4>🗺️ Chọn bản đồ luyện</h4>
            <div class="dt-toggle-row"><span>Ưu tiên bãi có Boss với mọi nhiệm vụ</span><button type="button" id="dt-prefer-boss" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Đi tới tọa độ Boss theo kênh hiện tại</span><button type="button" id="dt-boss-position" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <pre id="dt-boss-position-live" class="dt-wb-live"></pre>
            <div class="dt-toggle-row"><span>Giữ khoảng cách theo tầm chiêu, hạn chế chạy áp sát</span><button type="button" id="dt-range-hold" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <pre id="dt-range-live" class="dt-wb-live"></pre>
            <small>Ưu tiên bãi có cấu hình Boss và đúng cấp. Nhiệm vụ yêu cầu đúng tên bãi luôn được ưu tiên. Nếu không có bãi Boss hợp lệ, dùng bãi thường.</small>
          </div>
          <div class="dt-boss"><h4>👑 Boss nhiệm vụ Dã Tẩu</h4>
            <div class="dt-toggle-row"><span>Tự săn Boss nhiệm vụ</span><button type="button" id="dt-quest-boss" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row" style="display:none"><span>Đổi kênh tìm Boss (đã bỏ)</span><button type="button" id="dt-boss-channel" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <small>Nếu nhiệm vụ hạ Boss chưa có tiến độ, thử kênh khác sau khoảng 2 phút; chỉ đổi bãi khi cần, không bỏ Boss đang sống.</small>
          </div>
          <div class="dt-boss"><h4>🔋 Treo máy</h4>
            <div class="dt-toggle-row"><span>Treo máy tiết kiệm pin tại bãi</span><button type="button" id="dt-afk-on" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-party" data-dt-pane="party" role="tabpanel" aria-labelledby="dt-nav-party" hidden>
          <div class="dt-boss"><h4>Danh sách ưu tiên mời</h4>
            <label>Tên nhân vật, mỗi dòng một tên<textarea id="dt-party-names" rows="5" style="width:100%;box-sizing:border-box"></textarea></label>
            <label>Cách mời <select id="dt-party-names-mode"><option value="prefer">Ưu tiên danh sách, sau đó người khác</option><option value="only">Chỉ mời người trong danh sách</option></select></label>
            <button type="button" id="dt-party-names-save">Lưu danh sách mời</button>
            <small>Chỉ xét người game đang nhìn thấy ở gần. Không đồng bộ giữa máy, không đuổi theo map/kênh của danh sách. Chế độ Chỉ mời với danh sách trống sẽ không mời ai. Đội hiện tại vẫn giữ theo các tùy chọn bên dưới.</small>
          </div>
          <div class="dt-boss"><h4>👥 Tổ đội khi làm Dã Tẩu</h4>
            <div class="dt-toggle-row"><span>Đăng tuyển đội lên thế giới (map, kênh, số người)</span><button type="button" id="dt-party-world" class="dt-toggle is-off" aria-pressed="false">✕ TẮT</button></div>
            <small>Mặc định tắt. Khi bật: chỉ đội trưởng còn chỗ đăng tuyển, tối đa 1 tin/2 phút; từ 3 ứng viên gần trở lên dùng lời mời chung. Không gửi bù tin bị giới hạn.</small>
            <pre id="dt-party-world-status" class="dt-wb-live"></pre>
            <div class="dt-toggle-row"><span>Theo tuyển đội từ danh sách — chỉ cùng map</span><button type="button" id="dt-party-follow" class="dt-toggle is-off" aria-pressed="false">✕ TẮT</button></div>
            <pre id="dt-party-follow-status" class="dt-wb-live"></pre>
            <small>Chỉ theo tin mới từ tên trong danh sách và đội đông hơn còn chỗ. Đến đúng kênh, thấy người tuyển rồi mới xét rời đội cũ. Không tự đổi map; quá 2 phút chờ tại nơi tập hợp sẽ hủy.</small>
            <div class="dt-toggle-row"><span>Mới chạy / sang map: rời đội một mình, chờ mời 5 phút</span><button type="button" id="dt-party-wait" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <small>Chờ sau khi đã đến đúng kênh. Đội có đồng đội được giữ. Hết 5 phút mới tự mời; lời mời đến được nhận theo chế độ danh sách đã chọn.</small>
            <div class="dt-toggle-row"><span>Tự mời và lấp đầy tổ đội khi làm Dã Tẩu</span><button type="button" id="dt-party-invite" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Ưu tiên kênh đội 4–5 người cùng map</span><button type="button" id="dt-party-channel" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Rời đội khác map sau khi đến đúng kênh</span><button type="button" id="dt-party-leave" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Đội trưởng: mời ra người khác kênh quá 5 phút</span><button type="button" id="dt-party-kick" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <pre id="dt-party-live" class="dt-wb-live"></pre>
            <small>Giữ đội cùng map/kênh và mời đến đủ 5. Khi đội phân tán, ưu tiên nhóm đông nhất cùng map; chưa rõ vị trí thì chờ. Đếm vắng mặt lại từ đầu mỗi khi bạn đổi map/kênh.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-tk" data-dt-pane="tk" role="tabpanel" aria-labelledby="dt-nav-tk" hidden>
          <div class="dt-boss"><h4>⚔️ Tống Kim · 12:30 và 22:00</h4>
            <div class="dt-toggle-row"><span>Tự vào Tống Kim theo lịch và điều kiện game</span><button type="button" id="dt-tk-on" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Tự động chiến đấu và di chuyển</span><button type="button" id="dt-tk-combat" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <label for="dt-tk-hp">Bơm máu khi dưới (%) <input type="number" id="dt-tk-hp" min="0" max="100" step="1"></label>
            <label for="dt-tk-mp">Bơm mana khi dưới (%) <input type="number" id="dt-tk-mp" min="0" max="100" step="1"></label>
            <small>Đặt 0 để tắt từng loại thuốc. Khi tắt tự chiến đấu, game và người chơi điều khiển di chuyển. Auto vẫn bơm thuốc và ưu tiên mục tiêu trong tầm theo tương khắc và kết liễu.</small>
            <pre id="dt-tk-live" class="dt-wb-live"></pre>
            <small>Dự kiến trận 12:30–12:45 và 22:00–22:15; báo danh trước 5 phút. Chuẩn bị từ 12:24 / 21:54, chỉ vào khi máy chủ mở báo danh. Lịch và điều kiện máy chủ được ưu tiên; mặc định cần chuyển sinh ≥1. Hai đường: lệnh tk hoặc NPC Tống Kim → Báo danh. Không tự rời trận; chờ máy chủ trả về rồi tiếp tục Dã Tẩu.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-world" data-dt-pane="world" role="tabpanel" aria-labelledby="dt-nav-world" hidden>
          <div class="dt-boss"><h4>🐉 Boss Thế Giới</h4>
            <div class="dt-toggle-row"><span>Auto Boss</span><button type="button" id="dt-boss-on" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>12:00 hằng ngày</span><button type="button" id="dt-boss-12" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>21:00 hằng ngày</span><button type="button" id="dt-boss-21" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <label>Chuẩn bị trước <select id="dt-boss-early"><option value="0" selected>Đúng giờ</option><option value="1">1 phút</option><option value="3">3 phút</option></select></label>
            <div class="dt-toggle-row"><span>Chết → vào lại Boss</span><button type="button" id="dt-boss-rejoin" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Trở lại Dã Tẩu</span><button type="button" id="dt-boss-resume" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Ưu tiên mục tiêu Boss khi vào đấu trường</span><button type="button" id="dt-wb-priority" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <button type="button" id="dt-wb-refresh" class="dt-export">↻ Lấy trạng thái Boss từ máy chủ</button>
            <pre class="dt-wb-live" id="dt-wb-live" aria-live="polite"></pre>
            <small>Cần cấp theo máy chủ hoặc đã chuyển sinh (S.reset &gt; 0); người Lv1 sau chuyển sinh vẫn có thể tham gia. Việc vào đấu trường phải được máy chủ xác nhận.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-quiz" data-dt-pane="quiz" role="tabpanel" aria-labelledby="dt-nav-quiz" hidden>
          <div class="dt-boss"><h4>🏮 Tự trả lời Hoa Đăng · 20:30</h4>
            <div class="dt-toggle-row"><span>Trả lời khi Auto đang chạy</span><button type="button" id="dt-quiz-on" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <div class="dt-toggle-row"><span>Tự tra cứu internet (Wikipedia)</span><button type="button" id="dt-quiz-web" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <small>Câu chưa xác nhận: đối chiếu thư viện và Wikipedia song song. Nhật ký ghi hai kết quả và lý do chọn; gần hết giờ vẫn gửi đáp án.</small>
            <label>Câu chưa học <select id="dt-quiz-mode"><option value="guess">Xác nhận → Thư viện + Internet song song → đoán</option></select></label>
            <pre class="dt-wb-live" id="dt-quiz-live" aria-live="polite"></pre>
            <button type="button" id="dt-quiz-export" class="dt-export">⬇ Xuất ngân hàng đáp án JSON</button>
            <button type="button" id="dt-quiz-import" class="dt-export">⬆ Nhập ngân hàng đáp án JSON</button>
            <small>Học đáp án chính thức khi server công bố, lưu trên thiết bị. Câu chưa biết không thể bảo đảm trả lời chính xác.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-rebirth" data-dt-pane="rebirth" role="tabpanel" aria-labelledby="dt-nav-rebirth" hidden>
          <div class="dt-boss"><h4>☯️ Tự chuyển sinh (thao tác không thể hoàn tác)</h4>
            <div class="dt-toggle-row"><span>Tự chuyển sinh khi đủ cấp</span><button type="button" id="dt-rebirth-on" class="dt-toggle" aria-pressed="false">✕ TẮT</button></div>
            <label>Điều kiện <select id="dt-rebirth-mode"><option value="game">Đúng mốc cấp theo game</option><option value="custom">Đặt mốc cấp riêng</option></select></label>
            <label>Cấp mong muốn <input id="dt-rebirth-target" type="number" min="100" max="500" step="1" value="100"></label>
            <div class="dt-toggle-row"><span>Chờ trả xong nhiệm vụ Dã Tẩu</span><button type="button" id="dt-rebirth-wait" class="dt-toggle is-on" aria-pressed="true">✓ BẬT</button></div>
            <label>Số lần mỗi phiên <select id="dt-rebirth-max"><option value="1">1 lần (an toàn)</option><option value="3">3 lần</option><option value="10">10 lần</option><option value="0">Không giới hạn</option></select></label>
            <pre class="dt-wb-live" id="dt-rebirth-live"></pre>
            <small>Mặc định TẮT. Mốc thật do máy chủ áp dụng: 100 + 20 × số lần đã chuyển sinh (tối đa cấp 400). Tự chuyển sinh chỉ gửi yêu cầu ở thành khi không có Boss/Hoa Đăng, chờ xác nhận và giới hạn thử lại. Sau đó tiếp tục luyện cấp 1.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-bag" data-dt-pane="bag" role="tabpanel" aria-labelledby="dt-nav-bag" hidden>
          <div class="dt-boss"><h4>🎒 Tự nhấn Bán theo lọc khi đạt ngưỡng</h4>
            <pre class="dt-wb-live" id="dt-bag-live"></pre>
            <div class="dt-toggle-row"><span>Tự bán khi túi gần đầy (mặc định TẮT)</span><button type="button" id="dt-sell-on" class="dt-toggle" aria-pressed="false">✕ TẮT</button></div>
            <label>Ngưỡng đầy túi <select id="dt-sell-pct"><option value="70">70%</option><option value="80">80%</option><option value="85">85%</option><option value="90">90%</option><option value="95">95%</option></select></label>
            <label>Số ô trống tối thiểu <select id="dt-sell-free"><option value="3">3</option><option value="5">5</option><option value="8">8</option><option value="10">10</option><option value="15">15</option></select></label>
            <label>Khoảng cách giữa hai lần bán <select id="dt-sell-cool"><option value="60">60 giây</option><option value="120">2 phút</option><option value="300">5 phút</option><option value="600">10 phút</option></select></label>
            <button type="button" id="dt-sell-once" class="dt-export">Kiểm tra và bán 1 lần theo lọc</button>
            <small>Khi đạt ngưỡng đầy túi hoặc số ô trống, Auto mở Bán đồ và nhấn đúng Bán theo lọc. Dùng toàn bộ danh sách do game chọn. Hãy khóa đồ quý và kiểm tra bộ lọc trong Hành trang trước khi bật. Bán không hoàn tác. Nếu không thấy UID được chọn biến mất, Auto tạm ngừng thử, tránh gửi lặp.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-quick" data-dt-pane="quick" role="tabpanel" aria-labelledby="dt-nav-quick" hidden>
          <div class="dt-boss"><h4>⚡ Cửa sổ mở từ ngoài thành</h4>
            <div class="dt-quick-grid" id="dt-quick-grid"></div>
            <pre class="dt-wb-live" id="dt-quick-status" aria-live="polite">Các nút chỉ mở cửa sổ game. Không tự mua, bán, đổi danh hiệu hay di chuyển về thành.</pre>
            <small>Chợ, Kỳ Trân Các và Danh hiệu chỉ mở giao diện. Một số thao tác mua/bán, nhiệm vụ hoặc phần thưởng bên trong vẫn có thể bị máy chủ giới hạn theo vị trí/trạng thái.</small>
          </div>
        </section>
        <section class="dt-tab-content" id="dt-pane-stats" data-dt-pane="stats" role="tabpanel" aria-labelledby="dt-nav-stats" hidden>
          <div class="dt-stats"><h4>📊 Thống kê theo phiên</h4><pre id="dt-metrics"></pre></div>
          <div class="dt-help">EXP là mức tăng quan sát, không phải tổng EXP chính xác khi lên cấp.</div>
        </section>
        <section class="dt-tab-content" id="dt-pane-logs" data-dt-pane="logs" role="tabpanel" aria-labelledby="dt-nav-logs" hidden>
          <div class="dt-help">Kết quả sự kiện — lưu riêng từng nhân vật, tối đa 500 dòng; dưới đây là 100 dòng mới nhất. Xuất nhật ký để xem đầy đủ.</div><pre class="dt-log" id="dt-event-log" style="white-space:pre-wrap;overflow:auto"></pre>
          <div class="dt-log" id="dt-log"></div>
          <button type="button" id="dt-export" class="dt-export">⬇ Xuất nhật ký chẩn đoán TXT</button>
          <div class="dt-help">Nhật ký không chứa token hoặc cookie. Hãy xem lại thông tin nhiệm vụ trước khi chia sẻ.</div>
        </section>
      </div>
    </div>`;
  document.body.appendChild(p);
  let activeTab = 'general';
  function activateTab(name) {
    const pane = p.querySelector('[data-dt-pane="' + name + '"]');
    if (!pane) return;
    activeTab = name;
    p.querySelectorAll('[data-dt-tab]').forEach(b => {
      const active = b.dataset.dtTab === name;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
    });
    p.querySelectorAll('[data-dt-pane]').forEach(section => {
      const active = section.dataset.dtPane === name;
      section.classList.toggle('is-active', active);
      section.hidden = !active;
    });
    const viewport = p.querySelector('.dt-tab-viewport');
    if (viewport) viewport.scrollTop=0;
  }
  const tabButtons = [...p.querySelectorAll('[data-dt-tab]')];
  tabButtons.forEach((b,i) => {
    b.addEventListener('click', () => activateTab(b.dataset.dtTab));
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const target=tabButtons[(i+(e.key==='ArrowRight'?1:tabButtons.length-1))%tabButtons.length];
      activateTab(target.dataset.dtTab); target.focus();
    });
  });
  activateTab(activeTab);
  function renderFieldKiteToggle(){
    const el=$('#dt-field-kite'),enabled=fieldKiteEnabled();
    el.disabled=!charIdentity();
    el.classList.toggle('is-on',enabled);
    el.setAttribute('aria-pressed',String(enabled));
    el.textContent=enabled?'✓ BẬT':'✕ TẮT';
  }
  function draw() {
    if (!p.isConnected) return;
    renderFieldKiteToggle();
    const s = game();
    const charEl=$('#dt-character'); if (charEl) {
      charEl.textContent=characterLabel();
      const c=characterInfo();
      charEl.title=c?'Ngân lượng: '+(c.gold===null?'chưa đồng bộ':c.gold.toLocaleString('vi-VN'))+
        ' | Dã Tẩu: '+(c.questStep===null?'chờ đồng bộ':'bước '+c.questStep)+
        ' | Hoàn thành trong phiên: '+st.completed+'/'+cfg.target:'';
    }
    const chLive=$('#dt-ch-live'); if (chLive) chLive.textContent=channelRankText();
    $('#dt-status').textContent = `${cfg.daTauPaused ? '⏸ Tạm dừng nhận/trả Dã Tẩu · ' : ''}${s && !questEligible(s) ? '🔒 Dã Tẩu đang luyện đến cấp 40 · ' : ''}${s && !worldBossEligible(s) ? '🐉 Boss cần cấp 60 hoặc chuyển sinh\n' : ''}${s?.reborns>0 ? '☯️ Đã chuyển sinh '+s.reborns+' lần · ' : ''}${st.running ? (st.questActive ? '🟢 ĐANG CHẠY' : '🟡 CHỜ SỰ KIỆN') : '⚪ ĐÃ DỪNG'} | ${st.completed}/${cfg.target} bước | ${s ? s.have + '/' + s.need : 'chưa có dữ liệu'}\n${st.status}${st.boss.phase !== 'idle' ? '\n🐉 Boss: ' + st.boss.phase + ' (' + st.boss.slot + ')' + (st.boss.phase === 'respawning' ? ' · Đang chờ hồi sinh / vào lại' : '') : ''}${st.recoveryAt ? '\n⏳ Dang phuc hoi sau khi ve thanh' : ''}${st.chosenZone ? '\nBãi chọn: ' + st.chosenZone.name : ''}${Object.keys(st.map.failures).length ? '\nMap da tam bo qua: ' + Object.keys(st.map.failures).length : ''}${s && !s.town ? '\nKênh: ' + (typeof R !== 'undefined' ? R.ch : '?') + ' · ' + (st.channel.label || 'đang kiểm tra') : ''}`;
    $('#dt-status').style.whiteSpace = 'pre-wrap';
    $('#dt-log').textContent = st.logs.join('\n');
    if($('#dt-event-log'))$('#dt-event-log').textContent=auditText();
    const metricsEl=$('#dt-metrics'); if (metricsEl) metricsEl.textContent=metricsText();
    const wbEl=$('#dt-wb-live');if(wbEl)wbEl.textContent=bossUiText();
    const qzEl=$('#dt-quiz-live');if(qzEl)qzEl.textContent=quizText();
    const rbEl=$('#dt-rebirth-live');if(rbEl)rbEl.textContent=rebirthUiText();
    const bagEl=$('#dt-bag-live');if(bagEl)bagEl.textContent=sellStatusText();
    const followStatus=$('#dt-party-follow-status');if(followStatus)followStatus.textContent=cfg.partyFollowWorld?partyFollow.status:'Theo tuyển đội đang tắt';
    const partyWorldStatus=$('#dt-party-world-status');if(partyWorldStatus)partyWorldStatus.textContent=cfg.partyWorldChat?partyWorldChat.status:'Thông báo thế giới đang tắt';
    const partyLive=$('#dt-party-live');if(partyLive)partyLive.textContent=partyInvite.status+[...partyInvite.away].map(([acc,v])=>'\nThành viên '+acc+': khác kênh '+Math.floor((Date.now()-v.since)/1000)+'s / 300s').join('');
    const rangeLive=$('#dt-range-live');if(rangeLive)rangeLive.textContent=rangeCombat.status+'\nGói ra chiêu: '+rangeCombat.casts+' · Lượt ra chiêu vào Boss: '+rangeCombat.bossCasts+' · Lệnh đi tới Boss: '+rangeCombat.moves+' · Dừng khi đủ tầm: '+rangeCombat.stops;
    const bossPosition=$('#dt-boss-position-live');if(bossPosition)bossPosition.textContent=bossApproach.status;
    const tkLive=$('#dt-tk-live');if(tkLive)tkLive.textContent=tongKim.status+(tongKimInside()?'\n'+(cfg.tongKimCombatEnabled?'Tự chiến đấu':'Hỗ trợ trong tầm')+' · '+tkCombat.status:'')+'\nPha: '+tongKim.phase+' · lượt gửi '+tongKim.attempts+' · đường '+(tongKim.lastWay||'chưa gửi');
    const rew=$('#dt-reward-live');if(rew)rew.textContent='Nút Quà Hoạt động: '+(cfg.rewardManualMode?'BẬT':'TẮT')+' · nhấn '+rewardNet.manualClicks+' · xác nhận '+rewardNet.manualConfirmed+' · lỗi '+rewardNet.manualFailures+'\nThưởng: '+rewardNet.lastResult+'\nTrạng thái: '+(rewardNet.active?'đang kiểm tra':'chờ')+' · xác nhận '+rewardNet.confirmed+' · quá hạn '+rewardNet.timeouts+'\nQuay miễn phí: '+(cfg.rewardFreeSpin?'bật (chỉ spin=0)':'tắt');
    if(rew){const rows=dailyRows();rew.textContent+='\nNgày: '+rows.filter(r=>r.got).length+'/'+rows.length+' đã nhận · '+rows.filter(r=>r.ready).length+' đủ điều kiện · '+(allRewardsDone()?'ngừng đến 0 giờ':rewardsRuntime.nextAt?'lần tới '+new Date(rewardsRuntime.nextAt).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'chờ kiểm tra lần đầu');}
    const du=$('#dt-dual-live');if(du)du.textContent='Chế độ: '+cfg.dualRouteMode+' | Lệnh '+dual.counts.command+' · UI '+dual.counts.ui+' · Không có đường '+dual.counts.unavailable+'\n'+Object.entries(dual.last).slice(-4).map(([k,v])=>k+': '+v.way).join(' · ');
    const wd=$('#dt-watch-live');if(wd)wd.textContent='Kết nối: '+(isOnline()?'OK':'CHỜ')+' | R.ready: '+(typeof R!=='undefined'&&!!R.ready?'OK':'CHỜ')+'\nWatchdog: '+watch.reason+' | Phục hồi: '+watch.reconnectAttempts+' lần\nDã Tẩu: '+(st.questActive?'đang chạy':'đã đủ bước / chờ sự kiện')+(st.softUntil?'\nTạm nghỉ: '+st.softFault:'');
    $('#dt-mini-status').textContent = (st.running ? (st.questActive?'🟢 ĐANG CHẠY':'🟡 CHỜ SỰ KIỆN') : '⚪ ĐÃ DỪNG') + ' · ' + st.completed + '/' + cfg.target + ' bước · ' + (s ? s.have + '/' + s.need : '--');
  }
  function restoreRunOptions(options){
    for(const [key,value] of Object.entries(options||{})){
      // Legacy run snapshots cannot distinguish an explicit choice from the old 1-minute default.
      if(key==='bossPrepareMinutes')continue;
      if(Object.prototype.hasOwnProperty.call(cfg,key)&&typeof cfg[key]===typeof value)cfg[key]=value;
    }
  }
  function beginAuto(resume=null) {
    resetPartyWait();
    const s = game();
    if (!s) return say('Khong doc duoc nhan vat (hoac Da Tau chua dong bo o cap 40+)');
    const missing=checkCompatibility();
    if(missing.length)return say('Thiếu dữ liệu game: '+missing.join(', ')+'. Chưa khởi động để tránh lỗi.');
    if(resume){
      restoreRunOptions(resume.options);
      $('#dt-reward').value=cfg.reward;$('#dt-target').value=cfg.target;$('#dt-channel').value=cfg.channelMode;$('#dt-boss-early').value=cfg.bossPrepareMinutes;$('#dt-quiz-mode').value='guess';
      $('#dt-rebirth-mode').value=cfg.rebirthMode;$('#dt-rebirth-target').value=cfg.rebirthTarget;$('#dt-rebirth-max').value=String(cfg.rebirthMaxPerRun);
      for(const [id,k] of [['dt-sell-pct','autoSellPct'],['dt-sell-free','autoSellMinFree'],['dt-sell-cool','autoSellCooldown']])$('#'+id).value=String(cfg[k]);
      cfg.target=Math.max(1,Math.min(1000,Math.floor(Number(cfg.target)||200)));
      if(!/^rank[1-6]$|^fixed[1-6]$/.test(cfg.channelMode))cfg.channelMode='rank3';
      $('#dt-channel').value=cfg.channelMode;$('#dt-target').value=cfg.target;
      renderBossToggles();updateRebirthControls();
    }
    cfg.reward = $('#dt-reward').value;
    cfg.bossPrepareMinutes = Number($('#dt-boss-early').value);
    cfg.channelMode = $('#dt-channel').value;
    cfg.target = Math.min(1000, Math.max(1, Number($('#dt-target').value) || 200));
    sessionSerial++;
    abortQuizWeb();rebirth.phase='idle';rebirth.count=0;rebirth.retries=0;rebirth.lastError='';
    sellFlow.sentAt=0;sellFlow.beforeIds.clear();sellFlow.lastAt=0;sellFlow.blockedUntil=0;sellFlow.noChange=0;sellFlow.saved=0;sellFlow.requests=0;sellFlow.confirmed=0;sellFlow.lastResult='Chưa bán';
    Object.assign(metrics,{rebirths:0,quizWebLookups:0,quizWebHits:0,startedAt:Date.now(),last:null,lastLogPrimed:false,expObserved:0,kills:0,questSteps:0,bossQuestDone:0,bossWorldEntries:0,bossWorldFinishes:0,bossWorldDamage:0,bossWorldBestRank:null,bossWorldJoinRequests:0,bossWorldRejoinRequests:0,bossSightings:0,mapMoves:0,channelMoves:0,townReturns:0,deathsObserved:0,knLocal:0,knLog:0,lastKnN:null,seenLogKeys:[],lastDeath:false,lastZone:'',lastChannel:null,lastQuestStep:null,quizAnswered:0,quizKnown:0,quizGuessed:0,quizCorrect:0,quizWrong:0,quizLearned:0});
    townCombatWait.at=0;townCombatWait.key='';
    netState.offlineAt=0; netState.resumeAt=0; townFlow.request=null;bossPreflightAt=0;
    clearTownRecovery();resetFieldSafety();
    deathGuard.recent=[];deathGuard.lastWarning=0;deathGuard.lastZone='';rewardNet.active=false;rewardTownGuard.lastTown=false;rewardTownGuard.lastStartAt=0;rewardsRuntime.lastTownScan=0;
    Object.assign(starterExit,{at:0,tries:0,lastWarning:0,cooldownUntil:0,rounds:0,lastResult:'Chưa yêu cầu rời Ba Lăng'});
    Object.assign(questReborn,{blockedAction:'',waitLevel:0,until:0,noDataAt:0,
      lastInfo:'Chờ máy chủ xác nhận Dã Tẩu sau chuyển sinh',rejected:0});
    resetBossHunt();clearBossApproach();bossTarget.id=null;bossTarget.zone=null;bossTarget.lastAt=0; zoneGuard.saved=null;
    diagnostic('START',resume?'Khôi phục phiên Auto v2.0 sau reload':'Bắt đầu phiên Auto v2.0');
    st.baseStep = resume && Number.isFinite(resume.baseStep) ? resume.baseStep : (s.q?s.step:null);
    st.lastReborns=Number(s.reborns)||0;
    st.completed = resume && Number.isFinite(resume.completed)?Math.max(0,resume.completed):0;
    st.questActive = resume ? resume.questActive!==false : true;st.softUntil=0;st.softFault='';st.softTries=0; st.action = ''; st.ackFailures=0; st.busyToken=null;
    st.fieldHave = null; st.fieldAt = 0; st.chosenZone = null; st.busy = false;
    st.lastTown = s.town; st.recoveryAt = 0; st.recoveryAttempts = 0;
    st.recoveryStatus = ''; st.recoveryStep = null; st.zoneRetryAt = 0;
    restoreQuestBossPriority();
    st.map = { failures: {}, requested: null, lastZone: '', noProgressAt: 0, noProgressHave: null, questStep: null, questText:'', reportAt: 0, rotations: 0 };
    st.channel = { key: '', done: false, pending: 0, sentAt: 0, enteredAt: 0, tries: 0, label: '' };
    st.boss.phase = 'idle'; st.boss.slot = ''; st.boss.joinTries = 0;
    // Khởi động mới kiểm tra một lần; khôi phục nội bộ giữ lịch 60 phút.
    st.startup='done';
    const rewardSaved=readRewards().raw;
    Object.assign(rewardsRuntime,{identity:charIdentity(),day:vnDate(),scope:null,
      initialChecked:!!resume&&rewardSaved.checkedDay===vnDate()&&Number.isFinite(rewardSaved.checkedAt),
      nextAt:resume&&rewardSaved.checkedDay===vnDate()?Number(rewardSaved.checkedAt||0)+60*60000:0}); st.startupAt = 0; st.startupJob = null; st.startupOnce = false;
    startupField.step=s.step;startupField.zone=s.zone;startupField.kind=questKind(s.text);
    startupField.active=canQuestProgressHere(s,startupField.kind);startupField.reported=false;
    if(startupField.active) diagnostic('START','Da Tau dang thuc hien duoc tai bai hien tai; khong ve thanh',{zone:s.zone,step:s.step,quest:s.text});
    else if(!s.town) diagnostic('START','O ngoai bai nhung chua xac nhan hop le; kiem tra truoc khi doi bai',{zone:s.zone,step:s.step,quest:s.text});
    st.running = true;
    if(resume){
      if(Number.isFinite(resume.startAt))metrics.startedAt=resume.startAt;
      for(const [k,v] of Object.entries(resume.metrics||{}))if(Number.isFinite(v)&&k in metrics)metrics[k]=v;
      if(Number.isFinite(resume.rebirthCount))rebirth.count=resume.rebirthCount;
      if(Number.isFinite(resume.lastReborns))st.lastReborns=resume.lastReborns;
      diagnostic('RESUME','Da khoi phuc '+st.completed+' buoc; khong dem lai tu dau');
    }
    watch.progressValue='';watch.lastProgress=Date.now();
    persistRun(true);
    sampleMetrics(s);
    if(startupField.active) say('Bat dau: giu bai '+s.zone+' vi nhiem vu dang do hop le, chi kiem tra kenh va tiep tuc luyen.');
    say(!questEligible(s) ? ('Bắt đầu luyện cấp '+s.level+'/'+MIN_DA_TAU_LEVEL+' (chưa chuyển sinh)') :
      ('Bắt đầu từ bước '+s.step+' · chuyển sinh '+s.reborns+' · thưởng '+cfg.reward+
      (worldBossEligible(s)?'; Boss Thế Giới có thể tham gia':' ; Boss từ cấp 60 hoặc chuyển sinh')));
    tick();
  }
  $('#dt-dual-mode').value=cfg.dualRouteMode;
  $('#dt-dual-mode').onchange=e=>{cfg.dualRouteMode=e.target.value;saveExtraPrefs();diagnostic('DUAL','Đổi đường điều khiển', {mode:cfg.dualRouteMode});draw();};
  $('#dt-start').onclick=()=>beginAuto();
  $('#dt-reward-manual-now').onclick=()=>{
    const state=game();
    if(!st.running||!state||!isOnline()||rewardNet.active||st.startup==='running'||st.boss.phase!=='idle'||rebirth.phase!=='idle'){
      say('Chỉ quét thưởng khi Auto đang chạy, online và không bận tác vụ khác');return;
    }
    if(!requestRewardScan(true))say('Không kiểm tra thêm: đã nhận đủ thưởng ngày hoặc đang bận');
  };
  // Dung button rieng de tranh CSS checkbox cua game lam mat kha nang tick.
  const bossToggles = [
    ['dt-resume-on','resumeAfterReload'],
    ['dt-events-on','continueEventsAfterTarget'],
    ['dt-watch-reload','watchdogReload'],
    ['dt-rewards-direct','rewardDirectEnabled'],
    ['dt-rewards-manual','rewardManualMode'],
    ['dt-free-spin','rewardFreeSpin'],
    ['dt-sell-on','autoSellEnabled'],
    ['dt-boss-channel', 'bossChannelRotate'],
    ['dt-quiz-on','quizEnabled'],
    ['dt-quiz-web','quizWebSearch'],
    ['dt-rebirth-on','rebirthEnabled'],
    ['dt-rebirth-wait','rebirthWaitQuest'],
    ['dt-prefer-boss', 'preferBossMaps'],
    ['dt-boss-position', 'bossPositionEnabled'],
    ['dt-range-hold','rangedHoldEnabled'],
    ['dt-party-invite', 'partyInviteEnabled'],
    ['dt-party-wait','partyWaitEnabled'],
    ['dt-party-world','partyWorldChat'],
    ['dt-party-follow','partyFollowWorld'],
    ['dt-party-channel','partyPreferChannel'],
    ['dt-party-leave','partyLeaveOtherMap'],
    ['dt-party-kick','partyKickAway'],
    ['dt-afk-on', 'powerSaveAfk'],
    ['dt-quest-boss', 'bossQuestEnabled'],
    ['dt-boss-on', 'bossWorldEnabled'],
    ['dt-da-tau-pause', 'daTauPaused'],
    ['dt-tk-on', 'tongKimEnabled'],
    ['dt-tk-combat', 'tongKimCombatEnabled'],
    ['dt-boss-12', 'bossAt12'],
    ['dt-boss-21', 'bossAt21'],
    ['dt-boss-resume', 'resumeDaTau'],
    ['dt-boss-rejoin', 'bossRejoinOnDeath'],
    ['dt-wb-priority', 'worldBossCombatPriority']
  ];
  function renderBossToggles() {
    for (const [id, key] of bossToggles) {
      const el = $('#' + id), on = !!cfg[key];
      if (!el) continue;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-pressed', String(on));
      el.textContent = on ? '✓ BẬT' : '✕ TẮT';
    }
  }
  for (const [id, key] of bossToggles) {
    $('#' + id).addEventListener('click', e => {
      e.preventDefault();
      cfg[key] = !cfg[key];
      if(key==='daTauPaused'){
        if(/^(Nhan nhiem vu|Tra nhiem vu)/.test(st.action)){
          daTauHoldUntil=Math.max(daTauHoldUntil,st.actionAt+12000);
          st.action='';
        }
        if(/^(Ve thanh de nhan nhiem vu|Nhiem vu hoan thanh - ve thanh)/.test(townFlow.request?.label||''))townFlow.request=null;
        st.ackFailures=0;
        saveExtraPrefs();persistRun(true);renderBossToggles();
        say(cfg.daTauPaused?'Tạm dừng nhận/trả Dã Tẩu':'Tiếp tục nhận/trả Dã Tẩu theo tiến độ máy chủ');
        requestTick();return;
      }
      if(key==='tongKimCombatEnabled'){
        if(!cfg[key])tkReleaseMovement();
        else combatSync.forceSync=true;
        requestTick();
      }
      if(key==='quizWebSearch'&&!cfg[key])abortQuizWeb();
      if(key==='rangedHoldEnabled'&&!cfg[key])restoreRangedPolicy();
      saveExtraPrefs();
      renderBossToggles();
      if (key === 'bossQuestEnabled' && !cfg[key]) restoreQuestBossPriority();
      if (key === 'worldBossCombatPriority' && !cfg[key]) restoreWorldBossCombat();
      say('Tuy chon ' + key + ' = ' + (cfg[key] ? 'BAT' : 'TAT'));
    });
  }
  for(const [id,key] of [['dt-tk-hp','tongKimHpPct'],['dt-tk-mp','tongKimMpPct']]){
    const input=$('#'+id);
    input.value=String(cfg[key]);
    input.addEventListener('change',()=>{
      const value=input.valueAsNumber;
      if(Number.isInteger(value)&&value>=0&&value<=100){cfg[key]=value;saveExtraPrefs();}
      input.value=String(cfg[key]);
    });
  }
  $('#dt-field-kite').addEventListener('click',()=>{
    const enabled=!fieldKiteEnabled();
    if(!setFieldKiteEnabled(enabled))return;
    say('Né quái áp sát: '+(enabled?'BẬT':'TẮT'));
    renderFieldKiteToggle();requestTick();
  });
  for(const [id,key] of [['dt-sell-pct','autoSellPct'],['dt-sell-free','autoSellMinFree'],['dt-sell-cool','autoSellCooldown']]){
    const el=$('#'+id);el.value=String(cfg[key]);
    el.onchange=()=>{cfg[key]=Number(el.value);saveExtraPrefs();draw();};
  }
  $('#dt-sell-once').onclick=()=>{
    const b=bagState();
    if(!b||!isOnline()||!st.running){say('Hãy bật Auto và chờ túi/server đồng bộ để bán.');return;}
    if(st.boss.phase!=='idle'||arenaNow()||st.action){say('Đang Boss hoặc chuyển trạng thái; chưa bán.');return;}
    if(!S.lootF||typeof S.lootF!=='object'){say('Hãy thiết lập bộ lọc đồ trong game trước khi bán.');return;}
    if(sellFlow.sentAt){say('Đang chờ máy chủ xác nhận lần bán trước.');return;}
    if(!window.confirm('Gửi lệnh bán theo đúng danh sách bộ lọc hiện tại của game (đúng nút Bán theo lọc của game)? KHÔNG THỂ hoàn tác. Hãy khóa đồ quý trước khi xác nhận.'))return;
    const ok=sellTick(game(),true);
    if(!ok)say('Chưa gửi bán: '+sellFlow.lastResult);
    draw();
  };
  $('#dt-rebirth-mode').value=cfg.rebirthMode;
  $('#dt-rebirth-target').value=cfg.rebirthTarget;
  $('#dt-rebirth-max').value=String(cfg.rebirthMaxPerRun);
  function updateRebirthControls(){
    $('#dt-rebirth-target').disabled=cfg.rebirthMode!=='custom';
    $('#dt-rebirth-target').style.opacity=cfg.rebirthMode==='custom'?'1':'.55';
    draw();
  }
  $('#dt-rebirth-mode').onchange=()=>{cfg.rebirthMode=$('#dt-rebirth-mode').value;saveExtraPrefs();updateRebirthControls();};
  $('#dt-rebirth-target').onchange=()=>{cfg.rebirthTarget=Math.max(100,Math.min(500,Math.floor(Number($('#dt-rebirth-target').value)||100)));$('#dt-rebirth-target').value=cfg.rebirthTarget;saveExtraPrefs();draw();};
  $('#dt-rebirth-max').onchange=()=>{cfg.rebirthMaxPerRun=Number($('#dt-rebirth-max').value);saveExtraPrefs();draw();};
  updateRebirthControls();
  cfg.quizUnknown='guess';$('#dt-quiz-mode').value='guess';
  $('#dt-party-names').value=partyNamesPref.names.join(String.fromCharCode(10));
  $('#dt-party-names-mode').value=partyNamesPref.mode;
  $('#dt-party-names-save').onclick=()=>{
    try{partyNamesSave($('#dt-party-names-mode').value,$('#dt-party-names').value);partyInvite.nextAt=0;
      say('Đã lưu '+partyNamesPref.names.length+' tên · '+(partyNamesPref.mode==='only'?'chỉ mời danh sách':'ưu tiên danh sách'));draw();
    }catch(e){say(e.message);}
  };
  $('#dt-quiz-mode').onchange=()=>{cfg.quizUnknown=$('#dt-quiz-mode').value;say('Hoa Đăng: xác nhận → đối chiếu thư viện + Internet song song → đoán; luôn chọn khi còn thời gian');};
  $('#dt-quiz-export').onclick=quizExport;
  $('#dt-quiz-import').onclick=()=>{
    const el=document.createElement('input');el.type='file';el.accept='.json,application/json';el.hidden=true;
    el.onchange=async()=>{try{const f=el.files?.[0];if(!f)return;const count=quizImportData(await f.text());say('Da nhap '+count+' dap an Hoa Dang.');}catch(e){say('Nhap dap an that bai: '+e.message);}finally{el.remove();draw();}};
    document.body.appendChild(el);el.click();
  };
  $('#dt-wb-refresh').onclick=()=>{if(isOnline()){requestBossStatus(true);say('Da hoi trang thai Boss The Gioi tu may chu');}else say('Chua ket noi, chua gui lenh WB:st');};
  $('#dt-boss-early').value=String(cfg.bossPrepareMinutes);
  $('#dt-boss-early').addEventListener('change', () => {
    cfg.bossPrepareMinutes=Number($('#dt-boss-early').value);
    saveExtraPrefs();
    persistRun(true);
    draw();
  });
  renderBossToggles();
  $('#dt-ch-recheck').onclick = () => {
    const ranking=channelRankText();
    diagnostic('CHANNEL','Yeu cau kiem tra lai bang xep hang',{mode:cfg.channelMode,ranked:rankedChannels()});
    if (st.running) { st.channel.done=false;st.channel.pending=0;st.channel.tries=0;st.channel.enteredAt=Date.now()-2000; }
    say('Da tinh lai thu hang kenh tu R.chs. '+(chooseChannel().label||chooseChannel().error));
    draw();
  };
  $('#dt-channel').onchange = () => {
    cfg.channelMode = $('#dt-channel').value;
    if (st.running) { st.channel.done = false; st.channel.pending = 0; st.channel.tries = 0; st.channel.enteredAt = Date.now(); }
    diagnostic('CHANNEL','Doi che do chon kenh',{mode:cfg.channelMode,ranked:rankedChannels()});
    say('Lua chon kenh: ' + $('#dt-channel').selectedOptions[0].textContent + ' · ' +(chooseChannel().label||chooseChannel().error));
  };
  // Các cửa sổ do client VL4 xuất công khai: panelOpen, ktcWin, giftWin,...
  // Chỉ gọi hàm mở cửa sổ, KHÔNG tự gửi lệnh mua/bán/nhận thưởng/tốn tiền.
  const QUICK_WINDOWS = [
    ['market','🏛️ Chợ', 'panelOpen', 'mk'],
    ['curios','🏺 Kỳ Trân Các', 'ktcWin'],
    ['titles','🏅 Danh hiệu / Thành tựu', 'giftWin','ach'],
    ['gift','🎁 Quà ngày', 'giftWin','sign'],
    ['weekly','📅 Nhiệm vụ tuần','wqWin'],
    ['quest','📜 Dã Tẩu','qcWin'],
    ['boss','🐉 Boss Thế Giới','wbWin'],
    ['chest','🎁 Rương Phúc Duyên','fdWin'],
    ['rank','🏆 Bảng xếp hạng','panelOpen','rank'],
    ['guild','🛡️ Bang hội','panelOpen','guild'],
    ['team','👥 Tổ đội','panelOpen','team'],
    ['friend','🤝 Bạn bè','panelOpen','friend'],
    ['reborn','☯️ Chuyển sinh / Tâm pháp','rebornWin'],
  ];
  const quickGrid=$('#dt-quick-grid');
  const quickStatus=$('#dt-quick-status');
  const quickAvailability=()=>QUICK_WINDOWS.map(([id,label,fn,arg])=>({id,label,available:typeof window[fn]==='function',fn,arg:arg||null}));
  for(const [key,label,fn,arg] of QUICK_WINDOWS){
    const btn=document.createElement('button');
    btn.type='button';btn.className='dt-quick-btn';btn.textContent=label;btn.dataset.quick=key;
    btn.title='Mở cửa sổ '+label+' ngay tại bản đồ đang đứng';
    btn.addEventListener('click',()=>{
      if(typeof NET==='undefined'||!NET.inGame||typeof R==='undefined'||!R.ready){
        quickStatus.textContent='Chưa vào game hoặc dữ liệu bản đồ chưa sẵn sàng. Không mở '+label+'.';return;
      }
      const opener=window[fn];
      if(typeof opener!=='function'){
        quickStatus.textContent='Hàm '+fn+' không tồn tại trong phiên bản game hiện tại.';
        diagnostic('QUICK','Khong tim thay ham mo '+fn,{window:key});return;
      }
      try {
        if(arg===undefined)opener();else opener(arg);
        quickStatus.textContent='Đã gọi mở '+label+' tại vị trí hiện tại. Việc sử dụng chức năng bên trong tùy quy định máy chủ.';
        diagnostic('QUICK','Mo '+label,{window:key,zone:String(R.vlZone||'')});
      } catch(e){
        quickStatus.textContent='Không mở được '+label+': '+String(e?.message||e);
        diagnostic('QUICK','Loi mo '+label,{error:String(e?.message||e)});
      }
    });
    quickGrid.appendChild(btn);
  }
  $('#dt-stop').onclick = () => stop('Dung theo yeu cau');
  $('#dt-export').onclick = exportDiagnostics;
  $('#dt-mini').onclick = () => { st.minimized = !st.minimized; p.classList.toggle('dt-mini', st.minimized); $('#dt-mini').textContent = st.minimized ? '▢' : '−'; $('#dt-mini').title = st.minimized ? 'Mở rộng' : 'Thu nhỏ'; draw(); };
  function remove() { stop('Da go bo panel'); clearInterval(timer); clearInterval(quizTimer);uninstallQuizWire();clearInterval(persistTimer);stopDriver();uninstallQuizHook(); p.remove(); css.remove(); delete window.__VL4_DA_TAU; delete window.__AUTO_S4; }
  $('#dt-x').onclick = remove;
  const timer = setInterval(requestTick, delay);
  const persistTimer=setInterval(()=>persistRun(),5000);
  const quizTimer=setInterval(()=>{installQuizWire();ensureDispatchHook();fieldSafetyInstall();installQuizHook();quizTick();}, 750);
  installQuizWire();installQuizHook();
  startDriver();
  // Chờ đúng nhân vật và zone từ server trước khi khôi phục, không chạm phiên khác.
  let resumeTimer=null;
  const resumeCandidate=upgradeResume||readSavedRun();
  if(resumeCandidate){
    let tries=0;
    resumeTimer=setInterval(()=>{
      if(!p.isConnected||st.running||++tries>120){clearInterval(resumeTimer);return;}
      if(typeof NET!=='undefined'&&NET.kick){deactivateSavedRun('Kicked trước khi tự nối lại');clearInterval(resumeTimer);return;}
      if(typeof NET==='undefined'||!NET.inGame||typeof R==='undefined'||!R.ready)return;
      const id=charIdentity();
      if(!id)return;
      clearInterval(resumeTimer);
      if(id!==resumeCandidate.identity){deactivateSavedRun('Đổi nhân vật: hủy tự chạy lại');say('Không tự bật: nhân vật hiện tại khác phiên đã lưu.');return;}
      if(!cfg.resumeAfterReload&&!upgradeResume){deactivateSavedRun('Tùy chọn tự chạy lại đã tắt');return;}
      beginAuto(resumeCandidate);
    },1500);
  }
  window.addEventListener('pagehide',()=>persistRun(true),{once:true});
  window.__AUTO_S4 = window.__VL4_DA_TAU = { version:"2.1.9", nativeQuest:{status:()=>({...nativeQuest,savedZone:undefined})}, range:{status:()=>({...rangeCombat,savedMelee:undefined,positions:undefined,samples:rangeCombat.samples.slice(-80)}),profile:()=>activeRangeProfile()}, party:{status:()=>({...partyInvite,raw:undefined,seen:undefined,away:[...partyInvite.away].map(([acc,v])=>({acc,...v})),recent:[...partyInvite.recent],pending:partyInvite.pending?{...partyInvite.pending}:null}),channel:()=>partyChannelChoice(game())}, tongKim:{status:()=>({...tongKim,info:tongKim.info?{...tongKim.info}:null}),open:()=>tongKimOpenUI()}, townRecovery:{status:()=>({...townRecovery,target:townRecovery.target?{...townRecovery.target}:null,tried:[...townRecovery.tried]})}, bossPosition:{status:()=>({...bossApproach,input:undefined,target:bossApproach.target?{...bossApproach.target}:null})}, combat:{status:()=>({...combatSync,config:combatEnabled(),button:combatButtonState(),control:combatControl()?.id||null})}, rebirth:{status:()=>({...rebirth}),need:()=>rebirthThreshold(),tick:()=>{const s=game();return s?rebirthTick(s):false;}}, start: () => $('#dt-start').click(), stop, remove, tick, exportLog:exportDiagnostics, stats:()=>({...metrics}), watchdog:()=>({...watch}),resume:{saved:readSavedRun,clear:()=>deactivateSavedRun('Xóa phiên đã lưu')},channelRanking:()=>rankedChannels(), channelChoice:()=>chooseChannel(),
    bag:{status:()=>({...bagState(),...sellFlow,beforeIds:undefined,pendingIds:[...sellFlow.pendingIds]}),preview:()=>explicitSellPlan(),tick:()=>sellTick(game())},
    rewards:{daily:()=>({rows:dailyRows(),saved:readRewards().raw.progress||null,last:rewardNet.lastDaily||null,retryNeeded:rewardsRuntime.retryNeeded}),manual:()=>requestRewardScan(true),scan:()=>requestRewardScan(false),status:()=>({...rewardNet,dual:{...rewardDual,switchNext:{...rewardDual.switchNext},lastWay:{...rewardDual.lastWay}},scheduler:{...rewardTownGuard,nextAt:rewardsRuntime.nextAt,day:rewardsRuntime.day,initialChecked:rewardsRuntime.initialChecked},sign:rewardDone('sign',rewardServer('sign')),daily:rewardDone('daily',rewardServer('daily')),weekly:rewardDone('weekly',rewardServer('weekly'))})},
    quiz:{status:()=>quizRunStatus(),wire:()=>({...quizRunStatus().wire}),bank:()=>Object.keys(quizBank.entries).length,importData:quizImportData,exportBank:quizExport,tick:quizTick,web:()=>({...quizWeb,abort:undefined})},
    quick:{available:quickAvailability,open:(id)=>{const b=quickGrid.querySelector('[data-quick="'+String(id).replace(/[^a-z]/g,'')+'"]');if(!b)return false;b.click();return true;}},
    dual:{status:dualStatus,capabilities:()=>({...DUAL_CAPABILITIES}),setMode:mode=>{if(!['auto','command','ui'].includes(mode))return false;cfg.dualRouteMode=mode;$('#dt-dual-mode').value=mode;saveExtraPrefs();draw();return true;}},
    character:()=>({...characterInfo(), questCompletedThisRun:st.completed, questTarget:cfg.target}),
    eligibility:()=>{const s=game();return {level:s?.level,reborns:s?.reborns,daTau:questEligible(s),boss:worldBossEligible(s,bossServer()),questFallback:{...questReborn}};},
    get state() { return { ...st, config: { ...cfg }, questBoss: { ...questBoss, visible: fieldBosses().map(e => e.n) }, bossHunt:{ ...bossHunt }, worldBoss:{ ...st.boss, snapshot: bossServer(), ui:bossUiText() }, network:{...netState,online:isOnline(),watchdog:{...watch}}, questActive:st.questActive, metrics:{...metrics}, game: game(), mapDiagnostics: { current: typeof R !== 'undefined' ? R.vlZone : null, characterLevel: game()?.level, eligibleZones: game() ? availableZones(game()).map(z => ({ id:z.id, name:z.n, lo:z.lo, hi:z.hi })) : [], selected: st.chosenZone, failures: st.map.failures, requested: st.map.requested,
      townExit: {...starterExit}, safeArea: game()?.town ?? null,
      requiredPlace: game()?.took ? questPlace(game()?.text) : null } }; } };
  draw(); say('Đã nạp v1.0: điều khiển hai đường lệnh và nút giao diện, có xác nhận từ máy chủ.');
})();
