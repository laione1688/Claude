#!/usr/bin/env python3
"""
訂單視覺化圖表生成
產生各類分析圖表
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib import font_manager
import seaborn as sns
from pathlib import Path
import sys

# 設定中文字型
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'Microsoft JhengHei']
plt.rcParams['axes.unicode_minus'] = False

class OrderVisualizer:
    """訂單視覺化工具"""
    
    def __init__(self, analyzer, output_dir: str = './charts'):
        """
        初始化視覺化工具
        
        Args:
            analyzer: OrderAnalyzer實例
            output_dir: 圖表輸出目錄
        """
        self.analyzer = analyzer
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 設定樣式
        sns.set_style("whitegrid")
        self.colors = sns.color_palette("husl", 8)
    
    def plot_monthly_trend(self, save: bool = True) -> str:
        """
        繪製月度趨勢圖
        
        Returns:
            圖表檔案路徑
        """
        monthly = self.analyzer.monthly_new_vs_repeat_analysis()
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
        
        # 訂單數趨勢
        x = range(len(monthly))
        width = 0.35
        
        ax1.bar([i - width/2 for i in x], monthly['新客訂單數'], 
                width, label='新客訂單', color=self.colors[0], alpha=0.8)
        ax1.bar([i + width/2 for i in x], monthly['復購訂單數'], 
                width, label='復購訂單', color=self.colors[1], alpha=0.8)
        
        ax1.set_xlabel('月份', fontsize=12)
        ax1.set_ylabel('訂單數', fontsize=12)
        ax1.set_title('每月訂單數趨勢 (新客 vs 復購)', fontsize=14, fontweight='bold')
        ax1.set_xticks(x)
        ax1.set_xticklabels([str(m) for m in monthly.index], rotation=45)
        ax1.legend(fontsize=11)
        ax1.grid(True, alpha=0.3)
        
        # 金額趨勢
        ax2.bar([i - width/2 for i in x], monthly['新客金額'], 
                width, label='新客金額', color=self.colors[2], alpha=0.8)
        ax2.bar([i + width/2 for i in x], monthly['復購金額'], 
                width, label='復購金額', color=self.colors[3], alpha=0.8)
        
        ax2.set_xlabel('月份', fontsize=12)
        ax2.set_ylabel('金額 (元)', fontsize=12)
        ax2.set_title('每月營收趨勢 (新客 vs 復購)', fontsize=14, fontweight='bold')
        ax2.set_xticks(x)
        ax2.set_xticklabels([str(m) for m in monthly.index], rotation=45)
        ax2.legend(fontsize=11)
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save:
            filepath = self.output_dir / 'monthly_trend.png'
            plt.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close()
            return str(filepath)
        else:
            plt.show()
            return ""
    
    def plot_repeat_rate(self, save: bool = True) -> str:
        """
        繪製復購率趨勢
        
        Returns:
            圖表檔案路徑
        """
        monthly = self.analyzer.monthly_new_vs_repeat_analysis()
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        x = range(len(monthly))
        ax.plot(x, monthly['復購率%'], marker='o', linewidth=2.5, 
                markersize=8, color=self.colors[4], label='訂單復購率')
        ax.plot(x, monthly['復購金額佔比%'], marker='s', linewidth=2.5, 
                markersize=8, color=self.colors[5], label='金額復購佔比')
        
        # 添加數值標籤
        for i, (rate, amount) in enumerate(zip(monthly['復購率%'], monthly['復購金額佔比%'])):
            ax.text(i, rate + 1, f'{rate:.1f}%', ha='center', fontsize=9)
            ax.text(i, amount - 3, f'{amount:.1f}%', ha='center', fontsize=9)
        
        ax.set_xlabel('月份', fontsize=12)
        ax.set_ylabel('百分比 (%)', fontsize=12)
        ax.set_title('復購率趨勢分析', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels([str(m) for m in monthly.index], rotation=45)
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
        
        plt.tight_layout()
        
        if save:
            filepath = self.output_dir / 'repeat_rate.png'
            plt.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close()
            return str(filepath)
        else:
            plt.show()
            return ""
    
    def plot_product_analysis(self, top_n: int = 10, save: bool = True) -> str:
        """
        繪製商品分析圖
        
        Args:
            top_n: 顯示前N名商品
            
        Returns:
            圖表檔案路徑
        """
        product_stats, combo_stats = self.analyzer.product_analysis()
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
        
        # Top商品銷售
        top_products = product_stats.head(top_n)
        
        y_pos = range(len(top_products))
        ax1.barh(y_pos, top_products['銷售金額'], color=self.colors[0], alpha=0.8)
        ax1.set_yticks(y_pos)
        ax1.set_yticklabels([p[:30] + '...' if len(p) > 30 else p 
                             for p in top_products['商品']], fontsize=9)
        ax1.set_xlabel('銷售金額 (元)', fontsize=12)
        ax1.set_title(f'Top {top_n} 商品銷售排行', fontsize=13, fontweight='bold')
        ax1.grid(True, alpha=0.3, axis='x')
        
        # 添加金額標籤
        for i, (amount, ratio) in enumerate(zip(top_products['銷售金額'], 
                                                  top_products['銷售金額佔比%'])):
            ax1.text(amount, i, f' {int(amount):,} ({ratio}%)', 
                    va='center', fontsize=9)
        
        # 商品組合分析
        ax2.pie(combo_stats['訂單數'], labels=combo_stats['商品數'].apply(lambda x: f'{x}項商品'), 
                autopct='%1.1f%%', startangle=90, colors=self.colors)
        ax2.set_title('訂單商品組合分布', fontsize=13, fontweight='bold')
        
        plt.tight_layout()
        
        if save:
            filepath = self.output_dir / 'product_analysis.png'
            plt.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close()
            return str(filepath)
        else:
            plt.show()
            return ""
    
    def plot_customer_segmentation(self, save: bool = True) -> str:
        """
        繪製客戶分群圖
        
        Returns:
            圖表檔案路徑
        """
        summary = self.analyzer.customer_behavior_analysis()
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # 購買次數分布
        freq_dist = summary['購買次數分布']
        x = list(freq_dist.keys())
        y = list(freq_dist.values())
        
        ax1.bar(x, y, color=self.colors[1], alpha=0.8)
        ax1.set_xlabel('購買次數', fontsize=12)
        ax1.set_ylabel('客戶數', fontsize=12)
        ax1.set_title('客戶購買次數分布', fontsize=13, fontweight='bold')
        ax1.grid(True, alpha=0.3, axis='y')
        
        # 添加數值標籤
        for i, v in enumerate(y):
            ax1.text(x[i], v, str(v), ha='center', va='bottom', fontsize=10)
        
        # 新客vs復購客戶佔比
        labels = ['一次性客戶', '復購客戶']
        sizes = [summary['一次性客戶數'], summary['復購客戶數']]
        
        ax2.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90,
                colors=[self.colors[2], self.colors[3]])
        ax2.set_title(f'客戶復購分析\n(總復購率: {summary["復購率%"]}%)', 
                     fontsize=13, fontweight='bold')
        
        plt.tight_layout()
        
        if save:
            filepath = self.output_dir / 'customer_segmentation.png'
            plt.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close()
            return str(filepath)
        else:
            plt.show()
            return ""
    
    def generate_all_charts(self) -> list:
        """
        生成所有圖表
        
        Returns:
            所有圖表檔案路徑列表
        """
        charts = []
        
        print("正在生成圖表...")
        
        print("  - 月度趨勢圖")
        charts.append(self.plot_monthly_trend())
        
        print("  - 復購率趨勢圖")
        charts.append(self.plot_repeat_rate())
        
        print("  - 商品分析圖")
        charts.append(self.plot_product_analysis())
        
        print("  - 客戶分群圖")
        charts.append(self.plot_customer_segmentation())
        
        print(f"\n✅ 已生成 {len(charts)} 張圖表於: {self.output_dir}")
        
        return charts


if __name__ == "__main__":
    from order_analyzer import OrderAnalyzer
    
    if len(sys.argv) < 2:
        print("使用方式: python visualizer.py <訂單Excel檔案路徑>")
        sys.exit(1)
    
    excel_path = sys.argv[1]
    analyzer = OrderAnalyzer(excel_path)
    visualizer = OrderVisualizer(analyzer)
    
    charts = visualizer.generate_all_charts()
