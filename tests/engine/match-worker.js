// plays games A vs B from given start fens; prints JSON result per game
const Game=require(''+__dirname+'/../../chesscore.js')();
const path=require('path');const A=require(path.resolve(process.env.A))(Game), B=require(path.resolve(process.env.B))(Game);
const T=+process.env.T||100, fens=JSON.parse(process.env.FENS);
const out=[];
for(const [fen,aWhite] of fens){
  const g=new Game(fen),hist=[];let ply=0,res=null;
  while(!res){
    if(g.inCheckmate()){res=g.turn()==='w'?'b':'w';break;}
    if(g.isDraw()||ply>220){res='d';break;}
    const useA=(g.turn()==='w')===aWhite, E=useA?A:B;
    const r=E.pickMove(g.fen(),{depth:60,time:T,margin:0},hist.slice());
    hist.push(g.fen());g.move({from:r.move.from,to:r.move.to,promotion:r.move.promotion||undefined});ply++;
  }
  out.push(res==='d'?0.5:((res==='w')===aWhite?1:0));
}
console.log(JSON.stringify(out));
