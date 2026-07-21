import os
import sys
from playwright.sync_api import sync_playwright

def run_verification():
    # Make sure output directories exist
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    print("Launching Playwright browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Record video of the verification session
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()

        try:
            print("1. Navigating to Customer Marketplace / ShopPage...")
            page.goto("http://localhost:3000/marketplace")
            page.wait_for_timeout(2000) # Wait for page load/animation

            # Verify no crash / error boundary
            body_text = page.locator("body").inner_text()
            assert "Cannot read properties" not in body_text, "Found null reading id crash text!"
            assert "Something went wrong" not in body_text, "Found error boundary crash text!"
            print("✓ Marketplace loaded successfully!")

            # Take screenshot of marketplace
            page.screenshot(path="/home/jules/verification/screenshots/marketplace.png")

            print("2. Navigating to Healthcare Section / HealthcareShopPage...")
            page.goto("http://localhost:3000/healthcare")
            page.wait_for_timeout(2000) # Wait for page load/animation

            # Verify no crash / error boundary
            body_text = page.locator("body").inner_text()
            assert "Cannot read properties" not in body_text, "Found null reading id crash text in Healthcare!"
            assert "Something went wrong" not in body_text, "Found error boundary crash text in Healthcare!"
            print("✓ Healthcare section loaded successfully!")

            # Take main verification screenshot of healthcare
            page.screenshot(path="/home/jules/verification/screenshots/verification.png")
            page.wait_for_timeout(1000)

        except Exception as e:
            print(f"Error during verification: {e}")
            # Take error screenshot
            page.screenshot(path="/home/jules/verification/screenshots/error.png")
            raise e
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    run_verification()
    print("Verification complete!")
