/* ================= بلوت أونلاين =================
   القسم الأول: محرك القوانين (بدون واجهة) — يقدر يشتغل على أي جهاز
   القسم الثاني: الواجهة والطاولات (Firestore: live/r_XXXX)
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
function resolveProjects(st){
  const h=st.h,key=(p,s)=>PROJ_RANK[p.t]*1000+p.top*10+(h.mode==='hokm'&&p.suit===h.trump?5:0)+(3-((s-h.lead+4)%4))*.1;
  const best=[-1,-1];
  for(const s in h.decl)(h.decl[s]||[]).forEach(p=>{const k=key(p,+s);if(k>best[team(+s)])best[team(+s)]=k});
  h.projWin=best[0]<0&&best[1]<0?null:best[0]>best[1]?0:1;
  if(h.projWin!=null){
    const ls=[];for(const s in h.decl)if(team(+s)===h.projWin)(h.decl[s]||[]).forEach(p=>ls.push(nm(st,+s)+': '+PROJ_NAME[p.t]));
    ev(st,ls.join('، '));
  }
}
function newState(code,host,hostName){
  return {code,host,hostName,ts:Date.now(),seats:[null,null,null,null],phase:'lobby',score:[0,0],dealer:0,h:null,hist:[],evn:0,evt:'',rec:false,target:152};
}
function startGame(st){
  if(st.seats.some(x=>!x))throw 'لازم 4 لاعبين';
  st.score=[0,0];st.hist=[];st.rec=false;st.winner=null;st.dealer=rnd(4);deal(st);
}
function deal(st){
  const d=shuffle(SU.flatMap(s=>RANKS.map(r=>r+s))),hands={};
  for(let s=0;s<4;s++)hands[s]=d.slice(s*5,s*5+5);
  st.phase='bid';
  st.h={id:Date.now()+'_'+rnd(1e6),hands,up:d[20],rest:d.slice(21),round:1,bi:0,bid:null,said:{},mode:null,trump:null,buyer:null,mult:1,qahwa:false,closed:false,
        trick:[],last:null,tn:0,ab:[0,0],tw:[0,0],decl:{},cand:{},baloot:null,kq:null,projWin:null,result:null,dbl:null};
  ev(st,'الموزع '+nm(st,st.dealer));
}
function turnOf(st){
  const h=st.h;if(!h)return -1;
  if(st.phase==='bid')return ord(st.dealer)[h.bi];
  if(st.phase==='dbl')return h.dbl.turn;
  if(st.phase==='play')return h.turn;
  return -1;
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
function doPlay(st,seat,c,decl){
  const h=st.h;
  if(st.phase!=='play'||h.turn!==seat)throw 'مو دورك';
  if(!legal(h,seat).includes(c))throw 'ما يصلح تلعب هذي الورقة';
  if(h.tn===0){const cs=h.cand[seat]||[];h.decl[seat]=(Array.isArray(decl)?decl:cs.map((_,i)=>i)).filter(i=>cs[i]).map(i=>cs[i])}
  h.hands[seat]=h.hands[seat].filter(x=>x!==c);
  h.trick.push({s:seat,c});
  if(h.kq===seat&&isT(c,h)&&(rk(c)==='K'||rk(c)==='Q')&&!h.hands[seat].includes('K'+h.trump)&&!h.hands[seat].includes('Q'+h.trump)){h.baloot=seat;ev(st,nm(st,seat)+': بلوت')}
  if(h.trick.length<4){h.turn=(seat+1)%4;return}
  const w=trickWinner(h.trick,h);
  h.ab[team(w)]+=h.trick.reduce((a,t)=>a+pts(t.c,h),0);h.tw[team(w)]++;
  h.last={cards:h.trick,w};h.trick=[];h.tn++;h.turn=w;
  if(h.tn===1)resolveProjects(st);
  if(h.tn===8){h.ab[team(w)]+=10;endHand(st)}
}
function scoreHand(st){
  const h=st.h,b=team(h.buyer),o=1-b,sun=h.mode==='sun',total=sun?26:16;
  const kab=h.tw[0]===8?0:h.tw[1]===8?1:null;
  const projP=[0,0],projRaw=[0,0];
  if(h.projWin!=null)for(const s in h.decl)if(team(+s)===h.projWin)(h.decl[s]||[]).forEach(p=>{const v=PROJ_PTS[h.mode][p.t];projP[h.projWin]+=v;projRaw[h.projWin]+=v*(sun?5:10)});
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
  return {ab:h.ab.slice(),cp,projP,balP,kab,win,wt,res,mult:h.mult,qahwa:h.qahwa};
}
function endHand(st){
  const h=st.h,r=scoreHand(st);h.result=r;
  st.score[0]+=r.res[0];st.score[1]+=r.res[1];
  st.hist=(st.hist||[]).concat([{mode:h.mode,trump:h.trump,buyer:h.buyer,mult:h.mult,res:r.res}]).slice(-40);
  ev(st,r.kab!=null?'كبوت!':r.win?'المشتري نجح':'المشتري خسر، قلبت');
  if(h.qahwa){st.phase='over';st.winner=r.wt;return}
  const [a,b]=st.score;
  if((a>=st.target||b>=st.target)&&a!==b){st.phase='over';st.winner=a>b?0:1}
  else st.phase='end';
}
function doNext(st){if(st.phase!=='end')throw 'التوزيعة ما خلصت';st.dealer=(st.dealer+1)%4;deal(st)}

/* ---------- الكمبيوتر ---------- */
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
    const L=legal(h,seat),tr=h.trick,val=c=>pts(c,h),pw=c=>pow(c,h)+(isT(c,h)?100:0);
    const low=a=>a.slice().sort((x,y)=>val(x)-val(y)||pw(x)-pw(y))[0];
    let c;
    if(!tr.length){
      const aces=L.filter(x=>rk(x)==='A'&&!isT(x,h));
      if(h.mode==='hokm'&&team(seat)===team(h.buyer)&&L.includes('J'+h.trump))c='J'+h.trump;
      else c=aces.length?aces[0]:low(L);
    }else if(team(trickWinner(tr,h))===team(seat)){
      c=tr.length===3?L.slice().sort((x,y)=>(val(y)-(isT(y,h)?40:0))-(val(x)-(isT(x,h)?40:0)))[0]:low(L);
    }else{
      const wn=L.filter(x=>trickWinner(tr.concat([{s:seat,c:x}]),h)===seat);
      c=wn.length?wn.sort((x,y)=>pw(x)-pw(y))[0]:low(L);
    }
    return doPlay(st,seat,c);
  }
}

