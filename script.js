    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // --- Audio ---
    const bgm = new Audio('hyper.mp3');
    bgm.loop = true; bgm.volume = 0.5;
    let bgmStarted = false;
    function startBgm() {
        if (!bgmStarted) {
            bgm.play().then(() => { bgmStarted = true; }).catch(e => {});
        }
    }
    window.addEventListener('click', startBgm);
    window.addEventListener('touchstart', startBgm);
    window.addEventListener('keydown', startBgm);

    // --- Refs ---
    const expBar = document.getElementById('expBar');
    const lvText = document.getElementById('lvText');
    const hpText = document.getElementById('hpText');
    const scoreVal = document.getElementById('scoreVal');
    const bestVal = document.getElementById('bestVal');
    const infoMsg = document.getElementById('infoMsg');
    const infoText = document.getElementById('infoText');
    const infoIcon = document.getElementById('infoIcon');
    const comboEl = document.getElementById('comboCount');
    const comboLabel = document.getElementById('comboLabel');
    const hyperFill = document.getElementById('hyperFill');
    const rightHud = document.getElementById('rightHud');
    const typeIcon = document.getElementById('typeIcon');
    const dashIcon = document.getElementById('dashIcon');
    const levelUpScreen = document.getElementById('levelUpScreen');
    const levelUpTitle = document.getElementById('levelUpTitle');
    const cardsBox = document.getElementById('cardsBox');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const resultContainer = document.getElementById('resultContainer'); 
    const newRecordMsg = document.getElementById('newRecordMsg');
    const rushCountEl = document.getElementById('rushCount'); // (참조는 남겨둠, 사용 안 함)
    const rushProgressBar = document.getElementById('rushProgressBar');
    const rushProgressBarFill = document.getElementById('rushProgressBarFill');
    const rushBtn = document.getElementById('rushBtn');
    const rushSubText = document.getElementById('rushSubText');
    const rushLabel = document.getElementById('rushLabel');

    const CW = 360, CH = 640;
    canvas.width = CW; canvas.height = CH;

    let highScore = localStorage.getItem('survival_highscore') || 0;
    bestVal.innerText = parseInt(highScore).toLocaleString();

    let gameState = 'PLAY';
    let frameCount = 0;
    let screenShake = 0;
    let rushTimerInterval = null;
    let hasRushed = false; 

    const HYPER_RAPID = 0;
    const HYPER_EMP = 1;
    const HYPER_SHIELD = 2;

    const player = {
        wx: 0, wy: 0,
        r: 10, hitR: 5, grazeR: 45,
        color: '#0acde5',
        hp: 100, maxHp: 100,
        speed: 3.2, baseSpeed: 3.2, 
        damage: 15,
        critChance: 0.15, critDamage: 2.0,
        fireRate: 25, baseFireRate: 25,
        bulletCount: 1,
        magnet: 20, 
        level: 1, exp: 0, nextExp: 10,
        score: 0,
        hyperGauge: 0, isHyper: false, hyperTime: 0, hyperType: HYPER_RAPID,
        combo: 0, comboTimer: 0,
        lastShot: 0, showHpTimer: 0,
        killCount: 0, killTimer: 0,
        dashReady: true, dashCool: 0, dashMaxCool: 600, 
        isDashing: false, dashTime: 0, dashDuration: 15, dashVx: 0, dashVy: 0,
        pendingLevelUps: 0,
        shieldAngle: 0, shieldPulse: 0,
        isGrazingNow: false 
    };

    let joystick = { active: false, baseX: CW*0.2, baseY: CH*0.8, stickX: CW*0.2, stickY: CH*0.8, maxRadius: 30, vx: 0, vy: 0 };

    const dashZone = document.getElementById('dashZone');
    window.addEventListener('keydown', e => { if(e.code === 'Space') useDash(); });
    dashZone.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); useDash(); }, {passive:false});
    dashZone.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); useDash(); });

    function inputStart(cx, cy) {
        if(gameState!=='PLAY') return;
        const rect = canvas.getBoundingClientRect();
        const x = (cx - rect.left) * (CW / rect.width);
        const y = (cy - rect.top) * (CH / rect.height);
        if(x > CW*0.6 && y > CH*0.75) return; 
        joystick.active = true; joystick.baseX = x; joystick.baseY = y; joystick.stickX = x; joystick.stickY = y; joystick.vx = 0; joystick.vy = 0;
        startBgm();
    }
    function inputMove(cx, cy) {
        if(!joystick.active || gameState!=='PLAY') return;
        const rect = canvas.getBoundingClientRect();
        const x = (cx - rect.left) * (CW / rect.width);
        const y = (cy - rect.top) * (CH / rect.height);
        const dx = x - joystick.baseX; const dy = y - joystick.baseY;
        const dist = Math.hypot(dx, dy); const limit = Math.min(dist, joystick.maxRadius); const angle = Math.atan2(dy, dx);
        joystick.stickX = joystick.baseX + Math.cos(angle)*limit; joystick.stickY = joystick.baseY + Math.sin(angle)*limit;
        if (dist > 5) { joystick.vx=Math.cos(angle); joystick.vy=Math.sin(angle); } else { joystick.vx=0; joystick.vy=0; }
    }
    function inputEnd() { joystick.active = false; joystick.vx = 0; joystick.vy = 0; }

    canvas.addEventListener('mousedown', e=>inputStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e=>inputMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', inputEnd);
    canvas.addEventListener('touchstart', e=>{ e.preventDefault(); for(let i=0; i<e.changedTouches.length; i++) inputStart(e.changedTouches[i].clientX, e.changedTouches[i].clientY); }, {passive:false});
    window.addEventListener('touchmove', e=>{ e.preventDefault(); if(joystick.active) inputMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    window.addEventListener('touchend', e=>{ if(e.touches.length === 0) inputEnd(); });

    function useDash() {
        if(!player.dashReady || player.isDashing) return;
        let dx = joystick.vx; let dy = joystick.vy;
        if(dx === 0 && dy === 0) { dy = -1; }
        player.isDashing = true; player.dashTime = player.dashDuration;
        player.dashVx = dx; player.dashVy = dy;
        player.dashReady = false; player.dashCool = player.dashMaxCool;
        showMessage("DASH!", "#f1c40f");
        updateDashUI();
    }

        let msgTimer = null;
        function showMessage(text, color, iconSrc = null) { // iconSrc 인자 추가
            infoText.innerText = text;
            infoText.style.color = color;
            infoMsg.style.opacity = 1;
            infoText.classList.remove('pop-in');
            void infoText.offsetWidth;
            infoText.classList.add('pop-in');
    
            if (iconSrc) { // 아이콘 이미지 경로가 있으면
                infoIcon.src = iconSrc;
                infoIcon.style.display = 'block';
            } else { // 없으면 숨김
                infoIcon.style.display = 'none';
            }
    
            if(msgTimer) clearTimeout(msgTimer);
            msgTimer = setTimeout(() => {
                infoMsg.style.opacity = 0;
                infoIcon.style.display = 'none'; // 아이콘도 숨김 처리
            }, 600);
        }
    let enemies = []; let bullets = []; let gems = []; let texts = []; let effects = []; let hyperOrbs = [];
    function getObj(arr, Class) { let o = arr.find(x=>!x.active); if(!o) { o=new Class(); arr.push(o); } return o; }

    class HyperOrb {
        constructor() { this.active = false; }
        spawn(wx, wy, color) {
            this.wx = wx; this.wy = wy;
            this.color = color;
            this.active = true;
            this.progress = 0;
            this.startX = wx; this.startY = wy;
            
            // 목표: 화면 우측 게이지 부근
            this.targetRelX = CW/2 - 20; 
            this.targetRelY = -CH/2 + 250;

            // 제어점
            this.cpOffsetX = 100;
            this.cpOffsetY = -200;
            
            this.currentSpeed = 0.005; // 시작 속도

            this.colorCycle = 0; // 0: 흰색, 1: 빨간색
            this.colorChangeInterval = 4; // 0.07초 (60fps 기준)
            this.colorChangeCounter = 0;
            
            this.angle = 0; // 회전 각도
        }
        update() {
            // 가속 -> 감속 -> 급가속 로직
            if (this.progress < 0.3) {
                this.currentSpeed += 0.0005; 
            } else if (this.progress < 0.6) {
                this.currentSpeed *= 0.95; 
                if(this.currentSpeed < 0.003) this.currentSpeed = 0.003; 
            } else {
                this.currentSpeed *= 1.1; 
            }

            this.progress += this.currentSpeed;

            this.colorChangeCounter++;
            if (this.colorChangeCounter >= this.colorChangeInterval) {
                this.colorCycle = 1 - this.colorCycle; // 색상 토글
                this.colorChangeCounter = 0;
            }
            
            this.angle += 0.15; // 회전

            if (this.progress >= 1) {
                this.active = false;
                addHyper(20); 
                showMessage("SHUTDOWN", "#fdcb6e");
                return;
            }

            const t = this.progress;
            const u = 1 - t;
            
            const targetX = player.wx + this.targetRelX;
            const targetY = player.wy + this.targetRelY;
            const cpX = this.startX + this.cpOffsetX;
            const cpY = this.startY + this.cpOffsetY;

            this.wx = (u * u * this.startX) + (2 * u * t * cpX) + (t * t * targetX);
            this.wy = (u * u * this.startY) + (2 * u * t * cpY) + (t * t * targetY);
        }
        draw() {
            const sx = this.wx - player.wx + CW/2; 
            const sy = this.wy - player.wy + CH/2;
            
            // 색상 결정 (흰색 <-> 빨간색)
            const curColor = this.colorCycle === 0 ? "#ffffff" : "#ff0000";

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(this.angle);
            
            ctx.shadowColor = curColor;
            ctx.shadowBlur = 15;
            ctx.fillStyle = curColor;
            
            // 삼각형 그리기 (크기 20% 증가)
            ctx.beginPath();
            ctx.moveTo(0, -3.6); 
            ctx.lineTo(3, 2.4); 
            ctx.lineTo(-3, 2.4); 
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    }

    class Enemy {
        constructor() { this.active=false; }
        spawn(isElite) {
            const angle = Math.random() * Math.PI * 2; const dist = 480;
            this.wx = player.wx + Math.cos(angle)*dist; this.wy = player.wy + Math.sin(angle)*dist;
            this.isElite = isElite; this.active = true; this.grazeCool = 0;
            this.isSuicide = false; this.suicideTimer = 0; // 자폭 관련 초기화

            let speedBonus = 0; let hpBonus = 0;
            if(player.level > 5) speedBonus += (player.level * 0.05);
            // ... (중략) ...
            if(isElite) {
                // 엘리트 HP: 다항식 스케일링 적용 (기하급수적 증가)
                this.hp = 150 + (player.level * 40) + Math.pow(player.level, 2.5);
                this.maxHp = this.hp; 
                this.speed = Math.min(5.0, (player.baseSpeed * 0.40) + (speedBonus * 0.5)); 
                this.r = 30; this.color = '#e17055'; this.xp = 200; this.scoreVal = 1000;
                
                // 패턴 레벨 스케일링 개선: 특정 패턴 고정이 아닌 'AI 성향' 부여
                let roll = Math.random();
                if (player.level < 5) {
                    this.aiType = 0; 
                } else if (player.level < 15) {
                    this.aiType = roll < 0.7 ? 1 : 0; 
                } else if (player.level < 25) {
                    this.aiType = roll < 0.6 ? 2 : (roll < 0.9 ? 1 : 0);
                } else {
                    this.aiType = 3; 
                }

                this.shootTimer = 60; 
                this.patternAngle = 0;
                this.rapidCount = 0; 
            } else {
                // 일반 적 HP: 다항식 스케일링 적용
                let baseHp = 20 + (player.level * 8) + Math.pow(player.level, 2.2);
                let baseSpeed = Math.min(6.5, (1.2 + Math.random() * 0.5) + speedBonus);
                
                // 10% 확률로 자폭병 생성
                if (Math.random() < 0.1) {
                    this.isSuicide = true;
                    this.hp = baseHp * 1.5; // 맷집 1.5배
                    this.speed = baseSpeed * 1.5; // 속도 1.5배 (기본보다 0.5배 빠름)
                    this.color = '#555'; // 검은 회색
                } else {
                    this.hp = baseHp;
                    this.speed = baseSpeed;
                    this.r = 10; this.color = '#ff6b81'; 
                }
                
                this.maxHp = this.hp;
                this.r = 10; 
                this.xp = 5; this.scoreVal = 10;
            }
        }
        update() {
            const angleToPlayer = Math.atan2(player.wy - this.wy, player.wx - this.wx);
            this.wx += Math.cos(angleToPlayer)*this.speed; this.wy += Math.sin(angleToPlayer)*this.speed;
            if(this.grazeCool>0) this.grazeCool--;
            const dist = Math.hypot(player.wx-this.wx, player.wy-this.wy);
            if(dist < player.hitR + this.r) {
                if(player.isDashing) {
                    const dmg = 50 + (player.damage*2); this.hp -= dmg; spawnText("CRASH!", this.wx, this.wy, "#f1c40f", 16);
                    this.wx -= Math.cos(angleToPlayer)*30; this.wy -= Math.sin(angleToPlayer)*30; if(this.hp <= 0) killEnemy(this);
                } else if(player.isHyper && player.hyperType === HYPER_SHIELD) {
                    spawnText("BLOCK", player.wx, player.wy, '#a29bfe'); this.wx -= Math.cos(angleToPlayer)*15; this.wy -= Math.sin(angleToPlayer)*15;
                } else {
                    const dmg = this.isElite?20:10; player.hp -= dmg; player.showHpTimer = 60; spawnText(`-${dmg}`, player.wx, player.wy, 'red');
                    player.combo = 0; comboEl.style.display='none'; comboLabel.style.display='none'; // 피격 시 콤보 초기화
                    if(!this.isElite) this.active=false; updateUI(); if(player.hp<=0) gameOver();
                }
            } else if(dist < player.grazeR + this.r && this.grazeCool<=0) { 
                addHyper(this.isElite?5:1); 
                this.grazeCool=20; 
            }
            if(this.isElite) {
                this.shootTimer--;
                if(this.shootTimer <= 0) {
                    let execPattern = 0;
                    
                    // 연사 중이면 무조건 연사 유지
                    if(this.rapidCount > 0) {
                        execPattern = 2;
                    } else {
                        // AI 성향에 따른 확률적 패턴 선택
                        let r = Math.random();
                        if (this.aiType === 0) { // Fan 위주
                            execPattern = r < 0.8 ? 0 : 2; 
                        } else if (this.aiType === 1) { // Spiral 위주
                            execPattern = r < 0.6 ? 1 : (r < 0.9 ? 0 : 2);
                        } else if (this.aiType === 2) { // Stream 위주
                            execPattern = r < 0.6 ? 2 : (r < 0.9 ? 1 : 0);
                        } else { // Chaos
                            execPattern = Math.floor(Math.random() * 3);
                        }
                    }

                    // 탄속 증가: 레벨당 2% 빨라짐 (최대 2배)
                    const speedMult = 1 + Math.min(1.0, player.level * 0.02);

                    if(execPattern === 0) { // Fan (부채꼴)
                        const count = 5 + Math.floor(player.level / 8); 
                        const spread = 0.4; 
                        const startA = angleToPlayer - (spread * (count-1))/2;
                        for(let i=0; i<count; i++) spawnBullet(this.wx, this.wy, startA + spread*i, true, speedMult); 
                        this.shootTimer = Math.max(50, 90 - player.level); 
                    } 
                    else if(execPattern === 1) { // Spiral (나선/원형)
                        const count = 8 + Math.floor(player.level / 10);
                        for(let i=0; i<count; i++) {
                            const a = (Math.PI*2 / count) * i + this.patternAngle;
                            spawnBullet(this.wx, this.wy, a, true, speedMult);
                        }
                        this.patternAngle += 0.3; 
                        this.shootTimer = 20; 
                    }
                    else if(execPattern === 2) { // Stream (조준 연사)
                        if(this.rapidCount <= 0) this.rapidCount = (5 + Math.floor(player.level / 15)) * 2; // 발사 수 2배
                        
                        spawnBullet(this.wx, this.wy, angleToPlayer, true, speedMult * 4); // 탄속 기존 대비 2배 (총 4배속)
                        this.rapidCount--;
                        
                        if(this.rapidCount > 0) this.shootTimer = 16; // 간격 2배 (8 -> 16)
                        else this.shootTimer = 100; 
                    }
                }
            }
            if(dist > 1000) this.active=false;

            // 자폭 로직
            if(this.isSuicide && this.hp < this.maxHp) {
                if(this.suicideTimer === 0) this.suicideTimer = 1; // 카운트다운 시작
            }
            if(this.suicideTimer > 0) {
                this.suicideTimer++;
                if(this.suicideTimer >= 240) { // 4초 (60fps * 4)
                    // 타이머 종료 시 폭발
                    triggerSuicideExplosion(this);
                    // 타이머 폭발은 킬 카운트/점수 처리 안함 (자폭했으므로)
                }
            }
        }
        draw() {
            const sx = this.wx - player.wx + CW/2; const sy = this.wy - player.wy + CH/2;
            if(sx<-60||sx>CW+60||sy<-60||sy>CH+60) return;
            
            // 자폭병 그리기
            ctx.beginPath(); ctx.arc(sx, sy, this.r, 0, Math.PI*2); ctx.fillStyle = this.color; ctx.fill();
            
            // 카운트다운 텍스트
            if(this.suicideTimer > 0) {
                const remainingSec = 4 - Math.floor(this.suicideTimer / 60);
                ctx.fillStyle = "white";
                ctx.font = "bold 12px Arial"; // 자폭 숫자를 키움 (8px -> 12px)
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(remainingSec, sx, sy);
            }

            const hpPct = Math.max(0, this.hp / this.maxHp);
            let barW = this.isElite ? 40 : 18; let barH = this.isElite ? 6 : 3; let barY = this.isElite ? 40 : 20;
            if(this.isElite) { ctx.lineWidth=3; ctx.strokeStyle='#fff'; ctx.stroke(); }
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx - barW/2, sy - barY, barW, barH);
            ctx.fillStyle = this.isElite || this.isSuicide ? '#ff7675' : '#ff7675'; // 자폭병도 빨간 게이지
            ctx.fillRect(sx - barW/2, sy - barY, barW * hpPct, barH);
        }
    }

    class Bullet {
        constructor() { this.active=false; }
        spawn(wx, wy, a, isEnemyBullet=false, speedMult=1.0) {
            this.wx=wx; this.wy=wy; this.isEnemyBullet = isEnemyBullet;
            if(isEnemyBullet) { 
                this.vx = Math.cos(a)*4*speedMult; this.vy = Math.sin(a)*4*speedMult; this.life = 300; this.r = 6; this.color = '#ff9f43'; this.isCrit=false;
            } else { 
                this.vx = Math.cos(a)*8; this.vy = Math.sin(a)*8; this.life = 50;
                this.isCrit = Math.random() < player.critChance;
                this.r = (player.isHyper && player.hyperType===HYPER_RAPID) ? 8 : 4;
                if(this.isCrit) { this.color = '#ff4757'; } 
                else { this.color = (player.isHyper && player.hyperType===HYPER_RAPID) ? '#fffa65' : '#0acde5'; }
                this.hitList = [];
            }
            this.active=true;
        }
        update() { this.wx+=this.vx; this.wy+=this.vy; this.life--; if(this.life<=0) this.active=false; }
        draw() {
            const sx = this.wx - player.wx + CW/2; const sy = this.wy - player.wy + CH/2;
            if(sx<-20||sx>CW+20||sy<-20||sy>CH+20) return;
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(sx, sy, this.r, 0, Math.PI*2); ctx.fill();
            if(this.isEnemyBullet) { ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); }
        }
    }

    class Gem {
        constructor() { this.active=false; }
        spawn(wx, wy, v, isRare) { this.wx=wx; this.wy=wy; this.val=v; this.isRare = isRare; this.active=true; }
        update() {
            const dist = Math.hypot(player.wx-this.wx, player.wy-this.wy);
            let range = player.magnet; let spd = 7;
            if(dist < range) {
                const a = Math.atan2(player.wy-this.wy, player.wx-this.wx);
                this.wx += Math.cos(a)*spd; this.wy += Math.sin(a)*spd; if(dist < 20) { addExp(this.val); this.active=false; }
            }
            if(dist > 1200) this.active=false;
        }
        draw() {
            const sx = this.wx - player.wx + CW/2; const sy = this.wy - player.wy + CH/2;
            if(sx<-20||sx>CW+20||sy<-20||sy>CH+20) return;
            ctx.beginPath(); 
            ctx.fillStyle='#0acde5'; 
            if(this.isRare) ctx.arc(sx, sy, 10, 0, Math.PI*2); 
            else ctx.arc(sx, sy, 6, 0, Math.PI*2); 
            ctx.fill();
        }
    }

    class Effect {
        constructor() { this.active = false; }
        spawnEMP(wx, wy) { this.wx = wx; this.wy = wy; this.r = 0; this.maxR = 200; this.active = true; this.type = 'EMP'; }
        spawnExplosion(wx, wy) { this.wx = wx; this.wy = wy; this.r = 0; this.maxR = 60; this.active = true; this.type = 'EXPLOSION'; } // 자폭 이펙트
        update() { this.r += this.type === 'EXPLOSION' ? 5 : 40; if(this.r > this.maxR) this.active = false; }
        draw() {
            const sx = this.wx - player.wx + CW/2; const sy = this.wy - player.wy + CH/2;
            if (this.type === 'EMP') {
                ctx.strokeStyle = '#2ecc71'; 
                ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(sx, sy, this.r, 0, Math.PI*2); ctx.stroke();
            } else if (this.type === 'EXPLOSION') {
                ctx.fillStyle = `rgba(255, 69, 0, ${1 - this.r/this.maxR})`; // 오렌지색, 퍼질수록 투명
                ctx.beginPath(); ctx.arc(sx, sy, this.r, 0, Math.PI*2); ctx.fill();
            }
        }
    }

    class FloatText {
        constructor() { this.active=false; }
        spawn(t, wx, wy, c, size=14) { this.t=t; this.wx=wx; this.wy=wy; this.c=c; this.size=size; this.life=40; this.active=true; }
        update() { this.wy-=1; this.life--; if(this.life<=0) this.active=false; }
        draw() { const sx = this.wx - player.wx + CW/2; const sy = this.wy - player.wy + CH/2; ctx.fillStyle=this.c; ctx.font=`bold ${this.size}px Arial`; ctx.fillText(this.t, sx, sy); }
    }

    function spawnText(t, wx, wy, c, s) { getObj(texts, FloatText).spawn(t, wx, wy, c, s); }
    function spawnBullet(wx, wy, a, isEnemy=false) { getObj(bullets, Bullet).spawn(wx, wy, a, isEnemy); }
    function spawnEffect() { return getObj(effects, Effect); }

    function drawLightning(x1, y1, x2, y2, color) {
        ctx.save();
        ctx.strokeStyle = color; 
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.floor(dist / 10); 
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const tx = x1 + (x2 - x1) * t;
            const ty = y1 + (y2 - y1) * t;
            const jitter = (Math.random() - 0.5) * 20; 
            ctx.lineTo(tx + jitter, ty + jitter);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    function addCombo(n) {
        player.combo += n; player.comboTimer = 120; comboEl.style.display = 'block'; comboLabel.style.display = 'block';
        comboEl.innerText = player.combo; comboEl.style.transform = 'scale(1.3)'; setTimeout(()=>comboEl.style.transform='scale(1)', 100);
    }
    function addHyper(n) { if(player.isHyper) return; player.hyperGauge = Math.min(100, player.hyperGauge+n); if(player.hyperGauge>=100) activateHyper(); updateUI(); }

    function activateHyper() {
        if(player.hyperType === HYPER_RAPID) { player.isHyper = true; player.hyperTime = 300; document.body.classList.add('hyper-active'); showMessage("RAPID FIRE!", "#f1c40f"); } 
        else if (player.hyperType === HYPER_EMP) { screenShake = 30; spawnEffect().spawnEMP(player.wx, player.wy); enemies.forEach(e => { if(e.active && Math.hypot(e.wx - player.wx, e.wy - player.wy) < 300) killEnemy(e, true); }); player.hyperGauge = 0; showMessage("EMP BLAST!", "#2ecc71"); }
        else if (player.hyperType === HYPER_SHIELD) { player.isHyper = true; player.hyperTime = 600; document.body.classList.add('hyper-active'); showMessage("SHIELD ON", "#9b59b6"); }
    }

    function triggerSuicideExplosion(e) {
        e.active = false;
        e.hp = 0;
        
        // 폭발 이펙트
        spawnEffect().spawnExplosion(e.wx, e.wy);

        // 폭발 시 원형 탄막 발사 (12발) - 총알 크기 절반(3)으로 축소
        for(let i=0; i<12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            // spawnBullet에 radius 인자 추가하거나 spawn 후 수정
            let b = getObj(bullets, Bullet);
            b.spawn(e.wx, e.wy, angle, true);
            b.r = 3; // 자폭 탄막 크기 절반
        }

        // 플레이어 피격 체크 (반경 4배)
        const distToPlayer = Math.hypot(player.wx - e.wx, player.wy - e.wy);
        if(distToPlayer < e.r * 4 + player.hitR) {
            if(!player.isDashing && !(player.isHyper && player.hyperType === HYPER_SHIELD)) {
                player.hp -= 20; 
                player.showHpTimer = 60; 
                spawnText("-20", player.wx, player.wy, 'red'); 
                player.combo = 0; comboEl.style.display='none'; comboLabel.style.display='none';
                updateUI(); 
                if(player.hp<=0) gameOver();
            } else {
                spawnText("BLOCK", player.wx, player.wy, "#a29bfe");
            }
        }
    }

    function killEnemy(e, isEmp=false) {
        if (e.isSuicide) {
            // 자폭병은 죽을 때도 폭발 (단, EMP로 죽을 땐 폭발 안함? 일단 요청대로 죽으면 자폭)
            // EMP로 죽을 때도 폭발해야 하나? "데미지를 입어 죽는 경우"라고 했으므로 포함
            triggerSuicideExplosion(e);
            
            // 점수/보상은 줌
            addScore(e.scoreVal); 
            getObj(gems, Gem).spawn(e.wx, e.wy, e.xp, e.isElite);
            player.killCount++; player.killTimer = 180; updateKillStreak();
            addCombo(1);
            return;
        }

        e.hp = 0; e.active = false; addScore(e.scoreVal); getObj(gems, Gem).spawn(e.wx, e.wy, e.xp, e.isElite);
        addCombo(1); // 킬 콤보 추가
        // [수정] 하이퍼 상태가 아닐 때만 엘리트 처치 시 게이지 충전
        // 즉시 충전하지 않고 HyperOrb 생성
        if(e.isElite && !player.isHyper) { 
             getObj(hyperOrbs, HyperOrb).spawn(e.wx, e.wy, e.color);
        }
        player.killCount++; player.killTimer = 180; updateKillStreak();
    }

    function updateKillStreak() {
        let msg = ""; let col = "#fff";
        if(player.killCount === 2) { msg = "DOUBLE KILL"; col="#ff7675"; }
        else if(player.killCount === 3) { msg = "TRIPLE KILL"; col="#fd79a8"; }
        else if(player.killCount === 4) { msg = "QUADRA KILL"; col="#fab1a0"; }
        else if(player.killCount >= 5) { msg = "PENTA KILL"; col="#ff0000"; }
        if(msg) showMessage(msg, col);
    }

    function addExp(n) {
        player.exp += n;
        if(player.exp >= player.nextExp) {
            player.level++; player.exp=0; player.nextExp = Math.floor(player.nextExp*1.4);
            if(player.hyperGauge >= 90 && !player.isHyper) { player.pendingLevelUps++; showMessage("LEVEL PENDING!", "#fff"); } 
            else { levelUp(); }
        }
        updateUI();
    }

    function addScore(val) { player.score += val; scoreVal.innerText = player.score.toLocaleString(); }
    
    function updateUI() { 
        expBar.style.width = (player.exp/player.nextExp)*100 + "%"; 
        lvText.innerText = "LV. " + player.level; 
        hpText.innerText = "HP: " + Math.floor(player.hp); 
        hyperFill.style.height = player.hyperGauge + "%"; 
        if(player.isGrazingNow) { rightHud.classList.add('gauge-charging'); } else { rightHud.classList.remove('gauge-charging'); }
    }
    
    function updateDashUI() { if(player.dashReady) { dashIcon.classList.remove('cooldown'); dashIcon.classList.add('ready'); dashIcon.innerText = "DASH"; } else { dashIcon.classList.remove('ready'); dashIcon.classList.add('cooldown'); dashIcon.innerText = Math.ceil(player.dashCool/60); } }
    
    function updateTypeIcon() {
        let newSrc;
        let newBackground;

        if(player.hyperType === HYPER_RAPID) {
            newSrc = "rapid.png";
            newBackground = 'linear-gradient(to top, #f1c40f, #fffa65)';
        } else if(player.hyperType === HYPER_EMP) {
            newSrc = "emp.png";
            newBackground = 'linear-gradient(to top, #f1c40f, #2ecc71)';
        } else {
            newSrc = "shield.png";
            newBackground = 'linear-gradient(to top, #54a0ff, #5f27cd)';
        }

        // 아이콘이 실제로 변경될 때만 애니메이션을 트리거
        if (typeIcon.src.indexOf(newSrc) === -1 || typeIcon.classList.contains('icon-attach-anim')) { // 현재 src가 newSrc를 포함하지 않거나, 애니메이션이 아직 진행 중일 때
            typeIcon.classList.remove('icon-attach-anim'); // 기존 애니메이션 클래스 제거 (혹시 남아있을 경우)
            // 브라우저가 DOM 변경을 인식하고 애니메이션을 리셋하도록 강제하는 트릭
            void typeIcon.offsetWidth; 
            typeIcon.src = newSrc;
            typeIcon.classList.add('icon-attach-anim'); // 애니메이션 클래스 추가

            typeIcon.onanimationend = () => {
                typeIcon.classList.remove('icon-attach-anim');
                typeIcon.onanimationend = null; // 이벤트 리스너 제거
            };
        } else { // 아이콘 변경이 없을 때
            typeIcon.src = newSrc;
        }
        hyperFill.style.background = newBackground;
    }

    function drawGrid() {
        ctx.fillStyle = '#0f1218'; ctx.fillRect(0, 0, CW, CH);
        ctx.strokeStyle = '#1e2328'; ctx.lineWidth = 2; ctx.beginPath();
        const sz = 60; const offX = ((player.wx % sz) + sz) % sz; const offY = ((player.wy % sz) + sz) % sz;
        for(let x = -offX; x < CW; x += sz) { ctx.moveTo(x, 0); ctx.lineTo(x, CH); }
        for(let y = -offY; y < CH; y += sz) { ctx.moveTo(0, y); ctx.lineTo(CW, y); }
        ctx.stroke();
    }

    function drawJoystick() {
        if(!joystick.active) { if('ontouchstart' in window) { ctx.beginPath(); ctx.arc(CW*0.2, CH*0.8, 30, 0, Math.PI*2); ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'; ctx.lineWidth = 2; ctx.stroke(); } return; }
        ctx.beginPath(); ctx.arc(joystick.baseX, joystick.baseY, joystick.maxRadius, 0, Math.PI*2); ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(joystick.stickX, joystick.stickY, 20, 0, Math.PI*2); ctx.fillStyle = 'rgba(10, 205, 229, 0.1)'; ctx.fill();
    }

    function update() {
        if(gameState!=='PLAY') return;
        frameCount++;
        player.isGrazingNow = false;

        if(screenShake > 0) screenShake *= 0.9; if(screenShake < 0.5) screenShake = 0;
        if(player.killTimer > 0) { player.killTimer--; if(player.killTimer <= 0) { player.killCount = 0; } }
        if(!player.dashReady) { player.dashCool--; if(player.dashCool <= 0) { player.dashReady = true; updateDashUI(); } else if (frameCount % 60 === 0) updateDashUI(); }

        if(player.isDashing) {
            player.wx += player.dashVx * 15; player.wy += player.dashVy * 15; player.dashTime--; if(player.dashTime <= 0) player.isDashing = false;
        } else {
            const isMoving = joystick.active && (joystick.vx !== 0 || joystick.vy !== 0);
            const spd = (player.isHyper && player.hyperType===HYPER_RAPID) ? player.baseSpeed*1.5 : player.baseSpeed;
            player.wx += joystick.vx * spd; player.wy += joystick.vy * spd;
            const fr = (player.isHyper && player.hyperType===HYPER_RAPID) ? 4 : player.baseFireRate;
            if(isMoving && frameCount - player.lastShot > fr) {
                let t=null, min=Infinity;
                enemies.forEach(e=>{ if(!e.active) return; const d = Math.hypot(player.wx-e.wx, player.wy-e.wy); if(d<min) { min=d; t=e; } });
                if(t && min<450) {
                    const a = Math.atan2(t.wy-player.wy, t.wx-player.wx); const spread = 0.2; const startA = a - (spread*(player.bulletCount-1))/2;
                    for(let i=0; i<player.bulletCount; i++) spawnBullet(player.wx, player.wy, startA + spread*i, false);
                    player.lastShot = frameCount;
                }
            }
        }

        if(player.isHyper) {
            player.hyperTime--; player.hyperGauge = (player.hyperTime/300)*100;
            if(player.hyperType === HYPER_SHIELD) {
                player.hyperGauge = (player.hyperTime/600)*100;
                player.shieldAngle += 0.05; player.shieldPulse += 0.1;

                // 쉴드 하이퍼 동안 HP 재생 (1초마다 1HP)
                if (frameCount % 60 === 0) {
                    player.hp = Math.min(player.maxHp, player.hp + 1);
                    updateUI(); // HP 업데이트 반영
                }
            }
            if(player.hyperTime<=0) {
                player.isHyper=false; player.hyperGauge=0; document.body.classList.remove('hyper-active');
                if(player.pendingLevelUps > 0) { player.pendingLevelUps--; levelUp(); }
            }
            updateUI();
        }
        if(player.combo>0) { player.comboTimer--; if(player.comboTimer<=0) { player.combo=0; comboEl.style.display='none'; comboLabel.style.display='none'; } }

        // 스폰 주기: 레벨이 오를수록 기하급수적으로 빨라짐 (최소 10프레임 = 초당 6마리)
        const rate = (player.isHyper && player.hyperType===HYPER_RAPID) ? 5 : Math.max(10, 60 - player.level - Math.floor(Math.pow(player.level, 1.5) * 0.1));
        if(frameCount % rate === 0) getObj(enemies, Enemy).spawn(false);
        if(frameCount % 900 === 0 && player.level >= 3) {
            const activeBosses = enemies.filter(e => e.active && e.isElite).length; let maxBosses = 1; if(player.level >= 9) maxBosses = 2; if(player.level >= 18) maxBosses = 3;
            if(activeBosses < maxBosses) getObj(enemies, Enemy).spawn(true);
        }

        bullets.forEach(b=>{
            if(b.active) {
                b.update();
                if(b.isEnemyBullet) {
                    const d = Math.hypot(b.wx-player.wx, b.wy-player.wy);
                    if(d < player.hitR + b.r) {
                        if((player.isHyper && player.hyperType === HYPER_SHIELD) || player.isDashing) { spawnText("BLOCK", player.wx, player.wy, "#a29bfe"); b.active = false; } 
                        else { 
                            player.hp -= 10; player.showHpTimer = 60; spawnText("-10", player.wx, player.wy, 'red'); 
                            player.combo = 0; comboEl.style.display='none'; comboLabel.style.display='none'; // 피격 시 콤보 초기화
                            updateUI(); b.active=false; if(player.hp<=0) gameOver(); 
                        }
                    }
                } else {
                    enemies.forEach(e=>{
                        if(e.active) {
                            const d = Math.hypot(b.wx-e.wx, b.wy-e.wy);
                            if(d < b.r + e.r) {
                                if (!b.hitList.includes(e)) {
                                    let finalDmg = player.damage * ((player.isHyper && player.hyperType===HYPER_RAPID)?2:1);
                                    if(b.isCrit) finalDmg *= player.critDamage;
                                    e.hp -= finalDmg; 
                                    let color = b.isCrit ? '#ff4757' : 'white'; let size = b.isCrit ? 20 : 12; let txt = Math.floor(finalDmg); 
                                    spawnText(txt, e.wx, e.wy, color, size);
                                    const kbPower = e.isElite ? 0.3 : 4.0; e.wx += b.vx * 0.5 * kbPower; e.wy += b.vy * 0.5 * kbPower; 
                                    if(e.hp<=0) killEnemy(e);
                                    if (b.isCrit) { b.hitList.push(e); } else { b.active = false; }
                                }
                            }
                        }
                    })
                }
            }
        });
        enemies.forEach(e=>{ if(e.active) e.update(); }); gems.forEach(e=>{ if(e.active) e.draw(); }); texts.forEach(e=>{ if(e.active) e.update(); }); effects.forEach(e=>{ if(e.active) e.draw(); }); hyperOrbs.forEach(e=>{ if(e.active) e.update(); });
    }

    function draw() {
        ctx.save();
        if(screenShake > 0) { const rx = (Math.random() - 0.5) * screenShake; const ry = (Math.random() - 0.5) * screenShake; ctx.translate(rx, ry); }
        drawGrid();
        
        // [수정] Graze 서클 및 전기 색상 동적 결정 (Rapid: Yellow)
        let hyperColor;
        if(player.hyperType === HYPER_RAPID) hyperColor = '#f1c40f'; // Yellow
        else if(player.hyperType === HYPER_EMP) hyperColor = '#2ecc71'; // Green
        else hyperColor = '#9b59b6'; // Purple
        
        ctx.strokeStyle = hyperColor; 
        ctx.globalAlpha = 0.4; // 원 투명도
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CW/2, CH/2, player.grazeR, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1.0; // 투명도 복구

        gems.forEach(e=>{ if(e.active) e.draw(); }); effects.forEach(e=>{ if(e.active) e.draw(); }); bullets.forEach(e=>{ if(e.active) e.draw(); }); enemies.forEach(e=>{ if(e.active) e.draw(); }); texts.forEach(e=>{ if(e.active) e.draw(); }); hyperOrbs.forEach(e=>{ if(e.active) e.draw(); });

        if(player.isHyper && player.hyperType === HYPER_SHIELD) {
            const pulseOffset = Math.sin(player.shieldPulse) * 3;
            const baseRadius = player.r + 25;
            ctx.strokeStyle = 'rgba(162, 155, 254, 0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(CW/2, CH/2, baseRadius + pulseOffset, 0, Math.PI*2); ctx.stroke();
            ctx.save(); ctx.translate(CW/2, CH/2); ctx.rotate(player.shieldAngle);
            ctx.strokeStyle = `rgba(108, 92, 231, ${0.3 + Math.random()*0.3})`; ctx.lineWidth = 4;
            for(let i=0; i<3; i++) { ctx.beginPath(); ctx.arc(0, 0, baseRadius - 2, (Math.PI*2/3)*i, (Math.PI*2/3)*i + 1.5); ctx.stroke(); }
            ctx.restore();
            ctx.fillStyle = 'rgba(162, 155, 254, 0.1)'; ctx.beginPath(); ctx.arc(CW/2, CH/2, baseRadius + pulseOffset, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.fillStyle = (player.isHyper && player.hyperType===HYPER_RAPID) ? '#fffa65' : player.color;
        if(player.isDashing) { ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff'; } else if(player.isHyper) { ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=15; }
        ctx.beginPath(); ctx.arc(CW/2, CH/2, player.r, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

        // 흰 점 그리기
        let lookX = joystick.vx;
        let lookY = joystick.vy;

        // 조이스틱 입력이 없으면 기본적으로 위쪽을 바라보도록
        if (lookX === 0 && lookY === 0) {
            lookY = -1; // 위쪽
        }

        const indicatorRadius = player.r - 5; // 주인공 반지름보다 살짝 안쪽
        const indicatorSize = 2; // 흰 점의 반지름

        // 방향 벡터 정규화
        const magnitude = Math.hypot(lookX, lookY);
        if (magnitude > 0) {
            lookX /= magnitude;
            lookY /= magnitude;
        }

        const dotX = CW/2 + lookX * indicatorRadius;
        const dotY = CH/2 + lookY * indicatorRadius;

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(dotX, dotY, indicatorSize, 0, Math.PI*2);
        ctx.fill();

        enemies.forEach(e => {
            if (e.active) {
                const dist = Math.hypot(e.wx - player.wx, e.wy - player.wy);
                if (dist < player.grazeR + e.r && dist > player.hitR + e.r) {
                    const sx = e.wx - player.wx + CW/2;
                    const sy = e.wy - player.wy + CH/2;
                    // [수정] 전기 색상 파라미터 전달
                    drawLightning(CW/2, CH/2, sx, sy, hyperColor); 
                    player.isGrazingNow = true; 
                }
            }
        });
        updateUI();

        if(player.showHpTimer > 0) {
            player.showHpTimer--; const hpPct = Math.max(0, player.hp / player.maxHp); const bx = CW/2, by = CH/2 - 25; const bw = 30, bh = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx - bw/2, by, bw, bh); ctx.fillStyle = '#ff7675'; ctx.fillRect(bx - bw/2, by, bw * hpPct, bh);
        }
        if(screenShake > 20) { ctx.fillStyle = `rgba(255,255,255, ${screenShake/100})`; ctx.fillRect(0,0,CW,CH); }
        ctx.restore(); drawJoystick();
    }

    function loop() { requestAnimationFrame(loop); if(gameState==='PLAY') { update(); draw(); } }

    // [수정] 통합된 레벨업 시스템 (하이퍼 스킬 랜덤 출현)
    function levelUp() {
        gameState='PAUSE'; 
        joystick.active=false; joystick.vx=0; joystick.vy=0; 
        levelUpScreen.style.display='flex'; 
        cardsBox.innerHTML='';
        levelUpTitle.innerText = "LEVEL UP!"; // 타이틀 통일

        // 1. 일반 스탯 옵션
        const statOpts = [
            {t:"공격력 UP", d:"데미지 +5", img: "atk.png", f:()=>{player.damage+=5;}}, 
            {t:"연사속도 UP", d:"공격속도 +10%", img: "speed.png", f:()=>{player.baseFireRate*=0.9;}},
            {t:"치명타 UP", d:"확률 +5%", img: "cri.png", f:()=>{player.critChance+=0.05;}}, 
            {t:"멀티샷", d:"탄환 +1", img: "multi.png", f:()=>{player.bulletCount++;}},
            {t:"대쉬 쿨다운", d:"재사용 대기시간 -1초", img: "dash.png", f:()=>{player.dashMaxCool = Math.max(180, player.dashMaxCool - 60);}}, 
            {t:"체력회복", d:"HP +30", img: "hp.png", f:()=>{player.hp=Math.min(player.maxHp, player.hp+30);}},
            {t:"자석 강화", d:"흡수 범위 +15", img: "mag.png", f:()=>{player.magnet += 15;}} 
        ];

        // 2. 하이퍼 스킬 옵션
        const hyperOpts = [
            {t:"고속연사 스킬장착", d:"5초 동안 고속연사", c:'hyper-card', img:'rapid.png', f:()=>{player.hyperType=HYPER_RAPID; updateTypeIcon();}},
            {t:"EMP 스킬장착", d:"EMP 광역 데미지", c:'hyper-card', img:'emp.png', f:()=>{player.hyperType=HYPER_EMP; updateTypeIcon();}},
            {t:"완전방어 스킬장착", d:"10초 무적 + HP 회복", c:'hyper-card', img:'shield.png', f:()=>{player.hyperType=HYPER_SHIELD; updateTypeIcon();}},
        ];

        // 3. 풀 합치기 (확률 조정 가능, 여기선 단순 병합)
        let pool = [...statOpts, ...hyperOpts];

        // 4. 랜덤 3개 선택 (중복 방지 로직 포함)
        for(let i=0; i<3; i++) {
            if(pool.length === 0) break;
            const r = Math.floor(Math.random()*pool.length);
            const item = pool.splice(r, 1)[0]; 

            const div = document.createElement('div'); 
            div.className = item.c ? `card ${item.c}` : 'card'; // 하이퍼 카드는 별도 클래스 유지
            
            let imgHTML = item.img ? `<img src="${item.img}" class="card-icon">` : '';
            div.innerHTML = `
                ${imgHTML}
                <div class="card-text-group">
                    <h3>${item.t}</h3>
                    <p>${item.d}</p>
                </div>
            `;
            
                        div.style.animationDelay = `${i * 0.1}s`;
                        div.onclick=()=>{
                            item.f();
                            // 기존 if(item.c) showMessage(...) 부분을 통합
                            let msgColor = item.c ? "#a29bfe" : "#c8aa6e"; // 하이퍼 카드면 보라색, 아니면 레벨업 카드 색상
                            let msgText = item.t;
                            if (item.c) msgText += " 장착됨"; // 하이퍼 카드면 "장착됨" 추가
                            else msgText += "!"; // 일반 스킬은 "!" 추가
            
                            showMessage(msgText, msgColor, item.img); // 이미지 경로 전달
            
                            levelUpScreen.style.display='none';
                            gameState='PLAY';
                        };
                        cardsBox.appendChild(div);        }
    }

    // --- [Logic Update] 1-Time Rush Mode ---
    function gameOver() {
        gameState='GAMEOVER';
        gameOverScreen.style.display='flex'; // [수정] 모달을 먼저 표시하여 리플로우가 동작하게 함

        let isNewRecord = false;
        if(player.score > highScore) { 
            highScore = player.score; 
            localStorage.setItem('survival_highscore', highScore);
            isNewRecord = true;
        }
        newRecordMsg.style.display = isNewRecord ? 'block' : 'none';
        
        resultContainer.innerHTML = `
            <div style="font-size:20px; font-weight:normal; color:#ddd; margin-bottom:5px;">SCORE: ${player.score.toLocaleString()}</div>
            <div style="font-size:20px; font-weight:bold; color:#fffa65;">BEST: ${parseInt(highScore).toLocaleString()}</div>
        `;
        
        // 1회 한정 Rush 체크
        if (!hasRushed) {
            // rushCountEl.style.display = "none"; // 삭제됨
            rushProgressBar.style.display = "block"; // 프로그레스 바 표시
            
            // 프로그레스 바 애니메이션 리셋 및 시작 (5초간 주~욱 줄어듦)
            rushProgressBarFill.style.transition = 'none';
            rushProgressBarFill.style.width = "100%"; 
            
            // 모달이 뜬 직후 브라우저가 렌더링할 시간을 아주 잠깐 주고 애니메이션 시작
            setTimeout(() => {
                rushProgressBarFill.style.transition = 'width 5s linear';
                rushProgressBarFill.style.width = "0%";
            }, 50);

            let timeLeft = 5; // 초기 타이머 값
            // const maxTime = timeLeft; // (CSS 애니메이션 사용으로 불필요)
            
            rushBtn.innerHTML = `<span style="font-size: 1.5em; vertical-align: middle;">${timeLeft}</span> &nbsp; 강화된 재도전`; 
            rushBtn.className = "btn-enhanced"; 
            rushSubText.innerText = "단 한번! 현재 스킬을 유지한 채 재시작.";
            rushLabel.style.display = "none"; 
            
            if(rushTimerInterval) clearInterval(rushTimerInterval);
            rushTimerInterval = setInterval(() => {
                timeLeft--;
                // rushProgressBarFill.style.width 업데이트 제거 (CSS transition이 처리)
                
                if(timeLeft > 0) { 
                    rushBtn.innerHTML = `<span style="font-size: 1.5em; vertical-align: middle;">${timeLeft}</span> &nbsp; 강화된 재도전`;
                } else {
                    clearInterval(rushTimerInterval);
                    // 타임아웃 -> 일반 리셋으로 변경
                    rushBtn.innerText = "↻ 처음부터";
                    rushBtn.className = "btn-reset"; 
                    rushSubText.innerText = "";
                    // rushCountEl 삭제됨
                    rushProgressBar.style.display = "none"; 
                }
            }, 1000);
        } else {
            // 이미 Rush를 씀 -> 바로 리셋 버튼
            // rushCountEl 삭제됨
            rushLabel.style.display = "none";
            rushBtn.innerText = "↻ 처음부터";
            rushBtn.className = "btn-reset"; 
            rushSubText.innerText = "";
            if(rushTimerInterval) clearInterval(rushTimerInterval);
            rushProgressBar.style.display = "none"; 
        }
        
        // gameOverScreen.style.display='flex'; // [수정] 위로 이동함
    }

    function rushStart() {
        if(rushTimerInterval) clearInterval(rushTimerInterval);
        const btnText = rushBtn.innerText;
        // [수정] 한글 텍스트에 맞춰 조건 변경
        const canRush = btnText.includes("강화된");
        
        enemies.length = 0; bullets.length = 0; gems.length = 0; texts.length = 0; effects.length = 0; hyperOrbs.length = 0;
        player.wx = 0; player.wy = 0; joystick.active = false;
        
        if(canRush) {
            // New Game+ (Stats Keep)
            player.level = 1; player.exp = 0; player.nextExp = 10; player.score = 0;
            player.hp = player.maxHp; 
            hasRushed = true; // 플래그 설정 (다음엔 못씀)
        } else {
            // Hard Reset
            player.hp = 100; player.maxHp = 100; player.level = 1; player.exp = 0; player.nextExp = 10;
            player.score = 0; player.damage = 15; player.fireRate = 25; player.baseFireRate = 25;
            player.bulletCount = 1; player.critChance = 0.15; player.magnet = 20;
            player.hyperGauge = 0; player.isHyper = false; player.hyperType = HYPER_RAPID;
            player.dashMaxCool = 600;
            hasRushed = false; // 플래그 리셋 (새 게임이니 다시 기회 줌)
        }
        
        player.lastShot = -100; 
        player.dashReady = true; player.dashCool = 0;
        player.combo = 0; player.comboTimer = 0;
        player.killCount = 0; player.killTimer = 0;
        frameCount = 0; 
        
        // 화면 진동 초기화
        screenShake = 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0); // 캔버스 변환 초기화

        comboEl.style.display = 'none';
        comboLabel.style.display = 'none';
        infoMsg.style.opacity = 0;

        gameOverScreen.style.display = 'none';
        gameState = 'PLAY';
        
        bestVal.innerText = parseInt(highScore).toLocaleString();
        
        updateUI(); updateTypeIcon(); updateDashUI();
    }

    updateTypeIcon(); loop();
