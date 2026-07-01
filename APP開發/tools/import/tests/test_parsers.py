from parsers import parse_person, parse_activity

def test_direct_offering():
    r = parse_person("1150617-疏文回覆-福德正神-舒莉芬.docx")
    assert r["beneficiary"] == "舒莉芬"
    assert r["is_proxy"] is False

def test_proxy_offering():
    # 括號內為供養人、括號前為受供人
    r = parse_person("1140707-疏文回覆-觀音-廖美垣(劉恩榜代供).docx")
    assert r["beneficiary"] == "廖美垣"
    assert r["offerer"] == "劉恩榜"
    assert r["is_proxy"] is True

def test_masked_name():
    r = parse_person("1150617-疏文回覆-福德正神-許O絜.pdf")
    assert r["masked"] is True

def test_activity_folder():
    a = parse_activity("1150617-烘爐地南山福德宮-115第二期")
    assert a["temple"].startswith("烘爐地南山福德宮")
    assert a["roc_date"] == "1150617"
