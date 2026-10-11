from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1300,'height':820}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(700)
    pg.screenshot(path='scratch/n0.png')
    pg.click('[data-ob=meet]'); pg.wait_for_timeout(500); pg.screenshot(path='scratch/n1.png')
    pg.click('[data-band="800"]'); pg.wait_for_timeout(1200)
    pg.click('[data-tour=skip]'); pg.wait_for_timeout(300)
    pg.screenshot(path='scratch/n2.png')
    pg.click('[data-act=toggleStage][data-i="0"]'); pg.wait_for_timeout(300)
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    pg.screenshot(path='scratch/n3.png', full_page=True)
    print('scrollW', pg.evaluate('document.documentElement.scrollWidth'), errs)
    b.close()
