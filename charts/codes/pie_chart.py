"""
Pie Chart - Biểu đồ tròn
Prompts: charts/prompts/06_pie_chart_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class PieConfig:
    """Cấu hình mặc định cho Pie Chart."""

    DEFAULTS = {
        'figsize': (10, 8),
        'dpi': 150,
        'style': 'seaborn-v0_8-whitegrid',
        'colors': ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#9b59b6'],
        'title_fontsize': 18,
    }

    PALETTES = {
        'modern': ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
        'pastel': ['#a8d5e2', '#f7c6c7', '#c5e8b7', '#ffe0b2', '#e1bee7', '#b3e5fc'],
        'vibrant': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
        'warm': ['#e74c3c', '#e67e22', '#f39c12', '#f1c40f', '#2ecc71', '#27ae60'],
        'cool': ['#3498db', '#2980b9', '#1abc9c', '#16a085', '#9b59b6', '#8e44ad'],
        'monochrome': ['#2c3e50', '#34495e', '#5d6d7e', '#85929e', '#aab7b8', '#d5d8dc'],
    }

    @staticmethod
    def apply_style(style: Optional[str] = None):
        try:
            plt.style.use(style or PieConfig.DEFAULTS['style'])
        except Exception:
            pass


# ============================================================
# BASIC PIE CHART
# ============================================================

def plot_pie(
    x: Union[pd.Series, np.ndarray, List],
    labels: Optional[List[str]] = None,
    title: str = '',
    autopct: Optional[str] = '%1.1f%%',
    pctdistance: float = 0.75,
    startangle: int = 90,
    colors: Optional[List[str]] = None,
    palette: Optional[str] = None,
    explode: Optional[List[float]] = None,
    shadow: bool = False,
    alpha: float = 0.9,
    wedgeprops: Optional[dict] = None,
    textprops: Optional[dict] = None,
    legend: bool = True,
    legend_loc: str = 'best',
    legend_fontsize: int = 12,
    center_text: Optional[str] = None,
    center_text_fontsize: int = 16,
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ biểu đồ tròn (Pie Chart).

    Args:
        x: giá trị của mỗi phần
        labels: nhãn cho mỗi phần
        autopct: format cho phần trăm ('%1.1f%%', '%1.0f%%', None)
        pctdistance: khoảng cách text phần trăm từ tâm (0-1)
        startangle: góc bắt đầu (0=phải, 90=trên, 180=trái, 270=dưới)
        colors: danh sách màu
        palette: tên palette thay vì colors
        explode: list giá trị tách (0=không tách, 0.1=tách nhẹ)
        shadow: hiển thị bóng đổ
        wedgeprops: dict cho style viền wedge
        center_text: text hiển thị ở giữa (cho donut)
        legend: hiển thị legend
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    PieConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    if palette:
        color_list = PieConfig.PALETTES.get(palette, PieConfig.DEFAULTS['colors'])
    else:
        color_list = colors or PieConfig.DEFAULTS['colors']

    if explode is None:
        explode = [0.0] * len(x)

    wp = wedgeprops or {'edgecolor': 'white', 'linewidth': 2}
    tp = textprops or {'fontsize': 11, 'fontweight': 'bold'}

    wedges, texts, autotexts = ax.pie(
        x, labels=labels, colors=color_list[:len(x)],
        autopct=autopct, startangle=startangle,
        explode=explode[:len(x)], shadow=shadow,
        wedgeprops=wp, textprops=tp,
        pctdistance=pctdistance
    )

    if autopct:
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')

    if center_text:
        ax.text(0, 0, center_text, ha='center', va='center',
                fontsize=center_text_fontsize, fontweight='bold',
                color='#2c3e50')

    if title:
        ax.set_title(title, fontsize=PieConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)

    if legend and labels:
        ax.legend(wedges, labels,
                  loc=legend_loc, fontsize=legend_fontsize,
                  frameon=True, edgecolor='gray',
                  title='Chú thích', title_fontsize=11)

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# DONUT CHART
# ============================================================

def plot_donut(
    x: Union[pd.Series, np.ndarray, List],
    labels: Optional[List[str]] = None,
    title: str = '',
    autopct: Optional[str] = '%1.1f%%',
    startangle: int = 90,
    colors: Optional[List[str]] = None,
    palette: Optional[str] = None,
    explode: Optional[List[float]] = None,
    shadow: bool = True,
    donut_width: float = 0.5,
    wedgeprops: Optional[dict] = None,
    textprops: Optional[dict] = None,
    legend: bool = True,
    legend_loc: str = 'best',
    legend_fontsize: int = 12,
    center_label: Optional[str] = None,
    center_value: Optional[str] = None,
    center_fontsize: int = 14,
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ biểu đồ donut (pie với lỗ giữa).

    Args:
        donut_width: tỷ lệ độ rỗng (0.5 = 50% rỗng, càng nhỏ càng rỗng nhiều)
        center_label: nhãn ở giữa
        center_value: giá trị hiển thị ở giữa
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    PieConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    if palette:
        color_list = PieConfig.PALETTES.get(palette, PieConfig.DEFAULTS['colors'])
    else:
        color_list = colors or PieConfig.DEFAULTS['colors']

    if explode is None:
        explode = [0.0] * len(x)

    wp = wedgeprops or {'edgecolor': 'white', 'linewidth': 2}
    wp['width'] = donut_width

    tp = textprops or {'fontsize': 11, 'fontweight': 'bold'}

    wedges, texts, autotexts = ax.pie(
        x, labels=labels, colors=color_list[:len(x)],
        autopct=autopct, startangle=startangle,
        explode=explode[:len(x)], shadow=shadow,
        wedgeprops=wp, textprops=tp,
        pctdistance=0.8
    )

    if autopct:
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')

    if center_label or center_value:
        center_text = ''
        if center_value:
            center_text += f'{center_value}\n'
        if center_label:
            center_text += center_label
        ax.text(0, 0, center_text.strip(), ha='center', va='center',
                fontsize=center_fontsize, fontweight='bold',
                color='#2c3e50')

    if title:
        ax.set_title(title, fontsize=PieConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)

    if legend and labels:
        ax.legend(wedges, labels,
                  loc=legend_loc, fontsize=legend_fontsize,
                  frameon=True, edgecolor='gray')

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_pie(
    df: pd.DataFrame,
    y: str,
    labels: Optional[str] = None,
    title: str = '',
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    autopct: Optional[str] = '%1.1f%%',
    startangle: int = 90,
    colors: Optional[List[str]] = None,
    explode: Optional[List[float]] = None,
    legend: bool = True,
    legend_loc: str = 'best',
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ pie chart sử dụng pandas DataFrame.plot().

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    PieConfig.apply_style(style)

    ax = df.plot(kind='pie', y=y, labels=df[labels] if labels else None,
                 figsize=figsize, dpi=dpi, autopct=autopct,
                 startangle=startangle, colors=colors,
                 legend=legend, title=title if title else None)

    ax.set_ylabel('')
    if legend:
        ax.legend(loc=legend_loc, fontsize=12)

    plt.tight_layout()

    if save_path:
        ax.figure.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return ax.figure


# ============================================================
# USAGE EXAMPLES
# ============================================================

if __name__ == '__main__':
    labels = ['Sản phẩm A', 'Sản phẩm B', 'Sản phẩm C', 'Sản phẩm D', 'Sản phẩm E']
    values = [350, 250, 180, 120, 100]
    total = sum(values)

    print("=== Pie Chart Examples ===\n")

    # 1. Basic pie
    plot_pie(
        x=values, labels=labels,
        title='Tỷ lệ doanh số theo sản phẩm',
        autopct='%1.1f%%',
        colors=PieConfig.PALETTES['vibrant'],
        shadow=True,
        show=False, save_path='charts/output/pie_basic.png'
    )
    print("1. Basic pie: charts/output/pie_basic.png")

    # 2. Exploded pie
    plot_pie(
        x=values, labels=labels,
        title='Tỷ lệ doanh số (Nhấn mạnh sản phẩm A)',
        autopct='%1.0f%%',
        colors=PieConfig.PALETTES['modern'],
        explode=[0.1, 0, 0, 0, 0],
        shadow=True,
        legend=True, legend_loc='upper right',
        show=False, save_path='charts/output/pie_exploded.png'
    )
    print("2. Exploded pie: charts/output/pie_exploded.png")

    # 3. Donut
    plot_donut(
        x=values, labels=labels,
        title='Tỷ lệ doanh số (Donut)',
        autopct='%1.1f%%',
        colors=PieConfig.PALETTES['cool'],
        donut_width=0.6,
        shadow=True,
        center_label='Tổng cộng',
        center_value=f'{total}M',
        show=False, save_path='charts/output/pie_donut.png'
    )
    print("3. Donut chart: charts/output/pie_donut.png")

    # 4. No percentages, legend only
    plot_pie(
        x=values, labels=labels,
        title='Cơ cấu sản phẩm',
        autopct=None,
        colors=PieConfig.PALETTES['pastel'],
        shadow=False,
        legend=True,
        show=False, save_path='charts/output/pie_nolabel.png'
    )
    print("4. Pie without pct labels: charts/output/pie_nolabel.png")
