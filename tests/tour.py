from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for vp in [{'width':1300,'height':820},{'width':390,'height':844}]:
        pg=b.new_page(viewport=vp); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(600)
        pg.click('[data-band="400"]'); pg.wait_for_timeout(1500)
        for k in range(4): pg.click('[data-tour=next]'); pg.wait_for_timeout(450)
        pg.screenshot(path=f"scratch/tour{vp['width']}.png")
        for k in range(7): pg.click('[data-tour=next]'); pg.wait_for_timeout(200)
        print(vp['width'], 'tour closed', pg.evaluate("!document.querySelector('.tour')"), pg.evaluate("ChessAscent.state().toured"), errs)
    b.close()
