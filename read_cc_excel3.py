import pandas as pd
file_path = "CC Q300 VFINAL1.xlsm"

try:
    df_datos = pd.read_excel(file_path, sheet_name="Datos", nrows=20)
    print("=== HOJA: Datos ===")
    print(df_datos.to_string())
except Exception as e:
    print(f"Error reading 'Datos': {e}")

try:
    df_carta = pd.read_excel(file_path, sheet_name="Carta 0", nrows=20)
    print("\n=== HOJA: Carta 0 ===")
    print(df_carta.to_string())
except Exception as e:
    print(f"Error reading 'Carta 0': {e}")
