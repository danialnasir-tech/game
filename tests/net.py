from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
    pg=b.new_page()
    pg.set_content('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>')
    pg.wait_for_timeout(4000)
    print(pg.evaluate('typeof THREE'), pg.evaluate('typeof THREE!=="undefined" && typeof THREE.OrbitControls'))
    print(pg.evaluate('(()=>{try{const c=document.createElement("canvas");return !!c.getContext("webgl")}catch(e){return String(e)}})()'))
    b.close()
