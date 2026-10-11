from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/site.html'); pg.wait_for_timeout(1000)
    pg.click('[data-ob=meet]'); pg.click('[data-band="100"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]'); pg.wait_for_timeout(800)
    pg.screenshot(path='scratch/wn_0.png')
    pg.evaluate("document.querySelector('#panel').scrollTop=400"); pg.wait_for_timeout(200); pg.screenshot(path='scratch/wn_0b.png')
    pg.evaluate("ChessAscent.go('lesson','l-rook')"); pg.wait_for_timeout(300)
    for i in range(8): pg.evaluate("ChessAscent.ACT.nextStep()"); pg.wait_for_timeout(100)
    pg.wait_for_timeout(900)
    while pg.query_selector('[data-cel]'): pg.click('[data-cel]'); pg.wait_for_timeout(700)
    pg.screenshot(path='scratch/wn_1.png')
    pg.evaluate("document.querySelector('#panel').scrollTop=9999"); pg.wait_for_timeout(200); pg.screenshot(path='scratch/wn_2.png')
    pg.click('.wn-card.pref'); pg.wait_for_timeout(800); pg.screenshot(path='scratch/wn_3.png')
    print(pg.evaluate("document.body.dataset.mode+' '+document.body.dataset.layout"))
    print(errs); b.close()
