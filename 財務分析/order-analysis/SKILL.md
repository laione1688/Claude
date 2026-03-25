---
name: order-analysis
description: 全方位訂單數據分析系統,專為電商訂單分析設計。適用場景:(1) 需要分析訂單Excel資料時 (2) 需要新客vs復購分析 (3) 需要計算廣告效益(FB廣告來源vs復購客戶) (4) 需要銷售趨勢、商品分析、客戶行為分析 (5) 需要異常訂單偵測 (6) 需要業務洞察建議 (7) 需要生成分析報表或視覺化圖表。支援繁體中文,特別針對台灣電商香供養品牌的訂單結構優化。
---

# 訂單分析系統 (Order Analysis System)

全方位訂單數據分析工具,提供深度的業務洞察和視覺化報表。

## 核心功能

### 1. 新客vs復購分析
追蹤每月新客戶和復購客戶的訂單數量與金額,計算復購率和客戶留存情況。

### 2. 廣告效益分析
區分FB廣告來源新客與自然復購客戶,評估廣告投資報酬率。

### 3. 銷售趨勢分析
提供日/週/月等不同時間維度的銷售趨勢,包含訂單數、金額、客戶數等指標。

### 4. 商品分析
- 商品銷售排行
- 商品組合分析(單品vs組合購買)
- 銷售集中度分析(80/20法則)

### 5. 客戶行為分析
- 購買次數分布
- 客戶生命週期價值(LTV)
- 高價值客戶識別
- 客戶分群

### 6. 異常偵測
自動識別異常高額或低額訂單。

### 7. 業務洞察
基於數據自動生成可執行的業務建議。

## 使用方式

### 快速開始

```python
from order_analyzer import OrderAnalyzer
from visualizer import OrderVisualizer
from report_generator import generate_excel_report

# 1. 載入訂單資料
analyzer = OrderAnalyzer('訂單資料表.xlsx')

# 2. 執行分析
monthly_stats = analyzer.monthly_new_vs_repeat_analysis()
customer_insights = analyzer.customer_behavior_analysis()
insights = analyzer.generate_insights()

# 3. 生成報表
generate_excel_report(analyzer, '分析報表.xlsx')

# 4. 生成圖表
visualizer = OrderVisualizer(analyzer)
visualizer.generate_all_charts()
```

### 命令列快速執行

```bash
# 生成完整報表
python scripts/report_generator.py 訂單資料表.xlsx ./output

# 生成視覺化圖表
python scripts/visualizer.py 訂單資料表.xlsx

# 查看基本分析
python scripts/order_analyzer.py 訂單資料表.xlsx
```

## 資料格式要求

訂單Excel檔案需包含以下欄位:
- `訂單日期`: 訂單時間
- `訂單編號`: 唯一訂單識別碼
- `購買人`: 客戶姓名
- `購買人郵件`: 客戶email
- `購買人手機`: 客戶手機
- `訂單金額`: 訂單總金額
- `品名規格`: 商品名稱
- `數量`: 商品數量
- `商品小計`: 商品金額
- `訂單備註`: (可選) 用於識別訂單來源

## 新客vs復購判斷邏輯

系統使用以下邏輯判斷客戶類型:

1. **客戶識別**: 使用 `購買人郵件` + `購買人手機` 組合作為唯一客戶ID
2. **首購認定**: 該客戶ID的第一筆訂單標記為「新客」
3. **復購認定**: 該客戶ID的第二筆及之後訂單標記為「復購」
4. **FB廣告來源**: 可透過`訂單備註`欄位進行標記(需自行定義規則)

## 分析報表內容

生成的Excel報表包含以下工作表:

1. **月度新客復購分析**: 每月新客/復購的訂單數、金額、佔比
2. **每日/每月銷售趨勢**: 時間序列趨勢數據
3. **商品銷售分析**: 商品排行、銷售佔比、累積佔比
4. **商品組合分析**: 單品vs組合購買統計
5. **客戶行為摘要**: 客戶數、復購率、LTV等關鍵指標
6. **購買次數分布**: 客戶購買頻率分布
7. **Top10高價值客戶**: 消費金額最高的客戶清單
8. **異常訂單偵測**: 統計異常的訂單列表
9. **客戶明細**: 每位客戶的詳細消費記錄
10. **業務洞察**: 自動生成的建議和觀察

## 視覺化圖表

生成的PNG圖表包括:

- `monthly_trend.png`: 月度訂單數與金額趨勢(新客vs復購)
- `repeat_rate.png`: 復購率趨勢線圖
- `product_analysis.png`: 商品銷售排行 + 商品組合分布
- `customer_segmentation.png`: 客戶購買次數分布 + 新客復購佔比

## 業務洞察範例

系統會自動生成如下洞察:

- ⚠️ 整體復購率偏低(15.2%),建議加強客戶關係維護和會員經營
- ⚠️ 75.3%的客戶只購買一次,建議設計首購後的再行銷方案
- 📈 上月營收成長32.5%,表現優異
- 💎 高價值客戶貢獻顯著(Top10平均消費為一般客戶6.2倍),建議建立VIP方案

## 客製化分析

如需針對特定業務需求進行客製化分析,可直接使用 `OrderAnalyzer` 類別:

```python
analyzer = OrderAnalyzer('data.xlsx')

# 取得詳細客戶分類資料
df_typed = analyzer.get_customer_type()

# 自訂分析
custom_analysis = df_typed.groupby(['年月', '客戶類型']).agg({
    '訂單金額': ['sum', 'mean', 'count']
})
```

## 注意事項

1. **資料品質**: 確保客戶郵件和手機資料完整,否則可能影響新客/復購判斷準確性
2. **日期格式**: 訂單日期需為Excel標準日期格式
3. **編碼**: 檔案需使用UTF-8編碼以正確顯示繁體中文
4. **重複訂單**: 系統會自動處理多商品訂單(同訂單編號多行)
5. **FB廣告識別**: 需根據實際業務邏輯調整`訂單備註`的判斷規則

## 進階功能

### 自訂時間區間

```python
# 篩選特定時間區間
df_filtered = analyzer.df[
    (analyzer.df['訂單日期'] >= '2025-12-01') &
    (analyzer.df['訂單日期'] <= '2025-12-31')
]

# 基於篩選資料建立新分析器
filtered_analyzer = OrderAnalyzer.__new__(OrderAnalyzer)
filtered_analyzer.df = df_filtered
filtered_analyzer._preprocess_data()
```

### 匯出特定客群

```python
# 找出高價值復購客戶
df_typed = analyzer.get_customer_type()
vip_customers = df_typed[
    (df_typed['客戶類型'] == '復購') &
    (df_typed['訂單金額'] > 5000)
]['購買人郵件'].unique()
```

## 腳本說明

### scripts/order_analyzer.py
核心分析引擎,包含所有分析邏輯和方法。可獨立執行查看基本分析結果。

### scripts/visualizer.py
視覺化圖表生成器,產生PNG格式的分析圖表。需要matplotlib和seaborn。

### scripts/report_generator.py
報表生成器,產生完整的Excel報表和文字摘要。整合所有分析結果為單一檔案。

## 相依套件

- pandas: 資料處理
- numpy: 數值計算
- matplotlib: 圖表繪製
- seaborn: 進階視覺化
- openpyxl: Excel檔案讀寫

安裝指令:
```bash
pip install pandas numpy matplotlib seaborn openpyxl
```
