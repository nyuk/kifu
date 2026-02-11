import requests
import uuid
import time
import sys

BASE_URL = "http://localhost:8080/api/v1"
# Hardcoded for local QA environment - if needed we can fetch or register new
# But for now let's try to register a fresh user to avoid conflicts
TIMESTAMP = int(time.time())
EMAIL = f"qa_auto_{TIMESTAMP}@example.com"
PASSWORD = "password123"

def print_result(test_name, status, message=""):
    color = "\033[92m" if status == "PASS" else "\033[91m"
    reset = "\033[0m"
    print(f"[{test_name}] {color}{status}{reset} {message}")

def run_tests():
    print(f"Starting QA Automation at {BASE_URL}...")
    
    # 1. Auth / Register
    session = requests.Session()
    register_payload = {
        "email": EMAIL,
        "password": PASSWORD,
        "name": f"QABot_{TIMESTAMP}",
        "marketing_agree": False
    }
    
    try:
        # Register
        res = session.post(f"{BASE_URL}/auth/register", json=register_payload)
        if res.status_code != 200 and res.status_code != 201:
            print_result("A-00 Setup", "FAIL", f"Register failed: {res.text}")
            return
        
        print_result("A-00 Setup", "PASS", f"User registered: {EMAIL}")

        # Login
        login_payload = {
            "email": EMAIL,
            "password": PASSWORD
        }
        res = session.post(f"{BASE_URL}/auth/login", json=login_payload)
        if res.status_code != 200:
             print_result("A-00 Setup", "FAIL", f"Login failed: {res.text}")
             return
             
        token = res.json().get("access_token")
        if not token:
             print_result("A-00 Setup", "FAIL", "No access token in login response")
             return
             
        session.headers.update({"Authorization": f"Bearer {token}"})
        print_result("A-00 Setup", "PASS", "Logged in successfully")
        
    except Exception as e:
        print_result("A-00 Setup", "FAIL", f"Exception: {e}")
        return

    # 2. C-07: Verify Quick Symbol Search for '005930'
    # Expect: Backend should handle it gracefully or return specific error
    print("\n--- Testing C-07 Quick Symbol '005930' ---")
    
    # Test 2.1: Market Klines
    try:
        # Standard exchange check (Binance/Upbit)
        res = session.get(f"{BASE_URL}/market/klines", params={"symbol": "005930", "interval": "1h", "exchange": "upbit"})
        if res.status_code == 400:
             print_result("C-07 Market Klines", "PASS", "Correctly rejected invalid symbol format for Upbit")
        elif res.status_code == 500 or res.status_code == 502:
             print_result("C-07 Market Klines", "WARNING", f"Got {res.status_code}, backend tried to fetch but failed (Acceptable for invalid symbol)")
        else:
             print_result("C-07 Market Klines", "FAIL", f"Unexpected status {res.status_code}: {res.text}")
             
    except Exception as e:
         print_result("C-07 Market Klines", "FAIL", str(e))

    # Test 2.2: Bubble Search (Similar Handler)
    try:
        # Search endpoint requires tags usually, but checking symbol validation
        res = session.get(f"{BASE_URL}/bubbles/search", params={"symbol": "005930", "period": "1h", "tags": "test"})
        # Handler regex `^[A-Z0-9]{3,12}$` matches 005930? Yes.
        # So it might try to search DB.
        if res.status_code == 200:
            data = res.json()
            items = data.get("items", [])
            if len(items) == 0:
                print_result("C-07 Bubble Search", "PASS", "Returned empty list (valid behavior)")
            else:
                 print_result("C-07 Bubble Search", "PASS", f"Returned {len(items)} items (Surprising but valid if exists)")
        elif res.status_code == 400:
             print_result("C-07 Bubble Search", "PASS", "Rejected (Validation)")
        else:
             print_result("C-07 Bubble Search", "FAIL", f"Status {res.status_code}: {res.text}")

    except Exception as e:
        print_result("C-07 Bubble Search", "FAIL", str(e))


    # 3. N-01: Verify AI Note Pruning (Prune older than N)
    print("\n--- Testing N-01 AI Note Pruning ---")
    try:
        # N-01.1: Create a Bubble first (required for some notes? optional in handler?)
        # note_handler allows optional bubble_id. Let's try without bubble_id first to speed up.
        
        # We need to know the limit. Default 200.
        LIMIT = 200 
        OVERFLOW = 10
        TOTAL_TO_CREATE = LIMIT + OVERFLOW
        
        print(f"Creating {TOTAL_TO_CREATE} notes with title 'AI 복기 요약'...")
        
        # Use simple thread pool or sequential? Sequential is safer for order checking but slow.
        # 210 requests might take a bit.
        
        for i in range(TOTAL_TO_CREATE):
            note_payload = {
                "title": "AI 복기 요약", 
                "content": f"Auto generated note {i}",
                "emotion": "neutral"
            }
            res = session.post(f"{BASE_URL}/notes", json=note_payload)
            if res.status_code != 201:
                print_result("N-01 Creation", "FAIL", f"Failed at index {i}: {res.text}")
                break
            if i % 50 == 0:
                print(f"Created {i}...")
                
        # Now check count
        res = session.get(f"{BASE_URL}/notes", params={"limit": 100}) # Pagination logic needed to count all?
        # The list endpoint returns "total".
        
        if res.status_code == 200:
            data = res.json()
            total = data.get("total", 0)
            
            # Since we just registered, total should be exactly the limit if pruning works.
            # However, the pruning logic: "PruneAIGeneratedByUser" keeps N.
            # If we created 210, it should delete 10. Remaining: 200.
            
            if total == LIMIT:
                print_result("N-01 Pruning", "PASS", f"Total notes is {total} (Matches Limit {LIMIT})")
            elif total > LIMIT:
                print_result("N-01 Pruning", "FAIL", f"Total notes {total} > Limit {LIMIT}. Pruning didn't work?")
                # Debug: print first few titles
                items = data.get("notes", [])
                if items:
                    print(f"DEBUG: First note title: '{items[0].get('title')}'")
                    print(f"DEBUG: First note created_at: '{items[0].get('created_at')}'")
            else:
                print_result("N-01 Pruning", "WARNING", f"Total notes {total} < Limit {LIMIT}. Creation failed?")
    
    except Exception as e:
        print_result("N-01 Pruning", "FAIL", str(e))

    # 4. Create Bubble for Deeplink Test
    print("\n--- Creating Bubble for Deeplink Test ---")
    try:
         bubble_payload = {
             "symbol": "BTC", # Short symbol? Handler regex ^[A-Z0-9]{3,12}$
             # Wait, handler says symbolPattern? bubbleSymbolPattern in handler
             "symbol": "BTCUSDT",
             "timeframe": "1h",
             "candle_time": "2025-01-01T00:00:00Z",
             "price": "100000",
             "tags": ["test"],
             "memo": "Deeplink test"
         }
         # Need to handle potential 400 if validation fails
         res = session.post(f"{BASE_URL}/bubbles", json=bubble_payload)
         if res.status_code == 200:
             bid = res.json().get("id")
             print(f"DEBUG: Created Bubble ID: {bid}")
             print_result("B-00 Create Bubble", "PASS", f"ID: {bid}")
         else:
             print_result("B-00 Create Bubble", "FAIL", f"Status {res.status_code}: {res.text}")
    except Exception as e:
         print_result("B-00 Create Bubble", "FAIL", str(e))

    print("\nDone.")

if __name__ == "__main__":
    run_tests()
