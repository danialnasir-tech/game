from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1300,'height':820})
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(600)
    pg.screenshot(path='scratch/s0.png')
    pg.click('[data-band="400"]'); pg.wait_for_timeout(500)
    pg.screenshot(path='scratch/s1.png')
    pg.set_viewport_size({'width':390,'height':844}); pg.evaluate("ChessAscent.go('play')"); pg.wait_for_timeout(500)
    pg.screenshot(path='scratch/s2.png', full_page=True)
    b.close()