const BE={SU,SYM,SNAME,RANKS,W,PROJ_NAME,su,rk,team,ord,legal,trickWinner,findProjects,projLabel,newState,startGame,deal,turnOf,doBid,doDbl,doPlay,doNext,scoreHand,botAct,pts,pow,isT};
if(typeof module!=='undefined'&&module.exports){module.exports=BE;return}
G.BE=BE;

/* ---------- الواجهة ---------- */
const CSS=`
.ocode{font-size:44px;font-weight:800;letter-spacing:8px;color:var(--acc);direction:ltr}
.seatmap{display:grid;grid-template-columns:1fr 1.2fr 1fr;grid-template-rows:auto auto auto;gap:8px;align-items:center;margin:6px 0 10px}
.seatmap .mid{grid-column:2;grid-row:2;aspect-ratio:1;border-radius:18px;background:radial-gradient(#2e8b5b,#174d33);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;text-align:center;padding:6px}
.st0{grid-column:2;grid-row:3}.st1{grid-column:3;grid-row:2}.st2{grid-column:2;grid-row:1}.st3{grid-column:1;grid-row:2}
.sb{border:1px dashed var(--line);border-radius:14px;padding:8px 4px;text-align:center;min-height:62px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.sb.ta{border-color:#2e8b5b}.sb.tb{border-color:#b8860b}
.sb b{font-size:14px}.sb small{font-size:11px;color:var(--mut)}
.sb button{border:0;background:var(--chip);color:var(--ink);font:inherit;font-size:12px;font-weight:700;border-radius:9px;padding:5px 6px;cursor:pointer}
.osb{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.osb .sc{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px 12px;text-align:center;min-width:72px}
.osb .sc small{display:block;font-size:11px;color:var(--mut)}.osb .sc b{font-size:22px}
.osb .md{flex:1;text-align:center;font-size:13px;font-weight:700;line-height:1.5}
.felt{position:relative;height:300px;border-radius:24px;background:radial-gradient(120% 100% at 50% 40%,#2e8b5b,#123d27);margin-bottom:10px;overflow:hidden;box-shadow:inset 0 0 30px rgba(0,0,0,.35)}
.ps{position:absolute;color:#fff;text-align:center;font-size:12px;line-height:1.35;max-width:96px}
.ps .pn{font-weight:800;font-size:13px;background:rgba(0,0,0,.25);border-radius:99px;padding:3px 9px;display:inline-block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:96px}
.ps.turn .pn{background:#e0b84a;color:#1b1500;box-shadow:0 0 0 3px rgba(224,184,74,.35);animation:pulse 1.2s infinite}
.ps .bub{display:inline-block;background:#fff;color:#17241c;border-radius:10px;padding:2px 8px;font-weight:800;margin-top:3px;font-size:12px}
.ps .tag2{display:block;opacity:.85;font-size:11px}
.p1{right:6px;top:50%;transform:translateY(-50%)}.p2{top:8px;left:50%;transform:translateX(-50%)}.p3{left:6px;top:50%;transform:translateY(-50%)}.p0{bottom:6px;left:50%;transform:translateX(-50%)}
.cd{width:42px;height:60px;border-radius:7px;background:#fff;color:#17241c;border:1px solid #cfd6cf;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;font-weight:800;box-shadow:0 2px 4px rgba(0,0,0,.18);padding:0;line-height:1;direction:ltr;flex:0 0 auto}
.cd .r{font-size:17px}.cd .s{font-size:20px;margin-top:2px}.cd.red{color:#c0262d}
.cd.big{width:56px;height:80px}.cd.big .r{font-size:22px}.cd.big .s{font-size:28px}
.tcd{position:absolute;left:50%;top:50%;transition:transform .2s}
.tcd.r0{transform:translate(-50%,8%)}.tcd.r1{transform:translate(32%,-50%)}.tcd.r2{transform:translate(-50%,-108%)}.tcd.r3{transform:translate(-132%,-50%)}
.tcd.win .cd{box-shadow:0 0 0 3px #e0b84a}.tcd.old{opacity:.75}
.upc{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;color:#fff;font-size:12px}
.hand{display:flex;justify-content:center;gap:3px;direction:ltr;min-height:76px;align-items:flex-end;margin-bottom:6px}
.hand .cd{cursor:pointer;transition:transform .12s}
.hand .cd.sel{transform:translateY(-14px);box-shadow:0 0 0 3px #e0b84a}
.hand .cd.no{opacity:.38}
.opnl{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;margin-bottom:10px;text-align:center}
.opnl .bt{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px}
.opnl .bt button{flex:1 1 30%;min-width:84px;border:0;border-radius:12px;padding:12px 6px;font:inherit;font-weight:800;font-size:16px;cursor:pointer;background:var(--chip);color:var(--ink)}
.opnl .bt button.g{background:var(--g);color:#fff}.opnl .bt button.y{background:var(--acc);color:#1b1500}
.pj{display:inline-block;background:var(--chip);border-radius:99px;padding:6px 12px;margin:4px;font-weight:700;font-size:13px;cursor:pointer;border:2px solid transparent}
.pj.on{border-color:var(--acc);background:rgba(224,184,74,.18)}
.otoast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#17241c;color:#fff;padding:10px 16px;border-radius:12px;z-index:100;font-weight:700;font-size:14px;max-width:90%;text-align:center}
details.rules summary{cursor:pointer;font-weight:800}details.rules li{margin:5px 0;font-size:14px;line-height:1.6}
`;
const stEl=document.createElement('style');stEl.textContent=CSS;document.head.appendChild(stEl);

