from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page()
    pg.on('console', lambda m: errs.append(m.type+': '+m.text))
    pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)+' '+str(e.stack)[:500]))
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(1500)
    print(pg.evaluate("document.getElementById('modal').hidden"), pg.inner_text('#panel')[:100])
    b.close()
print('\n'.join(errs))
