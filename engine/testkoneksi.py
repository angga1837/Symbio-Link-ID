import requests
import sys
import os

def test_blockchain_connectivity(target_url):
    print(f"Ngecek koneksi Engine ke Blockchain Gateway di: {target_url}/health")
    try:
        response = requests.get(f"{target_url}/health", timeout=5)
        
        if response.status_code == 200:
            print(f"Koneksi ke Blockchain Gateway sukses! Respons: {response.json()}")
        else:
            print(f"Server terkonek, tapi ada respons error. Status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print(f"Koneksi gagal: Tidak bisa menemukan server di {target_url}.")
        print("Pastikan nama service di docker-compose adalah 'blockchain'.")
        sys.exit(1)
    except Exception as e:
        print(f"Error sistem: {e}")
        sys.exit(1)

if __name__ == "__main__":
    
    URL_TARGET = os.getenv("BLOCKCHAIN_URL", "http://blockchain:3000")
    test_blockchain_connectivity(URL_TARGET)