let oc=null,R,Rok=false,unsub=null,osel=null,odecl=null,odeclId='',botKey='',first=true,ocodeVal='',busy=false;
const $$=s=>document.querySelector(s);
const e2=s=>typeof esc==='function'?esc(s):String(s);
function toast(t){const d=document.createElement('div');d.className='otoast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
const ref=()=>db.doc('live/r_'+oc);
const mySeat=()=>R&&R.seats?R.seats.findIndex(x=>x&&!x.bot&&x.d===devId):-1;
const RN=r=>r==='T'?'10':r;
const cardH=(c,cls,at)=>`<${at?'button':'div'} class="cd ${su(c)==='H'||su(c)==='D'?'red':''} ${cls||''}" ${at||''}><span class="r">${RN(rk(c))}</span><span class="s">${SYM[su(c)]}</span></${at?'button':'div'}>`;
const sname=s=>(R.seats[s]&&R.seats[s].n)||'—';
const tnames=t=>[t,t+2].map(sname).map(e2).join(' و ');

async function act(fn){
  if(!oc)return;
  try{
    await db.runTransaction(async tx=>{
      const d=await tx.get(ref());if(!d.exists)throw 'الطاولة غير موجودة';
      const s=JSON.parse(JSON.stringify(d.data()));
      fn(s);s.ts=Date.now();
      if(s.phase==='over'&&!s.rec&&s.seats.every(x=>x&&!x.bot)){
        s.rec=true;const w=s.winner;
        tx.set(db.collection('games').doc(),{a:[s.seats[0].n,s.seats[2].n],b:[s.seats[1].n,s.seats[3].n],sa:s.score[0],sb:s.score[1],winner:w===0?'A':'B',ts:Date.now(),target:s.target,by:'أونلاين',online:true});
      }
      tx.set(ref(),JSON.parse(JSON.stringify(s)));
    });
  }catch(e){botKey='';if(typeof e==='string')toast(e);else{console.error(e);toast('تعذر الاتصال، تأكد من الإنترنت')}}
}
function openRoom(code){
  if(unsub)try{unsub()}catch(e){}
  oc=String(code);R=undefined;Rok=false;first=true;osel=null;botKey='';
  try{localStorage.setItem('baloot_room',oc)}catch(e){}
  unsub=ref().onSnapshot(s=>{
    const p=R;R=s.exists?s.data():null;Rok=true;
    if(R&&!first){
      if(R.evn!==(p&&p.evn)&&R.evt)speak(R.evt);
      const pl=p&&p.h&&p.h.trick?p.h.trick.length+(p.h.tn||0)*4:0,nl=R.h&&R.h.trick?R.h.trick.length+(R.h.tn||0)*4:0;
      if(nl>pl&&typeof tone==='function')tone(520+rnd(200),.06,'triangle',.08);
      if(R.phase==='over'&&p&&p.phase!=='over'){if(typeof fanfare==='function')fanfare();if(typeof confetti==='function')confetti()}
    }
    first=false;
    if(R&&R.h&&R.h.id!==odeclId){odeclId=R.h.id;odecl=null;osel=null}
    drive();render();
  },e=>{console.error(e);Rok=true;R=null;render()});
}
function closeRoom(){if(unsub)try{unsub()}catch(e){}unsub=null;oc=null;R=undefined;render()}
// الجهاز المنظم يشغّل الكمبيوتر
function drive(){
  if(!R||R.host!==devId||!R.h)return;
  const t=BE.turnOf(R);if(t<0||!R.seats[t]||!R.seats[t].bot)return;
  const h=R.h,key=[R.phase,t,h.id,h.round,h.bi,h.tn,h.trick.length,h.dbl&&h.dbl.st].join('|');
  if(key===botKey)return;botKey=key;
  const wait=R.phase==='play'&&!h.trick.length&&h.last?1500:950;
  setTimeout(()=>act(st=>{if(BE.turnOf(st)===t&&st.seats[t]&&st.seats[t].bot)BE.botAct(st,t)}),wait);
}

function rulesCard(){
  return `<div class="card"><details class="rules"><summary>📜 القوانين المعتمدة</summary><ul>
  <li>اللعب عكس عقارب الساعة، واللي متقابلين شركاء. الصكة 152.</li>
  <li>الشراء: حكم بلون الورقة المكشوفة، صن، أشكل (للثالث والرابع، والورقة تروح لخويه)، أو بس. الصن يغلب الحكم. إذا الكل قال بس يجي "ثاني" وتختار حكم بلون غير المكشوفة، وإذا الكل بس مرة ثانية تنعاد التوزيعة.</li>
  <li>الدبل في الحكم: دبل ← ثري ← فور ← قهوة. واللي رفع آخر وحدة يختار مفتوح أو مقفول (المقفول: ما تبدأ بالحكم إلا إذا ما عندك غيره). في الصن الدبل بس، ويجوز إذا المشتري فوق 100 والخصم تحت.</li>
  <li>اللعب: لازم تلحق اللون. في الحكم إذا ما عندك اللون لازم تدق (إلا إذا خويك ماسك الأكلة)، ولازم تكبّر على الحكم إذا تقدر.</li>
  <li>المشاريع تنعلن بأول أكلة: سرا، خمسين، مية، أربعمية (أربع إكك في الصن). أعلى مشروع يلغي مشاريع الخصم. البلوت (الشايب والبنت من الحكم) = 2 وما يتضاعف.</li>
  <li>النقاط: الصن 26 والحكم 16، الأرض 10 أبناط، الكبوت 44 في الصن و25 في الحكم.</li>
  <li>إذا المشتري ما جاب أكثر من الخصم يخسر وتروح كل النقاط للخصم. إذا فيه دبل، الفايز ياخذ الكل مضروب. القهوة: اللي يفوز بالتوزيعة يفوز بالصكة.</li>
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
  const ms=mySeat(),host=R.host===devId,full=R.seats.every(Boolean);
  const sb=i=>{const x=R.seats[i],tc=i%2?'tb':'ta';
    if(x)return `<div class="sb ${tc} st${i}"><b>${x.bot?'🤖 ':''}${e2(x.n)}</b><small>${i%2?'فريق ب':'فريق أ'}${i===ms?' · أنت':''}</small>${host&&i!==ms?`<button data-act="okick" data-v="${i}">✕ شيل</button>`:''}</div>`;
    return `<div class="sb ${tc} st${i}"><button data-act="osit" data-v="${i}">اجلس هنا</button>${host?`<button data-act="obot" data-v="${i}">🤖 كمبيوتر</button>`:''}</div>`};
  return `<div class="card" style="text-align:center"><div class="note">رقم الطاولة</div><div class="ocode">${e2(R.code)}</div><button class="btn alt" data-act="oshare">📤 أرسل الرابط لربعك</button></div>
  <div class="card"><h2>اختر مكانك</h2><div class="seatmap">${[0,1,2,3].map(sb).join('')}<div class="mid">اللي متقابلين<br>شركاء</div></div>
  ${host?`<button class="btn gold" data-act="ostart" ${full?'':'disabled'}>${full?'▶️ ابدأ الصكة':'بانتظار يكتمل 4 لاعبين'}</button>${full?'':'<button class="btn alt" data-act="ofill" style="margin-top:8px">🤖 كمّل الفاضي بالكمبيوتر</button>'}`:`<p class="note" style="text-align:center">بانتظار ${e2(R.hostName||'المنظم')} يبدأ الصكة</p>`}
  <button class="btn bad" data-act="oleave" style="margin-top:8px">خروج من الطاولة</button></div>${rulesCard()}`;
}
function sortHand(cs,h){
  const order=['S','H','C','D'];
  if(h&&h.mode==='hokm'){order.splice(order.indexOf(h.trump),1);order.unshift(h.trump)}
  const p=c=>h&&h.mode?BE.pow(c,h):SUN_ORD.indexOf(rk(c));
  return cs.slice().sort((a,b)=>order.indexOf(su(a))-order.indexOf(su(b))||p(b)-p(a));
}
function modeText(h){
  if(!h||!h.mode)return R.phase==='bid'?(h.round===1?'الشراء':'ثاني'):'';
  const m=h.mode==='sun'?'صن':'حكم '+SYM[h.trump];
  const x=h.qahwa?' · قهوة ☕':h.mult>1?' · '+['','','دبل','ثري','فور'][h.mult]:'';
  return `${m}${x}${h.closed?' · مقفول':''}<br><small style="font-weight:400;color:var(--mut)">المشتري: ${e2(sname(h.buyer))}</small>`;
}
function tableView(){
  const h=R.h,ms=mySeat(),base=ms>=0?ms:0,me2=ms>=0?team(ms):0,turn=BE.turnOf(R),host=R.host===devId;
  const rel=s=>(s-base+4)%4;
  const sbar=`<div class="osb"><div class="sc"><small>${ms>=0?'لنا':'فريق أ'}</small><b>${R.score[me2]}</b></div><div class="md">${modeText(h)}</div><div class="sc"><small>${ms>=0?'لهم':'فريق ب'}</small><b>${R.score[1-me2]}</b></div></div>`;
  // اللاعبين حول الطاولة
  const seatH=s=>{
    const r=rel(s);
    const x=R.seats[s],n=x?(x.bot?'🤖 ':'')+x.n:'—';
    const tags=[];if(s===R.dealer)tags.push('موزع');if(h&&h.buyer===s&&h.mode)tags.push('مشتري');
    const cnt=h&&h.hands&&h.hands[s]?h.hands[s].length:0;
    let bub=h&&h.said&&h.said[s]&&(R.phase==='bid'||R.phase==='dbl')?`<div class="bub">${e2(h.said[s])}</div>`:'';
    if(h&&h.baloot===s)bub+=`<div class="bub">بلوت</div>`;
    let pj='';if(h&&h.projWin!=null&&team(s)===h.projWin&&(h.decl[s]||[]).length)pj=`<span class="tag2">${(h.decl[s]).map(BE.projLabel).map(e2).join('، ')}</span>`;
    const click=host&&x&&!x.bot&&s!==ms?`data-act="obotify" data-v="${s}" style="cursor:pointer"`:'';
    return `<div class="ps p${r} ${turn===s?'turn':''}" ${click}><span class="pn">${e2(n)}</span><span class="tag2">${tags.join(' · ')}${r!==0||ms<0?(tags.length?' · ':'')+'🂠'+cnt:''}</span>${pj}${bub}</div>`;
  };
  let center='';
  if(R.phase==='bid'||R.phase==='dbl')center=`<div class="upc">${cardH(h.up,'big')}<div style="margin-top:6px">${R.phase==='bid'?(h.round===1?'الشراء':'ثاني'):'الدبل'}</div></div>`;
  else if(h){
    const cur=h.trick.length?h.trick:(h.last?h.last.cards:[]),old=!h.trick.length;
    center=cur.map(t=>`<div class="tcd r${rel(t.s)} ${old?'old':''} ${old&&h.last&&h.last.w===t.s?'win':''}">${cardH(t.c,'big')}</div>`).join('');
  }
  const felt=`<div class="felt">${[0,1,2,3].map(seatH).join('')}${center}</div>`;
  // يدي
  let hand='';
  if(ms>=0&&h&&h.hands){
    const myTurn=R.phase==='play'&&turn===ms,L=myTurn?BE.legal(h,ms):[];
    hand=`<div class="hand">${sortHand(h.hands[ms],h).map(c=>cardH(c,(osel===c?'sel ':'')+(myTurn&&!L.includes(c)?'no':''),`data-act="ocard" data-v="${c}"`)).join('')}</div>`;
  }
  const spec=ms<0?`<div class="opnl"><b>أنت تتفرج</b><div class="note">تبغى تلعب؟ اجلس مكان:</div><div class="bt">${R.seats.map((x,i)=>`<button data-act="osit" data-v="${i}">${x&&x.bot?'🤖 ':''}${e2(x?x.n:'—')}</button>`).join('')}</div></div>`:'';
  return sbar+felt+hand+spec+panel(h,ms,turn,host);
}
function panel(h,ms,turn,host){
  const B=(a,l,c,v)=>`<button class="${c||''}" data-act="${a}" ${v?`data-v="${v}"`:''}>${l}</button>`;
  const who=t=>t===ms?'دورك':'دور '+e2(sname(t));
  if(R.phase==='bid'){
    if(turn!==ms)return `<div class="opnl">${who(turn)} ${h.bid?`· الشراء الحالي: ${e2(sname(h.bid.s))} حكم ${SYM[h.bid.suit]}`:''}</div>`;
    const us=su(h.up);let b='';
    if(!h.bid)b+=h.round===1?B('obid','حكم '+SYM[us],'g','hokm'):SU.filter(s=>s!==us).map(s=>B('obid2','حكم '+SYM[s],'g',s)).join('');
    b+=B('obid','صن','y','sun');if(h.bi>=2)b+=B('obid','أشكل','y','ashkal');b+=B('obid','بس','','pass');
    return `<div class="opnl"><b>${h.round===1?'دورك تشتري':'ثاني: دورك'}</b>${h.bid?`<div class="note">${e2(sname(h.bid.s))} قال حكم ${SYM[h.bid.suit]}، تقدر تقلبها صن</div>`:''}<div class="bt">${b}</div></div>`;
  }
  if(R.phase==='dbl'){
    const D=h.dbl;
    if(turn!==ms)return `<div class="opnl">${who(turn)} ${D.st==='oc'?'يختار مفتوح أو مقفول':'يقرر الدبل'}</div>`;
    const m={d:[['dbl','دبل','y']],t:[['three','ثري','y']],f:[['four','فور','y']],q:[['qahwa','قهوة ☕','y']]}[D.st];
    if(D.st==='oc')return `<div class="opnl"><b>مفتوح ولا مقفول؟</b><div class="bt">${B('odbl','مفتوح','g','open')}${B('odbl','مقفول','y','closed')}</div></div>`;
    return `<div class="opnl"><b>${D.st==='d'?'تدبّل عليهم؟':'دبّلوا عليك! ترفع؟'}</b><div class="bt">${m.map(x=>B('odbl',x[1],x[2],x[0])).join('')}${B('odbl','بس','','pass')}</div></div>`;
  }
  if(R.phase==='play'){
    let pj='';
    if(ms>=0&&h.tn===0&&turn===ms&&(h.cand[ms]||[]).length){
      const cs=h.cand[ms];if(!odecl)odecl=new Set(cs.map((_,i)=>i));
      pj=`<div class="note">مشاريعك (اضغط لإخفائها):</div>${cs.map((p,i)=>`<span class="pj ${odecl.has(i)?'on':''}" data-act="opj" data-v="${i}">${odecl.has(i)?'📣 ':''}${e2(BE.projLabel(p))}</span>`).join('')}`;
    }
    return `<div class="opnl">${turn===ms?'<b>دورك</b> · اضغط الورقة مرتين عشان تلعبها':who(turn)} <span class="note">· الأكلة ${Math.min(h.tn+1,8)} من 8</span>${pj}</div>`;
  }
  if(R.phase==='end'||R.phase==='over'){
    const r=h.result,me2=ms>=0?team(ms):0,o=1-me2,lb=ms>=0?['لنا','لهم']:['فريق أ','فريق ب'];
    const row=(t,a,b)=>`<tr><td>${t}</td><td>${a}</td><td>${b}</td></tr>`;
    const title=r.kab!=null?'💥 كبوت!':r.win?'✅ المشتري نجح':'❌ المشتري خسر (قلبت)';
    let s=`<div class="opnl"><h2 style="margin:0 0 6px">${title}</h2><div class="note">${h.mode==='sun'?'صن':'حكم '+SYM[h.trump]} · المشتري ${e2(sname(h.buyer))}${r.mult>1?' · ×'+r.mult:''}${r.qahwa?' · قهوة':''}</div>
    <table><tr><th></th><th>${lb[0]}</th><th>${lb[1]}</th></tr>${row('الأبناط',r.ab[me2],r.ab[o])}${row('المشاريع',r.projP[me2],r.projP[o])}${row('بلوت',r.balP[me2],r.balP[o])}${row('<b>نقاط التوزيعة</b>','<b>'+r.res[me2]+'</b>','<b>'+r.res[o]+'</b>')}${row('المجموع',R.score[me2],R.score[o])}</table>`;
    if(R.phase==='end')s+=ms>=0||host?`<div class="bt">${B('onext','التوزيعة التالية ▶️','g')}</div>`:'';
    else{
      const w=R.winner;
      s+=`<div class="champ" style="margin-top:12px"><div class="cup">🏆</div><div class="nm">${tnames(w)}</div><div>${R.score[w]} - ${R.score[1-w]}</div></div>`;
      if(host)s+=`<div class="bt">${B('orestart','صكة جديدة','g')}${B('olobby','تغيير المقاعد','')}</div>`;
    }
    return s+`</div><button class="btn alt" data-act="oleave">خروج من الطاولة</button>`;
  }
  return '';
}
G.oView=function(){
  if(!oc)return homeView();
  if(!Rok)return `<div class="card empty">جاري فتح الطاولة ${e2(oc)}…</div>`;
  if(!R)return `<div class="card empty">ما لقينا طاولة برقم ${e2(oc)}</div><button class="btn alt" data-act="oleave">رجوع</button>`;
  if(R.phase==='lobby')return lobbyView();
  return tableView();
};

document.addEventListener('input',e=>{if(e.target.id==='ocode')ocodeVal=e.target.value});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,v=b.dataset.v;if(a[0]!=='o')return;
  const ms=mySeat(),meName=me||'لاعب';
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
    if(R&&R.phase==='lobby'&&ms>=0)await act(st=>{st.seats[ms]=null});
    try{history.replaceState(null,'',location.pathname)}catch(err){}
    closeRoom();
  }
  else if(a==='oshare'){
    const url=location.origin+location.pathname+'?room='+R.code,txt='تعال العب بلوت معنا 🎴 طاولة '+R.code+'\n'+url;
    try{if(navigator.share){await navigator.share({text:txt});return}}catch(err){return}
    try{await navigator.clipboard.writeText(url);toast('انسخ الرابط ✓')}catch(err){prompt('انسخ الرابط:',url)}
  }
  else if(a==='osit'){
    const i=+v,x=R.seats[i];
    if(x&&!x.bot&&!confirm('هذا مكان '+x.n+'، تاخذه؟'))return;
    if(x&&x.bot&&R.phase!=='lobby'&&!confirm('تاخذ مكان الكمبيوتر؟'))return;
    await act(st=>{st.seats=st.seats.map(y=>y&&!y.bot&&y.d===devId&&st.phase==='lobby'?null:y);st.seats[i]={n:meName,d:devId,bot:false}});
  }
  else if(!R)return;
  else if(a==='obot'||a==='okick'||a==='ostart'||a==='ofill'||a==='orestart'||a==='olobby'||a==='obotify'){
    if(R.host!==devId)return;
    if(a==='obot')await act(st=>{st.seats[+v]={n:'كمبيوتر '+(+v+1),d:'',bot:true}});
    else if(a==='okick')await act(st=>{st.seats[+v]=null});
    else if(a==='ofill')await act(st=>{st.seats=st.seats.map((y,i)=>y||{n:'كمبيوتر '+(i+1),d:'',bot:true})});
    else if(a==='ostart'||a==='orestart')await act(st=>BE.startGame(st));
    else if(a==='olobby')await act(st=>{st.phase='lobby';st.h=null});
    else if(a==='obotify'){const x=R.seats[+v];if(confirm('تبدّل '+x.n+' بالكمبيوتر؟ (لو طلع من اللعبة)'))await act(st=>{st.seats[+v]={n:'كمبيوتر '+(+v+1),d:'',bot:true}})}
  }
  else if(ms<0){if(a==='onext'&&R.host===devId)await act(st=>BE.doNext(st));return}
  else if(a==='obid')await act(st=>BE.doBid(st,ms,v));
  else if(a==='obid2')await act(st=>BE.doBid(st,ms,'hokm',v));
  else if(a==='odbl')await act(st=>BE.doDbl(st,ms,v));
  else if(a==='onext')await act(st=>{if(st.phase==='end')BE.doNext(st)});
  else if(a==='opj'){odecl.has(+v)?odecl.delete(+v):odecl.add(+v);render()}
  else if(a==='ocard'){
    const h=R.h;if(R.phase!=='play'||BE.turnOf(R)!==ms)return toast('مو دورك');
    if(!BE.legal(h,ms).includes(v))return toast('ما يصلح تلعب هذي الورقة');
    if(osel!==v){osel=v;return render()}
    osel=null;const d=odecl?[...odecl]:undefined;
    busy=true;await act(st=>BE.doPlay(st,ms,v,d));busy=false;
  }
});
// فتح الطاولة من الرابط
try{const q=new URLSearchParams(location.search).get('room');if(q&&/^\d{4}$/.test(q)){tab='online';openRoom(q)}}catch(e){}
})(typeof window!=='undefined'?window:globalThis);
