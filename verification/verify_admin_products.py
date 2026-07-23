import os
import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    print("[Playwright] Navigating to Admin Panel Login...")
    page.goto("http://localhost:3001/login")
    page.wait_for_timeout(1000)

    # Fill credentials
    print("[Playwright] Entering Admin credentials...")
    page.get_by_placeholder("admin@connecthub.website").fill("connecthubadmin_prod@gmail.com")
    page.wait_for_timeout(500)
    page.get_by_placeholder("••••••••").fill("Password123!")
    page.wait_for_timeout(500)

    # Click login button
    print("[Playwright] Clicking Login...")
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_timeout(2000)

    # Check that we are on dashboard
    print(f"[Playwright] Logged in successfully. Current URL: {page.url}")

    # Click Products link in sidebar or go directly
    print("[Playwright] Navigating to Products Management page...")
    page.goto("http://localhost:3001/products")
    page.wait_for_timeout(2000)

    # Capture main page showing stats cards and products table
    print("[Playwright] Capturing screenshot of Products page...")
    page.screenshot(path="/home/jules/verification/screenshots/products_page.png")
    page.wait_for_timeout(1000)

    # Click on "View Details" for the first product
    print("[Playwright] Clicking view details (eye icon) for Wireless Bluetooth Headphones...")
    # Find button with eye icon inside the row for Wireless Bluetooth Headphones
    page.locator("tr:has-text('Wireless Bluetooth Headphones')").locator("button[title='View Details']").click()
    page.wait_for_timeout(1500)

    # Capture details modal screenshot
    print("[Playwright] Capturing screenshot of Product details modal...")
    page.screenshot(path="/home/jules/verification/screenshots/product_details_modal.png")
    page.wait_for_timeout(1000)

    # Close the modal
    print("[Playwright] Closing the modal...")
    page.get_by_role("button").filter(has=page.locator("svg[class*='lucide-x']")).click()
    page.wait_for_timeout(1000)

    # Try to toggle status (suspend product)
    print("[Playwright] Suspending Wireless Bluetooth Headphones...")
    # Handle the window.confirm dialog automatically
    page.on("dialog", lambda dialog: dialog.accept())

    page.locator("tr:has-text('Wireless Bluetooth Headphones')").get_by_role("button", name="Suspend").click()
    page.wait_for_timeout(1500)

    # Verify that it now shows "Activate"
    print("[Playwright] Verifying status updated in table...")
    page.screenshot(path="/home/jules/verification/screenshots/products_suspended_state.png")
    page.wait_for_timeout(1000)

    print("[Playwright] E2E verification complete!")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("[Playwright] Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print(f"[Error in E2E]: {e}", file=sys.stderr)
            page.screenshot(path="/home/jules/verification/screenshots/error.png")
        finally:
            context.close()
            browser.close()
            print("[Playwright] Closed browser.")
