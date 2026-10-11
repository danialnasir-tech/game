from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    pg.goto('file:///home/claude/chess/dist/site.html'); pg.wait_for_timeout(1000)
    pg.click('[data-ob=meet]'); pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]'); pg.wait_for_timeout(800)
    print(pg.evaluate("['.stage','#three','.b2-wrap','.b2-board'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return s+' '+[r.y,r.height,r.width].map(Math.round)})"))
    b.close()
