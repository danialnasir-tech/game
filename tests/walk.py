from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1366,'height':768})
    pg.goto('file:///home/claude/chess/dist/test.html'); pg.wait_for_timeout(500)
    pg.click('[data-ob=meet]'); pg.wait_for_timeout(300); pg.screenshot(path='scratch/w1_level.png')
    pg.click('[data-band="100"]'); pg.wait_for_timeout(900); pg.screenshot(path='scratch/w2_tour.png'); pg.click('[data-tour=skip]')
    pg.click('[data-act=startNext]'); pg.wait_for_timeout(500); pg.screenshot(path='scratch/w3_lesson.png')
    pg.evaluate("ChessAscent.go('puzzles')"); pg.wait_for_timeout(500); pg.screenshot(path='scratch/w4_puzzle.png')
    pg.evaluate("ChessAscent.go('openings')"); pg.wait_for_timeout(500); pg.screenshot(path='scratch/w5_openings.png')
    pg.evaluate("ChessAscent.go('play')"); pg.wait_for_timeout(400); pg.screenshot(path='scratch/w6_coach.png')
    pg.click('[data-act=startGame]'); pg.wait_for_timeout(300)
    for m in [('e2','e4'),('g1','f3'),('f1','c4'),('d1','e2')]:
        pg.evaluate(f"ChessAscent.drop('{m[0]}','{m[1]}')"); pg.wait_for_timeout(3500)
    pg.screenshot(path='scratch/w7_game.png')
    pg.evaluate("ChessAscent.go('progress')"); pg.wait_for_timeout(400); pg.screenshot(path='scratch/w8_progress.png')
    b.close()
