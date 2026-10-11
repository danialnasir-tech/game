from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(500)
    pg.click('[data-ob=meet]'); pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]')
    st=lambda: pg.evaluate("[ChessAscent.IX.enabled, ChessAscent.IX.game && ChessAscent.IX.game.history().join(' ')]")
    # lesson wrong then right
    pg.evaluate("ChessAscent.go('lesson','l-forks')"); pg.click('[data-act=nextStep]'); pg.wait_for_timeout(300)
    print('lesson wrong', pg.evaluate("ChessAscent.drop('c4','e5')")); pg.wait_for_timeout(400); print(st())
    print('lesson right', pg.evaluate("ChessAscent.drop('c4','d6')")); pg.wait_for_timeout(2500); print(st())
    # puzzle wrong
    pg.evaluate("ChessAscent.go('puzzles')"); pg.wait_for_timeout(500)
    sol=pg.evaluate("ChessAscent.dbg().PZ.cur.p.sol"); g=pg.evaluate("ChessAscent.IX.game.moves().map(m=>m.from+m.to)")
    wrong=[m for m in g if m!=sol[0][:4]][0]
    print('puzzle wrong', pg.evaluate(f"ChessAscent.drop('{wrong[:2]}','{wrong[2:]}')")); pg.wait_for_timeout(500); print(st())
    print('puzzle right', pg.evaluate(f"ChessAscent.drop('{sol[0][:2]}','{sol[0][2:4]}')")); pg.wait_for_timeout(3000); print(st())
    # drill wrong
    pg.evaluate("ChessAscent.go('opening',{id:'italian',mode:'drill'})"); pg.wait_for_timeout(800)
    print('drill wrong', pg.evaluate("ChessAscent.drop('d2','d4')")); pg.wait_for_timeout(500); print(st())
    print('drill right', pg.evaluate("ChessAscent.drop('e2','e4')")); pg.wait_for_timeout(1800); print(st())
    print(errs); b.close()
