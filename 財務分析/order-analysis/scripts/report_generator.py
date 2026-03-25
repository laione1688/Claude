#!/usr/bin/env python3
"""
訂單分析報表生成器
生成完整的Excel分析報表和Word報告
"""

import pandas as pd
from datetime import datetime
import sys
from pathlib import Path


def generate_excel_report(analyzer, output_path: str):
    """
    生成完整的Excel分析報表
    
    Args:
        analyzer: OrderAnalyzer實例
        output_path: 輸出檔案路徑
    """
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        
        # 1. 每月新客vs復購分析
        monthly = analyzer.monthly_new_vs_repeat_analysis()
        monthly.to_excel(writer, sheet_name='月度新客復購分析')
        
        # 2. 銷售趨勢
        trend_daily = analyzer.sales_trend_analysis('D')
        trend_daily.to_excel(writer, sheet_name='每日銷售趨勢')
        
        trend_monthly = analyzer.sales_trend_analysis('M')
        trend_monthly.to_excel(writer, sheet_name='每月銷售趨勢')
        
        # 3. 商品分析
        product_stats, combo_stats = analyzer.product_analysis()
        product_stats.to_excel(writer, sheet_name='商品銷售分析', index=False)
        combo_stats.to_excel(writer, sheet_name='商品組合分析', index=False)
        
        # 4. 客戶行為分析
        customer_summary = analyzer.customer_behavior_analysis()
        
        # 客戶摘要
        summary_df = pd.DataFrame([
            {'指標': k, '數值': v} 
            for k, v in customer_summary.items()
            if k not in ['購買次數分布', 'Top10高價值客戶']
        ])
        summary_df.to_excel(writer, sheet_name='客戶行為摘要', index=False)
        
        # 購買次數分布
        freq_df = pd.DataFrame([
            {'購買次數': k, '客戶數': v}
            for k, v in customer_summary['購買次數分布'].items()
        ]).sort_values('購買次數')
        freq_df.to_excel(writer, sheet_name='購買次數分布', index=False)
        
        # Top10高價值客戶
        top10_df = pd.DataFrame(customer_summary['Top10高價值客戶']).T
        top10_df.index.name = '客戶ID'
        top10_df.to_excel(writer, sheet_name='Top10高價值客戶')
        
        # 5. 異常訂單
        anomalies = analyzer.anomaly_detection()
        if len(anomalies) > 0:
            anomalies.to_excel(writer, sheet_name='異常訂單偵測', index=False)
        
        # 6. 詳細客戶分類資料
        df_typed = analyzer.get_customer_type()
        
        # 客戶首購/復購明細
        customer_detail = df_typed.groupby('客戶ID').agg({
            '購買人': 'first',
            '購買人郵件': 'first',
            '訂單編號': 'nunique',
            '訂單金額': 'sum',
            '訂單日期': ['min', 'max']
        }).reset_index()
        
        customer_detail.columns = ['客戶ID', '姓名', '郵件', '訂單次數', 
                                   '總消費金額', '首購日期', '最後購買日期']
        customer_detail['客戶類型'] = customer_detail['訂單次數'].apply(
            lambda x: '新客' if x == 1 else '復購'
        )
        customer_detail = customer_detail.sort_values('總消費金額', ascending=False)
        customer_detail.to_excel(writer, sheet_name='客戶明細', index=False)
        
        # 7. 業務洞察
        insights = analyzer.generate_insights()
        insights_df = pd.DataFrame({
            '序號': range(1, len(insights) + 1),
            '洞察建議': insights
        })
        insights_df.to_excel(writer, sheet_name='業務洞察', index=False)
    
    print(f"✅ Excel報表已生成: {output_path}")


def generate_summary_text(analyzer) -> str:
    """
    生成文字摘要報告
    
    Args:
        analyzer: OrderAnalyzer實例
        
    Returns:
        摘要文字
    """
    monthly = analyzer.monthly_new_vs_repeat_analysis()
    customer_summary = analyzer.customer_behavior_analysis()
    product_stats, combo_stats = analyzer.product_analysis()
    
    report = f"""
{'=' * 80}
訂單分析報告摘要
生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'=' * 80}

【整體概況】
• 分析期間: {analyzer.df['訂單日期'].min().strftime('%Y-%m-%d')} ~ {analyzer.df['訂單日期'].max().strftime('%Y-%m-%d')}
• 總訂單數: {analyzer.df['訂單編號'].nunique()} 筆
• 總營收: ${analyzer.df.drop_duplicates('訂單編號')['訂單金額'].sum():,.0f}
• 總客戶數: {customer_summary['總客戶數']} 人

【客戶分析】
• 新客數量: {customer_summary['總客戶數'] - customer_summary['復購客戶數']} 人
• 復購客戶: {customer_summary['復購客戶數']} 人
• 整體復購率: {customer_summary['復購率%']}%
• 平均購買次數: {customer_summary['平均購買次數']} 次
• 平均客戶價值: ${customer_summary['平均客戶LTV']:,.0f}

【月度表現】
最近一個月:
• 新客訂單: {int(monthly.iloc[-1]['新客訂單數'])} 筆 (${monthly.iloc[-1]['新客金額']:,.0f})
• 復購訂單: {int(monthly.iloc[-1]['復購訂單數'])} 筆 (${monthly.iloc[-1]['復購金額']:,.0f})
• 當月復購率: {monthly.iloc[-1]['復購率%']:.1f}%
• 當月復購金額佔比: {monthly.iloc[-1]['復購金額佔比%']:.1f}%

【商品分析】
• 總商品種類: {len(product_stats)} 種
• Top 3 商品銷售佔比: {product_stats.head(3)['銷售金額佔比%'].sum():.1f}%
• 最熱銷商品: {product_stats.iloc[0]['商品']}
  - 銷售數量: {int(product_stats.iloc[0]['銷售數量'])} 件
  - 銷售金額: ${product_stats.iloc[0]['銷售金額']:,.0f}

【業務洞察】
"""
    
    insights = analyzer.generate_insights()
    for i, insight in enumerate(insights, 1):
        report += f"{i}. {insight}\n"
    
    report += f"\n{'=' * 80}\n"
    
    return report


def main():
    """主程式"""
    from order_analyzer import OrderAnalyzer
    
    if len(sys.argv) < 2:
        print("使用方式: python report_generator.py <訂單Excel檔案路徑> [輸出目錄]")
        sys.exit(1)
    
    excel_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './reports'
    
    # 建立輸出目錄
    Path(output_dir).mkdir(exist_ok=True)
    
    # 初始化分析器
    print("正在載入訂單資料...")
    analyzer = OrderAnalyzer(excel_path)
    
    # 生成報表
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 1. Excel報表
    print("\n生成Excel報表...")
    excel_output = f"{output_dir}/訂單分析報表_{timestamp}.xlsx"
    generate_excel_report(analyzer, excel_output)
    
    # 2. 文字摘要
    print("\n生成摘要報告...")
    summary_text = generate_summary_text(analyzer)
    summary_output = f"{output_dir}/訂單分析摘要_{timestamp}.txt"
    with open(summary_output, 'w', encoding='utf-8') as f:
        f.write(summary_text)
    print(f"✅ 摘要報告已生成: {summary_output}")
    
    # 顯示摘要
    print(summary_text)


if __name__ == "__main__":
    main()
