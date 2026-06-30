import pandas as pd
file_path = "CC Q300 VFINAL1.xlsm"

df_datos = pd.read_excel(file_path, sheet_name="Datos", nrows=50)
print("=== HOJA: Datos ===")
print(df_datos.dropna(how="all").head(10).to_string())
