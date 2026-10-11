from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1366,'height':800}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/chess-ascent.html'); pg.wait_for_timeout(1500)
    pg.click('[data-ob=meet]'); pg.click('[data-band="800"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]')
    pg.evaluate("ChessAscent.go('play')"); pg.click('[data-act=startGame]'); pg.wait_for_timeout(300)
    # real mouse drag e2->e4 on the 2D board
    box=pg.query_selector('.b2-board').bounding_box(); s=box['width']/8
    def c(sq): f=ord(sq[0])-97; r=int(sq[1])-1; return (box['x']+(f+.5)*s, box['y']+(7-r+.5)*s)
    x0,y0=c('e2'); x1,y1=c('e4')
    pg.mouse.move(x0,y0); pg.mouse.down(); pg.mouse.move((x0+x1)/2,(y0+y1)/2,steps=5); pg.mouse.move(x1,y1,steps=5); pg.mouse.up()
    pg.wait_for_timeout(3500)
    print('after drag', pg.evaluate("ChessAscent.IX.game.history()"))
    x0,y0=c('g1'); x1,y1=c('f3'); pg.mouse.click(x0,y0); pg.wait_for_timeout(200); pg.mouse.click(x1,y1); pg.wait_for_timeout(3500)
    print('after clicks', pg.evaluate("ChessAscent.IX.game.history()"))
    pg.screenshot(path='scratch/b2d.png')
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(400); pg.screenshot(path='scratch/b2d_m.png')
    print(errs); b.close()
