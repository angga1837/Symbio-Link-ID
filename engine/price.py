def calculate_financials(material_type: str, volume_kg: float, ml_score: float, logistic_cost: float) -> dict:
    base_prices = {"Fly Ash": 500, "Silica Fume": 1200, "Steel Slag": 800}
    base_rate = base_prices.get(material_type, 500)
    
    base_total = base_rate * volume_kg
    adjusted_price = base_total * ml_score  # Kualitas ML menentukan harga
    platform_fee = adjusted_price * 0.02    # Komisi Symbio-Link 2%
    
    final_payout = adjusted_price - platform_fee
    total_bill = adjusted_price + logistic_cost # Pembeli bayar harga + ongkir MILP
    
    return {
        "base_price_total": round(base_total, 2),
        "ml_quality_adjustment": round(adjusted_price - base_total, 2),
        "logistics_cost": round(logistic_cost, 2),
        "platform_fee": round(platform_fee, 2),
        "final_payout_to_sender": round(final_payout, 2),
        "total_bill_to_buyer": round(total_bill, 2),
        "currency": "IDR"
    }