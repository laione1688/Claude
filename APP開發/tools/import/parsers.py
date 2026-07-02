import re

def parse_person(filename: str) -> dict:
    stem = re.sub(r"\.(docx|pdf)$", "", filename)
    stem = re.sub(r"docx$", "", stem)  # 清 "許婼絜docx" 這類髒尾
    parts = stem.split("-")
    name_field = parts[-1].strip()
    proxy = re.search(r"(.+?)\((.+?)代(?:供)?\)", name_field)
    if proxy:
        beneficiary, offerer = proxy.group(1), proxy.group(2)
        is_proxy = True
    else:
        beneficiary, offerer, is_proxy = name_field, name_field, False
    masked = "O" in beneficiary or "○" in beneficiary
    return {"beneficiary": beneficiary, "offerer": offerer,
            "is_proxy": is_proxy, "masked": masked}

def parse_activity(folder: str) -> dict:
    m = re.match(r"(\d{7})-(.+)", folder)
    if m:
        return {"roc_date": m.group(1), "temple": m.group(2)}
    return {"roc_date": None, "temple": folder}
