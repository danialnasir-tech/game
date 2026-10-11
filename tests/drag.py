from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(500)
    pg.click('[data-ob=meet]'); pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]')
    pg.evaluate("ChessAscent.go('play')"); pg.click('[data-act=startGame]'); pg.wait_for_timeout(400)
    print('illegal', pg.evaluate("ChessAscent.drop('e2','e5')"), pg.evaluate("ChessAscent.IX.game.history()"))
    print('legal', pg.evaluate("ChessAscent.drop('e2','e4')")); pg.wait_for_timeout(4000)
    print(pg.evaluate("ChessAscent.IX.game.history()"))
    # blunder then retry
    pg.evaluate("ChessAscent.drop('d1','h5')"); pg.wait_for_timeout(4000)
    h=pg.evaluate("ChessAscent.IX.game.history()"); print(h)
    btn=pg.query_selector('[data-act=pRetry]')
    print('retry button', bool(btn))
    if btn:
        btn.click(); pg.wait_for_timeout(500); print('after retry', pg.evaluate("ChessAscent.IX.game.history()"))
    pg.evaluate("ChessAscent.go('lesson','l-rook')"); pg.click('[data-act=nextStep]'); pg.wait_for_timeout(300)
    print('collect drop', pg.evaluate("ChessAscent.drop('a1','a6')")); pg.wait_for_timeout(800); print(pg.inner_text('#collect-count'))
    print(errs)
    b.close()
