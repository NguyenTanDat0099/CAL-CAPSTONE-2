"""
Bar Chart - Biểu đồ cột
Prompts: charts/prompts/02_bar_chart_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class BarChartConfig:
    """Cấu hình mặc định cho Bar Chart."""

    DEFAULTS = {
        'figsize': (12, 7),
        'dpi': 150,
        'style': 'seaborn-v0_8-whitegrid',
        'colors': ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
        'title_fontsize': 18,
        'label_fontsize': 13,
        'tick_fontsize': 11,
        'legend_fontsize': 12,
    }

    @staticmethod
    def apply_style(style: Optional[str] = None):
        try:
            plt.style.use(style or BarChartConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)


# ============================================================
# SINGLE BAR CHART (Vertical)
# ============================================================

def plot_vertical_bar(
    x: Union[pd.Series, np.ndarray, List],
    height: Union[pd.Series, np.ndarray, List],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    color: str = '#3498db',
    width: float = 0.7,
    edgecolor: str = 'black',
    linewidth: float = 1.2,
    alpha: float = 0.85,
    rot: int = 0,
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = False,
    grid_axis: str = 'y',
    grid_alpha: float = 0.5,
    annotate: bool = True,
    annotate_fontsize: int = 10,
    annotate_color: str = 'black',
    annotate_format: str = '.0f',
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ bar chart dọc (cột đứng).

    Args:
        x: nhãn hoặc vị trí trục X
        height: chiều cao các cột
        width: độ rộng cột (0-1)
        edgecolor, linewidth: style viền cột
        rot: góc xoay nhãn trục X
        annotate: hiển thị giá trị trên đỉnh cột
        annotate_format: format số ('.0f', '.1f', '.2f')
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BarChartConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    ax.bar(x, height, width=width, color=color, edgecolor=edgecolor,
           linewidth=linewidth, alpha=alpha)

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=grid_alpha)

    if annotate:
        for i, (xi, hi) in enumerate(zip(x, height)):
            ax.annotate(f'{hi:{annotate_format}}',
                        xy=(xi, hi), xytext=(0, 5),
                        textcoords='offset points',
                        ha='center', va='bottom',
                        fontsize=annotate_fontsize,
                        color=annotate_color,
                        fontweight='bold')

    if title:
        ax.set_title(title, fontsize=BarChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='x', rotation=rot,
                   labelsize=BarChartConfig.DEFAULTS['tick_fontsize'])
    ax.tick_params(axis='y', labelsize=BarChartConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    BarChartConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# HORIZONTAL BAR CHART
# ============================================================

def plot_horizontal_bar(
    y: Union[pd.Series, np.ndarray, List],
    width: Union[pd.Series, np.ndarray, List],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    color: str = '#3498db',
    height: float = 0.6,
    edgecolor: str = 'white',
    linewidth: float = 1.0,
    alpha: float = 0.85,
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_axis: str = 'x',
    grid_alpha: float = 0.5,
    annotate: bool = True,
    annotate_fontsize: int = 10,
    annotate_color: str = 'black',
    annotate_format: str = '.0f',
    xlim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ bar chart ngang (cột nằm ngang).

    Args:
        y: nhãn trục Y
        width: chiều rộng các thanh
        height: độ cao mỗi thanh
        annotate: hiển thị giá trị
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BarChartConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    ax.barh(y, width, height=height, color=color, edgecolor=edgecolor,
            linewidth=linewidth, alpha=alpha)

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=grid_alpha)

    if annotate:
        for i, (yi, wi) in enumerate(zip(y, width)):
            ax.annotate(f'{wi:{annotate_format}}',
                        xy=(wi, yi), xytext=(5, 0),
                        textcoords='offset points',
                        ha='left', va='center',
                        fontsize=annotate_fontsize,
                        color=annotate_color,
                        fontweight='bold')

    if title:
        ax.set_title(title, fontsize=BarChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=BarChartConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)

    BarChartConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# GROUPED BAR CHART
# ============================================================

def plot_grouped_bar(
    df: pd.DataFrame,
    x_col: str,
    columns: List[str],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    width: float = 0.25,
    edgecolor: str = 'white',
    linewidth: float = 1.0,
    alpha: float = 0.85,
    rot: int = 0,
    figsize: Tuple[int, int] = (14, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_axis: str = 'y',
    grid_alpha: float = 0.5,
    legend_loc: str = 'best',
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ grouped bar chart (nhiều cột nhóm cạnh nhau).

    Args:
        df: DataFrame chứa dữ liệu
        x_col: tên cột trục X (categories)
        columns: danh sách cột cần so sánh
        width: độ rộng mỗi cột con
        colors: danh sách màu cho mỗi nhóm
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BarChartConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    x_positions = np.arange(len(df[x_col]))
    color_list = colors or BarChartConfig.DEFAULTS['colors']

    for i, col in enumerate(columns):
        offset = (i - len(columns) / 2 + 0.5) * width
        ax.bar(x_positions + offset, df[col], width,
               label=col, color=color_list[i % len(color_list)],
               edgecolor=edgecolor, linewidth=linewidth, alpha=alpha)

    ax.set_xticks(x_positions)
    ax.set_xticklabels(df[x_col], rotation=rot,
                       fontsize=BarChartConfig.DEFAULTS['tick_fontsize'])

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=grid_alpha)

    if title:
        ax.set_title(title, fontsize=BarChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='y', labelsize=BarChartConfig.DEFAULTS['tick_fontsize'])

    ax.legend(loc=legend_loc, fontsize=BarChartConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray')

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    BarChartConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# STACKED BAR CHART
# ============================================================

def plot_stacked_bar(
    df: pd.DataFrame,
    x_col: str,
    columns: List[str],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    width: float = 0.7,
    edgecolor: str = 'white',
    linewidth: float = 0.8,
    alpha: float = 0.9,
    rot: int = 0,
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_axis: str = 'y',
    grid_alpha: float = 0.5,
    legend_loc: str = 'best',
    annotate: bool = True,
    annotate_fontsize: int = 9,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ stacked bar chart (cột chồng).

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BarChartConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    color_list = colors or BarChartConfig.DEFAULTS['colors']

    x_positions = np.arange(len(df[x_col]))
    bottoms = np.zeros(len(df[x_col]))

    for i, col in enumerate(columns):
        ax.bar(x_positions, df[col], width, bottom=bottoms,
               label=col, color=color_list[i % len(color_list)],
               edgecolor=edgecolor, linewidth=linewidth, alpha=alpha)

        if annotate:
            for j, (pos, bottom, val) in enumerate(zip(x_positions, bottoms, df[col])):
                if val > 5:
                    ax.annotate(f'{val:.0f}',
                                xy=(pos, bottom + val / 2),
                                ha='center', va='center',
                                fontsize=annotate_fontsize,
                                color='white', fontweight='bold')

        bottoms += df[col].values

    ax.set_xticks(x_positions)
    ax.set_xticklabels(df[x_col], rotation=rot,
                       fontsize=BarChartConfig.DEFAULTS['tick_fontsize'])

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=grid_alpha)

    if title:
        ax.set_title(title, fontsize=BarChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='y', labelsize=BarChartConfig.DEFAULTS['tick_fontsize'])
    ax.legend(loc=legend_loc, fontsize=BarChartConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray')

    BarChartConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_bar_chart(
    df: pd.DataFrame,
    x: Optional[str] = None,
    y: Optional[Union[str, List[str]]] = None,
    kind: str = 'bar',
    title: str = '',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    color: Optional[Union[str, List[str]]] = None,
    colormap: Optional[str] = None,
    width: float = 0.7,
    alpha: float = 0.85,
    rot: int = 0,
    grid: bool = False,
    stacked: bool = False,
    legend: Union[bool, str] = True,
    legend_loc: str = 'best',
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ bar chart sử dụng pandas DataFrame.plot().

    Args:
        kind: 'bar' (dọc), 'barh' (ngang)
        stacked: True cho stacked bar
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BarChartConfig.apply_style(style)

    ax = df.plot(kind=kind, figsize=figsize, dpi=dpi,
                 x=x, y=y, color=color, colormap=colormap,
                 width=width, alpha=alpha, rot=rot,
                 grid=grid, stacked=stacked, legend=legend)

    if title:
        ax.set_title(title, fontsize=BarChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BarChartConfig.DEFAULTS['label_fontsize'])

    if isinstance(legend, str) and legend == 'reverse':
        handles, labels = ax.get_legend_handles_labels()
        ax.legend(handles[::-1], labels[::-1], loc=legend_loc)
    elif legend:
        ax.legend(loc=legend_loc, fontsize=BarChartConfig.DEFAULTS['legend_fontsize'])

    BarChartConfig.clean_spines(ax)
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
    # Sample data
    df = pd.DataFrame({
        'Sản phẩm': ['A', 'B', 'C', 'D', 'E'],
        'Q1': [120, 85, 150, 90, 110],
        'Q2': [135, 95, 140, 105, 125],
        'Q3': [110, 100, 160, 115, 130],
        'Q4': [160, 120, 180, 130, 150],
    })

    print("=== Bar Chart Examples ===\n")

    # 1. Vertical bar
    plot_vertical_bar(
        x=df['Sản phẩm'], height=df['Q4'],
        title='Doanh số Q4 theo sản phẩm',
        xlabel='Sản phẩm', ylabel='Doanh số (Triệu)',
        color='#3498db', width=0.6,
        grid=True, annotate=True,
        show=False, save_path='charts/output/bar_vertical.png'
    )
    print("1. Vertical bar: charts/output/bar_vertical.png")

    # 2. Horizontal bar
    plot_horizontal_bar(
        y=df['Sản phẩm'], width=df['Q4'],
        title='Doanh số Q4 theo sản phẩm',
        xlabel='Doanh số (Triệu)', ylabel='Sản phẩm',
        color='#2ecc71',
        grid=True, annotate=True,
        show=False, save_path='charts/output/bar_horizontal.png'
    )
    print("2. Horizontal bar: charts/output/bar_horizontal.png")

    # 3. Grouped bar
    plot_grouped_bar(
        df=df, x_col='Sản phẩm',
        columns=['Q1', 'Q2', 'Q3', 'Q4'],
        title='Doanh số theo quý từng sản phẩm',
        xlabel='Sản phẩm', ylabel='Doanh số (Triệu)',
        width=0.2,
        grid=True,
        show=False, save_path='charts/output/bar_grouped.png'
    )
    print("3. Grouped bar: charts/output/bar_grouped.png")

    # 4. Stacked bar
    plot_stacked_bar(
        df=df, x_col='Sản phẩm',
        columns=['Q1', 'Q2', 'Q3', 'Q4'],
        title='Doanh số tích lũy theo quý',
        xlabel='Sản phẩm', ylabel='Doanh số (Triệu)',
        width=0.6,
        grid=True,
        show=False, save_path='charts/output/bar_stacked.png'
    )
    print("4. Stacked bar: charts/output/bar_stacked.png")

    # 5. Pandas wrapper
    pandas_bar_chart(
        df=df.set_index('Sản phẩm'),
        kind='bar',
        title='Doanh số (Pandas)',
        color=['#3498db', '#e74c3c', '#2ecc71', '#f39c12'],
        grid=True, rot=0,
        show=False, save_path='charts/output/bar_pandas.png'
    )
    print("5. Pandas wrapper: charts/output/bar_pandas.png")
