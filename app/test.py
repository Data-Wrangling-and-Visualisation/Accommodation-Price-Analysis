import requests
import json

BASE_URL = "http://127.0.0.1:5000"

payload = {
    "latitude": 43.5,
    "longitude": -39.7,
    "date": "2023-01-01",
    "floor": 5,
    "rooms_count": 2,
    "floors_count": 2,
    "total_meters": 90
}

response = requests.post(f"{BASE_URL}/predict_with_importance", json=payload)

print("Status Code:", response.status_code)
print("Response JSON:", response.json())