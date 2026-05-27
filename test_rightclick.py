from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    print(f"Connected!")

    # Find all pages
    pet_page = None
    for ctx in browser.contexts:
        for page in ctx.pages:
            print(f"  Page: {page.url}")
            if "pet.html" in page.url:
                pet_page = page

    if not pet_page:
        print("ERROR: pet.html not found!")
        browser.close()
        exit(1)

    print(f"Found: {pet_page.url}")

    # Wait for canvas
    pet_page.wait_for_selector("canvas", timeout=5000)
    print("Canvas ready, taking before screenshot...")
    pet_page.screenshot(path="E:/desktop-pet-claude/test_before_rightclick.png")

    # Right-click
    canvas = pet_page.locator("canvas")
    box = canvas.bounding_box()
    cx = box['x'] + box['width'] / 2
    cy = box['y'] + box['height'] / 2
    pet_page.mouse.click(cx, cy, button='right')
    print("Right-click done.")
    time.sleep(0.8)

    pet_page.screenshot(path="E:/desktop-pet-claude/test_after_rightclick.png")
    print("After screenshot saved.")

    # Left click still works
    pet_page.mouse.click(cx, cy, button='left')
    print("Left-click: OK")

    browser.close()
    print("Test complete!")
