from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(500)
    pg.click('[data-ob=meet]'); pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]')
    pg.evaluate("ChessAscent.go('play')"); pg.click('[data-act=startGame]'); pg.wait_for_timeout(400)
    for m in [('e2','e4'),('d1','h5'),('h5','f7')]:
        pg.evaluate(f"ChessAscent.drop('{m[0]}','{m[1]}')"); pg.wait_for_timeout(4500)
    print(pg.evaluate("ChessAscent.IX.game.history()"))
    btns=pg.query_selector_all('[data-act=pRetry]'); print('retry buttons', len(btns))
    if btns:
        btns[0].click(); pg.wait_for_timeout(600); print('after retry', pg.evaluate("ChessAscent.IX.game.history()"), pg.evaluate("ChessAscent.IX.enabled"))
        print(pg.inner_text('.feed')[:200].replace('\n',' | '))
    print(errs); b.close()
