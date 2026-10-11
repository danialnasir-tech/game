from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':580,'height':220}); pg.goto('file:///home/claude/chess/scratch/icons.html'); pg.screenshot(path='scratch/icons.png'); b.close()
