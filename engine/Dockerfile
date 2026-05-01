# 1. Gunakan pondasi sistem operasi Linux ringan yang sudah terinstal Python 3.10
FROM python:3.10-slim

# 2. Tentukan folder kerja di dalam "kontainer" Docker
WORKDIR /app

# 3. Pindahkan file requirements.txt dari laptopmu ke dalam kontainer
COPY requirements.txt .

# 4. Install semua library yang ada di requirements.txt tanpa menyimpan cache (agar ukuran file kecil)
RUN pip install --no-cache-dir -r requirements.txt

# 5. Salin semua file dari folder /engine laptopmu (main.py, optimizer.py, dll) ke dalam kontainer
COPY . .

# 6. Beri tahu Docker bahwa aplikasi ini akan menggunakan port 8000
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]