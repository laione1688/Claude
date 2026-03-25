#!/usr/bin/env python3
"""
訂單分析核心腳本
提供完整的訂單數據分析功能,包含新客/復購分析、銷售趨勢、商品分析等
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from typing import Dict, List, Tuple, Optional

class OrderAnalyzer:
    """訂單分析器"""
    
    def __init__(self, excel_path: str):
        """
        初始化分析器
        
        Args:
            excel_path: 訂單Excel檔案路徑
        """
        self.df = pd.read_excel(excel_path)
        self._preprocess_data()
        
    def _preprocess_data(self):
        """資料預處理"""
        # 轉換日期格式
        self.df['訂單日期'] = pd.to_datetime(self.df['訂單日期'])
        
        # 新增年月欄位
        self.df['年月'] = self.df['訂單日期'].dt.to_period('M')
        
        # 標記是否為FB廣告訂單 (根據訂單備註判斷)
        # 如果訂單備註包含特定關鍵字,則標記為非FB廣告(老客戶)
        # 否則標記為FB廣告新客
        self.df['是否FB廣告'] = ~self.df['訂單備註'].notna()
        
        # 建立客戶唯一識別 (使用郵件和手機組合)
        self.df['客戶ID'] = self.df['購買人郵件'].fillna('') + '_' + self.df['購買人手機'].astype(str)
        
    def get_customer_type(self) -> pd.DataFrame:
        """
        判斷每筆訂單的客戶類型(新客/復購)
        
        Returns:
            包含客戶類型資訊的DataFrame
        """
        # 按客戶和訂單日期排序
        df_sorted = self.df.sort_values(['客戶ID', '訂單日期'])
        
        # 為每個客戶的訂單編號
        df_sorted['客戶訂單序號'] = df_sorted.groupby('客戶ID').cumcount() + 1
        
        # 標記客戶類型
        df_sorted['客戶類型'] = df_sorted['客戶訂單序號'].apply(
            lambda x: '新客' if x == 1 else '復購'
        )
        
        return df_sorted
    
    def monthly_new_vs_repeat_analysis(self) -> pd.DataFrame:
        """
        每月新客vs復購分析
        
        Returns:
            包含每月新客/復購訂單數和金額的DataFrame
        """
        df_typed = self.get_customer_type()
        
        # 按年月和客戶類型分組統計
        monthly_stats = df_typed.groupby(['年月', '客戶類型']).agg({
            '訂單編號': 'nunique',  # 訂單數
            '訂單金額': 'sum'  # 訂單總金額
        }).reset_index()
        
        monthly_stats.columns = ['年月', '客戶類型', '訂單數', '訂單金額']
        
        # 透視表格式
        pivot_orders = monthly_stats.pivot(
            index='年月', 
            columns='客戶類型', 
            values='訂單數'
        ).fillna(0)
        
        pivot_revenue = monthly_stats.pivot(
            index='年月', 
            columns='客戶類型', 
            values='訂單金額'
        ).fillna(0)
        
        # 合併結果
        result = pd.DataFrame({
            '新客訂單數': pivot_orders.get('新客', 0),
            '復購訂單數': pivot_orders.get('復購', 0),
            '新客金額': pivot_revenue.get('新客', 0),
            '復購金額': pivot_revenue.get('復購', 0)
        })
        
        result['總訂單數'] = result['新客訂單數'] + result['復購訂單數']
        result['總金額'] = result['新客金額'] + result['復購金額']
        result['復購率%'] = (result['復購訂單數'] / result['總訂單數'] * 100).round(2)
        result['復購金額佔比%'] = (result['復購金額'] / result['總金額'] * 100).round(2)
        
        return result
    
    def fb_ad_performance_analysis(self) -> pd.DataFrame:
        """
        FB廣告效益分析
        
        Returns:
            FB廣告vs自然流量的效益分析
        """
        df_typed = self.get_customer_type()
        
        # 按年月、是否FB廣告、客戶類型分組
        fb_stats = df_typed.groupby(['年月', '是否FB廣告', '客戶類型']).agg({
            '訂單編號': 'nunique',
            '訂單金額': 'sum'
        }).reset_index()
        
        fb_stats.columns = ['年月', '是否FB廣告', '客戶類型', '訂單數', '訂單金額']
        
        return fb_stats
    
    def sales_trend_analysis(self, period: str = 'M') -> pd.DataFrame:
        """
        銷售趨勢分析
        
        Args:
            period: 時間週期 ('D'=日, 'W'=週, 'M'=月)
            
        Returns:
            時間序列銷售數據
        """
        # 按訂單去重(避免多商品訂單重複計算)
        df_unique_orders = self.df.drop_duplicates('訂單編號')
        
        # 設定訂單日期為索引
        df_unique_orders = df_unique_orders.set_index('訂單日期')
        
        # 重採樣
        trend = df_unique_orders.resample(period).agg({
            '訂單編號': 'count',
            '訂單金額': 'sum',
            '客戶ID': 'nunique'
        })
        
        trend.columns = ['訂單數', '訂單金額', '客戶數']
        trend['平均訂單金額'] = (trend['訂單金額'] / trend['訂單數']).round(0)
        
        return trend
    
    def product_analysis(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        商品分析
        
        Returns:
            (商品銷售統計, 商品組合分析)
        """
        # 商品銷售統計
        product_stats = self.df.groupby('品名規格').agg({
            '數量': 'sum',
            '商品小計': 'sum',
            '訂單編號': 'nunique'
        }).reset_index()
        
        product_stats.columns = ['商品', '銷售數量', '銷售金額', '訂單數']
        product_stats = product_stats.sort_values('銷售金額', ascending=False)
        product_stats['銷售金額佔比%'] = (
            product_stats['銷售金額'] / product_stats['銷售金額'].sum() * 100
        ).round(2)
        product_stats['累積佔比%'] = product_stats['銷售金額佔比%'].cumsum().round(2)
        
        # 商品組合分析(同一訂單中的商品組合)
        order_products = self.df.groupby('訂單編號')['品名規格'].apply(list).reset_index()
        order_products['商品數'] = order_products['品名規格'].apply(len)
        
        combo_stats = order_products['商品數'].value_counts().reset_index()
        combo_stats.columns = ['商品數', '訂單數']
        combo_stats['佔比%'] = (combo_stats['訂單數'] / combo_stats['訂單數'].sum() * 100).round(2)
        
        return product_stats, combo_stats
    
    def customer_behavior_analysis(self) -> Dict:
        """
        客戶行為分析
        
        Returns:
            客戶行為統計字典
        """
        df_typed = self.get_customer_type()
        
        # 客戶購買次數分布
        customer_purchase_freq = df_typed.groupby('客戶ID')['訂單編號'].nunique()
        
        # 客戶生命週期價值
        customer_ltv = df_typed.groupby('客戶ID').agg({
            '訂單金額': 'sum',
            '訂單編號': 'nunique',
            '訂單日期': ['min', 'max']
        })
        
        customer_ltv.columns = ['總消費金額', '訂單次數', '首購日期', '最後購買日期']
        customer_ltv['客戶生命週期(天)'] = (
            customer_ltv['最後購買日期'] - customer_ltv['首購日期']
        ).dt.days
        customer_ltv['平均訂單金額'] = (customer_ltv['總消費金額'] / customer_ltv['訂單次數']).round(0)
        
        # 統計摘要
        summary = {
            '總客戶數': len(customer_purchase_freq),
            '一次性客戶數': (customer_purchase_freq == 1).sum(),
            '復購客戶數': (customer_purchase_freq > 1).sum(),
            '復購率%': round((customer_purchase_freq > 1).sum() / len(customer_purchase_freq) * 100, 2),
            '平均購買次數': round(customer_purchase_freq.mean(), 2),
            '平均客戶LTV': round(customer_ltv['總消費金額'].mean(), 0),
            '平均客戶生命週期(天)': round(customer_ltv['客戶生命週期(天)'].mean(), 1),
            '購買次數分布': customer_purchase_freq.value_counts().sort_index().to_dict(),
            'Top10高價值客戶': customer_ltv.nlargest(10, '總消費金額')[['總消費金額', '訂單次數']].to_dict('index')
        }
        
        return summary
    
    def anomaly_detection(self) -> pd.DataFrame:
        """
        異常訂單偵測
        
        Returns:
            異常訂單列表
        """
        df_unique = self.df.drop_duplicates('訂單編號')
        
        # 計算訂單金額的統計指標
        mean_amount = df_unique['訂單金額'].mean()
        std_amount = df_unique['訂單金額'].std()
        
        # 標記異常(超過平均值2個標準差)
        df_unique['是否異常'] = (
            (df_unique['訂單金額'] > mean_amount + 2 * std_amount) |
            (df_unique['訂單金額'] < mean_amount - 2 * std_amount)
        )
        
        anomalies = df_unique[df_unique['是否異常']][
            ['訂單日期', '訂單編號', '購買人', '訂單金額', '付款狀態']
        ].sort_values('訂單金額', ascending=False)
        
        return anomalies
    
    def generate_insights(self) -> List[str]:
        """
        生成業務洞察
        
        Returns:
            洞察建議列表
        """
        insights = []
        
        # 取得各項分析結果
        monthly_analysis = self.monthly_new_vs_repeat_analysis()
        customer_summary = self.customer_behavior_analysis()
        product_stats, _ = self.product_analysis()
        
        # 復購率洞察
        avg_repeat_rate = monthly_analysis['復購率%'].mean()
        if avg_repeat_rate < 20:
            insights.append(f"⚠️ 整體復購率偏低({avg_repeat_rate:.1f}%),建議加強客戶關係維護和會員經營")
        elif avg_repeat_rate > 40:
            insights.append(f"✅ 復購率表現良好({avg_repeat_rate:.1f}%),顯示客戶黏性強")
        
        # 客戶生命週期洞察
        one_time_rate = customer_summary['一次性客戶數'] / customer_summary['總客戶數'] * 100
        if one_time_rate > 70:
            insights.append(f"⚠️ {one_time_rate:.1f}%的客戶只購買一次,建議設計首購後的再行銷方案")
        
        # 商品集中度洞察
        top3_ratio = product_stats.head(3)['銷售金額佔比%'].sum()
        if top3_ratio > 70:
            insights.append(f"⚠️ 前3名商品佔營收{top3_ratio:.1f}%,商品集中度高,建議分散風險")
        
        # 月增長趨勢洞察
        if len(monthly_analysis) >= 2:
            recent_growth = (
                (monthly_analysis.iloc[-1]['總金額'] - monthly_analysis.iloc[-2]['總金額']) / 
                monthly_analysis.iloc[-2]['總金額'] * 100
            )
            if recent_growth > 20:
                insights.append(f"📈 上月營收成長{recent_growth:.1f}%,表現優異")
            elif recent_growth < -10:
                insights.append(f"📉 上月營收下降{abs(recent_growth):.1f}%,需關注原因")
        
        # 高價值客戶洞察
        avg_ltv = customer_summary['平均客戶LTV']
        top10_avg = np.mean([v['總消費金額'] for v in customer_summary['Top10高價值客戶'].values()])
        vip_ratio = top10_avg / avg_ltv
        if vip_ratio > 5:
            insights.append(f"💎 高價值客戶貢獻顯著(Top10平均消費為一般客戶{vip_ratio:.1f}倍),建議建立VIP方案")
        
        return insights


def main():
    """主程式範例"""
    import sys
    
    if len(sys.argv) < 2:
        print("使用方式: python order_analyzer.py <訂單Excel檔案路徑>")
        sys.exit(1)
    
    excel_path = sys.argv[1]
    analyzer = OrderAnalyzer(excel_path)
    
    print("=" * 80)
    print("訂單分析報告")
    print("=" * 80)
    
    # 1. 每月新客vs復購分析
    print("\n【每月新客vs復購分析】")
    monthly = analyzer.monthly_new_vs_repeat_analysis()
    print(monthly)
    
    # 2. 客戶行為分析
    print("\n【客戶行為分析】")
    customer = analyzer.customer_behavior_analysis()
    for key, value in customer.items():
        if key not in ['購買次數分布', 'Top10高價值客戶']:
            print(f"{key}: {value}")
    
    # 3. 商品分析
    print("\n【Top 10 商品分析】")
    product_stats, _ = analyzer.product_analysis()
    print(product_stats.head(10))
    
    # 4. 業務洞察
    print("\n【業務洞察與建議】")
    insights = analyzer.generate_insights()
    for insight in insights:
        print(insight)


if __name__ == "__main__":
    main()
