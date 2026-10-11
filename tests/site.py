from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/site.html'); pg.wait_for_timeout(1500)
    print('innerWidth', pg.evaluate('innerWidth'), 'scrollW', pg.evaluate('document.documentElement.scrollWidth'), 'rail fixed bottom:', pg.evaluate("getComputedStyle(document.querySelector('.rail')).position"))
    pg.tap('[data-ob=meet]'); pg.tap('[data-band="800"]'); pg.wait_for_timeout(900); pg.tap('[data-tour=skip]')
    pg.evaluate("ChessAscent.go('progress')"); pg.wait_for_timeout(300)
    pg.click('[data-act=backup]'); code=pg.input_value('#bk-code'); print('backup len', len(code))
    pg.evaluate("ChessAscent.state().xp=999"); pg.click('[data-act=restore]'); pg.fill('#rs-code', code); pg.click('[data-act=doRestore]'); pg.wait_for_timeout(300)
    print('xp after restore', pg.evaluate("ChessAscent.state().xp"))
    pg.screenshot(path='scratch/site_m.png', full_page=False)
    print(errs); b.close()
