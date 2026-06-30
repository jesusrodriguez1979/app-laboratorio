import pandas as pd
file_path = "CC Q300 VFINAL1.xlsm"
try:
    xl = pd.ExcelFile(file_path)
    print("Sheet names in Excel file:")
    print(xl.sheet_names)
except Exception as e:
    print("Error:", e)
