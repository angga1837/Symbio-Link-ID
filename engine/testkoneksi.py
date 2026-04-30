import requests
import time

def test_connectivity(target_url):
    print(f"konesi tes ke: {target_url}")
    try:
        
        response = requests.get(target_url, timeout=5)
        
        if response.status_code == 200:
            print(f"Koneksi suksess! Status: {response.status_code}")
            print(f"Respons server: {response.json()}")
        else:
            print(f"Server terhubung, tetapi eror. Status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("Koneksi gagal: Tidak bisa menemukan server. Pastikan container sudah running.")
    except Exception as e:
        print(f"Eror: {e}")

if __name__ == "__main__":
    URL_TARGET = "http://localhost:8000/"  #ganti dengan service di docker
    test_connectivity(URL_TARGET)