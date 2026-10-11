from playwright.sync_api import sync_playwright
import json, time
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1300,'height':820})
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('file:///home/claude/chess/dist/test.html')
    pg.wait_for_timeout(800)
    pg.click('[data-ob=meet]'); pg.wait_for_timeout(300); pg.click('[data-band="800"]'); pg.wait_for_timeout(1200); pg.click('[data-tour=skip]'); pg.wait_for_timeout(300)
    print('path:', pg.inner_text('#panel')[:160].replace('\n',' | '))
    # lesson: rook (collect)
    pg.evaluate("ChessAscent.go('lesson','l-rook')"); pg.wait_for_timeout(300)
    pg.click('[data-act=nextStep]'); pg.wait_for_timeout(300)
    for sq in ['a1','a6','f6','f2','h2']:
        pg.evaluate(f"ChessAscent.click('{sq}')"); pg.wait_for_timeout(900)
    print('collect:', pg.inner_text('#status'))
    # lesson with moves: forks
    pg.evaluate("ChessAscent.go('lesson','l-forks')"); pg.wait_for_timeout(300)
    pg.click('[data-act=nextStep]'); pg.wait_for_timeout(300)
    for sq in ['c4','d6']:
        pg.evaluate(f"ChessAscent.click('{sq}')"); pg.wait_for_timeout(200)
    pg.wait_for_timeout(2500)
    print('fork step:', pg.inner_text('#status'), '| fen', pg.evaluate("ChessAscent.IX.game.fen()"))
    # wrong move test on next step
    pg.click('[data-act=nextStep]'); pg.wait_for_timeout(300)
    for sq in ['e1','e2']:
        pg.evaluate(f"ChessAscent.click('{sq}')"); pg.wait_for_timeout(200)
    pg.wait_for_timeout(500); print('wrong:', pg.inner_text('#status'))
    # safe-judge step
    pg.evaluate("ChessAscent.go('lesson','l-cct')"); pg.wait_for_timeout(300)
    pg.click('[data-act=nextStep]'); pg.wait_for_timeout(300)
    for sq in ['a1','a8']:
        pg.evaluate(f"ChessAscent.click('{sq}')"); pg.wait_for_timeout(200)
    pg.wait_for_timeout(3500); print('safe-judge Ra8:', pg.inner_text('#status'))
    # puzzles
    pg.evaluate("ChessAscent.go('puzzles')"); pg.wait_for_timeout(500)
    p1=pg.evaluate("ChessAscent.dbg().PZ.cur.p")
    print('puzzle', p1['id'], p1['sol'])
    u=p1['sol'][0]
    pg.evaluate(f"ChessAscent.click('{u[:2]}')"); pg.wait_for_timeout(150); pg.evaluate(f"ChessAscent.click('{u[2:4]}')")
    pg.wait_for_timeout(3500)
    print('puzzle status:', pg.inner_text('#status'), 'rating', pg.evaluate("ChessAscent.state().puzzle.rating"))
    # openings
    pg.evaluate("ChessAscent.go('opening',{id:'sicilian-dragon',mode:'learn'})"); pg.wait_for_timeout(400)
    for i in range(3): pg.click('[data-act=opNext]'); pg.wait_for_timeout(900)
    print('learn:', pg.inner_text('.coach-card')[:120].replace('\n',' | '))
    pg.click('[data-act=drillOp]'); pg.wait_for_timeout(1500)
    print('drill:', pg.inner_text('#status'))
    pg.evaluate("ChessAscent.click('c7')"); pg.wait_for_timeout(100); pg.evaluate("ChessAscent.click('c5')"); pg.wait_for_timeout(2500)
    print('drill after c5:', pg.inner_text('#status'), pg.evaluate("ChessAscent.IX.game.history()"))
    # play
    pg.evaluate("ChessAscent.go('play')"); pg.wait_for_timeout(400)
    pg.click('[data-act=setLevel][data-id=strong]'); pg.click('[data-act=setColor][data-c=w]'); pg.click('[data-act=startGame]'); pg.wait_for_timeout(500)
    for mv in [('e2','e4'),('d1','h5'),('h5','f7')]:
        pg.evaluate(f"ChessAscent.click('{mv[0]}')"); pg.wait_for_timeout(100); pg.evaluate(f"ChessAscent.click('{mv[1]}')")
        pg.wait_for_timeout(5000)
        print('hist', pg.evaluate("ChessAscent.IX.game.history()"))
    print('feed:', pg.inner_text('.feed')[:600].replace('\n',' | '))
    pg.evaluate("ChessAscent.go('progress')"); pg.wait_for_timeout(400)
    print('progress:', pg.inner_text('#panel')[:300].replace('\n',' | '))
    pg.set_viewport_size({'width':390,'height':800}); pg.wait_for_timeout(300)
    print('scrollW', pg.evaluate("document.documentElement.scrollWidth"))
    b.close()
print('ERRORS', errs)
