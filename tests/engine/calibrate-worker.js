// our engine (ENG, T ms/move) vs Stockfish at UCI_Elo ELO (ST ms/move); FENS = [[fen, ourWhite], ...]
const {spawn}=require('child_process');const Game=require(''+__dirname+'/../../chesscore.js')();const E=require(require('path').resolve(process.env.ENG))(Game);
const T=+process.env.T, ST=+process.env.ST||T, ELO=process.env.ELO, fens=JSON.parse(process.env.FENS);
const sf=spawn('node',[process.env.SF||'stockfish/src/stockfish-17.1-lite-single-03e3232.js']);
let buf='',wait=null;sf.stdout.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);if(wait&&wait.test(l)){const w=wait;wait=null;w.res(l);}}});
const send=s=>sf.stdin.write(s+'\n');const until=(re)=>new Promise(res=>{wait={test:l=>re.test(l),res};});
(async()=>{
  send('uci');await until(/uciok/);send('setoption name UCI_LimitStrength value true');send('setoption name UCI_Elo value '+ELO);send('isready');await until(/readyok/);
  const out=[];
  for(const [fen,ourW] of fens){
    const g=new Game(fen),hist=[],uci=[];let ply=0,res=null;send('ucinewgame');
    while(!res){
      if(g.inCheckmate()){res=g.turn()==='w'?'b':'w';break;}
      if(g.isDraw()||ply>240){res='d';break;}
      let mv;
      if((g.turn()==='w')===ourW){const r=E.pickMove(g.fen(),{depth:+(process.env.DEPTH||60),time:T,margin:+(process.env.MARGIN||0)},hist.slice());mv=r.move.from+r.move.to+(r.move.promotion||'');}
      else{send('position fen '+fen+(uci.length?' moves '+uci.join(' '):''));send('go movetime '+ST);const l=await until(/^bestmove/);mv=l.split(' ')[1];}
      hist.push(g.fen());g.move({from:mv.slice(0,2),to:mv.slice(2,4),promotion:mv[4]||undefined});uci.push(mv);ply++;
    }
    out.push(res==='d'?0.5:((res==='w')===ourW?1:0));
  }
  console.log(JSON.stringify(out));sf.kill();process.exit(0);
})();
