import requests
# Verify blockchain node 8080 accessibility
try:
    res = requests.get("http://blockchain:8080")
    print(res.status_code)
except:
    print("Node not reachable")
