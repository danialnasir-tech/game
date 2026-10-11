from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1366,'height':800}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(500)
    pg.click('[data-ob=meet]'); pg.click('[data-band="100"]'); pg.wait_for_timeout(900); pg.click('[data-tour=skip]')
    print('missions beginner:', pg.inner_text('.mchips').replace('\n',' | '))
    pg.click('.rail [data-go=play]'); pg.wait_for_timeout(300); print('locked:', pg.inner_text('#panel')[:90].replace('\n',' | '))
    pg.screenshot(path='scratch/x_locked.png')
    pg.click('[data-act=peek]'); pg.wait_for_timeout(400)
    print('styles:', pg.inner_text('.styles').replace('\n',' / '))
    pg.click('[data-act=setStyle][data-s=teach]'); pg.click('[data-act=startGame]'); pg.wait_for_timeout(300)
    for m in [('e2','e4'),('d1','h5'),('h5','f7'),('f1','c4'),('g1','f3')]:
        pg.evaluate(f"ChessAscent.drop('{m[0]}','{m[1]}')"); pg.wait_for_timeout(3800)
    pg.screenshot(path='scratch/x_game.png')
    print('minis:', len(pg.query_selector_all('.feed-mini')), 'bubble hidden:', pg.evaluate("document.getElementById('coach-bubble').hidden"), pg.inner_text('#coach-bubble')[:80].replace('\n',' '))
    pg.click('[data-act=pResign]'); pg.wait_for_timeout(800)
    print('over actions:', pg.inner_text('.over-actions').replace('\n',' / '))
    pg.click('[data-act=reviewGame]'); pg.wait_for_timeout(600); pg.screenshot(path='scratch/x_review.png')
    print('review:', pg.inner_text('#panel')[:260].replace('\n',' | '))
    ms=pg.query_selector_all('[data-act=rvMoment]'); print('moments', len(ms))
    if ms: ms[0].click(); pg.wait_for_timeout(300)
    pg.click('[data-act="rvGo"][aria-label=Back]'); pg.wait_for_timeout(200)
    if pg.query_selector('[data-act=rvPractice]'):
        pg.click('[data-act=rvPractice]'); pg.wait_for_timeout(500); print('practice:', pg.inner_text('#panel')[:120].replace('\n',' | '))
        pg.click('[data-act=practiceHint]'); pg.wait_for_timeout(300); print('after hint:', pg.inner_text('#status'))
    # celebrations: badge from a game (resign gives none) -> force via lesson completion
    pg.evaluate("ChessAscent.go('lesson','l-rook')")
    for i in range(3):
        pg.wait_for_timeout(200)
        if i==1:
            for sq in ['a1','a6','f6','f2','h2']: pg.evaluate(f"ChessAscent.click('{sq}')"); pg.wait_for_timeout(800)
        if i==2:
            for sq in ['h8','c8','c3','g3','g1','b1']: pg.evaluate(f"ChessAscent.click('{sq}')"); pg.wait_for_timeout(800)
        pg.click('[data-act=nextStep]')
    pg.wait_for_timeout(1200); print('celebrate:', bool(pg.query_selector('.celebrate')), pg.inner_text('.celebrate')[:80].replace('\n',' ') if pg.query_selector('.celebrate') else '')
    pg.screenshot(path='scratch/x_badge.png')
    if pg.query_selector('[data-cel]'): pg.click('[data-cel]'); pg.wait_for_timeout(600)
    if pg.query_selector('[data-cel]'): pg.click('[data-cel]'); pg.wait_for_timeout(400)
    print('top level:', pg.inner_text('#top-level'), pg.evaluate("ChessAscent.state().xp"))
    # rush
    pg.evaluate("ChessAscent.go('puzzles')"); pg.wait_for_timeout(400); pg.click('[data-act=rushStart]'); pg.wait_for_timeout(400)
    sol=pg.evaluate("ChessAscent.IX.game && ChessAscent.dbg ? null : null")
    print('rush:', pg.inner_text('#panel')[:100].replace('\n',' | ')); pg.screenshot(path='scratch/x_rush.png')
    # openings
    pg.evaluate("ChessAscent.go('openings')"); pg.wait_for_timeout(400); pg.click('[data-act=peek]'); pg.wait_for_timeout(400)
    print('recs:', pg.inner_text('.recs').replace('\n',' / ')[:150])
    pg.fill('#op-search','sicil'); pg.wait_for_timeout(300); print('search:', len(pg.query_selector_all('.op-card')))
    # settings
    pg.click('#settings-btn'); pg.wait_for_timeout(300); pg.screenshot(path='scratch/x_settings.png'); pg.click('[data-set=close]')
    pg.set_viewport_size({'width':390,'height':844}); pg.evaluate("ChessAscent.go('path')"); pg.wait_for_timeout(400)
    print('scrollW', pg.evaluate('document.documentElement.scrollWidth')); pg.screenshot(path='scratch/x_mobile.png')
    print('ERR', errs); b.close()
