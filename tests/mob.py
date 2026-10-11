import sys
from playwright.sync_api import sync_playwright
W,H=int(sys.argv[1]),int(sys.argv[2]); tag=sys.argv[3]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':W,'height':H}, device_scale_factor=1, is_mobile=W<600, has_touch=W<600); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/site.html' if W<900 else 'file:///home/claude/chess/dist/chess-ascent.html'); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'scratch/{tag}_0splash.png')
    pg.click('[data-ob=meet]'); pg.wait_for_timeout(300); pg.screenshot(path=f'scratch/{tag}_1level.png')
    pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.screenshot(path=f'scratch/{tag}_2tour.png'); pg.click('[data-tour=skip]'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'scratch/{tag}_3path.png')
    for m in ['lesson','puzzles','openings','play','progress']:
        if m=='lesson': pg.evaluate("ChessAscent.go('lesson','l-rook')")
        else: pg.evaluate(f"ChessAscent.go('{m}')")
        pg.wait_for_timeout(500); pg.screenshot(path=f'scratch/{tag}_{m}.png')
        sh=pg.evaluate("[document.documentElement.scrollHeight, innerHeight, document.getElementById('panel').scrollHeight]")
        print(m, sh)
    print(errs); b.close()
