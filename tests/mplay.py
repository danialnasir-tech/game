from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/site.html'); pg.wait_for_timeout(1000)
    pg.click('[data-ob=meet]'); pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]'); pg.wait_for_timeout(500)
    pg.evaluate("ChessAscent.go('play')"); pg.wait_for_timeout(400); pg.click('[data-act=startGame]'); pg.wait_for_timeout(500)
    print(pg.evaluate("document.body.dataset.layout"))
    pg.evaluate("ChessAscent.drop('e2','e4')"); pg.wait_for_timeout(4000)
    pg.evaluate("ChessAscent.drop('g1','f3')"); pg.wait_for_timeout(4000)
    print(pg.evaluate("ChessAscent.IX.game.history()"))
    pg.screenshot(path='scratch/mp_1.png')
    pg.click('[data-act=pHint]'); pg.wait_for_timeout(3000); pg.screenshot(path='scratch/mp_2.png')
    pg.click('#tools-btn'); pg.wait_for_timeout(300); pg.screenshot(path='scratch/mp_3.png')
    print(errs); b.close()
