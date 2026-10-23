/* ================= بلوت أونلاين =================
   القسم الأول: محرك القوانين (بدون واجهة) — يقدر يشتغل على أي جهاز
   القسم الثاني: الواجهة والطاولات (Firestore: live/r_XXXX)
   الإصدار 2: لعب حر + قيد + سوا + إعلان المشاريع يدوي + مؤقت + طاولة جديدة
*/
(function(G){
'use strict';
/* ---------- المحرك ---------- */
const SU=['S','H','C','D'],SYM={S:'♠',H:'♥',D:'♦',C:'♣'},SNAME={S:'سبيت',H:'هاص',D:'ديمن',C:'شريا'};
const RANKS=['7','8','9','T','J','Q','K','A'];
const SUN_ORD='789JQKTA',TR_ORD='78QKTA9J',SEQ='789TJQKA';
const SUN_P={7:0,8:0,9:0,J:2,Q:3,K:4,T:10,A:11},TR_P={7:0,8:0,Q:3,K:4,T:10,A:11,9:14,J:20};
// قيمة المشاريع بالنقاط (بعد التحويل)
const PROJ_PTS={hokm:{sira:2,'50':5,'100':10,'400':10},sun:{sira:4,'50':10,'100':20,'400':40}};
const PROJ_RANK={sira:1,'50':2,'100':3,'400':4};
const PROJ_NAME={sira:'سرا','50':'خمسين','100':'مية','400':'أربعمية'};
const W={pass:'بس',hokm:'حكم',sun:'صن',ashkal:'أشكل',dbl:'دبل',three:'ثري',four:'فور',qahwa:'قهوة',open:'مفتوح',closed:'مقفول'};
const su=c=>c[1],rk=c=>c[0],team=s=>s%2;
const rnd=n=>{try{const a=new Uint32Array(1);(G.crypto||globalThis.crypto).getRandomValues(a);return a[0]%n}catch(e){return Math.floor(Math.random()*n)}};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const ord=d=>[(d+1)%4,(d+2)%4,(d+3)%4,d];
const isT=(c,h)=>h.mode==='hokm'&&su(c)===h.trump;
const pts=(c,h)=>isT(c,h)?TR_P[rk(c)]:SUN_P[rk(c)];
const pow=(c,h)=>isT(c,h)?TR_ORD.indexOf(rk(c)):SUN_ORD.indexOf(rk(c));
const nm=(st,s)=>(st.seats[s]&&st.seats[s].n)||('لاعب '+(s+1));
function ev(st,t){st.evn=(st.evn||0)+1;st.evt=t}

function trickWinner(tr,h){
  let b=tr[0];
  for(const t of tr.slice(1)){
    const bT=isT(b.c,h),tT=isT(t.c,h);
    if(tT&&!bT)b=t;
    else if(tT===bT&&su(t.c)===su(b.c)&&pow(t.c,h)>pow(b.c,h))b=t;
  }
  return b.s;
}
// الورق النظامي (يستخدمه الكمبيوتر وكشف المخالفات والسوا) — اللاعب نفسه حر يلعب أي ورقة
function legal(h,seat){
  const hand=h.hands[seat],tr=h.trick;
  if(!tr.length){
    if(h.mode==='hokm'&&h.closed){const nt=hand.filter(c=>su(c)!==h.trump);if(nt.length)return nt}
    return hand.slice();
  }
  const led=su(tr[0].c),fol=hand.filter(c=>su(c)===led);
  if(h.mode!=='hokm')return fol.length?fol:hand.slice();
  const T=h.trump,tin=tr.filter(t=>su(t.c)===T),hi=tin.length?Math.max(...tin.map(t=>pow(t.c,h))):-1;
  if(led===T){if(!fol.length)return hand.slice();const up=fol.filter(c=>pow(c,h)>hi);return up.length?up:fol}
  if(fol.length)return fol;
  const mt=hand.filter(c=>su(c)===T);if(!mt.length)return hand.slice();
  if(team(trickWinner(tr,h))===team(seat))return hand.slice();   // خويك ماسك الأكلة
  if(tin.length){const up=mt.filter(c=>pow(c,h)>hi);return up.length?up:hand.slice()}
  return mt;                                                       // لازم تدق
}
function whyIllegal(h,seat,c){
  const hand=h.hands[seat],tr=h.trick;
  if(!tr.length)return 'بدأ بالحكم والدور مقفول';
  const led=su(tr[0].c);
  if(su(c)!==led&&hand.some(x=>su(x)===led))return 'ما لحق اللون';
  if(h.mode==='hokm')return su(c)===h.trump?'ما كبّر على الحكم':'ما دق بالحكم';
  return 'لعب ورقة غلط';
}
function findProjects(hand,mode){
  const out=[],used=new Set();
  for(const r of 'AKQJT'){
    const cs=hand.filter(c=>rk(c)===r);
    if(cs.length===4){const t=r==='A'&&mode==='sun'?'400':'100';out.push({t,top:SEQ.indexOf(r),suit:'',cards:cs});cs.forEach(c=>used.add(c))}
  }
  for(const s of SU){
    const idx=hand.filter(c=>su(c)===s&&!used.has(c)).map(c=>SEQ.indexOf(rk(c))).sort((a,b)=>b-a);
    let run=[];
    const flush=()=>{const arr=[...run];while(arr.length>=3){const n=Math.min(5,arr.length),p=arr.splice(0,n);out.push({t:n===5?'100':n===4?'50':'sira',top:p[0],suit:s,cards:p.map(i=>SEQ[i]+s)})}run=[]};
    for(const i of idx){if(run.length&&run[run.length-1]-1!==i)flush();run.push(i)}
    flush();
  }
  return out;
}
const projLabel=p=>PROJ_NAME[p.t]+(p.suit?' '+SYM[p.suit]:'')+' ('+(SEQ[p.top]==='T'?'10':SEQ[p.top])+')';
function addViol(st,v){
  const h=st.h,opBot=[(v.s+1)%4,(v.s+3)%4].some(s=>st.seats[s]&&st.seats[s].bot);
  v.bot=opBot&&rnd(10)<8;           // الكمبيوتر ينتبه للغلط غالباً
  h.viol=(h.viol||[]).concat([v]);
}
// اللاعب يختار نوع المشروع بنفسه — اللي ما يعلنه يروح عليه، واللي يعلن شي ما عنده تنحسب عليه مخالفة
function pickDecl(st,seat,decl){
  const h=st.h,cs=(h.cand[seat]||[]).slice().sort((a,b)=>PROJ_RANK[b.t]-PROJ_RANK[a.t]||b.top-a.top);
  if(decl==='all')return cs;
  const want=decl&&typeof decl==='object'?decl:{},out=[],used=new Set();
  for(const t of ['400','100','50','sira']){
    for(let n=Math.min(+want[t]||0,4);n>0;n--){
      let i=cs.findIndex((p,j)=>!used.has(j)&&p.t===t);
      if(i<0)i=cs.findIndex((p,j)=>!used.has(j)&&PROJ_RANK[p.t]>PROJ_RANK[t]);   // أعلن أقل من اللي عنده
      if(i<0){addViol(st,{s:seat,tn:0,c:'',why:'أعلن '+PROJ_NAME[t]+' وهو ما عنده'});continue}
      used.add(i);out.push(cs[i].t===t?cs[i]:Object.assign({},cs[i],{t}));
    }
  }
  return out;
}
function resolveProjects(st){
  const h=st.h,key=(p,s)=>PROJ_RANK[p.t]*1000+p.top*10+(h.mode==='hokm'&&p.suit===h.trump?5:0)+(3-((s-h.lead+4)%4))*.1;
  const best=[-1,-1];
  for(const s in h.decl)(h.decl[s]||[]).forEach(p=>{const k=key(p,+s);if(k>best[team(+s)])best[team(+s)]=k});
  h.projWin=best[0]<0&&best[1]<0?null:best[0]>best[1]?0:1;
  h.projDone=true;
  if(h.projWin!=null){
    const ls=[];for(const s in h.decl)if(team(+s)===h.projWin)(h.decl[s]||[]).forEach(p=>ls.push(nm(st,+s)+': '+PROJ_NAME[p.t]));
    ev(st,ls.join('، '));
  }
}
function projPoints(h){
  const pp=[0,0],raw=[0,0];
  if(h.projWin!=null)for(const s in h.decl)if(team(+s)===h.projWin)(h.decl[s]||[]).forEach(p=>{const v=PROJ_PTS[h.mode][p.t];pp[h.projWin]+=v;raw[h.projWin]+=v*(h.mode==='sun'?5:10)});
  return {pp,raw};
}
function newState(code,host,hostName){
  return {code,host,hostName,ts:Date.now(),seats:[null,null,null,null],phase:'lobby',score:[0,0],dealer:0,h:null,hist:[],evn:0,evt:'',rec:false,recId:null,target:152,tsec:5};
}
function startGame(st){
  if(st.seats.some(x=>!x))throw 'لازم 4 لاعبين';
  st.score=[0,0];st.hist=[];st.rec=false;st.recId=null;st.winner=null;st.dealer=rnd(4);deal(st);
}
function deal(st){
  const d=shuffle(SU.flatMap(s=>RANKS.map(r=>r+s))),hands={};
  for(let s=0;s<4;s++)hands[s]=d.slice(s*5,s*5+5);
  st.phase='bid';
  st.h={id:Date.now()+'_'+rnd(1e6),hands,up:d[20],rest:d.slice(21),round:1,bi:0,bid:null,said:{},mode:null,trump:null,buyer:null,mult:1,qahwa:false,closed:false,
        trick:[],last:null,tn:0,ab:[0,0],tw:[0,0],decl:{},cand:{},baloot:null,kq:null,projWin:null,projDone:false,result:null,dbl:null,viol:[],sawa:null,log:[]};
  ev(st,'الموزع '+nm(st,st.dealer));
}
function turnOf(st){
  const h=st.h;if(!h)return -1;
  if(st.phase==='bid')return ord(st.dealer)[h.bi];
  if(st.phase==='dbl')return h.dbl.turn;
  if(st.phase==='play')return h.turn;
  return -1;
}
// مفتاح الدور الحالي (للمؤقت ومنع التكرار)
function tkey(st){
  const h=st.h;if(!h)return st.phase||'';
  return [st.phase,turnOf(st),h.id,h.round,h.bi,h.tn,h.trick.length,h.dbl?h.dbl.st+h.dbl.turn:''].join('|');
}
function doBid(st,seat,b,suit){
  const h=st.h;
  if(st.phase!=='bid'||turnOf(st)!==seat)throw 'مو دورك';
  if(b==='sun'||b==='ashkal'){
    if(b==='ashkal'&&h.bi<2)throw 'أشكل للاعب الثالث والرابع بس';
    h.bid={s:seat,t:'sun',ash:b==='ashkal'};h.said[seat]=W[b];ev(st,nm(st,seat)+': '+W[b]);
    return finishBid(st);
  }
  if(b==='hokm'){
    if(h.bid)throw 'فيه حكم قبلك، تقدر تقول صن أو بس';
    const s2=h.round===1?su(h.up):suit;
    if(h.round===2&&(!SU.includes(s2)||s2===su(h.up)))throw 'في الثاني اختر لون غير لون الورقة المكشوفة';
    h.bid={s:seat,t:'hokm',suit:s2};h.said[seat]=W.hokm+(h.round===2?' '+SYM[s2]:'');
    ev(st,nm(st,seat)+': حكم'+(h.round===2?' '+SNAME[s2]:''));
  }else if(b==='pass'){h.said[seat]=W.pass;ev(st,nm(st,seat)+': بس')}
  else throw 'طلب غير معروف';
  h.bi++;
  if(h.bi>=4){
    if(h.bid)return finishBid(st);
    if(h.round===1){h.round=2;h.bi=0;h.said={};ev(st,'ثاني')}
    else{st.dealer=(st.dealer+1)%4;deal(st);ev(st,'كلكم بس، توزيعة جديدة')}
  }
}
function finishBid(st){
  const h=st.h,b=h.bid;
  h.mode=b.t;h.trump=b.t==='hokm'?b.suit:null;h.buyer=b.ash?(b.s+2)%4:b.s;h.mult=1;
  const bt=team(h.buyer),canD=h.mode==='hokm'||(st.score[bt]>100&&st.score[1-bt]<100);
  if(canD){st.phase='dbl';h.dbl={st:'d',turn:(h.buyer+1)%4,ask:0,by:null,last:null}}
  else startPlay(st);
}
function doDbl(st,seat,a){
  const h=st.h,D=h.dbl;
  if(st.phase!=='dbl'||D.turn!==seat)throw 'مو دورك';
  const say=w=>{h.said[seat]=W[w];ev(st,nm(st,seat)+': '+W[w])};
  const end=()=>{if(h.mult>1&&h.mode==='hokm'){D.st='oc';D.turn=D.last}else startPlay(st)};
  if(D.st==='d'){
    if(a==='dbl'){say('dbl');h.mult=2;D.by=seat;D.last=seat;if(h.mode==='sun')return end();D.st='t';D.turn=h.buyer}
    else if(a==='pass'){if(D.ask===0){D.ask=1;D.turn=(h.buyer+3)%4}else return end()}
    else throw 'طلب غير معروف';
  }else if(D.st==='t'){
    if(a==='three'){say('three');h.mult=3;D.last=seat;D.st='f';D.turn=D.by}
    else if(a==='pass')return end();else throw 'طلب غير معروف';
  }else if(D.st==='f'){
    if(a==='four'){say('four');h.mult=4;D.last=seat;D.st='q';D.turn=h.buyer}
    else if(a==='pass')return end();else throw 'طلب غير معروف';
  }else if(D.st==='q'){
    if(a==='qahwa'){say('qahwa');h.qahwa=true;D.last=seat;return end()}
    else if(a==='pass')return end();else throw 'طلب غير معروف';
  }else if(D.st==='oc'){
    if(a!=='open'&&a!=='closed')throw 'اختر مفتوح أو مقفول';
    say(a);h.closed=a==='closed';startPlay(st);
  }
}
function startPlay(st){
  const h=st.h,r=h.rest;let i=0;
  h.hands[h.buyer]=h.hands[h.buyer].concat([h.up,r[i++],r[i++]]);
  for(const s of ord(st.dealer))if(s!==h.buyer)h.hands[s]=h.hands[s].concat([r[i++],r[i++],r[i++]]);
  h.rest=[];
  for(let s=0;s<4;s++){
    h.cand[s]=findProjects(h.hands[s],h.mode);
    if(h.mode==='hokm'&&h.hands[s].includes('K'+h.trump)&&h.hands[s].includes('Q'+h.trump))h.kq=s;
  }
  st.phase='play';h.turn=(st.dealer+1)%4;h.lead=h.turn;h.dbl=null;
}
// decl: 'all' (الكمبيوتر) أو {sira:1,'50':0,...} اختيار اللاعب
function doPlay(st,seat,c,decl){
  const h=st.h;
  if(st.phase!=='play'||h.turn!==seat)throw 'مو دورك';
  if(!h.hands[seat].includes(c))throw 'الورقة مو عندك';
  if(h.tn===0&&!(String(seat) in h.decl))h.decl[seat]=pickDecl(st,seat,decl);
  if(!legal(h,seat).includes(c))addViol(st,{s:seat,tn:h.tn,c,why:whyIllegal(h,seat,c)});
  h.hands[seat]=h.hands[seat].filter(x=>x!==c);
  (h.log=h.log||[]).push({s:seat,c,led:h.trick.length?su(h.trick[0].c):null});
  h.trick.push({s:seat,c});
  if(h.kq===seat&&isT(c,h)&&(rk(c)==='K'||rk(c)==='Q')&&!h.hands[seat].includes('K'+h.trump)&&!h.hands[seat].includes('Q'+h.trump)){h.baloot=seat;ev(st,nm(st,seat)+': بلوت')}
  if(h.trick.length<4){h.turn=(seat+1)%4;return}
  const w=trickWinner(h.trick,h);
  h.ab[team(w)]+=h.trick.reduce((a,t)=>a+pts(t.c,h),0);h.tw[team(w)]++;
  h.last={cards:h.trick,w};h.trick=[];h.tn++;h.turn=w;
  if(h.tn===1)resolveProjects(st);
  if(h.tn===8){h.ab[team(w)]+=10;endHand(st)}
}
// سوا: هل فريق اللاعب ياخذ كل الأكلات الباقية مهما لعب الخصم؟ (null = الورق كثير وما نقدر نتحقق)
function sawaOK(h,seat){
  const T=team(seat),hh={mode:h.mode,trump:h.trump,closed:h.closed,hands:{},trick:[]},memo=new Map();let n=0;
  for(let s=0;s<4;s++)hh.hands[s]=(h.hands[s]||[]).slice();
  function rec(turn){
    if(++n>400000)throw 'big';
    if(!hh.trick.length&&!hh.hands[turn].length)return true;
    let key=null;
    if(!hh.trick.length){key=turn+'|'+[0,1,2,3].map(s=>hh.hands[s].slice().sort().join('')).join('/');if(memo.has(key))return memo.get(key)}
    const L=legal(hh,turn),mine=team(turn)===T;let res=!mine;
    for(const c of L){
      const keep=hh.hands[turn];hh.hands[turn]=keep.filter(x=>x!==c);hh.trick.push({s:turn,c});
      let ok;
      if(hh.trick.length===4){const w=trickWinner(hh.trick,hh);if(team(w)!==T)ok=false;else{const tr=hh.trick;hh.trick=[];ok=rec(w);hh.trick=tr}}
      else ok=rec((turn+1)%4);
      hh.trick.pop();hh.hands[turn]=keep;
      if(mine&&ok){res=true;break}
      if(!mine&&!ok){res=false;break}
    }
    if(key)memo.set(key,res);
    return res;
  }
  try{return rec(seat)}catch(e){if(e==='big')return null;throw e}
}
function doSawa(st,seat){
  const h=st.h;
  if(st.phase!=='play'||h.turn!==seat||h.trick.length)throw 'السوا تقولها وأنت تبدأ الأكلة';
  if(h.tn<1)throw 'السوا بعد أول أكلة';
  const ok=sawaOK(h,seat);
  if(ok===null)throw 'باقي ورق كثير، كمّل أكلة وبعدها قل سوا';
  const T=team(seat);
  if(!ok){const sh={};for(let s=0;s<4;s++)sh[s]=h.hands[s].slice();h.sawa={s:seat,shown:sh,ok:false};ev(st,nm(st,seat)+': سوا');return finishPenalty(st,1-T,{k:'sawa',by:seat,ok:false})}
  const shown={};let rem=0;
  for(let s=0;s<4;s++){shown[s]=h.hands[s].slice();rem+=h.hands[s].reduce((a,c)=>a+pts(c,h),0);h.hands[s]=[]}
  if(h.kq!=null&&h.baloot==null)h.baloot=h.kq;
  h.ab[T]+=rem+10;h.tw[T]+=8-h.tn;h.tn=8;h.sawa={s:seat,shown,ok:true};
  ev(st,nm(st,seat)+': سوا');
  endHand(st);
}
// قيد: إذا الخصم غلط ينحسب لكم كل شي، وإذا القيد غلط ينقلب عليكم
function doQayd(st,seat){
  const h=st.h;
  if(!h||!['play','end','over'].includes(st.phase))throw 'ما فيه لعب الحين';
  if(h.result&&h.result.pen)throw 'التوزيعة انحسمت';
  const T=team(seat),vs=(h.viol||[]).filter(v=>team(v.s)!==T),ok=vs.length>0;
  finishPenalty(st,ok?T:1-T,{k:'qayd',by:seat,ok,v:ok?vs[0]:null});
}
function finishPenalty(st,wt,pen){
  const h=st.h;
  if(h.result){st.score[0]-=h.result.res[0];st.score[1]-=h.result.res[1];st.hist=(st.hist||[]).slice(0,-1);st.winner=null}
  if(!h.projDone)resolveProjects(st);
  const {pp}=projPoints(h),total=h.mode==='sun'?26:16,balP=[0,0];
  if(h.baloot!=null)balP[team(h.baloot)]=2;
  const res=[0,0],cp=[0,0],projP=[0,0];
  cp[wt]=total;projP[wt]=pp[0]+pp[1];
  res[wt]=(total+pp[0]+pp[1])*h.mult;res[0]+=balP[0];res[1]+=balP[1];
  h.trick=[];
  applyResult(st,{ab:h.ab.slice(),cp,projP,balP,kab:null,win:wt===team(h.buyer),wt,res,mult:h.mult,qahwa:h.qahwa,pen});
}
function scoreHand(st){
  const h=st.h,b=team(h.buyer),o=1-b,sun=h.mode==='sun',total=sun?26:16;
  const kab=h.tw[0]===8?0:h.tw[1]===8?1:null;
  const {pp:projP,raw:projRaw}=projPoints(h);
  const balP=[0,0];if(h.baloot!=null)balP[team(h.baloot)]=2;
  let cp=[0,0];
  if(kab!=null)cp[kab]=sun?44:25;
  else if(sun){cp[b]=Math.round(h.ab[b]*2/10);cp[o]=26-cp[b]}
  else{const u=h.ab[b]%10;cp[b]=Math.floor(h.ab[b]/10)+(u>5?1:0);cp[o]=16-cp[b]}
  const raw=[0,1].map(t=>h.ab[t]+projRaw[t]+balP[t]*10);
  const win=kab!=null?kab===b:raw[b]>raw[o];
  const res=[0,0],wt=win?b:o;
  if(h.mult===1&&win){res[b]=cp[b]+projP[b];res[o]=cp[o]+projP[o]}
  else res[wt]=((kab!=null?cp[wt]:total)+projP[0]+projP[1])*h.mult;
  res[0]+=balP[0];res[1]+=balP[1];
  return {ab:h.ab.slice(),cp,projP,balP,kab,win,wt,res,mult:h.mult,qahwa:h.qahwa,pen:null};
}
function endHand(st){applyResult(st,scoreHand(st))}
function applyResult(st,r){
  const h=st.h;h.result=r;
  st.score[0]+=r.res[0];st.score[1]+=r.res[1];
  st.hist=(st.hist||[]).concat([{mode:h.mode,trump:h.trump,buyer:h.buyer,mult:h.mult,res:r.res}]).slice(-40);
  const P=r.pen;
  ev(st,P?(P.k==='qayd'?(P.ok?'قيد صحيح على '+nm(st,P.v.s):'قيد غلط، انقلبت'):'سوا غلط، انقلبت'):r.kab!=null?'كبوت!':r.win?'المشتري نجح':'المشتري خسر، قلبت');
  if(h.qahwa){st.phase='over';st.winner=r.wt;return}
  const [a,b]=st.score;
  if((a>=st.target||b>=st.target)&&a!==b){st.phase='over';st.winner=a>b?0:1}
  else{st.phase='end';st.winner=null}
}
function doNext(st){if(st.phase!=='end')throw 'التوزيعة ما خلصت';st.dealer=(st.dealer+1)%4;deal(st)}

/* ---------- الكمبيوتر: يلعب على أصول البلوت ----------
   يتذكر الورق اللي نزل، ويعرف مين خلص من أي لون، ويقرأ إشارات خويه.
   البادي: يسحب الحكم (المشتري) ← يحل قوته (الأوراق الكبيرة) ← يشد حلة خويه ← يلعب لخويه اللون اللي يدق فيه ← يفتح من أطول لون بورقة صغيرة ويحمي العشرة.
   اللي بعده: إذا خويه ماسك ومضمون يكبّر له بالأبناط، وإذا الخصم ماسك يأكل بأرخص ورقة، وإذا ما يقدر يرمي أصغر ورقة. */
const DECK=SU.flatMap(s=>RANKS.map(r=>r+s));
function botCard(st,seat){
  const h=st.h,hand=h.hands[seat],L=legal(h,seat),tr=h.trick,mate=(seat+2)%4,hokm=h.mode==='hokm',T=h.trump;
  const log=h.log||[],played=new Set(log.map(x=>x.c));tr.forEach(t=>played.add(t.c));
  const mine=new Set(hand);
  const outs=s=>DECK.filter(c=>su(c)===s&&!played.has(c)&&!mine.has(c));
  const master=c=>outs(su(c)).every(o=>pow(o,h)<pow(c,h));
  const val=c=>pts(c,h),pw=c=>pow(c,h)+(isT(c,h)?100:0);
  const voids={};log.forEach(x=>{if(x.led&&su(x.c)!==x.led)(voids[x.s]=voids[x.s]||{})[x.led]=1});
  tr.forEach((t,i)=>{if(i&&su(t.c)!==su(tr[0].c))(voids[t.s]=voids[t.s]||{})[su(tr[0].c)]=1});
  const isVoid=(s,suit)=>!!(voids[s]&&voids[s][suit]);
  const opp=[(seat+1)%4,(seat+3)%4],trOut=hokm?outs(T).length:0;
  const oppCut=suit=>hokm&&suit!==T&&trOut>0&&opp.some(o=>isVoid(o,suit)&&!isVoid(o,T));
  // إشارات خويه: إذا رمى ورقة كبيرة من لون = يبيه، وإذا رمى صغيرة = ما يبيه (تنفير)
  const want={},nowant={};
  log.forEach(x=>{if(x.s===mate&&x.led&&su(x.c)!==x.led&&!(hokm&&su(x.c)===T)){if('ATK'.includes(rk(x.c)))want[su(x.c)]=1;else nowant[su(x.c)]=1}});
  // خويه بدأ بلون وأكل فيه = هذي حلته
  log.forEach((x,i)=>{if(x.s===mate&&!x.led&&!(hokm&&su(x.c)===T)&&'AT'.includes(rk(x.c)))want[su(x.c)]=1});
  if(hokm&&team(h.buyer)===team(seat)&&h.buyer===mate)want[T]=want[T]||0;
  const low=a=>a.slice().sort((x,y)=>val(x)-val(y)||pw(x)-pw(y))[0];
  const cheapWin=a=>a.slice().sort((x,y)=>pw(x)-pw(y)||val(x)-val(y))[0];
  const of=(a,s)=>a.filter(c=>su(c)===s);
  if(!tr.length){
    const weBuy=team(h.buyer)===team(seat);
    if(hokm){
      const myT=of(hand,T).sort((a,b)=>pow(b,h)-pow(a,h));
      // يسحب الحكم: فريق المشتري يطلّع حكم الخصوم بالكبير
      if(weBuy&&myT.length&&trOut>0&&L.includes(myT[0])){
        if(master(myT[0]))return myT[0];
      }
    }
    // يحل قوته: الأوراق الكبيرة اللي ما فوقها شي (والخصم ما يقدر يدق عليها)
    const cash=L.filter(c=>!(hokm&&su(c)===T)&&master(c)&&val(c)>=3&&!oppCut(su(c)));
    if(cash.length)return cash.sort((x,y)=>val(y)-val(x))[0];
    // يشد حلة خويه
    const ms=Object.keys(want).filter(s=>of(L,s).length&&!(hokm&&s===T&&!weBuy));
    if(ms.length){const s=ms.sort((a,b)=>of(L,b).length-of(L,a).length)[0],cs=of(L,s);const m=cs.filter(master);return m.length?m[0]:low(cs)}
    // خويه خالص من لون وعنده حكم: يلعب له اللون عشان يدق
    if(hokm){const cut=SU.filter(s=>s!==T&&isVoid(mate,s)&&!isVoid(mate,T)&&of(L,s).length&&!opp.some(o=>isVoid(o,s)&&!isVoid(o,T)));if(cut.length)return low(of(L,cut[0]))}
    // يفتح لون: ما يلعب حكم إذا هو خصم، يحمي العشرة، ويتجنب اللون اللي خويه نفّر منه
    const okSuit=s=>{
      if(hokm&&s===T&&!weBuy)return false;
      const cs=of(hand,s);
      if(cs.some(c=>rk(c)==='T')&&outs(s).some(c=>rk(c)==='A')&&cs.length<=2)return false;
      if(nowant[s])return false;
      return true;
    };
    let pool=L.filter(c=>okSuit(su(c)));
    if(!pool.length)pool=L.filter(c=>!(hokm&&su(c)===T&&!weBuy));
    if(!pool.length)pool=L;
    // من أطول لون، بأصغر ورقة، وما يفتح بالشايب أو البنت إذا الإكه برا
    const suits=[...new Set(pool.map(su))].sort((a,b)=>of(hand,b).length-of(hand,a).length||of(pool,a).reduce((v,c)=>v+val(c),0)-of(pool,b).reduce((v,c)=>v+val(c),0));
    for(const s of suits){const cs=of(pool,s).filter(c=>!('KQ'.includes(rk(c))&&outs(s).some(o=>pow(o,h)>pow(c,h))&&of(pool,s).length>1));if(cs.length)return low(cs)}
    return low(pool);
  }
  const led=su(tr[0].c),cur=trickWinner(tr,h),curC=tr.find(t=>t.s===cur).c,pos=tr.length;
  const inPts=tr.reduce((a,t)=>a+val(t.c),0);
  const wins=L.filter(c=>trickWinner(tr.concat([{s:seat,c}]),h)===seat);
  if(team(cur)===team(seat)){
    // خويه ماسك: إذا مضمون (آخر واحد أو ورقته ما فوقها شي) يكبّر له بالأبناط
    const sure=pos===3||(master(curC)&&(isT(curC,h)||!oppCut(led)))||(pos===2&&opp.every(o=>tr.some(t=>t.s===o)));
    if(sure){
      const give=L.filter(c=>!(hokm&&su(c)===T&&L.some(x=>su(x)!==T))&&!(master(c)&&rk(c)==='A'&&of(hand,su(c)).length>1));
      const g=(give.length?give:L).slice().sort((x,y)=>val(y)-val(x)||pw(x)-pw(y));
      return g[0];
    }
    // خويه ماسك بس مو مضمون: إذا عندي الورقة الكبيرة أضمن الأكلة
    const mw=wins.filter(c=>master(c)&&(isT(c,h)||!oppCut(led))&&!(isT(c,h)&&!isT(curC,h)));
    if(mw.length&&inPts>=10)return cheapWin(mw);
    return low(L);
  }
  if(wins.length){
    if(pos===3)return cheapWin(wins);                       // آخر واحد: ياكل بأرخص ورقة
    if(pos===2)return cheapWin(wins);                       // خويه بدأ والخصم غطّاه: يرجّعها
    const safe=wins.filter(c=>master(c)&&(isT(c,h)||!oppCut(led)));
    if(safe.length)return cheapWin(safe);                   // ثاني واحد: ياكل بس إذا ورقته مضمونة
    if(inPts>=10&&hokm&&wins.some(c=>isT(c,h)))return cheapWin(wins);
    return low(L);
  }
  // ما يقدر ياكل: يرمي أقل شي، ويخلي الأوراق الكبيرة اللي تنفع بعدين
  const keep=L.filter(c=>!master(c));
  return low(keep.length?keep:L);
}
function botAct(st,seat){
  const h=st.h;
  if(st.phase==='bid'){
    const hand=h.hands[seat].concat([h.up]);
    const hs=s=>hand.reduce((v,c)=>v+(su(c)===s?({J:3,9:2.2,A:1.4,T:1,K:.6,Q:.5,8:.3,7:.3})[rk(c)]:(rk(c)==='A'?1:0)),0);
    const sunS=hand.reduce((v,c)=>v+(rk(c)==='A'?2.2:rk(c)==='T'&&hand.includes('A'+su(c))?1.2:rk(c)==='K'?.4:0),0);
    if(sunS>=6.6)return doBid(st,seat,(h.bi>=2&&rnd(3)===0)?'ashkal':'sun');
    if(!h.bid){
      if(h.round===1&&hs(su(h.up))>=5.5)return doBid(st,seat,'hokm');
      if(h.round===2){const bs=SU.filter(s=>s!==su(h.up)).sort((a,b)=>hs(b)-hs(a))[0];if(hs(bs)>=5.5)return doBid(st,seat,'hokm',bs)}
    }
    return doBid(st,seat,'pass');
  }
  if(st.phase==='dbl'){
    const D=h.dbl;
    if(D.st==='oc')return doDbl(st,seat,'open');
    if(D.st==='d'&&h.mode==='hokm'){const s=h.hands[seat].filter(c=>su(c)===h.trump).reduce((v,c)=>v+(({J:3,9:2.2,A:1.4,T:1})[rk(c)]||0),0);if(s>=6)return doDbl(st,seat,'dbl')}
    return doDbl(st,seat,'pass');
  }
  if(st.phase==='play'){
    if(!h.trick.length&&h.tn>=1&&h.hands[seat].length<=4&&sawaOK(h,seat)===true)return doSawa(st,seat);
    return doPlay(st,seat,botCard(st,seat),'all');
  }
}
// إذا خلص وقت اللاعب: الشراء = بس، الدبل = بس، اللعب = الكمبيوتر يختار ورقة نظامية
function autoAct(st,seat,decl){
  const h=st.h;
  if(st.phase==='bid')return doBid(st,seat,'pass');
  if(st.phase==='dbl')return doDbl(st,seat,h.dbl.st==='oc'?'open':'pass');
  if(st.phase==='play')return doPlay(st,seat,botCard(st,seat),decl||{});
}

const BE={SU,SYM,SNAME,RANKS,W,PROJ_NAME,su,rk,team,ord,legal,whyIllegal,trickWinner,findProjects,projLabel,newState,startGame,deal,turnOf,tkey,doBid,doDbl,doPlay,doNext,doQayd,doSawa,sawaOK,scoreHand,botAct,botCard,autoAct,pts,pow,isT};
if(typeof module!=='undefined'&&module.exports){module.exports=BE;return}
G.BE=BE;

/* ---------- الواجهة ---------- */
const CSS=`
@property --p{syntax:'<percentage>';inherits:false;initial-value:100%}
@keyframes oring{from{--p:100%}to{--p:0%}}
@keyframes obar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes opop{from{opacity:0;scale:.78}to{opacity:1;scale:1}}
@keyframes obub{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.ocode{font-size:44px;font-weight:800;letter-spacing:8px;color:var(--acc);direction:ltr}
.seatmap{display:grid;grid-template-columns:1fr 1.2fr 1fr;grid-template-rows:auto auto auto;gap:8px;align-items:center;margin:6px 0 10px}
.seatmap .mid{grid-column:2;grid-row:2;aspect-ratio:1;border-radius:18px;background:radial-gradient(#1f6b4f,#0d3527);border:4px solid #6b4226;display:flex;align-items:center;justify-content:center;color:#f1e4c8;font-size:13px;text-align:center;padding:6px}
.st0{grid-column:2;grid-row:3}.st1{grid-column:3;grid-row:2}.st2{grid-column:2;grid-row:1}.st3{grid-column:1;grid-row:2}
.sb{border:1px dashed var(--line);border-radius:14px;padding:8px 4px;text-align:center;min-height:62px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.sb.ta{border-color:#2e8b5b}.sb.tb{border-color:#b8860b}
.sb b{font-size:14px}.sb small{font-size:11px;color:var(--mut)}
.sb button,.tsel button{border:0;background:var(--chip);color:var(--ink);font:inherit;font-size:12px;font-weight:700;border-radius:9px;padding:5px 6px;cursor:pointer}
.tsel{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;margin:4px 0 12px;font-size:13px;color:var(--mut)}
.tsel button{padding:7px 12px;font-size:13px}.tsel button.on{background:var(--acc);color:#1b1500}
/* لوحة النتيجة */
.osb{display:flex;align-items:stretch;gap:8px;margin-bottom:10px}
.osb .sc{border-radius:14px;padding:6px 10px;text-align:center;min-width:76px;color:#fff;background:linear-gradient(#7a4a2a,#4e2d17);box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.osb .sc.us{background:linear-gradient(#c99a3e,#8a6420)}
.osb .sc small{display:block;font-size:11px;opacity:.85}.osb .sc b{font-size:24px;line-height:1.1}
.osb .md{flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center;font-size:14px;font-weight:800;line-height:1.45;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:4px 6px}
.osb .md small{font-weight:500;color:var(--mut);font-size:12px}
.osb .md .rs{color:#c0262d}
/* الطاولة */
.otbl{position:relative;margin:0 -4px 6px;padding:9px;border-radius:30px;background:linear-gradient(160deg,#8a5a33,#5a3519 55%,#3f2410);box-shadow:0 12px 26px rgba(50,25,5,.32),inset 0 2px 0 rgba(255,255,255,.16),inset 0 -2px 0 rgba(0,0,0,.3)}
.sadu{height:9px;margin:0 18px 7px;border-radius:5px;opacity:.95;background:
 linear-gradient(135deg,#9b2d1f 25%,transparent 25%) -7px 0/14px 9px,
 linear-gradient(225deg,#9b2d1f 25%,transparent 25%) -7px 0/14px 9px,
 linear-gradient(315deg,#231a12 25%,transparent 25%) 0 0/14px 9px,
 linear-gradient(45deg,#231a12 25%,transparent 25%) 0 0/14px 9px,#efe3cf}
.sadu.b{margin:7px 18px 0}
.felt{position:relative;height:clamp(350px,96vw,440px);border-radius:22px;overflow:hidden;
 background:radial-gradient(90% 75% at 50% 45%,#23795a 0%,#17583f 55%,#0d3527 100%);
 box-shadow:inset 0 0 0 2px rgba(212,162,76,.55),inset 0 0 0 7px rgba(0,0,0,.12),inset 0 0 46px rgba(0,0,0,.45)}
.felt:before{content:"";position:absolute;left:50%;top:50%;width:min(52%,230px);aspect-ratio:1;transform:translate(-50%,-50%) rotate(45deg);border:1.5px solid rgba(212,162,76,.22);border-radius:18px}
.felt .emb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:rgba(241,228,200,.22);font-size:13px;font-weight:800;text-align:center;line-height:1.5}
.felt .emb b{display:block;font-size:42px;line-height:1}
.pl{position:absolute;z-index:4;display:flex;flex-direction:column;align-items:center;gap:2px;width:96px;color:#fff;text-align:center}
.pl .av{position:relative;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:19px;color:#4a2c14;background:linear-gradient(#fbf3e3,#e3cca5);border:3px solid #9fb7c9;box-shadow:0 3px 8px rgba(0,0,0,.35)}
.pl.us .av{border-color:#e0b84a}
.pl .av .dl{position:absolute;bottom:-4px;left:-6px;background:#efe3cf;color:#4a2c14;border-radius:99px;font-size:10px;padding:1px 5px;font-weight:800;border:1px solid #c9a46a}
.pl.turn .av{box-shadow:0 0 0 3px rgba(255,214,107,.35),0 0 18px rgba(255,214,107,.55)}
.pl.turn .av:after{content:"";position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(#ffd66b var(--p),rgba(255,255,255,.12) 0);
 -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 4px));
 animation:oring var(--d,0s) linear forwards;animation-delay:var(--dl,0s)}
.pl .nm{font-size:12.5px;font-weight:800;background:rgba(0,0,0,.38);padding:2px 9px;border-radius:99px;max-width:96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl .tg{font-size:10.5px;opacity:.88;line-height:1.3}
.pl .bub{background:#fffaf0;color:#2b1a0e;border-radius:12px;padding:2px 10px;font-weight:800;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.3);animation:obub .25s}
.pl .bub.g{background:#e0b84a}
.pl .pjs{font-size:10.5px;background:rgba(224,184,74,.9);color:#2b1a0e;border-radius:8px;padding:1px 6px;font-weight:700}
.pl .backs{display:flex;direction:ltr;margin-top:2px}
.pl .backs i{width:13px;height:19px;border-radius:2.5px;margin-left:-6px;border:1px solid #f1e4c8;background:repeating-linear-gradient(45deg,#7a4a2a 0 2px,#5a3519 2px 4px)}
.pl .backs i:first-child{margin-left:0}
.pl.p2{top:8px;left:50%;transform:translateX(-50%)}
.pl.p1{right:4px;top:50%;transform:translateY(-58%)}
.pl.p3{left:4px;top:50%;transform:translateY(-58%)}
.pl.p0{bottom:8px;right:8px;width:80px}
/* الورق */
.cd{--w:60px;position:relative;width:var(--w);height:calc(var(--w)*1.42);border-radius:calc(var(--w)*.1);background:linear-gradient(#fffefb,#fbf6ea);color:#1d1d24;border:1px solid #d8cdb6;box-shadow:0 2px 5px rgba(0,0,0,.25);direction:ltr;font-family:Georgia,'Times New Roman',serif;flex:0 0 auto;overflow:hidden;padding:0}
.cd.red{color:#c0262d}
.cd .ix{position:absolute;top:calc(var(--w)*.04);left:calc(var(--w)*.06);display:flex;flex-direction:column;align-items:center;font-weight:700;font-size:calc(var(--w)*.3);line-height:.95;font-style:normal;z-index:2}
.cd .ix b{font-size:calc(var(--w)*.26);font-family:system-ui,sans-serif}
.cd .ix.bt{top:auto;left:auto;bottom:calc(var(--w)*.04);right:calc(var(--w)*.06);transform:rotate(180deg)}
.cd .pip{position:absolute;left:58%;top:54%;transform:translate(-50%,-50%);font-size:calc(var(--w)*.62);line-height:1;font-family:system-ui,sans-serif}
.cd .pip.ace{font-size:calc(var(--w)*.8)}
.cd .pip.ace:after{content:"";position:absolute;inset:-14%;border:1.5px solid #c9a046;border-radius:50%}
.cd .art{position:absolute;left:26%;right:9%;top:12%;bottom:8%;border-radius:calc(var(--w)*.06);border:1.5px solid currentColor;background:#f6ecd9;overflow:hidden}
.cd .art svg{width:100%;height:100%;display:block}
.cd .fl{position:absolute;left:4%;bottom:5%;font-size:calc(var(--w)*.13);font-family:'Tajawal',system-ui;font-weight:800;writing-mode:vertical-rl;transform:rotate(180deg);opacity:.75}
.cd.bk{background:repeating-linear-gradient(45deg,#7a4a2a 0 4px,#5a3519 4px 8px),#5a3519;box-shadow:inset 0 0 0 3px #f1e4c8,0 2px 5px rgba(0,0,0,.25)}
.tcd{position:absolute;left:50%;top:50%;z-index:2}
.tcd .cd{--w:clamp(52px,15vw,70px)}
.tcd.r0{transform:translate(-50%,4%) rotate(2deg)}.tcd.r2{transform:translate(-50%,-104%) rotate(-3deg)}
.tcd.r1{transform:translate(44%,-50%) rotate(-7deg)}.tcd.r3{transform:translate(-144%,-50%) rotate(6deg)}
.tcd.nw .cd{animation:opop .22s ease-out}
.tcd.win .cd{box-shadow:0 0 0 3px #ffd66b,0 4px 12px rgba(0,0,0,.4)}.tcd.old .cd{filter:brightness(.9)}
.upc{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;color:#f1e4c8;font-size:13px;font-weight:700;z-index:2}
.upc .cd{--w:clamp(60px,17vw,78px);margin:0 auto 6px;transform:rotate(-4deg)}
/* يدي */
.hand{--w:clamp(50px,calc((min(100vw,640px) - 40px)/6.1),78px);display:flex;justify-content:center;direction:ltr;padding:20px 0 6px;margin:0 -6px 2px;min-height:calc(var(--w)*1.42 + 30px)}
.hand .cd{--w:inherit;cursor:pointer;transform:translateY(var(--y,0)) rotate(var(--r,0));transform-origin:50% 120%;transition:transform .12s}
.hand .cd+.cd{margin-left:calc(var(--w)*-.34)}
.hand.my .cd:active,.hand.my .cd:hover{transform:translateY(calc(var(--y,0px) - 14px)) rotate(var(--r,0))}
.hand:not(.my) .cd{filter:saturate(.85) brightness(.97)}
/* اللوحة */
.opnl{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;margin-bottom:10px;text-align:center}
.opnl .bt{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px}
.opnl .bt button{flex:1 1 30%;min-width:84px;border:0;border-radius:12px;padding:12px 6px;font:inherit;font-weight:800;font-size:16px;cursor:pointer;background:var(--chip);color:var(--ink)}
.opnl .bt button.g{background:var(--g);color:#fff}.opnl .bt button.y{background:var(--acc);color:#1b1500}
.opnl .bt button.q{background:none;border:2px solid var(--bad);color:var(--bad)}
.otm{height:7px;border-radius:9px;background:var(--chip);overflow:hidden;margin:8px 0 2px}
.otm i{display:block;height:100%;background:linear-gradient(90deg,#c0262d,#e0b84a 40%,#2e8b5b);transform-origin:right;animation:obar var(--d) linear forwards;animation-delay:var(--dl)}
.pjrow{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;margin-top:8px;font-size:13px;color:var(--mut)}
.pj{background:var(--chip);border-radius:99px;padding:7px 13px;font-weight:800;font-size:14px;cursor:pointer;border:2px solid transparent;color:var(--ink);font-family:inherit}
.pj.on{border-color:var(--acc);background:rgba(224,184,74,.2)}
.pen{background:rgba(192,38,45,.08);border:1px solid rgba(192,38,45,.35);border-radius:12px;padding:8px;margin:6px 0;font-weight:700;font-size:14px}
.pen.ok{background:rgba(46,139,91,.1);border-color:rgba(46,139,91,.4)}
.otoast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#2b1a0e;color:#fff;padding:10px 16px;border-radius:12px;z-index:100;font-weight:700;font-size:14px;max-width:90%;text-align:center}
.osawa{background:linear-gradient(160deg,#1f6b4f,#0d3527);color:#fbf3e3;border-radius:18px;padding:10px 10px 6px;margin:0 0 10px;box-shadow:0 8px 18px rgba(0,0,0,.2);animation:opop .3s ease-out}
.osh{font-weight:800;font-size:15px;text-align:center;margin-bottom:6px}.osh small{display:block;font-size:11.5px;font-weight:500;opacity:.8}
.osh .ok{color:#8fe0b4}.osh .bad{color:#f0a49a}
.osr{display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:12px;margin-bottom:4px;background:rgba(0,0,0,.18)}
.osr.tm{background:rgba(224,184,74,.14)}.osr.me{box-shadow:inset 0 0 0 2px #e0b84a}
.osn{width:72px;flex:0 0 auto;font-size:12.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.osc{flex:1;display:flex;direction:ltr;flex-wrap:wrap;gap:3px}.osc .cd{--w:clamp(34px,9.6vw,44px)}.osc .cd .ix.bt{display:none}.osc .note{color:#f1e4c8;opacity:.7}
.felt.cmp{height:clamp(250px,66vw,310px)}
.felt.cmp .upc{top:57%}.felt.cmp .upc .cd{--w:clamp(52px,14vw,64px)}.felt.cmp .pl.p2 .backs{display:none}
.omute{position:absolute;top:8px;left:8px;z-index:6;width:38px;height:38px;border-radius:50%;border:1px solid rgba(241,228,200,.45);background:rgba(0,0,0,.28);color:#fff;font-size:17px;cursor:pointer;display:grid;place-items:center;padding:0}
.pjc{display:flex;align-items:center;gap:2px;direction:ltr;background:rgba(255,250,240,.95);border-radius:8px;padding:2px 4px;box-shadow:0 2px 6px rgba(0,0,0,.3);animation:obub .3s}
.pjc em{font-style:normal;font-size:10px;font-weight:800;color:#8a6420;margin-right:3px;direction:rtl}
.pjc i{font-style:normal;font-weight:800;font-size:12px;color:#1d1d24;background:#fff;border:1px solid #d8cdb6;border-radius:4px;padding:1px 3px;line-height:1.2}
.pjc i.red{color:#c0262d}
.opnl .bt button{padding:11px 6px}
details.rules summary{cursor:pointer;font-weight:800}details.rules li{margin:5px 0;font-size:14px;line-height:1.6}
`;
const stEl=document.createElement('style');stEl.textContent=CSS;document.head.appendChild(stEl);

/* ---------- صور الشايب والبنت والولد ---------- */
const OL='#3b2412',SK='#ecbd94';
function faceSVG(r,red){
  const robe=red?'#b3262d':'#1f2d4d',acc='#d4a24c';
  if(r==='K'){
    const shm=red?'#c4282f':'#fbf8f1';
    const dots=red?[[18,26],[22,20],[38,20],[42,26],[16,40],[44,40],[19,50],[41,50],[30,14]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.1" fill="#fff" opacity=".85"/>`).join(''):'';
    return `<svg viewBox="0 0 60 76" preserveAspectRatio="xMidYMax slice"><path d="M4 76C6 61 17 54 30 54S54 61 56 76Z" fill="${robe}"/><path d="M23 76L25 55H35L37 76Z" fill="#fbf8f1"/><path d="M25 55L23 76M35 55L37 76" stroke="${acc}" stroke-width="1.8"/><path d="M13 34C12 18 20 9 30 9S48 18 47 34L52 59C44 57 40 51 39 44H21C20 51 16 57 8 59Z" fill="${shm}" stroke="${OL}" stroke-width=".8"/>${dots}<ellipse cx="30" cy="31" rx="9.5" ry="11.5" fill="${SK}" stroke="${OL}" stroke-width=".8"/><path d="M20.5 31C21 45 26 49.5 30 49.5S39 45 39.5 31C37 37 34 38.5 30 38.5S23 37 20.5 31Z" fill="#f4f2ec" stroke="#a39d92" stroke-width=".6"/><path d="M24.5 37.2C27 35.4 33 35.4 35.5 37.2C33 38.4 27 38.4 24.5 37.2Z" fill="#e3e0d8" stroke="#a39d92" stroke-width=".5"/><path d="M24.5 26.6h4M31.5 26.6h4" stroke="#f4f2ec" stroke-width="1.7" stroke-linecap="round"/><circle cx="26.6" cy="29.6" r="1.05" fill="${OL}"/><circle cx="33.4" cy="29.6" r="1.05" fill="${OL}"/><ellipse cx="30" cy="16.5" rx="15.5" ry="4.3" fill="none" stroke="#17120e" stroke-width="2.6"/><ellipse cx="30" cy="12.8" rx="14" ry="3.6" fill="none" stroke="#17120e" stroke-width="2.2"/></svg>`;
  }
  if(r==='Q'){
    return `<svg viewBox="0 0 60 76" preserveAspectRatio="xMidYMax slice"><path d="M15 34C13 16 21 8 30 8S47 16 45 34C46 45 49 53 51 60H9C11 53 14 45 15 34Z" fill="#2b1a10"/><path d="M5 76C7 62 17 55 30 55S53 62 55 76Z" fill="${robe}"/><path d="M22 56Q30 63 38 56" fill="none" stroke="${acc}" stroke-width="1.8"/><circle cx="30" cy="61.5" r="1.8" fill="${acc}"/><rect x="26.5" y="44" width="7" height="12" rx="3" fill="${SK}"/><ellipse cx="30" cy="31" rx="9" ry="11" fill="${SK}" stroke="${OL}" stroke-width=".8"/><path d="M21 28C21 17 39 17 39 28C36 22 27 21 21 28Z" fill="#2b1a10"/><path d="M24.6 29.2q2-1.6 4 0M31.4 29.2q2-1.6 4 0" stroke="${OL}" stroke-width=".9" fill="none"/><circle cx="26.6" cy="30.6" r="1" fill="${OL}"/><circle cx="33.4" cy="30.6" r="1" fill="${OL}"/><circle cx="24.6" cy="35" r="2" fill="#e88" opacity=".35"/><circle cx="35.4" cy="35" r="2" fill="#e88" opacity=".35"/><path d="M27.6 38.2q2.4 1.6 4.8 0" stroke="#b3262d" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="21" cy="35" r="1.3" fill="${acc}"/><circle cx="39" cy="35" r="1.3" fill="${acc}"/><path d="M20 18L22.5 10.5 26.5 15 30 7 33.5 15 37.5 10.5 40 18Z" fill="${acc}" stroke="#8a6420" stroke-width=".7"/><circle cx="30" cy="12" r="1.6" fill="${red?'#c0262d':'#2f6fb0'}"/></svg>`;
  }
  // J الولد
  return `<svg viewBox="0 0 60 76" preserveAspectRatio="xMidYMax slice"><path d="M6 76C8 62 18 55 30 55S52 62 54 76Z" fill="#fbf8f1" stroke="#cfc6b4" stroke-width=".8"/><path d="M14 76L40 56 45 58 21 76Z" fill="${robe}"/><path d="M27 55V66" stroke="#cfc6b4" stroke-width="1"/><circle cx="27" cy="59" r=".9" fill="${acc}"/><circle cx="27" cy="63" r=".9" fill="${acc}"/><rect x="26.5" y="45" width="7" height="11" rx="3" fill="${SK}"/><ellipse cx="30" cy="32" rx="9" ry="11" fill="${SK}" stroke="${OL}" stroke-width=".8"/><path d="M21.2 30C21 26 22 24 24 23.5L36 23.5C38 24 39 26 38.8 30C37 26 23 26 21.2 30Z" fill="#2b1a10"/><path d="M20.4 24.5C21 14 39 14 39.6 24.5Z" fill="#fbf8f1" stroke="${OL}" stroke-width=".8"/><path d="M22 21.5H38M23.5 18H36.5" stroke="#d6cdb9" stroke-width="1" stroke-dasharray="1.4 1.2"/><path d="M24.8 28.6h3.6M31.6 28.6h3.6" stroke="#2b1a10" stroke-width="1.1" stroke-linecap="round"/><circle cx="26.6" cy="31" r="1" fill="${OL}"/><circle cx="33.4" cy="31" r="1" fill="${OL}"/><path d="M27 37.6q3 2.4 6 0" stroke="${OL}" stroke-width="1" fill="none" stroke-linecap="round"/></svg>`;
}
const FNAME={K:'شايب',Q:'بنت',J:'ولد'};
const RN=r=>r==='T'?'10':r;
function cardH(c,cls,attr,style){
  const r=rk(c),s=su(c),red=s==='H'||s==='D',ix=`<i class="ix"><span>${RN(r)}</span><b>${SYM[s]}</b></i>`;
  const mid=FNAME[r]?`<div class="art">${faceSVG(r,red)}</div><span class="fl">${FNAME[r]}</span>`:`<span class="pip ${r==='A'?'ace':''}">${SYM[s]}</span>`;
  const tag=attr?'button':'div';
  return `<${tag} class="cd ${red?'red':''} ${cls||''}" ${attr||''} ${style?`style="${style}"`:''}>${ix}${mid}${FNAME[r]?'':`<i class="ix bt"><span>${RN(r)}</span><b>${SYM[s]}</b></i>`}</${tag}>`;
}

/* ---------- أصوات هادية ---------- */
let AC=null;
const sndOn=()=>{try{return typeof snd==='undefined'||!!snd}catch(e){return true}};
function ac(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function sCard(){
  if(!sndOn())return;const a=ac();if(!a)return;
  try{const len=.11,b=a.createBuffer(1,Math.floor(a.sampleRate*len),a.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,4);
    const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
    src.buffer=b;f.type='lowpass';f.frequency.value=1100;g.gain.value=.28;
    src.connect(f).connect(g).connect(a.destination);src.start()}catch(e){}
}
function sNote(freqs,gap,vol,dur){
  if(!sndOn())return;const a=ac();if(!a)return;
  try{freqs.forEach((fr,i)=>{const t=a.currentTime+i*(gap||0),o=a.createOscillator(),g=a.createGain();
    o.type='sine';o.frequency.value=fr;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.035,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+(dur||.5));
    o.connect(g).connect(a.destination);o.start(t);o.stop(t+(dur||.5)+.05)})}catch(e){}
}
const sTurn=()=>sNote([587,880],.09,.03,.45);
const sTick=()=>sNote([740],0,.02,.12);
const sWin=()=>sNote([523,659,784,1047],.16,.04,.9);
function osay(t){
  if(!sndOn()||!('speechSynthesis' in window))return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ar-SA';
    const v=typeof pickVoice==='function'?pickVoice():null;if(v)u.voice=v;
    u.rate=.95;u.pitch=.95;u.volume=.7;speechSynthesis.speak(u)}catch(e){}
}

/* ---------- الحالة ---------- */
let oc=null,R,P=null,Rok=false,unsub=null,odecl={},odeclId='',botKey='',first=true,ocodeVal='';
let curKey='',tStart=0,timers=[],fxId='',fxCnt=0,fxTurn='';
const SKIP={skip:1};
const V=()=>P||R;
const clone=x=>JSON.parse(JSON.stringify(x));
const e2=s=>typeof esc==='function'?esc(s):String(s);
function toast(t){const d=document.createElement('div');d.className='otoast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
const ref=()=>db.doc('live/r_'+oc);
const mySeat=()=>{const S=V();return S&&S.seats?S.seats.findIndex(x=>x&&!x.bot&&x.d===devId):-1};
const sname=s=>{const S=V();return (S.seats[s]&&S.seats[s].n)||'—'};
const tnames=t=>[t,t+2].map(sname).map(e2).join(' و ');
const tsecOf=S=>S.tsec==null?5:+S.tsec;
function limit(S){
  const t=tsecOf(S);if(!t)return 0;
  if(S.phase==='play')return t*1000;
  if(S.phase==='bid'||S.phase==='dbl')return Math.max(8,t*2)*1000;
  if(S.phase==='end')return S.h&&S.h.sawa?10000:6000;
  return 0;
}

async function act(fn,opt){
  if(!oc)return;
  if(R&&!(opt&&opt.noPrev)){
    // عرض فوري قبل ما يرد السيرفر
    try{const s=clone(R);fn(s);P=s;fx();render()}
    catch(e){if(e===SKIP)return;if(typeof e==='string')return toast(e);console.error(e)}
  }
  try{
    await db.runTransaction(async tx=>{
      const d=await tx.get(ref());if(!d.exists)throw 'الطاولة غير موجودة';
      const s=JSON.parse(JSON.stringify(d.data()));
      fn(s);s.ts=Date.now();
      const allH=s.seats.some(x=>x&&!x.bot),bots=s.seats.filter(x=>x&&x.bot&&!x.sub).map(x=>x.n),games=db.collection('games');
      if(s.rec&&s.phase!=='over'){if(s.recId)tx.delete(games.doc(s.recId));s.rec=false;s.recId=null}
      if(s.phase==='over'&&allH){
        const id=s.recId||games.doc().id;s.rec=true;s.recId=id;const w=s.winner;
        tx.set(games.doc(id),{a:[s.seats[0].n,s.seats[2].n],b:[s.seats[1].n,s.seats[3].n],sa:s.score[0],sb:s.score[1],winner:w===0?'A':'B',ts:Date.now(),target:s.target,by:'أونلاين',online:true,bots});
      }
      tx.set(ref(),JSON.parse(JSON.stringify(s)));
    });
  }catch(e){
    P=null;botKey='';render();
    if(e===SKIP)return;
    if(typeof e==='string')toast(e);else{console.error(e);toast('تعذر الاتصال، تأكد من الإنترنت')}
  }
}
// المؤثرات: صوت الورقة، صوت دورك
function fx(){
  const S=V();if(!S||!S.h){fxId='';return}
  const h=S.h,cnt=h.tn*4+h.trick.length;
  if(h.id===fxId&&cnt>fxCnt)sCard();
  fxId=h.id;fxCnt=cnt;
  const ms=mySeat(),k=BE.tkey(S);
  if(k!==fxTurn){fxTurn=k;if(ms>=0&&BE.turnOf(S)===ms){if(!first)sTurn();setTimeout(showPanel,60)}}
}
function showPanel(){
  try{const el=document.querySelector('.opnl');if(!el)return;const r=el.getBoundingClientRect();
    if(r.bottom>innerHeight-4||r.top<0)window.scrollBy({top:r.bottom-innerHeight+12,behavior:'smooth'})}catch(e){}
}
function openRoom(code){
  if(unsub)try{unsub()}catch(e){}
  oc=String(code);R=undefined;P=null;Rok=false;first=true;botKey='';curKey='';
  try{localStorage.setItem('baloot_room',oc)}catch(e){}
  unsub=ref().onSnapshot(s=>{
    const p=R;R=s.exists?s.data():null;P=null;Rok=true;
    if(R&&!first){
      if(R.evn!==(p&&p.evn)&&R.evt)osay(R.evt);
      if(R.phase==='over'&&p&&p.phase!=='over'){sWin();if(typeof confetti==='function')confetti()}
    }
    if(R&&R.h&&R.h.id!==odeclId){odeclId=R.h.id;odecl={}}
    fx();first=false;
    schedule();drive();render();
  },e=>{console.error(e);Rok=true;R=null;render()});
}
function closeRoom(){if(unsub)try{unsub()}catch(e){}unsub=null;oc=null;R=undefined;P=null;timers.forEach(clearTimeout);timers=[];curKey='';render()}
const declObj=()=>Object.assign({},odecl);
// المؤقت: جهازك يلعب عنك إذا خلص وقتك، وجهاز المنظم احتياط لو أحد طلع
function schedule(){
  if(!R||!R.h){timers.forEach(clearTimeout);timers=[];curKey='';return}
  const k=BE.tkey(R);if(k===curKey)return;
  curKey=k;tStart=Date.now();timers.forEach(clearTimeout);timers=[];
  const lim=limit(R);if(!lim)return;
  const T=(f,ms)=>timers.push(setTimeout(f,Math.max(0,ms)));
  const guard=f=>st=>{if(BE.tkey(st)!==k)throw SKIP;f(st)};
  if(R.phase==='end'){if(R.host===devId)T(()=>act(guard(st=>BE.doNext(st)),{noPrev:1}),lim);return}
  const t=BE.turnOf(R),x=R.seats[t];if(t<0||!x||x.bot)return;
  if(t===mySeat()){
    T(()=>act(guard(st=>BE.autoAct(st,t,declObj())),{noPrev:1}),lim);
    if(lim>=3000){T(()=>{if(curKey===k)sTick()},lim-2000);T(()=>{if(curKey===k)sTick()},lim-1000)}
  }else if(R.host===devId)T(()=>act(guard(st=>BE.autoAct(st,t,{})),{noPrev:1}),lim+250);
  else if(mySeat()>=0)T(()=>act(guard(st=>BE.autoAct(st,t,{})),{noPrev:1}),lim+1500);
}
// الجهاز المنظم يشغّل الكمبيوتر
function drive(){
  if(!R||!R.h)return;
  const isHost=R.host===devId;if(!isHost&&mySeat()<0)return;
  const h=R.h,extra=isHost?0:900;
  // الكمبيوتر يقيد إذا شاف غلط (بعد ما تخلص الأكلة)
  if(((R.phase==='play'&&!h.trick.length)||R.phase==='end'||R.phase==='over')&&!(h.result&&h.result.pen)){
    const v=(h.viol||[]).find(x=>x.bot);
    const cat=v?[(v.s+1)%4,(v.s+3)%4].find(s=>R.seats[s]&&R.seats[s].bot):undefined;
    if(cat!=null){
      const key='q|'+h.id;if(key===botKey)return;botKey=key;
      setTimeout(()=>act(st=>{if(!st.h||st.h.id!==h.id||(st.h.result&&st.h.result.pen))throw SKIP;BE.doQayd(st,cat)},{noPrev:1}),300+extra);
      return;
    }
  }
  const t=BE.turnOf(R);if(t<0||!R.seats[t]||!R.seats[t].bot)return;
  const key=BE.tkey(R);
  if(key===botKey)return;botKey=key;
  // الكمبيوتر يلعب على طول، بس يترك لحظة قصيرة بعد اكتمال الأكلة عشان تبين الأوراق
  const wait=R.phase==='play'&&!h.trick.length&&h.last?550:60;
  setTimeout(()=>act(st=>{if(BE.tkey(st)!==key||!(st.seats[t]&&st.seats[t].bot))throw SKIP;BE.botAct(st,t)},{noPrev:1}),wait+extra);
}

function rulesCard(){
  return `<div class="card"><details class="rules"><summary>📜 القوانين المعتمدة</summary><ul>
  <li>اللعب عكس عقارب الساعة، واللي متقابلين شركاء. الصكة 152.</li>
  <li>الشراء: حكم بلون الورقة المكشوفة، صن، أشكل (للثالث والرابع، والورقة تروح لخويه)، أو بس. الصن يغلب الحكم. إذا الكل قال بس يجي "ثاني" وتختار حكم بلون غير المكشوفة، وإذا الكل بس مرة ثانية تنعاد التوزيعة.</li>
  <li>الدبل في الحكم: دبل ← ثري ← فور ← قهوة. واللي رفع آخر وحدة يختار مفتوح أو مقفول (المقفول: ما تبدأ بالحكم إلا إذا ما عندك غيره). في الصن الدبل بس، ويجوز إذا المشتري فوق 100 والخصم تحت.</li>
  <li>اللعب حر: تقدر تلعب أي ورقة. بس القانون: تلحق اللون، وفي الحكم إذا ما عندك اللون تدق (إلا إذا خويك ماسك الأكلة)، وتكبّر على الحكم إذا تقدر.</li>
  <li><b>القيد:</b> إذا شفت الخصم خالف (ما لحق، ما دق، ما كبّر، أو أعلن مشروع ما عنده) اضغط "قيد". إذا صح ينحسب لكم كل شي (26 أو 16 مع المشاريع ومضروب بالدبل)، وإذا القيد غلط تنقلب عليكم. والكمبيوتر يقيد بعد.</li>
  <li><b>سوا:</b> وأنت تبدأ الأكلة (من الأكلة الثانية) إذا متأكد إن فريقك ياخذ كل الباقي اضغط "سوا". إذا صحت تاخذون الباقي كله، وإذا غلط تروح التوزيعة للخصم.</li>
  <li><b>المشاريع:</b> تعلنها بنفسك في أول أكلة (سرا، خمسين، مية، أربعمية). اللي ما تعلنه يروح عليك، واللي تعلنه وهو ما عندك يتقيد عليك. أعلى مشروع يلغي مشاريع الخصم. البلوت (الشايب والبنت من الحكم) = 2 وتنحسب لحالها.</li>
  <li><b>المؤقت:</b> كل لعبة لها وقت (الشراء والدبل ضعفه)، وإذا خلص يلعب الكمبيوتر بدالك.</li>
  <li>النقاط: الصن 26 والحكم 16، الأرض 10 أبناط، الكبوت 44 في الصن و25 في الحكم. إذا المشتري ما جاب أكثر من الخصم يخسر وتروح كل النقاط للخصم. القهوة: اللي يفوز بالتوزيعة يفوز بالصكة.</li>
  </ul></details></div>`;
}
function homeView(){
  let last='';try{last=localStorage.getItem('baloot_room')||''}catch(e){}
  return `<div class="card"><h2>🎴 بلوت أونلاين</h2><p class="note">كل واحد يلعب من جواله. سوّ طاولة وأرسل الرابط لربعك، والمقاعد الفاضية يجلس فيها الكمبيوتر.</p>
  <button class="btn gold" data-act="ocreate">➕ طاولة جديدة</button>
  <div class="row" style="margin-top:10px"><input id="ocode" inputmode="numeric" maxlength="4" placeholder="رقم الطاولة" value="${e2(ocodeVal)}"><button class="btn alt" style="flex:0 0 90px" data-act="ojoin">دخول</button></div>
  ${last?`<button class="btn alt" data-act="ojoinlast" style="margin-top:8px">↩ رجوع لطاولة ${e2(last)}</button>`:''}</div>${rulesCard()}`;
}
function lobbyView(){
  const S=V(),ms=mySeat(),host=S.host===devId,full=S.seats.every(Boolean),ts=tsecOf(S);
  const sb=i=>{const x=S.seats[i],tc=i%2?'tb':'ta';
    if(x)return `<div class="sb ${tc} st${i}"><b>${x.bot?'🤖 ':''}${e2(x.n)}</b><small>${i%2?'فريق ب':'فريق أ'}${i===ms?' · أنت':''}</small>${host&&i!==ms?`<button data-act="okick" data-v="${i}">✕ شيل</button>`:''}</div>`;
    return `<div class="sb ${tc} st${i}"><button data-act="osit" data-v="${i}">اجلس هنا</button>${host?`<button data-act="obot" data-v="${i}">🤖 كمبيوتر</button>`:''}</div>`};
  const tsel=host?`<div class="tsel">⏱ وقت اللعبة: ${[5,8,10,0].map(n=>`<button class="${ts===n?'on':''}" data-act="otsec" data-v="${n}">${n?n+' ث':'بدون'}</button>`).join('')}</div>`
    :`<div class="tsel">⏱ وقت اللعبة: <b>${ts?ts+' ثواني':'بدون مؤقت'}</b></div>`;
  return `<div class="card" style="text-align:center"><div class="note">رقم الطاولة</div><div class="ocode">${e2(S.code)}</div><button class="btn alt" data-act="oshare">📤 أرسل الرابط لربعك</button></div>
  <div class="card"><h2>اختر مكانك</h2><div class="seatmap">${[0,1,2,3].map(sb).join('')}<div class="mid">اللي متقابلين<br>شركاء</div></div>${tsel}
  ${host?`<button class="btn gold" data-act="ostart" ${full?'':'disabled'}>${full?'▶️ ابدأ الصكة':'بانتظار يكتمل 4 لاعبين'}</button>${full?'':'<button class="btn alt" data-act="ofill" style="margin-top:8px">🤖 كمّل الفاضي بالكمبيوتر</button>'}`:`<p class="note" style="text-align:center">بانتظار ${e2(S.hostName||'المنظم')} يبدأ الصكة</p>`}
  <button class="btn bad" data-act="oleave" style="margin-top:8px">خروج من الطاولة</button></div>${rulesCard()}`;
}
function sortHand(cs,h){
  const order=['S','H','C','D'];
  if(h&&h.mode==='hokm'){order.splice(order.indexOf(h.trump),1);order.unshift(h.trump)}
  const p=c=>h&&h.mode?BE.pow(c,h):SUN_ORD.indexOf(rk(c));
  return cs.slice().sort((a,b)=>order.indexOf(su(a))-order.indexOf(su(b))||p(b)-p(a));
}
function modeText(S,h){
  if(!h||!h.mode)return S.phase==='bid'?(h.round===1?'الشراء':'ثاني'):'';
  const m=h.mode==='sun'?'صن':`حكم <span class="${h.trump==='H'||h.trump==='D'?'rs':''}">${SYM[h.trump]}</span>`;
  const x=h.qahwa?' · قهوة ☕':h.mult>1?' · '+['','','دبل','ثري','فور'][h.mult]:'';
  return `<span>${m}${x}${h.closed?' · مقفول':''}</span><small>المشتري: ${e2(sname(h.buyer))}</small>`;
}
// وقت الدور الحالي للعرض (حلقة حول اللاعب + شريط)
function timing(S){
  const lim=limit(S);if(!lim||!R||BE.tkey(S)!==curKey)return null;
  const el=Math.min(lim,Date.now()-tStart);return `--d:${lim}ms;--dl:-${el}ms`;
}
function tableView(){
  const S=V(),h=S.h,ms=mySeat(),base=ms>=0?ms:0,me2=ms>=0?team(ms):0,turn=BE.turnOf(S),host=S.host===devId,tm=timing(S);
  const rel=s=>(s-base+4)%4;
  const sbar=`<div class="osb"><div class="sc us"><small>${ms>=0?'لنا':'فريق أ'}</small><b>${S.score[me2]}</b></div><div class="md">${modeText(S,h)||'<span>بلوت</span>'}</div><div class="sc"><small>${ms>=0?'لهم':'فريق ب'}</small><b>${S.score[1-me2]}</b></div></div>`;
  const seatH=s=>{
    const r=rel(s),x=S.seats[s],n=x?x.n:'—',ini=x?(x.bot&&!x.sub?'🤖':e2(String(x.n).trim().charAt(0)||'؟')):'؟';
    const tags=[];if(h&&h.buyer===s&&h.mode)tags.push('مشتري');
    const cnt=h&&h.hands&&h.hands[s]?h.hands[s].length:0;
    let bub='';
    if(h&&h.said&&h.said[s]&&(S.phase==='bid'||S.phase==='dbl'))bub=`<span class="bub">${e2(h.said[s])}</span>`;
    if(h&&h.baloot===s&&S.phase==='play')bub+=`<span class="bub g">بلوت</span>`;
    if(h&&h.sawa&&h.sawa.s===s)bub+=`<span class="bub g">سوا</span>`;
    let pj='';const dc=h&&h.decl&&h.decl[s]||[];
    if(h&&S.phase==='play'&&dc.length){
      if(h.tn===0)pj=`<span class="bub g">📣 ${dc.map(p=>PROJ_NAME[p.t]).join(' + ')}</span>`;
      else if(h.tn===1&&h.projWin!=null&&team(s)===h.projWin)pj=dc.map(p=>`<span class="pjc"><em>${PROJ_NAME[p.t]}</em>${p.cards.slice(0,{sira:3,'50':4,'100':p.suit?5:4,'400':4}[p.t]).map(c=>`<i class="${su(c)==='H'||su(c)==='D'?'red':''}">${RN(rk(c))}${SYM[su(c)]}</i>`).join('')}</span>`).join('');
    }
    const backs=(r!==0||ms<0)&&cnt&&S.phase!=='end'&&S.phase!=='over'?`<span class="backs">${'<i></i>'.repeat(cnt)}</span>`:'';
    const click=host&&x&&!x.bot&&s!==ms?`data-act="obotify" data-v="${s}" style="cursor:pointer"`:'';
    const isT=turn===s;
    return `<div class="pl p${r} ${team(s)===me2?'us':''} ${isT?'turn':''}" ${click}><div class="av" ${isT&&tm?`style="${tm}"`:''}>${ini}${s===S.dealer?'<span class="dl">موزع</span>':''}</div><span class="nm">${e2(n)}</span>${tags.length?`<span class="tg">${tags.join(' · ')}</span>`:''}${pj}${bub}${r===0&&ms>=0?'':backs}</div>`;
  };
  let center='';
  if(S.phase==='bid'||S.phase==='dbl')center=`<div class="upc">${cardH(h.up)}<div>${S.phase==='bid'?(h.round===1?'الورقة المكشوفة':'ثاني'):'الدبل'}</div></div>`;
  else if(h){
    const cur=h.trick.length?h.trick:(h.last?h.last.cards:[]),old=!h.trick.length;
    center=cur.map((t,i)=>`<div class="tcd r${rel(t.s)} ${old?'old':''} ${!old&&i===cur.length-1?'nw':''} ${old&&h.last&&h.last.w===t.s?'win':''}">${cardH(t.c)}</div>`).join('');
    if(!cur.length)center=`<div class="emb"><b>♠</b>أساطير البلوت</div>`;
  }
  const mute=`<button class="omute" data-act="omute" aria-label="الصوت">${sndOn()?'🔊':'🔇'}</button>`;
  const felt=`<div class="otbl"><div class="sadu"></div><div class="felt ${S.phase==='bid'||S.phase==='dbl'?'cmp':''}">${mute}${[0,1,2,3].map(seatH).join('')}${center}</div><div class="sadu b"></div></div>`;
  let hand='';
  if(ms>=0&&h&&h.hands&&(h.hands[ms]||[]).length){
    const cs=sortHand(h.hands[ms]||[],h),n=cs.length,myT=S.phase==='play'&&turn===ms;
    hand=`<div class="hand ${myT?'my':''}">${cs.map((c,i)=>{const m=i-(n-1)/2;return cardH(c,'',`data-act="ocard" data-v="${c}"`,`--r:${(m*3.2).toFixed(1)}deg;--y:${(Math.abs(m)*Math.abs(m)*1.6).toFixed(1)}px`)}).join('')}</div>`;
  }
  const spec=ms<0?`<div class="opnl"><b>أنت تتفرج</b><div class="note">تبغى تلعب؟ اجلس مكان:</div><div class="bt">${S.seats.map((x,i)=>`<button data-act="osit" data-v="${i}">${x&&x.bot?'🤖 ':''}${e2(x?x.n:'—')}</button>`).join('')}</div></div>`:'';
  // السوا: كشف أوراق الكل
  let reveal='';
  if(h&&h.sawa&&h.sawa.shown&&(S.phase==='end'||S.phase==='over')){
    const sw=h.sawa,order=[0,1,2,3].map(i=>(sw.s+i)%4);
    reveal=`<div class="osawa"><div class="osh">🙌 ${e2(sname(sw.s))} قال سوا ${sw.ok===false?'<span class="bad">وما صحت ❌</span>':'<span class="ok">وصحت ✅</span>'}<small>كل الأوراق مكشوفة</small></div>${order.map(s=>{const cs=sortHand(sw.shown[s]||[],h);return `<div class="osr ${s===sw.s?'me':''} ${team(s)===team(sw.s)?'tm':''}"><span class="osn">${e2(sname(s))}${s===sw.s?' 🙌':''}</span><div class="osc">${cs.length?cs.map(c=>cardH(c)).join(''):'<span class="note">ما بقى عنده ورق</span>'}</div></div>`}).join('')}</div>`;
  }
  return sbar+felt+reveal+hand+spec+panel(S,h,ms,turn,host,tm);
}
function penText(S,h){
  const P=h.result&&h.result.pen;if(!P)return '';
  if(P.k==='qayd'&&P.ok){const v=P.v;return `<div class="pen ok">⚖️ قيد صحيح من ${e2(sname(P.by))}: ${e2(sname(v.s))} ${e2(v.why)}${v.c?` (لعب ${RN(rk(v.c))}${SYM[su(v.c)]})`:''}</div>`}
  if(P.k==='qayd')return `<div class="pen">⚖️ قيد غلط من ${e2(sname(P.by))}، ما فيه مخالفة، فانقلبت عليهم</div>`;
  return `<div class="pen">❌ ${e2(sname(P.by))} قال سوا وهي ما تصح، فراحت التوزيعة للخصم</div>`;
}
function panel(S,h,ms,turn,host,tm){
  const B=(a,l,c,v)=>`<button class="${c||''}" data-act="${a}" ${v!=null?`data-v="${v}"`:''}>${l}</button>`;
  const who=t=>t===ms?'دورك':'دور '+e2(sname(t));
  const bar=tm&&turn===ms?`<div class="otm"><i style="${tm}"></i></div>`:'';
  if(S.phase==='bid'){
    if(turn!==ms)return `<div class="opnl">${who(turn)} ${h.bid?`· الشراء الحالي: ${e2(sname(h.bid.s))} حكم ${SYM[h.bid.suit]}`:''}</div>`;
    const us=su(h.up);let b='';
    if(!h.bid)b+=h.round===1?B('obid','حكم '+SYM[us],'g','hokm'):SU.filter(s=>s!==us).map(s=>B('obid2','حكم '+SYM[s],'g',s)).join('');
    b+=B('obid','صن','y','sun');if(h.bi>=2)b+=B('obid','أشكل','y','ashkal');b+=B('obid','بس','','pass');
    return `<div class="opnl"><b>${h.round===1?'دورك تشتري':'ثاني: دورك'}</b>${bar}${h.bid?`<div class="note">${e2(sname(h.bid.s))} قال حكم ${SYM[h.bid.suit]}، تقدر تقلبها صن</div>`:''}<div class="bt">${b}</div></div>`;
  }
  if(S.phase==='dbl'){
    const D=h.dbl;
    if(turn!==ms)return `<div class="opnl">${who(turn)} ${D.st==='oc'?'يختار مفتوح أو مقفول':'يقرر الدبل'}</div>`;
    if(D.st==='oc')return `<div class="opnl"><b>مفتوح ولا مقفول؟</b>${bar}<div class="bt">${B('odbl','مفتوح','g','open')}${B('odbl','مقفول','y','closed')}</div></div>`;
    const m={d:[['dbl','دبل']],t:[['three','ثري']],f:[['four','فور']],q:[['qahwa','قهوة ☕']]}[D.st];
    return `<div class="opnl"><b>${D.st==='d'?'تدبّل عليهم؟':'دبّلوا عليك! ترفع؟'}</b>${bar}<div class="bt">${m.map(x=>B('odbl',x[1],'y',x[0])).join('')}${B('odbl','بس','','pass')}</div></div>`;
  }
  if(S.phase==='play'){
    let pj='';
    if(ms>=0&&h.tn===0&&!(String(ms) in h.decl)){
      const ts=h.mode==='sun'?['sira','50','100','400']:['sira','50','100'];
      const any=Object.values(odecl).some(n=>n>0);
      pj=`<div class="pjrow">📣 أعلن مشروعك: ${ts.map(t=>`<button class="pj ${odecl[t]?'on':''}" data-act="opj" data-v="${t}">${PROJ_NAME[t]}${odecl[t]>1?' ×'+odecl[t]:''}</button>`).join('')}${any?`<button class="pj" data-act="opj" data-v="clr">✕</button>`:''}</div>`;
    }
    const btns=ms>=0?`<div class="bt">${B('oqayd','⚖️ قيد','q')}${turn===ms&&!h.trick.length&&h.tn>=1?B('osawa','🙌 سوا','y'):''}</div>`:'';
    return `<div class="opnl">${turn===ms?'<b>دورك</b> · اضغط الورقة وتنلعب':who(turn)} <span class="note">· الأكلة ${Math.min(h.tn+1,8)} من 8</span>${bar}${pj}${btns}</div>`;
  }
  if(S.phase==='end'||S.phase==='over'){
    const r=h.result,me2=ms>=0?team(ms):0,o=1-me2,lb=ms>=0?['لنا','لهم']:['فريق أ','فريق ب'];
    const row=(t,a,b)=>`<tr><td>${t}</td><td>${a}</td><td>${b}</td></tr>`;
    const title=r.pen?(r.pen.k==='qayd'?'⚖️ قيد':'🙌 سوا'):h.sawa?'🙌 سوا':r.kab!=null?'💥 كبوت!':r.win?'✅ المشتري نجح':'❌ المشتري خسر (قلبت)';
    let s=`<div class="opnl"><h2 style="margin:0 0 6px">${title}</h2><div class="note">${h.mode==='sun'?'صن':'حكم '+SYM[h.trump]} · المشتري ${e2(sname(h.buyer))}${r.mult>1?' · ×'+r.mult:''}${r.qahwa?' · قهوة':''}</div>${penText(S,h)}
    <table><tr><th></th><th>${lb[0]}</th><th>${lb[1]}</th></tr>${row('الأبناط',r.ab[me2],r.ab[o])}${row('المشاريع',r.projP[me2],r.projP[o])}${row('بلوت',r.balP[me2],r.balP[o])}${row('<b>نقاط التوزيعة</b>','<b>'+r.res[me2]+'</b>','<b>'+r.res[o]+'</b>')}${row('المجموع',S.score[me2],S.score[o])}</table>`;
    const qb=ms>=0&&!r.pen?B('oqayd','⚖️ قيد','q'):'';
    if(S.phase==='end'){
      const et=timing(S);
      s+=(et?`<div class="note" style="margin-top:8px">التوزيعة التالية تبدأ تلقائياً</div><div class="otm"><i style="${et}"></i></div>`:'')+`<div class="bt">${ms>=0||host?B('onext','التوزيعة التالية ▶️','g'):''}${qb}</div>`;
    }else{
      const w=S.winner;
      s+=`<div class="champ" style="margin-top:12px"><div class="cup">🏆</div><div class="nm">${tnames(w)}</div><div>${S.score[w]} - ${S.score[1-w]}</div></div>`;
      s+=`<div class="bt">${host?B('orestart','صكة جديدة','g')+B('olobby','تغيير المقاعد',''):''}${qb}</div>`;
    }
    return s+`</div><button class="btn alt" data-act="oleave">خروج من الطاولة</button>`;
  }
  return '';
}
G.oView=function(){
  if(!oc)return homeView();
  if(!Rok)return `<div class="card empty">جاري فتح الطاولة ${e2(oc)}…</div>`;
  if(!V())return `<div class="card empty">ما لقينا طاولة برقم ${e2(oc)}</div><button class="btn alt" data-act="oleave">رجوع</button>`;
  if(V().phase==='lobby')return lobbyView();
  return tableView();
};

document.addEventListener('input',e=>{if(e.target.id==='ocode')ocodeVal=e.target.value});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,v=b.dataset.v;if(a[0]!=='o')return;
  ac();
  const S=V(),ms=mySeat(),meName=me||'لاعب';
  if(a==='ocreate'){
    let code='',tries=0;
    for(;;){code=String(1000+rnd(9000));try{const d=await db.doc('live/r_'+code).get();if(!d.exists||tries>5)break}catch(err){return toast('تعذر الاتصال، تأكد من الإنترنت')}tries++}
    const st=BE.newState(code,devId,meName);st.seats[0]={n:meName,d:devId,bot:false};
    try{await db.doc('live/r_'+code).set(st)}catch(err){return toast('تعذر إنشاء الطاولة، تأكد من الإنترنت')}
    openRoom(code);
  }
  else if(a==='ojoin'){const c=(ocodeVal||'').trim();if(!/^\d{4}$/.test(c))return toast('اكتب رقم الطاولة (4 أرقام)');openRoom(c)}
  else if(a==='ojoinlast'){try{openRoom(localStorage.getItem('baloot_room'))}catch(err){}}
  else if(a==='oleave'){
    if(S&&S.phase==='lobby'&&ms>=0)await act(st=>{st.seats[ms]=null},{noPrev:1});
    try{history.replaceState(null,'',location.pathname)}catch(err){}
    closeRoom();
  }
  else if(a==='oshare'){
    const url=location.origin+location.pathname+'?room='+S.code,txt='تعال العب بلوت معنا 🎴 طاولة '+S.code+'\n'+url;
    try{if(navigator.share){await navigator.share({text:txt});return}}catch(err){return}
    try{await navigator.clipboard.writeText(url);toast('انسخ الرابط ✓')}catch(err){prompt('انسخ الرابط:',url)}
  }
  else if(a==='osit'){
    const i=+v,x=S.seats[i];
    if(x&&!x.bot&&!confirm('هذا مكان '+x.n+'، تاخذه؟'))return;
    if(x&&x.bot&&S.phase!=='lobby'&&!confirm('تاخذ مكان الكمبيوتر؟'))return;
    await act(st=>{st.seats=st.seats.map(y=>y&&!y.bot&&y.d===devId&&st.phase==='lobby'?null:y);st.seats[i]={n:meName,d:devId,bot:false}});
  }
  else if(!S)return;
  else if(['obot','okick','ostart','ofill','orestart','olobby','obotify','otsec'].includes(a)){
    if(S.host!==devId)return;
    if(a==='obot')await act(st=>{st.seats[+v]={n:'كمبيوتر '+(+v+1),d:'',bot:true}});
    else if(a==='okick')await act(st=>{st.seats[+v]=null});
    else if(a==='ofill')await act(st=>{st.seats=st.seats.map((y,i)=>y||{n:'كمبيوتر '+(i+1),d:'',bot:true})});
    else if(a==='otsec')await act(st=>{st.tsec=+v});
    else if(a==='ostart'||a==='orestart')await act(st=>BE.startGame(st),{noPrev:1});
    else if(a==='olobby')await act(st=>{st.phase='lobby';st.h=null});
    else if(a==='obotify'){const x=S.seats[+v];if(confirm('الكمبيوتر يكمّل عن '+x.n+' باسمه؟ (لو طلع من اللعبة)'))await act(st=>{st.seats[+v]={n:x.n,d:'',bot:true,sub:true}})}
  }
  else if(ms<0){if(a==='onext'&&S.host===devId)await act(st=>{if(st.phase!=='end')throw SKIP;BE.doNext(st)},{noPrev:1});return}
  else if(a==='obid')await act(st=>BE.doBid(st,ms,v));
  else if(a==='obid2')await act(st=>BE.doBid(st,ms,'hokm',v));
  else if(a==='odbl')await act(st=>BE.doDbl(st,ms,v));
  else if(a==='onext')await act(st=>{if(st.phase!=='end')throw SKIP;BE.doNext(st)},{noPrev:1});
  else if(a==='omute'){
    try{snd=!snd;localStorage.setItem('baloot_snd',snd?'1':'0')}catch(err){}
    if(!sndOn())try{speechSynthesis.cancel()}catch(err){}
    toast(sndOn()?'🔊 الصوت شغّال':'🔇 الصوت مكتوم');render();
  }
  else if(a==='opj'){if(v==='clr')odecl={};else odecl[v]=((odecl[v]||0)+1)%3;render()}
  else if(a==='oqayd'){
    if(!confirm('تقيد عليهم؟ إذا ما فيه مخالفة تنقلب التوزيعة عليكم'))return;
    await act(st=>BE.doQayd(st,ms));
  }
  else if(a==='osawa'){
    if(!confirm('سوا؟ إذا ما صحت تروح التوزيعة للخصم'))return;
    await act(st=>BE.doSawa(st,ms));
  }
  else if(a==='ocard'){
    if(S.phase!=='play'||BE.turnOf(S)!==ms)return toast('مو دورك');
    const d=declObj();
    await act(st=>BE.doPlay(st,ms,v,d));
  }
});
// فتح الطاولة من الرابط
try{const q=new URLSearchParams(location.search).get('room');if(q&&/^\d{4}$/.test(q)){tab='online';openRoom(q)}}catch(e){}
})(typeof window!=='undefined'?window:globalThis);
